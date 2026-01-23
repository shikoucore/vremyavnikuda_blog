---
title: "Rust 1.93.0: musl、アロケータ、そして冬のリリースのサプライズ"
description: "Rust 1.93.0のポイントを整理: musl 1.2.5、アロケータのTLS、asm!内cfg、移行ポイント。"
pubDate: 2026-01-22
tags: ["rust", "release", "musl", "allocators", "asm"]
draft: false
lang: ja
---

# Rust 1.93.0: musl、アロケータ、そして冬のリリースのサプライズ

こんにちは! 今日は **2026年1月22日** に **Rust 1.93.0** がリリースされたので、このリリースについての感想を共有します。

一見すると少し地味に見えるアップデートってありますよね。言語の大きな新機能も、文法の革命的な変更もない。けれど掘り下げてみると、特にembeddedシステムや静的バイナリ、自作アロケータを扱う人にとって、裏側でたくさん面白いことが起きていると分かります。

**1.93.0** は技術的負債をたくさん返し、インフラを改善するような「メンテナンス」リリースだと思います。コードを書き直す必要はありません(ただし、後述するように一部は壊れる可能性があります)。でも、開発者の生活を少しだけ快適にする細かな改善が入っています。

個人的に一番刺さったのは次の3つです:

* **musl** の更新(ときどきデプロイ用に静的バイナリを作るので),
* グローバルアロケータで **thread-local storage** が使えるようになったこと(技術的に美しい),
* `asm!` の個々の行に `cfg` を付けられるようになったこと(ついに!).

なぜこういう更新を追うべきなのか? すぐに更新しないとしても、エコシステムがどこに向かっているのか、どんな問題が重要視されているのかを理解できます。また、変更が予期せずプロジェクトに影響することもあるので、突然壊れたCIから知るより、落ち着いたレビューで知る方がずっと良いです。

では、掘っていきましょう。

---

## リリースのトップ3(あくまで主観)

### bundled muslを1.2.5に更新

この変更は技術的に見えますが、実際にはLinuxで静的バイナリを作る人にとって非常に重要です。`x86_64-unknown-linux-musl` や `aarch64-unknown-linux-musl` のようなターゲットを使ったことがあるなら、Rustが **musl** ライブラリの組み込み版を同梱していることを知っているはずです。以前は **1.2.3** でしたが、今は **1.2.5** になりました。

これは一見地味でも実際の問題を解決するタイプの更新だと思います。musl 1.2.4 と 1.2.5 では **DNSリゾルバ** が大きく改善され、大きなDNSレコードや再帰リゾルバへの対応が良くなりました。静的バイナリがネットワークにアクセスする場合(ほとんどの本格的なアプリがそうですが)、この改善は信頼性を直接高めます。

例えばこういう状況を想像してください。コンテナにデプロイしたマイクロサービスが外部APIにHTTPリクエストを投げる。以前は、DNSレスポンスに大量のレコードが含まれる、あるいは複数のリゾルバを経由するような非標準的なDNS構成だと、muslが予測不能な挙動をすることがありました。新しいmuslではこれらのエッジケースをより正しく扱うので、問題が起きる確率は下がります。

新しいmuslで静的バイナリを作る実例を見てみましょう:

```bash
# muslターゲットが入っていることを確認
rustup target add x86_64-unknown-linux-musl

# ビルド時に自動的に musl 1.2.5 が使われる
cargo build --target x86_64-unknown-linux-musl --release

# バイナリが本当に静的か確認
ldd target/x86_64-unknown-linux-musl/release/myapp
# "not a dynamic executable" と出るはず
```

改善されたDNSリゾルバの恩恵を受ける簡単なアプリ例です:

```rust
use std::net::TcpStream;
use std::io::{Read, Write};

fn main() -> std::io::Result<()> {
    // musl 1.2.5 ではDNSリゾルバの改善により
    // このコードの信頼性が上がる
    let mut stream = TcpStream::connect("api.example.com:443")?;
    // "api.example.com" のDNS解決が
    // 大きなTXTレコード、複数のA/AAAAレコード、
    // 複雑なCNAMEチェーンに対してより強くなる
    let request = b"GET / HTTP/1.1\r\nHost: api.example.com\r\n\r\n";
    stream.write_all(request)?;
    let mut response = String::new();
    stream.read_to_string(&mut response)?;
    println!("Response: {}", response);
    Ok(())
}
```

