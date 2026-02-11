---
title: "Go 1.26: 何が新しく、なぜ重要か"
description: "Go 1.26の分かりやすい概要: 新しいGCでアプリが速くなり、改善されたgo fixと実用的な新機能の例を紹介。"
pubDate: 2026-02-11
tags:
  [
    "go",
    "release",
    "runtime",
    "gc",
    "tooling",
    "crypto",
    "standard-library",
    "platforms",
  ]
draft: false
lang: ja
---

**2026年2月10日**、Goチームは 1.26 をリリースしました。半年ごとの通常アップデートですが、日々の開発を楽にする目立つ改善が入っています。変更点と実際の使いどころを整理します。

---

## まず押さえるポイント

- **プログラムが速くなる**: Green Tea GC がデフォルトで有効になり、停止時間が約10〜40%短縮。
- **ボイラープレート削減**: `new(int64(300))` のように中間変数なしで書ける。
- **コードの自動更新**: 改良された `go fix` が新しい API への更新を自動化。
- **暗号がより安全に**: 暗号ライブラリが安全な乱数ソースを自動的に選択。
- **cgo が約30%高速化**: Cライブラリを使う場合に効果的。

---

## 言語の変更: 少なく書いて多くできる

### `new` が式を受け取れるように

**以前は面倒でした:**

```go
// 300 のポインタを作るために一時変数が必要
temp := int64(300)
ptr := &temp
```

**今はシンプル:**

```go
// 300 のポインタを直接作成
ptr := new(int64(300))
```

**どこで便利か?** optional フィールドをポインタで表すAPIで役立ちます:

```go
type User struct {
    Name    string
    // optional フィールド
    Age     *int
    // optional フィールド
    Premium *bool
}

// 以前
age := 25
premium := true
user := User{
    Name:    "Makoto",
    Age:     &age,
    Premium: &premium,
}

// これから
user := User{
    Name:    "Makoto",
    Age:     new(int(25)),
    Premium: new(bool(true)),
}
```

### Generics: 自己参照型

Generics を使い始めたばかりなら飛ばしてOKです。ただ、「型引数が自分自身を参照できない」という制限にぶつかったなら、今回から解決されています:

```go
// これは今は有効なコード
type Adder[A Adder[A]] interface {
    Add(A) A
}
```

自己参照の制約が書けるようになり、上級パターンが素直に表現できます。

---

## ツール: ルーチン作業の自動化

### `go fix` がコードを最新化

使っているライブラリの API が変わったとき、以前は手動で書き換える必要がありました。

**今は `go fix` が自動でやってくれます:**

```go
// 旧 API（置換対象としてマーク）
//go:fix inline
func OldCalculate(x, y int) int {
    return NewCalculate(x, y)
}

// 実行: go fix ./...
// OldCalculate の呼び出しは NewCalculate に置き換えられる
```

**実例:**

```go
// go fix 前
result := legacy.Join([]string{"a", "b"}, ",")
// go fix 後（ライブラリが移行ルールを提供していれば）
result := modern.Join([]string{"a", "b"}, ",")
```

### 新しい `go.mod` は `go 1.25.0`

`go mod init` を実行すると、現在のバージョンではなく `go 1.(N-1).0` が書かれます。新規モジュールが前の Go バージョンと互換になりやすくなります。

### `pprof -http` が flame graph から始まる

`go tool pprof -http=:8080 profile.pb.gz` を起動すると、最初に flame graph が表示されます。従来の呼び出しグラフはメニューからアクセス可能です。

---

## パフォーマンス: より速く、より効率的に

### Green Tea GC がデフォルト

**あなたにとって何が変わる?**

大量にオブジェクトを生成するアプリ（Webサーバ、データ処理、APIなど）では、GC の停止時間が **10〜40%短縮** され、レイテンシが安定します。

**効果を確認する方法:**

```bash
GODEBUG=gctrace=1 ./your-app
```

次のような出力が見えます:

```
gc 1 @0.005s 2%: 0.018+1.2+0.002 ms clock, ...
```

ミリ秒の値が Go 1.25 より下がっていれば改善されています。

**ロールバックしたい場合:**

```bash
GOEXPERIMENT=nogreenteagc go run main.go
```

### cgo 呼び出しが約30%高速化

cgo を使って C ライブラリを呼び出す場合、Go↔C のオーバーヘッドが約 1/3 低減しました。

**例:**

```go
// #include <stdlib.h>
// #include <string.h>
import "C"

// C.malloc, C.strlen がより速い
ptr := C.malloc(1024)
```

### heap アドレスのランダム化

64-bit 環境では起動時に heap アドレスがランダム化され、アドレス予測型の攻撃が難しくなります。普段の開発では意識不要ですが、安全性が上がります。

---

## 標準ライブラリ: 何が変わった?

### 暗号: より安全なデフォルト

**テストでは重要な変更です!**

