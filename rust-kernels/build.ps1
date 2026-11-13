$ErrorActionPreference = 'Stop'
# Prerequisite: rustup target add wasm32-unknown-unknown
$rustProject = $PSScriptRoot
& cargo build --manifest-path (Join-Path $rustProject 'Cargo.toml') --release --target wasm32-unknown-unknown
if ($LASTEXITCODE -ne 0) { throw 'Rust build failed' }
$wasmOutput = Join-Path $rustProject '../extension/wasm'
New-Item -ItemType Directory -Force -Path $wasmOutput | Out-Null
Copy-Item -LiteralPath (Join-Path $rustProject 'target/wasm32-unknown-unknown/release/rc_kernels.wasm') -Destination (Join-Path $wasmOutput 'rc_kernels.wasm')
