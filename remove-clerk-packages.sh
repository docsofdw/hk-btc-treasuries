#!/bin/bash
# Remove Clerk packages that are no longer needed

echo "🗑️  Removing Clerk authentication packages..."
npm uninstall @clerk/backend @clerk/nextjs @clerk/themes

echo ""
echo "✅ Clerk packages removed!"
echo ""
echo "📦 Stripe package kept for future use (currently commented out)"
echo ""
echo "Run 'npm install' if you need to clean up package-lock.json"
