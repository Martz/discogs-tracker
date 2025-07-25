#!/bin/bash

# Build script for discogs-tracker (both Rust and TypeScript versions)

set -e

echo "Building Discogs Price Tracker..."

# Build Rust version (recommended)
echo "Building Rust version..."
cargo build --release
echo "✓ Rust build completed"

# Build TypeScript version
echo "Building TypeScript version..."
if [ -f "package.json" ]; then
    npm run build
    echo "✓ TypeScript build completed"
else
    echo "⚠ package.json not found, skipping TypeScript build"
fi

echo ""
echo "Build completed! You can now use:"
echo "  Rust binary: ./target/release/discogs-tracker"
echo "  TypeScript:   npm start or node dist/cli.js"
echo ""
echo "To install globally:"
echo "  Rust: cargo install --path ."
echo "  TypeScript: npm link"