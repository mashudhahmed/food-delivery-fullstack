#!/bin/bash
# Render build script for QuickBite Backend
# This script handles the complete build process for Render deployment

set -e  # Exit on error

echo "🚀 Starting Render build process..."
echo "=========================================="
echo "Current directory: $(pwd)"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "=========================================="

# Set NODE_ENV to development temporarily to install dev dependencies
export NODE_ENV=development

# Clean npm cache to avoid issues
echo "🧹 Cleaning npm cache..."
npm cache clean --force || true

echo "📦 Installing dependencies..."
echo "=========================================="

# Install dependencies with all necessary flags
npm install \
  --include=dev \
  --legacy-peer-deps \
  --no-audit \
  --no-fund \
  --prefer-offline

# Ensure NestJS CLI is installed (critical for build)
echo "=========================================="
echo "🔍 Ensuring NestJS CLI is installed..."

# Check if NestJS CLI exists, install if missing
if [ ! -f "node_modules/@nestjs/cli/bin/nest.js" ]; then
  echo "⚠️  NestJS CLI not found, installing explicitly..."
  npm install --save-dev @nestjs/cli --legacy-peer-deps
fi

# Verify NestJS CLI is now available
if [ -f "node_modules/@nestjs/cli/bin/nest.js" ]; then
  echo "✅ NestJS CLI installed successfully"
  echo "   Version: $(node node_modules/@nestjs/cli/bin/nest.js --version 2>/dev/null || echo 'unknown')"
else
  echo "❌ NestJS CLI installation failed!"
  exit 1
fi

# Show installed NestJS packages
echo "=========================================="
echo "📦 Installed NestJS packages:"
npm list @nestjs/cli @nestjs/common @nestjs/core --depth=0 || true

echo "=========================================="
echo "🏗️ Building the application..."

# Build using the NestJS CLI
node node_modules/@nestjs/cli/bin/nest.js build

# Verify build succeeded
echo "=========================================="
echo "🔍 Verifying build output..."

if [ -d "dist" ]; then
  echo "✅ Build completed successfully!"
  echo "📁 dist/ directory contents:"
  ls -la dist/
  
  # Check if main.js exists
  if [ -f "dist/main.js" ]; then
    echo "✅ dist/main.js found - Build is valid"
    BUILD_STATUS="success"
  else
    echo "❌ dist/main.js not found - Build may be incomplete"
    BUILD_STATUS="failed"
  fi
else
  echo "❌ Build failed - dist/ directory not created"
  BUILD_STATUS="failed"
fi

echo "=========================================="

if [ "$BUILD_STATUS" = "success" ]; then
  echo "✅ Build completed successfully!"
  exit 0
else
  echo "❌ Build failed!"
  exit 1
fi