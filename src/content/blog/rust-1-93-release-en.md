---
title: "Rust 1.93.0: musl, allocators, and other winter release surprises"
description: "My take on Rust 1.93.0: musl 1.2.5, allocator TLS, asm cfg lines, and migration notes."
pubDate: 2026-01-22
tags: ["rust", "release", "musl", "allocators", "asm"]
draft: false
lang: en
---

# Rust 1.93.0: musl, allocators, and other winter release surprises

Hello! Today, **January 22, 2026**, **Rust 1.93.0** was released, and I want to share my impressions of this release.

You know how some updates look a bit boring at first glance - no loud new language features, no revolutionary syntax changes. But then you dig deeper and realize that a lot of interesting work is happening under the hood, especially if you work with embedded systems, static binaries, or your own allocators.

I think **1.93.0** is a "maintenance" release that pays down a lot of technical debt and improves infrastructure. It will not make you rewrite your code (although a few things can break - more on that below), but it adds the little quality-of-life details that make a developer's life a bit nicer.

Personally, three things grabbed me most:

* the **musl** update (because I sometimes build static binaries for deployment),
* the ability to use **thread-local storage** in global allocators (it's just beautiful from a technical standpoint),
* and the ability to attach `cfg` to individual lines in `asm!` (finally!).

Why keep track of updates like this at all? Even if you do not upgrade right away, knowing what changes are coming helps you understand where the language is heading and which problems are considered important. Also, some changes can affect your projects in unexpected ways, and it is better to learn about them from a calm overview than from a suddenly broken CI.

Let's dig deeper.

---

## Top 3 features of the release (my subjective take)

### Update bundled musl to version 1.2.5

This change looks technical, but in practice it is very important for everyone who builds static binaries on Linux. If you have ever used targets like `x86_64-unknown-linux-musl` or `aarch64-unknown-linux-musl`, you know that Rust ships with a bundled version of the **musl** library. It used to be version **1.2.3**, and now it is **1.2.5**.

I think this is one of those cases where a "quiet" update actually fixes real problems. In musl 1.2.4 and 1.2.5, the **DNS resolver** was significantly improved - it now handles large DNS records and recursive resolvers better. If your static binary talks to the network (and almost any serious application does), these improvements directly increase reliability.

Imagine this situation: you deploy your microservice in a container that makes HTTP requests to external APIs. Previously, with some non-standard DNS configurations (for example, when a DNS response contains many records or goes through multiple resolvers), musl could behave unpredictably. Now the odds of such problems are lower, because the new musl version handles these edge cases more correctly.

Let's look at a practical example of how to build a static binary with the new musl:

```bash
# Make sure you have the musl target installed
rustup target add x86_64-unknown-linux-musl

# Now the build will automatically use musl 1.2.5
cargo build --target x86_64-unknown-linux-musl --release

# Check that the binary is actually static
ldd target/x86_64-unknown-linux-musl/release/myapp
# Should show: "not a dynamic executable"
```

Here is a simple app that benefits from the improved DNS resolver:

```rust
use std::net::TcpStream;
use std::io::{Read, Write};

fn main() -> std::io::Result<()> {
    // This code is now more reliable on musl 1.2.5
    // thanks to the improved DNS resolver
    let mut stream = TcpStream::connect("api.example.com:443")?;
    // DNS resolving for "api.example.com" now handles
    // large TXT records, multiple A/AAAA records,
    // and complex CNAME chains better
    let request = b"GET / HTTP/1.1\r\nHost: api.example.com\r\n\r\n";
    stream.write_all(request)?;
    let mut response = String::new();
    stream.read_to_string(&mut response)?;
    println!("Response: {}", response);
    Ok(())
}
```

**Who benefits:** everyone who builds portable static binaries for Linux, especially for containers or embedded systems. If you deploy a single executable "without dependencies" - this is for you.

#### Warning: legacy compatibility symbols removed

But there is an important nuance: in musl 1.2.4 they removed a bunch of legacy compatibility symbols (things like `open64`, `fopen64`, and similar). This means that if your dependencies include old crates with bindings to these symbols, linking may fail with an error like `undefined reference to 'open64'`.

Here is what such an error might look like and how to fix it:

```bash
# Linking error (may appear after the update)
error: linking with `cc` failed: exit status: 1
  |
  = note: /usr/bin/ld: old_crate.o: undefined reference to `fopen64`
          /usr/bin/ld: old_crate.o: undefined reference to `open64`

# Solution: update dependencies
cargo update

# Or update a specific problematic crate
cargo update -p old_crate

# If you pin Cargo.lock in production,
# you can update only the affected dependencies:
cargo update -p libc -p getrandom
```

In short: **Rust is not to blame**, it is just that some projects have not touched their dependencies in a long time. I actually think this is a healthy "nudge": fewer artifacts of the past, more honest compatibility.

---

### Global allocators can now use TLS and `thread::current()`

I simply like this change from an elegance perspective.

Previously, if you wrote your own `#[global_allocator]`, you had to be very careful about what you call inside `alloc` and `dealloc`. The problem was that many parts of the standard library can allocate memory themselves, and if your allocator tries to use, say, `thread_local!`, you get a closed loop:

> allocator -> TLS -> allocation -> allocator -> recursion -> panic (or worse)

Now the Rust team has reworked parts of `std` so that some key APIs (specifically `thread_local!` and `std::thread::current()`) can fall back to the system allocator in critical places, avoiding recursion. This means you can write more complex and convenient allocators using familiar tools.

Let's look at a practical example. Imagine you want to write a profiling allocator that tracks allocations per thread:

```rust
use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};

// Before Rust 1.93, this could trigger recursion and panic
struct ProfilingAllocator;

// Thread-local counters for each thread
thread_local! {
    static ALLOCATIONS: AtomicUsize = AtomicUsize::new(0);
    static DEALLOCATIONS: AtomicUsize = AtomicUsize::new(0);
    static BYTES_ALLOCATED: AtomicUsize = AtomicUsize::new(0);
}

unsafe impl GlobalAlloc for ProfilingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        // Now this is safe! In Rust 1.93+ thread_local!
        // will not recurse into the allocator
        ALLOCATIONS.with(|count| {
            count.fetch_add(1, Ordering::Relaxed);
        });
        BYTES_ALLOCATED.with(|bytes| {
            bytes.fetch_add(layout.size(), Ordering::Relaxed);
        });
        // Delegate the actual allocation to the system allocator
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

// Function to get stats for the current thread
pub fn get_thread_stats() -> (usize, usize, usize) {
    let allocs = ALLOCATIONS.with(|c| c.load(Ordering::Relaxed));
    let deallocs = DEALLOCATIONS.with(|c| c.load(Ordering::Relaxed));
    let bytes = BYTES_ALLOCATED.with(|c| c.load(Ordering::Relaxed));
    (allocs, deallocs, bytes)
}

fn main() {
    // Make a few allocations
    let _vec1 = vec![1, 2, 3, 4, 5];
    let _vec2 = vec!["hello", "world"];
    let (allocs, deallocs, bytes) = get_thread_stats();
    println!(
        "Main thread: {} allocations, {} deallocations, {} bytes",
        allocs, deallocs, bytes
    );
    // Spawn a new thread
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

Previously, this code was dangerous because `thread_local!` could try to allocate memory for TLS initialization, which would call our allocator, which would try to access `thread_local!` again - and so on until stack overflow. Now the standard library is smart enough to avoid this trap.

And here is another example - an allocator that captures per-thread context (for leak hunting). I am intentionally doing this "softly": not as a full leak detector, but as convenient tracing.

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
            // In Rust 1.93+ you can safely get thread info
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

To me, this shows the maturity of the language - the Rust team is gradually lifting restrictions that used to feel fundamental. The docs used to simply say "do not use `std` in allocators", now there are concrete guarantees about what is allowed and what is not.

**Who benefits:** developers of low-level libraries, memory profilers, custom allocators for embedded. If you are a typical application developer, you probably will not notice this change directly, but it improves the ecosystem overall.

---

### `#[cfg(...)]` on individual lines inside `asm!`

This feature looks small, but if you have ever written low-level code with conditional compilation of inline assembly, you will understand why it is great.

Previously, if you needed to include or exclude a single assembly line depending on a target feature, you had to duplicate the entire `asm!` block. That is painful: code gets bulky, harder to read, and even harder to maintain.

In Rust 1.93+ you can do it much more elegantly - just mark the individual lines that differ:

```rust
use std::arch::asm;

/// Copies data using available SIMD instructions
#[cfg(target_arch = "x86_64")]
pub unsafe fn fast_memcpy(dst: *mut u8, src: *const u8, len: usize) {
    asm!(
        // Common logic
        "mov {tmp}, {len}",
        // AVX2 path (process 32 bytes)
        #[cfg(target_feature = "avx2")]
        "shr {tmp}, 5",
        // SSE2 path (process 16 bytes)
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "shr {tmp}, 4",
        // Check if there is anything to copy
        "test {tmp}, {tmp}",
        "jz 2f",
        "1:",
        // AVX2: copy 32 bytes
        #[cfg(target_feature = "avx2")]
        "vmovdqu ymm0, [{src}]",
        #[cfg(target_feature = "avx2")]
        "vmovdqu [{dst}], ymm0",
        #[cfg(target_feature = "avx2")]
        "add {src}, 32",
        #[cfg(target_feature = "avx2")]
        "add {dst}, 32",
        // SSE2: copy 16 bytes
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "movdqu xmm0, [{src}]",
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "movdqu [{dst}], xmm0",
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "add {src}, 16",
        #[cfg(all(not(target_feature = "avx2"), target_feature = "sse2"))]
        "add {dst}, 16",
        // Common loop logic
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

See how much more readable it is? Instead of duplicating 90% of the code between different cfg variants, we just mark the lines that differ. This makes the code much easier to maintain and understand.

**Who benefits:** people who write Rust code with inline assembly - drivers, cryptographic libraries, SIMD optimizations. If you never use `asm!`, this will not affect you, but those who do will appreciate it.

---

## Migration changes: what might break

Now for the things that may require your attention when upgrading. I will highlight the most important points in a "before -> after" format to make it clear, and show concrete examples.

### `BTreeMap::append` and `BTreeSet::append` no longer update existing keys

This behavior change can be surprising if you relied on the old semantics.

```rust
use std::collections::BTreeMap;

fn main() {
    let mut map1 = BTreeMap::new();
    map1.insert("key1", "old_value_1");
    map1.insert("key2", "old_value_2");
    let mut map2 = BTreeMap::new();
    map2.insert("key2", "new_value_2"); // Conflicting key
    map2.insert("key3", "value_3");     // New key
    map1.append(&mut map2);
    // BEFORE Rust 1.93:
    // map1["key2"] became "new_value_2" (overwrite)
    // AFTER Rust 1.93:
    // map1["key2"] stays "old_value_2" (no overwrite)
    println!("key1: {}", map1["key1"]);
    println!("key2: {}", map1["key2"]);
    println!("key3: {}", map1["key3"]);
    // map2 now contains only the elements that were not added:
    println!("map2 remaining: {:?}", map2); // {"key2": "new_value_2"}
}
```

If you need the old behavior (merge with overwrite), use `extend()`:

```rust
use std::collections::BTreeMap;

fn main() {
    let mut map1 = BTreeMap::new();
    map1.insert("key1", "old_value_1");
    map1.insert("key2", "old_value_2");
    let mut map2 = BTreeMap::new();
    map2.insert("key2", "new_value_2");
    map2.insert("key3", "value_3");
    // extend overwrites existing keys
    map1.extend(map2);
    println!("key2: {}", map1["key2"]); // "new_value_2"
}
```

Or, if you need fine-grained control - use the `entry` API:

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

**My take:** if you explicitly used `append` as a "fast merge with overwrite", then yes - this can be a surprise. But overall the new behavior seems more logical: append as "move in what is missing" without unexpected overwrites.

---

### Emscripten + `panic=unwind`: new ABI for stack unwinding

If you compile Rust to WebAssembly via Emscripten and use unwinding (stack unwinding on panic), you now need to update the build settings for your C/C++ code.

* **Before:** JS exception handling ABI.
* **After:** wasm exception handling ABI.

If you link Rust with C/C++ object files, the C/C++ part must be built/linked with `-fwasm-exceptions`.

Example in `build.rs` via the `cc` crate:

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

I would put it this way: if you are in this zone (Emscripten + unwind + C/C++), you are already used to the fact that "there is always a nuance". This is just a new one.

---

### `#[test]` in odd places is now an error

Previously, the compiler was more lenient and could silently ignore `#[test]` in inappropriate places. Now it is an error:

```rust
// This is now an ERROR in Rust 1.93+
struct MyStruct {
    #[test] // not allowed on fields
    field: i32,
}

// CORRECT usage of #[test]:
#[cfg(test)]
mod tests {
    #[test]
    fn test_mystruct() {
        assert!(true);
    }
}
```

I think this is good. Less "magic", more explicit rules.

---

### Cargo sets `CARGO_CFG_DEBUG_ASSERTIONS` more often

This change can surface bugs in older dependencies that handled debug assertions incorrectly. A known example is issues with `static-init` 1.0.1-1.0.3.

The solution is usually simple:

```bash
cargo update
# or targeted
cargo update -p static-init
```

If for some reason you cannot update the dependency, there are temporary workarounds at the profile level, but I honestly would not recommend overusing them.

---

### `-Cjump-tables=bool` instead of `-Zno-jump-tables`

If you used the nightly flag `-Zno-jump-tables`, it is now stabilized:

```bash
# Before (nightly)
RUSTFLAGS="-Zno-jump-tables" cargo +nightly build

# Now (stable)
RUSTFLAGS="-Cjump-tables=false" cargo build
```

For the embedded world, this can be genuinely useful: sometimes jump tables are undesirable because of execution predictability or memory characteristics.

---

### `deref_nullptr` is now deny-by-default

This lint now turns into a compilation error:

```rust
fn dangerous_function() {
    let ptr: *const i32 = std::ptr::null();
    // now an error
    let value = unsafe { *ptr };
    println!("{}", value);
}
```

In my view, this is exactly the kind of tightening that is useful for most projects: if something actually dereferences null, it is better to find out at compile time.

---

## Stabilized APIs: "small but nice"

Rust 1.93.0 stabilized quite a few useful methods. I will not try to turn this into a second reference manual, but some of these are genuinely nice to see on stable.

### `Vec::into_raw_parts` and `String::into_raw_parts`

Now you can carefully split a `Vec`/`String` into its parts (ptr/len/cap) - handy for FFI and manual memory management.

```rust
fn take_vec(v: Vec<u8>) -> (*mut u8, usize, usize) {
    let (ptr, len, cap) = v.into_raw_parts();
    (ptr, len, cap)
}

unsafe fn give_back(ptr: *mut u8, len: usize, cap: usize) -> Vec<u8> {
    Vec::from_raw_parts(ptr, len, cap)
}
```

### Methods for `MaybeUninit`

They simplify work with uninitialized memory (and reduce the number of "reinvented wheels" in low-level code):

* `assume_init_ref`, `assume_init_mut`, `assume_init_drop`
* `write_copy_of_slice`, `write_clone_of_slice`

### Slice -> array

This is really handy for parsing binary formats and protocols:

```rust
fn parse_magic(data: &[u8]) -> Option<[u8; 4]> {
    data.get(0..4)?.as_array::<4>().copied()
}
```

### `VecDeque::pop_front_if` / `pop_back_if`

A small but nice thing: conditionally "pop if it matches".

### `std::fmt::from_fn`

You can build a "formattable object" on the fly without creating intermediate strings - useful for logging and debugging.

I would say this: some of these stabilizations are niche, but taken together they make the standard library a bit more "grown up".

---

## Short upgrade checklist

If you decide to move to Rust 1.93.0, here is what I recommend you check:

**If you use musl targets:**

```bash
cargo update
cargo build --target x86_64-unknown-linux-musl --release
# Check for linking errors about *64 symbols
```

**If you link Rust with C/C++ on Emscripten with `panic=unwind`:**

```bash
# In build.rs or build scripts, add:
# -fwasm-exceptions
```

**If you use `BTreeMap::append` / `BTreeSet::append`:**

* check that the code does not rely on overwriting;
* if overwrite is needed - use `extend()`.

**Check `#[test]` attributes:**

* they must be where they are actually tests (`cfg(test)` modules).

**If builds fail because of old dependencies:**

```bash
cargo update
# or targeted
cargo update -p problematic-crate
```

**If you used `-Zno-jump-tables` on nightly:**

* replace it with `-Cjump-tables=false`.

**Check errors for `deref_nullptr`:**

* fix null pointer dereferences (if any).

---

## If you use musl, read this twice

I want to emphasize again for those who actively use musl targets: the update to musl 1.2.5 is a double-edged sword.

On one hand, you get a better DNS resolver and other improvements. On the other hand, if you do not update your dependencies, you may run into linking problems.

Here is my more "practical" plan without extra drama:

```bash
# Create a test branch
git checkout -b test-rust-1.93

# Update Rust
rustup update stable

# Update dependencies
cargo update

# Build a musl release
cargo build --target x86_64-unknown-linux-musl --release

# If linking complains about open64/fopen64/lseek64
# - find who brings the old stuff and update it directly
cargo tree | rg "(libc|getrandom|your_suspect)"

# Check static linking
ldd target/x86_64-unknown-linux-musl/release/your-app
# Should be: "not a dynamic executable"
```

My advice: before updating production projects, do a test build on CI with the new Rust version. If linking fails, it is usually fixed by updating a couple of dependencies.

---

## Conclusion: pros, cons, and who this is for

To be honest, Rust 1.93.0 left me with a feeling of "everything is calm, but better".

### Pros

* **musl 1.2.5**: static binaries become more reliable, especially if the app uses the network and you do not want DNS surprises.
* **allocators**: feels like lifting a long-standing restriction - there is more room for quality tools (profilers, trackers, specialized allocators).
* **`cfg` inside `asm!`**: a small feature that saves you nerves and lines of code if you occasionally live in inline assembly.
* **stabilized APIs**: not "wow", but a very useful everyday set for those who write low-level things.

### Cons / risks

* **musl can break linking** if the project has not updated dependencies in a long time. This is not a disaster, but an unpleasant surprise if you update Rust "head on" and expect everything to work as before.
* a few behavior changes (like `BTreeMap::append`) can bite only if you *really relied on it*.

### Who should update right now

* those who deploy **musl-static** binaries (especially with networking) - you get improvements and likely without pain (if dependencies are alive);
* those who write **low-level** libraries, profile memory, play with allocators - real new possibilities here;
* those who have **asm!** and lots of conditional compilation - it will be simpler and cleaner.

### Who can wait

* if you are a typical application developer and your project does not depend on musl/asm/allocators - you can calmly upgrade on schedule when CI and dependencies are ready.

And you know what? I like this type of release. It does not try to shock, but it steadily moves the ecosystem forward. Looks good.