**誰に有用か:** Linux向けのportableな静的バイナリを作る人全員、特にコンテナや組み込み向け。依存のない単一実行ファイルでデプロイするなら、これはあなたのための変更です。

#### 注意: legacy互換シンボルの削除

ただし重要な注意点があります。musl 1.2.4 で `open64`、`fopen64` などのlegacy互換シンボルが削除されました。これにより、古いクレートがこれらのシンボルにバインドしていると、リンク時に `undefined reference to 'open64'` のようなエラーが出ることがあります。

以下はそのエラー例と修正方法です:

```bash
# リンク時のエラー(更新後に起きる可能性あり)
error: linking with `cc` failed: exit status: 1
  |
  = note: /usr/bin/ld: old_crate.o: undefined reference to `fopen64`
          /usr/bin/ld: old_crate.o: undefined reference to `open64`

# 解決: 依存を更新
cargo update

# または問題のあるクレートだけ更新
cargo update -p old_crate

# productionでCargo.lockを固定している場合は
# 影響のある依存だけ更新:
cargo update -p libc -p getrandom
```

要するに、**悪いのはRustではありません**。単に依存が長らく更新されていないだけです。むしろ健全な「小さな刺激」だと思います。過去の遺物を減らし、正直な互換性に近づくからです。

---

### グローバルアロケータでTLSと`thread::current()`が使える

この変更はエレガントだと思います。

以前は、`#[global_allocator]` を書くときに `alloc` や `dealloc` の内部で何を呼ぶかに細心の注意が必要でした。標準ライブラリの多くはメモリを確保する可能性があり、アロケータ内で `thread_local!` を使おうとすると、次のような循環が起きます:

> アロケータ -> TLS -> アロケーション -> アロケータ -> 再帰 -> パニック(またはもっと悪い)

いまは `std` の内部が再設計され、`thread_local!` と `std::thread::current()` などの主要APIが、重要な箇所でシステムアロケータにフォールバックできるようになりました。つまり、馴染みのあるツールを使って、より複雑で便利なアロケータを書けます。

実例を見てみましょう。スレッドごとにアロケーションを追跡するプロファイリングアロケータを書くとします:

```rust
use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};

// Rust 1.93以前は再帰してパニックする可能性があった
struct ProfilingAllocator;

// 各スレッドのThread-localカウンタ
thread_local! {
    static ALLOCATIONS: AtomicUsize = AtomicUsize::new(0);
    static DEALLOCATIONS: AtomicUsize = AtomicUsize::new(0);
    static BYTES_ALLOCATED: AtomicUsize = AtomicUsize::new(0);
}

unsafe impl GlobalAlloc for ProfilingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        // Rust 1.93+ なら安全に使える
        // thread_local! がアロケータへ再帰しない
        ALLOCATIONS.with(|count| {
            count.fetch_add(1, Ordering::Relaxed);
        });
        BYTES_ALLOCATED.with(|bytes| {
            bytes.fetch_add(layout.size(), Ordering::Relaxed);
        });
        // 実際のアロケーションはシステムアロケータへ
        System.alloc(layout)
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        DEALLOCATIONS.with(|count| {
            count.fetch_add(1, Ordering::Relaxed);
        });
        System.dealloc(ptr, layout);
    }
}

#[global_allocator]
static ALLOCATOR: ProfilingAllocator = ProfilingAllocator;

// 現在のスレッドの統計を取得
pub fn get_thread_stats() -> (usize, usize, usize) {
    let allocs = ALLOCATIONS.with(|c| c.load(Ordering::Relaxed));
    let deallocs = DEALLOCATIONS.with(|c| c.load(Ordering::Relaxed));
    let bytes = BYTES_ALLOCATED.with(|c| c.load(Ordering::Relaxed));
    (allocs, deallocs, bytes)
}

fn main() {
    // いくつかアロケーションを作る
    let _vec1 = vec![1, 2, 3, 4, 5];
    let _vec2 = vec!["hello", "world"];
    let (allocs, deallocs, bytes) = get_thread_stats();
    println!(
        "Main thread: {} allocations, {} deallocations, {} bytes",
        allocs, deallocs, bytes
    );
    // 新しいスレッドを起動
    std::thread::spawn(|| {
        let _data = vec![0u8; 1024];
        let (allocs, deallocs, bytes) = get_thread_stats();
        println!(
            "Worker thread: {} allocations, {} deallocations, {} bytes",
            allocs, deallocs, bytes
        );
    })
    .join()
    .unwrap();
}
```