以前は deterministic テストのために独自の乱数ソースを渡せました:

```go
// これは期待通りに動かない
customRand := rand.New(rand.NewSource(42))
// customRand は無視される
rsa.GenerateKey(customRand, 2048)
```

**これからのテストの書き方:**

```go
import "testing/cryptotest"
import crand "crypto/rand"

func TestMyEncryption(t *testing.T) {
    // すべての暗号関数で決定的乱数を使う
    cryptotest.SetGlobalRandom(t, 12345)
    // テストが再現可能に
    key, _ := rsa.GenerateKey(crand.Reader, 2048)
}
```

**一時的な旧挙動:**

```bash
GODEBUG=cryptocustomrand=1 go test ./...
```

### 新しい `crypto/hpke`

HPKE（Hybrid Public Key Encryption）が追加され、ポスト量子ハイブリッド KEM もサポートされます。

```go
import "crypto/hpke"

// 使い方の例（簡略化）
sender, _ := hpke.SetupSender(...)
ciphertext := sender.Seal(plaintext)
```

### `image/jpeg` の新実装

JPEG コーデックが高速かつ高精度になりました。JPEG 出力をバイト単位で比較するテストは、golden ファイル更新が必要になる可能性があります。

### `io.ReadAll` が高速化

ファイルや HTTP レスポンスを丸ごと読む処理が、より速く、少ないアロケーションで動きます:

```go
resp, _ := http.Get("https://api.example.com/data")
// より速く、より効率的
body, _ := io.ReadAll(resp.Body)
```

### `net/http`: 逆プロキシの安全な API

`httputil.ReverseProxy` を使っている場合、重要な変更があります:

```go
// 旧方式（非推奨）
proxy := &httputil.ReverseProxy{
    Director: func(req *http.Request) {
        req.URL.Scheme = "https"
        req.URL.Host = "backend.example.com"
    },
}

// 新方式（より安全）
proxy := &httputil.ReverseProxy{
    Rewrite: func(r *httputil.ProxyRequest) {
        r.SetURL(targetURL)
        // hop-by-hop の正しい扱い
        r.Out.Host = r.In.Host
    },
}
```

旧 `Director` モデルは hop-by-hop ヘッダーに対して安全でないため、将来削除されます。

---

## プラットフォームと互換性

### macOS ユーザーへ

**Go 1.26 は macOS 12 Monterey の最終対応版です。** Monterey を使っている場合、Go 1.27 へ移行する前に macOS 13+ への更新を検討してください。

### Windows ARM (32‑bit) は削除

`windows/arm`（`windows/arm64` ではない）を使っていた場合、このポートは重大な不具合により削除されました。

### RISC‑V: race detector

`linux/riscv64` では race detector が使えるようになりました:

```bash
go test -race ./...
```

---

## アップグレード方法

**1. Go 1.26 をダウンロード:**

```bash
# Linux/macOS
wget https://go.dev/dl/go1.26.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.26.linux-amd64.tar.gz
```

**2. バージョン確認:**

```bash
go version
# go version go1.26 linux/amd64
```

**3. 依存を更新:**

```bash
go get -u ./...
go mod tidy
```

**4. テスト実行:**

```bash
go test ./...
```

**5. 変更点の確認:**

暗号系テストが落ちた場合は `cryptotest.SetGlobalRandom` を追加するか、`GODEBUG=cryptocustomrand=1` を一時的に使用してください。

---

## 実験的機能

興味のある人向け:

### SIMD ベクトル (amd64)

```bash
GOEXPERIMENT=simd go run main.go
```

`simd/archsimd` による低レベル SIMD が使えます。API は不安定で実験向きです。

### 秘密情報の安全な消去

```bash
GOEXPERIMENT=runtimesecret go run main.go
```

`runtime/secret` がパスワードや鍵を安全に消去します（現状 Linux の amd64/arm64 のみ）。

### ゴルーチンリークのプロファイリング

```bash
GOEXPERIMENT=goroutineleakprofile go run main.go
```

`goroutineleak` プロファイラは、同期プリミティブ上で永久にブロックされたゴルーチンを検出します。デッドロック検出の代替ではありませんが、大規模システムで役立ちます。

---

**アップグレードする価値があるケース:**

- GC 負荷の高いアプリ（Web サービス、データ処理）で性能向上を狙う。
- cgo を使っていてオーバーヘッドを減らしたい。
- `new(expr)` や `go fix` でコードを簡潔化したい。

**アップグレード後に確認すること:**

- 暗号系テストに `cryptotest.SetGlobalRandom` が必要か。
- JPEG の golden ファイル更新が必要か。
- `ReverseProxy.Director` を `Rewrite` に移行できているか。

**参考リンク:**

- [Official release notes](https://go.dev/doc/go1.26)
- [Go blog](https://go.dev/blog/)
- [Migration guide](https://go.dev/doc/go1.26#migration)
