---
title: "Go 1.26: What's New and Why It Matters to You"
description: "A clear overview of Go 1.26: how the new garbage collector speeds up your app, an improved go fix, and practical examples of new capabilities."
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
lang: en
---

On **February 10, 2026**, the Go team released version 1.26. This is a regular six‑month update, but it comes with noticeable improvements that make daily work easier. Let’s break down what changed and how to use it in practice.

---

## Key things to know

- **Your programs get faster**: the Green Tea garbage collector is enabled by default, cutting pauses by about 10–40%.
- **Less boilerplate**: you can now write `new(int64(300))` instead of creating temporary variables.
- **Automatic code modernization**: the revamped `go fix` can update your code for new APIs.
- **Safer cryptography by default**: crypto packages choose a secure random source automatically.
- **cgo is about 30% faster** if you call C libraries.

---

## Language changes: write less, do more

### `new` now accepts expressions

**Used to be awkward:**

```go
// To get a pointer to 300 you needed a temporary variable
temp := int64(300)
ptr := &temp
```

**Now it’s simple:**

```go
// Create a pointer to 300 directly
ptr := new(int64(300))
```

**Where is this useful?** In APIs where optional fields are represented as pointers:

```go
type User struct {
    Name    string
    // optional field
    Age     *int
    // optional field
    Premium *bool
}

// Before
age := 25
premium := true
user := User{
    Name:    "Makoto",
    Age:     &age,
    Premium: &premium,
}

// Now
user := User{
    Name:    "Makoto",
    Age:     new(int(25)),
    Premium: new(bool(true)),
}
```

### Generics: self‑referential types

If you are new to generics, you can skip this section. But if you ran into the limitation “a type cannot refer to itself in its own type parameters”, that restriction is gone:

```go
// This is now valid
type Adder[A Adder[A]] interface {
    Add(A) A
}
```

This is useful for advanced patterns where a type is constrained to operate on itself.

---

## Tooling: automation for routine work

### `go fix` can modernize code now

Imagine a library you use changed its API. Before, you had to find and rewrite all call sites manually.

**Now `go fix` can do it for you:**

```go
// Old API (marked for replacement)
//go:fix inline
func OldCalculate(x, y int) int {
    return NewCalculate(x, y)
}

// Run: go fix ./...
// All calls to OldCalculate will be replaced with NewCalculate
```

**Practical example:**

```go
// Before go fix
result := legacy.Join([]string{"a", "b"}, ",")
// After go fix (if the library provided a migration rule)
result := modern.Join([]string{"a", "b"}, ",")
```

### New `go.mod` files use `go 1.25.0`

When you run `go mod init`, Go 1.26 now writes `go 1.(N-1).0` instead of the current version. This keeps new modules compatible with the previous Go release out of the box.

### `pprof -http` opens flame graph first

If you run `go tool pprof -http=:8080 profile.pb.gz`, the UI now starts on a flame graph view (more convenient for analysis). The call graph view is still available in the menu.

---

## Performance: faster and more efficient

### Green Tea GC is default

**What does this mean for you?**

If your app allocates a lot (web servers, data processing, APIs), GC pauses are now about **10–40% shorter**. This improves latency stability and user experience.

**How to check if it helps your app?**

```bash
GODEBUG=gctrace=1 ./your-app
```

You will see output like:

```
gc 1 @0.005s 2%: 0.018+1.2+0.002 ms clock, ...
```

The millisecond timings should be lower compared to Go 1.25.

**Need to roll back for debugging?**

```bash
GOEXPERIMENT=nogreenteagc go run main.go
```

### cgo calls are ~30% faster

If you use C libraries via cgo (databases, graphics, system APIs), the overhead of Go↔C transitions dropped by about one third.

**Example:**

```go
// #include <stdlib.h>
// #include <string.h>
import "C"

// C.malloc, C.strlen are now faster
ptr := C.malloc(1024)
```

### Heap address randomization

On 64‑bit systems, heap addresses are randomized at program start. This makes memory‑address prediction attacks harder. For most developers, it’s invisible but improves security.

---

## Standard library: what changed

### Cryptography: safer defaults

**Important change for tests!**

Previously you could pass your own randomness source for deterministic tests:

```go
// This no longer works as expected
customRand := rand.New(rand.NewSource(42))
// customRand is ignored
rsa.GenerateKey(customRand, 2048)
```