以前は、`thread_local!` がTLS初期化のためにメモリ確保を試み、アロケータが再び `thread_local!` に触れてしまい、スタックオーバーフローまで進む可能性がありました。今は標準ライブラリがこの罠を回避できるようになっています。

もう一つの例です。スレッドごとのコンテキストを集める(リーク探索用の)アロケータ。これは本格的なリーク検出器ではなく、便利なトレースとして「柔らかく」やっています。

```rust
use std::alloc::{GlobalAlloc, Layout, System};
use std::collections::HashMap;
use std::sync::Mutex;

struct StackTrackingAllocator;

static ALLOCATIONS: Mutex<HashMap<usize, String>> = Mutex::new(HashMap::new());

unsafe impl GlobalAlloc for StackTrackingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let ptr = System.alloc(layout);
        if !ptr.is_null() {
            // Rust 1.93+ ならスレッド情報を安全に取得できる
            let thread_name = std::thread::current()
                .name()
                .unwrap_or("unnamed")
                .to_string();
            if let Ok(mut map) = ALLOCATIONS.try_lock() {
                map.insert(
                    ptr as usize,
                    format!("Thread: {}, size: {}", thread_name, layout.size()),
                );
            }
        }
        ptr
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        if let Ok(mut map) = ALLOCATIONS.try_lock() {
            map.remove(&(ptr as usize));
        }
        System.dealloc(ptr, layout);
    }
}

pub fn dump_active_allocations() {
    if let Ok(map) = ALLOCATIONS.try_lock() {
        println!("Active allocations: {}", map.len());
        for (addr, info) in map.iter().take(10) {
            println!("  0x{:x}: {}", addr, info);
        }
    }
}
```

こうした変化は、言語の成熟を示していると思います。以前は「アロケータ内で `std` を使うな」と言われていましたが、今は何が許されるかが明確になってきました。

**誰に有用か:** 低レベルライブラリ、メモリプロファイラ、embedded向けのカスタムアロケータの開発者。一般的なアプリ開発者には直接関係しないかもしれませんが、エコシステム全体を良くします。

---

### `asm!` の中で行単位の `#[cfg(...)]`

小さな機能に見えますが、条件付きコンパイルでインラインアセンブリを書いたことがあるなら、なぜ嬉しいか分かるはずです。

以前は、ターゲット機能によってアセンブリの1行だけを切り替えたい場合でも、`asm!` ブロック全体を複製する必要がありました。コードは膨らみ、読みづらくなり、保守も大変です。

Rust 1.93+ ではもっとエレガントにできます。違いのある行だけに `cfg` を付ければいい:

```rust
use std::arch::asm;

/// 利用可能なSIMD命令でデータをコピー
#[cfg(target_arch = "x86_64")]
pub unsafe fn fast_memcpy(dst: *mut u8, src: *const u8, len: usize) {
    asm!(
        // 共通ロジック
        "mov {tmp}, {len}",
        // AVX2パス(32バイト処理)
        #[cfg(target_feature = "avx2")]
        "shr {tmp}, 5",
        // SSE2パス(16バイト処理)
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "shr {tmp}, 4",
        // コピーするものがあるか確認
        "test {tmp}, {tmp}",
        "jz 2f",
        "1:",
        // AVX2: 32バイトコピー
        #[cfg(target_feature = "avx2")]
        "vmovdqu ymm0, [{src}]",
        #[cfg(target_feature = "avx2")]
        "vmovdqu [{dst}], ymm0",
        #[cfg(target_feature = "avx2")]
        "add {src}, 32",
        #[cfg(target_feature = "avx2")]
        "add {dst}, 32",
        // SSE2: 16バイトコピー
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "movdqu xmm0, [{src}]",
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "movdqu [{dst}], xmm0",
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "add {src}, 16",
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "add {dst}, 16",
        // 共通のループロジック
        "dec {tmp}",
        "jnz 1b",
        "2:",
        src = inout(reg) src => _,
        dst = inout(reg) dst => _,
        len = in(reg) len,
        tmp = out(reg) _,
        #[cfg(target_feature = "avx2")]
        out("ymm0") _,
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        out("xmm0") _,
        options(nostack),
    );
}
```

かなり読みやすくなりますよね。cfgごとに90%同じコードを複製する代わりに、違う行だけをマークすればいい。保守性と可読性が大きく向上します。

**誰に有用か:** Rustでインラインアセンブリを書く人(ドライバ、暗号ライブラリ、SIMD最適化など)。`asm!` を使わないなら影響はありませんが、使う人にとっては大きいです。

---

## 移行時に壊れうる変更

次はアップデート時に注意すべき点です。重要なものを「以前 -> 以後」の形でまとめ、具体例も示します。

### `BTreeMap::append` と `BTreeSet::append` が既存キーを更新しない

古い挙動に依存していると驚く可能性があります。

```rust
use std::collections::BTreeMap;

fn main() {
    let mut map1 = BTreeMap::new();
    map1.insert("key1", "old_value_1");
    map1.insert("key2", "old_value_2");
    let mut map2 = BTreeMap::new();
    map2.insert("key2", "new_value_2"); // 競合キー
    map2.insert("key3", "value_3");     // 新しいキー
    map1.append(&mut map2);
    // Rust 1.93以前:
    // map1["key2"] が "new_value_2" に上書き
    // Rust 1.93以後:
    // map1["key2"] は "old_value_2" のまま
    println!("key1: {}", map1["key1"]);
    println!("key2: {}", map1["key2"]);
    println!("key3: {}", map1["key3"]);
    // map2には追加されなかった要素だけが残る:
    println!("map2 remaining: {:?}", map2); // {"key2": "new_value_2"}
}
```

旧挙動(上書きマージ)が必要なら `extend()` を使います:

```rust
use std::collections::BTreeMap;

fn main() {
    let mut map1 = BTreeMap::new();
    map1.insert("key1", "old_value_1");
    map1.insert("key2", "old_value_2");
    let mut map2 = BTreeMap::new();
    map2.insert("key2", "new_value_2");
    map2.insert("key3", "value_3");
    // extendは既存キーを上書きする
    map1.extend(map2);
    println!("key2: {}", map1["key2"]); // "new_value_2"
}
```

より細かく制御したいなら `entry` API を使います:

```rust
use std::collections::BTreeMap;
use std::collections::btree_map::Entry;

fn merge_with_custom_logic(
    map1: &mut BTreeMap<String, Vec<i32>>,
    map2: BTreeMap<String, Vec<i32>>,
) {
    for (key, mut values) in map2 {
        match map1.entry(key) {
            Entry::Vacant(e) => {
                e.insert(values);
            }
            Entry::Occupied(mut e) => {
                e.get_mut().append(&mut values);
            }
        }
    }
}
```

**私の結論:** `append` を「上書きマージ」として使っていたなら、これは驚きです。でも新しい挙動の方が論理的です。appendは「存在しないものを移す」であり、予期せぬ上書きをしない。

---

### Emscripten + `panic=unwind`: スタックアンワインドの新しいABI

Emscripten経由でRustをWebAssemblyにコンパイルし、unwinding(パニック時のスタック展開)を使っている場合、C/C++側のビルド設定を更新する必要があります。

* **以前:** JS例外処理ABI。
* **以後:** wasm例外処理ABI。

