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

# Verify installation
echo "=========================================="
echo "🔍 Verifying dependencies..."

# Check if NestJS CLI is installed
if [ -f "node_modules/.bin/nest" ]; then
  echo "✅ NestJS CLI found at: node_modules/.bin/nest"
  NEST_VERSION=$(node_modules/.bin/nest --version 2>/dev/null || echo "unknown")
  echo "   Version: $NEST_VERSION"
elif [ -f "node_modules/@nestjs/cli/bin/nest.js" ]; then
  echo "✅ NestJS CLI found at: node_modules/@nestjs/cli/bin/nest.js"
  NEST_VERSION=$(node node_modules/@nestjs/cli/bin/nest.js --version 2>/dev/null || echo "unknown")
  echo "   Version: $NEST_VERSION"
else
  echo "⚠️  NestJS CLI not found, installing explicitly..."
  npm install --include=dev --legacy-peer-deps @nestjs/cli
fi

# Show installed NestJS packages
echo "=========================================="
echo "📦 Installed NestJS packages:"
npm list @nestjs/cli @nestjs/common @nestjs/core --depth=0 || true

echo "=========================================="
echo "🏗️ Building the application..."

# Try multiple methods to build
if command -v node_modules/.bin/nest &> /dev/null; then
  echo "Method 1: Using node_modules/.bin/nest"
  node_modules/.bin/nest build
elif [ -f "node_modules/@nestjs/cli/bin/nest.js" ]; then
  echo "Method 2: Using node_modules/@nestjs/cli/bin/nest.js"
  node node_modules/@nestjs/cli/bin/nest.js build
else
  echo "Method 3: Using npx nest"
  npx nest build
fi

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