**How to write tests now:**

```go
import "testing/cryptotest"
import crand "crypto/rand"

func TestMyEncryption(t *testing.T) {
    // Set deterministic randomness for all crypto functions
    cryptotest.SetGlobalRandom(t, 12345)
    // Tests become reproducible again
    key, _ := rsa.GenerateKey(crand.Reader, 2048)
}
```

**Temporary fallback for older tests:**

```bash
GODEBUG=cryptocustomrand=1 go test ./...
```

### New package `crypto/hpke`

HPKE (Hybrid Public Key Encryption) support was added, including post‑quantum hybrid KEM. This is useful for modern secure protocols.

```go
import "crypto/hpke"

// Example usage (simplified)
sender, _ := hpke.SetupSender(...)
ciphertext := sender.Seal(plaintext)
```

### `image/jpeg` has a new implementation

The JPEG codec was rewritten to be faster and more accurate. If you compare JPEG output byte‑for‑byte in tests, you may need to update golden files.

### `io.ReadAll` is faster

If you read files or HTTP responses entirely, this now runs faster with fewer allocations:

```go
resp, _ := http.Get("https://api.example.com/data")
// faster and more efficient
body, _ := io.ReadAll(resp.Body)
```

### `net/http`: a safer reverse proxy API

If you use `httputil.ReverseProxy`, there is an important change:

```go
// OLD approach (deprecated)
proxy := &httputil.ReverseProxy{
    Director: func(req *http.Request) {
        req.URL.Scheme = "https"
        req.URL.Host = "backend.example.com"
    },
}

// NEW, safer approach
proxy := &httputil.ReverseProxy{
    Rewrite: func(r *httputil.ProxyRequest) {
        r.SetURL(targetURL)
        // proper hop-by-hop handling
        r.Out.Host = r.In.Host
    },
}
```

The old `Director` model is considered unsafe for hop‑by‑hop headers and will be removed in the future.

---

## Platforms and compatibility

### macOS users

**Go 1.26 is the last version that supports macOS 12 Monterey.** If you are on Monterey, plan to upgrade to macOS 13+ before moving to Go 1.27.

### Windows ARM (32‑bit) removed

If you used `windows/arm` (not `windows/arm64`), this port is no longer supported due to critical bugs.

### RISC‑V: race detector

If you target `linux/riscv64`, the race detector is now available:

```bash
go test -race ./...
```

---

## How to upgrade

**1. Download Go 1.26:**

```bash
# Linux/macOS
wget https://go.dev/dl/go1.26.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.26.linux-amd64.tar.gz
```

**2. Check the version:**

```bash
go version
# go version go1.26 linux/amd64
```

**3. Update dependencies:**

```bash
go get -u ./...
go mod tidy
```

**4. Run tests:**

```bash
go test ./...
```

**5. Check if changes are needed:**

If your crypto tests fail, add `cryptotest.SetGlobalRandom` or temporarily use `GODEBUG=cryptocustomrand=1`.

---

## Experimental features

For the curious:

### SIMD vectors (amd64)

```bash
GOEXPERIMENT=simd go run main.go
```

This enables low‑level SIMD vectors via `simd/archsimd`. The API is unstable and meant for experimentation.

### Safe zeroing of secrets

```bash
GOEXPERIMENT=runtimesecret go run main.go
```

The `runtime/secret` package helps securely wipe passwords and keys from memory (currently amd64/arm64 on Linux).

### Goroutine leak profiling

```bash
GOEXPERIMENT=goroutineleakprofile go run main.go
```

The experimental `goroutineleak` profiler helps find goroutines stuck forever on synchronization primitives. It does not replace deadlock detection, but is useful in large systems.

---

**It’s worth upgrading if:**

- Your app is GC‑heavy (web services, data processing) and you want a performance boost.
- You use C libraries via cgo and want lower overhead.
- You want to simplify code with `new(expr)` and automate migrations with `go fix`.

**What to check after upgrading:**

- Crypto tests may need `cryptotest.SetGlobalRandom`.
- JPEG golden files may need updates.
- `ReverseProxy.Director` should be migrated to `Rewrite`.

**Useful links:**

- [Official release notes](https://go.dev/doc/go1.26)
- [Go blog](https://go.dev/blog/)
- [Migration guide](https://go.dev/doc/go1.26#migration)