RustとC/C++のオブジェクトをリンクする場合、C/C++側を `-fwasm-exceptions` 付きでビルド/リンクする必要があります。

`cc` クレートを使った `build.rs` の例:

```rust
fn main() {
    let mut build = cc::Build::new();
    build.file("src/native/helper.c");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("emscripten") {
        build.flag("-fwasm-exceptions");
    }
    build.compile("helper");
}
```

この領域(Emscripten + unwind + C/C++)にいる人は、元々「常に注意点がある」ことに慣れているはずです。これもその一つです。

---

### 変な場所の `#[test]` はエラーになる

以前はコンパイラが寛容で、不適切な場所の `#[test]` を黙って無視していました。今はエラーになります:

```rust
// Rust 1.93+ ではエラー
struct MyStruct {
    #[test] // フィールドには付けられない
    field: i32,
}

// 正しい #[test] の使い方:
#[cfg(test)]
mod tests {
    #[test]
    fn test_mystruct() {
        assert!(true);
    }
}
```

これは良い変更だと思います。魔法が減って、ルールが明確になる。

---

### Cargoが `CARGO_CFG_DEBUG_ASSERTIONS` をより頻繁に設定する

この変更により、デバッグアサーションを正しく扱えていなかった古い依存のバグが表面化するかもしれません。有名な例は `static-init` 1.0.1-1.0.3 の問題です。

解決策はだいたいシンプルです:

```bash
cargo update
# もしくはピンポイント
cargo update -p static-init
```

どうしても更新できない場合はプロファイルレベルの一時回避策がありますが、正直おすすめはしません。

---

### `-Zno-jump-tables` の代わりに `-Cjump-tables=bool`

nightlyの `-Zno-jump-tables` は安定化されました:

```bash
# 以前(nightly)
RUSTFLAGS="-Zno-jump-tables" cargo +nightly build

# いま(stable)
RUSTFLAGS="-Cjump-tables=false" cargo build
```

embeddedでは実際に有用です。ジャンプテーブルが実行予測性やメモリ特性の観点で望ましくない場合があります。

---

### `deref_nullptr` がdeny-by-defaultに

このlintはコンパイルエラーになります:

```rust
fn dangerous_function() {
    let ptr: *const i32 = std::ptr::null();
    // 今はエラー
    let value = unsafe { *ptr };
    println!("{}", value);
}
```

これは多くのプロジェクトにとって有益な強化だと思います。もしnullを本当に参照しているなら、コンパイル時に気づくべきです。

---

## Stabilized API: 「地味だけど嬉しい」

Rust 1.93.0では便利なメソッドがいくつか安定化されました。全部を辞書的に並べるつもりはありませんが、嬉しいものは確かにあります。

### `Vec::into_raw_parts` と `String::into_raw_parts`

`Vec`/`String` を (ptr/len/cap) に分解できるようになり、FFIや手動メモリ管理に便利です。

```rust
fn take_vec(v: Vec<u8>) -> (*mut u8, usize, usize) {
    let (ptr, len, cap) = v.into_raw_parts();
    (ptr, len, cap)
}

unsafe fn give_back(ptr: *mut u8, len: usize, cap: usize) -> Vec<u8> {
    Vec::from_raw_parts(ptr, len, cap)
}
```

### `MaybeUninit` 用のメソッド

未初期化メモリの扱いが楽になり、低レベルコードでの「車輪の再発明」が減ります:

* `assume_init_ref`, `assume_init_mut`, `assume_init_drop`
* `write_copy_of_slice`, `write_clone_of_slice`

### Slice -> array

バイナリフォーマットやプロトコルの解析に便利です:

```rust
fn parse_magic(data: &[u8]) -> Option<[u8; 4]> {
    data.get(0..4)?.as_array::<4>().copied()
}
```

### `VecDeque::pop_front_if` / `pop_back_if`

小さな改善ですが、「条件が合えば取り出す」が書けます。

### `std::fmt::from_fn`

中間文字列を作らず、その場で「フォーマット可能なオブジェクト」を作れます。ログやデバッグに便利です。

