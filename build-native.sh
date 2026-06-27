#!/bin/bash
# OmniReader - Cross-platform build script
# Builds the native runner for Linux, macOS, and Windows

set -e

APP_NAME="omnireader"
VERSION="2.0.0"
BUILD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
DIST_DIR="$BUILD_DIR/dist-native"

echo "🔨 Building OmniReader v$VERSION native runner..."

# Clean previous builds
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Build web assets first
echo "📦 Building web assets..."
cd "$BUILD_DIR"
npm run build

# Copy web assets to Go embed directory
echo "📋 Copying web assets to embed directory..."
rm -rf "$BUILD_DIR/cmd/omnireader/web/dist"
mkdir -p "$BUILD_DIR/cmd/omnireader/web/dist"
cp -r "$BUILD_DIR/dist/"* "$BUILD_DIR/cmd/omnireader/web/dist/"

# Function to build for a target
build_target() {
    local GOOS=$1
    local GOARCH=$2
    local EXT=$3
    local OUTPUT="$DIST_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}${EXT}"

    echo "🏗️  Building for $GOOS/$GOARCH..."

    CGO_ENABLED=0 GOOS=$GOOS GOARCH=$GOARCH go build \
        -ldflags="-s -w -X main.AppVersion=$VERSION" \
        -o "$OUTPUT" \
        "$BUILD_DIR/cmd/omnireader"

    if [ $? -eq 0 ]; then
        echo "✅ Built: $OUTPUT"
        # Create archive
        cd "$DIST_DIR"
        if [[ "$GOOS" == "windows" ]]; then
            zip "${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.zip" "$(basename "$OUTPUT")"
        else
            tar -czf "${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.tar.gz" "$(basename "$OUTPUT")"
        fi
        cd - > /dev/null
    else
        echo "❌ Failed to build for $GOOS/$GOARCH"
        exit 1
    fi
}

# Build for all platforms
echo "🌍 Building for all platforms..."

# Linux
build_target "linux" "amd64" ""
build_target "linux" "arm64" ""

# macOS
build_target "darwin" "amd64" ""
build_target "darwin" "arm64" ""

# Windows
build_target "windows" "amd64" ".exe"
build_target "windows" "arm64" ".exe"

# Also build for current platform as default
CGO_ENABLED=0 go build -ldflags="-s -w -X main.AppVersion=$VERSION" -o "$DIST_DIR/omnireader" "$BUILD_DIR/cmd/omnireader"

echo ""
echo "✅ Build complete!"
echo "📦 Artifacts in: $DIST_DIR"
ls -la "$DIST_DIR"