#!/bin/bash
# Render build script for QuickBite Backend

echo "🚀 Starting Render build process..."

# Set NODE_ENV to development temporarily to install dev dependencies
export NODE_ENV=development

echo "📦 Installing dependencies..."
npm install --include=dev

echo "🏗️ Building the application..."
npx nest build

echo "✅ Build completed successfully!"