まとめると、ニッチな安定化もありますが、合計すると標準ライブラリが少し「大人」になった感じです。

---

## 短いアップデートチェックリスト

Rust 1.93.0に更新するなら、以下を確認するのがおすすめです:

**muslターゲットを使っている場合:**

```bash
cargo update
cargo build --target x86_64-unknown-linux-musl --release
# *64シンボルのリンクエラーに注意
```

**Emscriptenで `panic=unwind` のRustとC/C++をリンクしている場合:**

```bash
# build.rsやビルドスクリプトに追加:
# -fwasm-exceptions
```

**`BTreeMap::append` / `BTreeSet::append` を使っている場合:**

* 上書きに依存していないか確認;
* 上書きが必要なら `extend()` を使う.

**`#[test]` 属性の確認:**

* 実際のテスト(`cfg(test)`モジュール)に置かれているか.

**古い依存でビルドが落ちる場合:**

```bash
cargo update
# もしくはピンポイント
cargo update -p problematic-crate
```

**nightlyで `-Zno-jump-tables` を使っていた場合:**

* `-Cjump-tables=false` に置き換える.

**`deref_nullptr` のエラー確認:**

* nullポインタの参照を修正する(もしあれば).

---

## muslを使うなら二度読むべき

muslターゲットを積極的に使っている人にもう一度強調します。musl 1.2.5への更新は諸刃の剣です。

一方でDNSリゾルバや他の改善が得られます。もう一方で、依存を更新しないとリンクエラーに遭遇する可能性があります。

余計な演出は省いて、より実務的な手順はこんな感じです:

```bash
# テスト用ブランチを作成
git checkout -b test-rust-1.93

# Rustを更新
rustup update stable

# 依存を更新
cargo update

# muslリリースをビルド
cargo build --target x86_64-unknown-linux-musl --release

# open64/fopen64/lseek64 のリンクエラーが出たら
# - どの依存が古いものを引っ張っているかを特定し、更新
cargo tree | rg "(libc|getrandom|your_suspect)"

# 静的リンクの確認
ldd target/x86_64-unknown-linux-musl/release/your-app
# "not a dynamic executable" と出るはず
```

アドバイスとしては、productionプロジェクトを更新する前に、新しいRustでCIのテストビルドを回すこと。リンクが落ちる場合は、ほとんどの場合いくつかの依存更新で直ります。

---

## 結論: 良い点、リスク、向いている人

正直に言うと、Rust 1.93.0 は「落ち着いているけれど良くなった」という感覚でした。

### 良い点

* **musl 1.2.5**: 静的バイナリがより信頼できるものになります。特にネットワークを使うアプリならDNS由来のサプライズを減らせます。
* **アロケータ**: 長年の制約が外れた感じがします。プロファイラやトラッカー、特化アロケータなどの良質なツールが作りやすくなります。
* **`asm!` 内の `cfg`**: 小さな機能ですが、インラインアセンブリを使う人にとっては大きな節約です。
* **安定化されたAPI**: 派手さはないけれど、低レベル開発者の日常に役立つセット。

### 欠点 / リスク

* **muslがリンクを壊す可能性**: 依存が長らく更新されていないと壊れます。Rustを「そのまま」更新すると予期せぬ驚きになります。
* `BTreeMap::append` のような挙動変更は、*本当に依存していた場合* にだけ刺さります。

### 今すぐ更新した方がいい人

* **musl静的バイナリ** をデプロイしている人(特にネットワークあり) - 改善が得られ、依存が生きていれば痛みは少ないはず;
* **低レベル** ライブラリやメモリプロファイル、アロケータの実験をしている人 - ここに新しい可能性があります;
* **asm!** と条件付きコンパイルが多い人 - よりシンプルで綺麗になります.

### 待ってもいい人

* 一般的なアプリ開発者で、musl/asm/アロケータに依存していない場合は、CIと依存が整ったタイミングで落ち着いて更新すれば十分です。

こういうタイプのリリースが私は好きです。驚かせようとせず、着実にエコシステムを前に進めてくれる。悪くないですね。
