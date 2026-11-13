# Rust pixel kernels

`rc_kernels.wasm` was built from `rust-kernels/src/lib.rs` with Rust 1.99.1,
target `wasm32-unknown-unknown`, edition 2021, cdylib, opt-level=3, LTO,
panic=abort and stripped symbols. No crates or wasm-bindgen are required.

The module exports reusable byte buffers, result-buffer accessors and four
synchronous pixel functions: preprocess, figures, strips and palette. All
callbacks, rendering, Tesseract scheduling and browser APIs remain outside Rust.

Rust's bundled standard-library licenses are included alongside the module.
For a standard installed target, `rust-kernels/build.ps1` rebuilds the binary.
