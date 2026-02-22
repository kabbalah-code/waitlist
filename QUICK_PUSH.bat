@echo off
echo ========================================
echo Git Push Script - Vercel Build Fix
echo ========================================
echo.

echo Step 1: Checking git status...
git status
echo.

echo Step 2: Adding files...
git add next.config.mjs .vercelignore vercel.json .npmrc VERCEL_BUILD_FIX.md DEPLOY_COMMANDS_RU.md QUICK_PUSH.bat
echo.

echo Step 3: Committing changes...
git commit -m "fix: resolve Vercel build errors with WalletConnect test files"
echo.

echo Step 4: Pushing to GitHub...
git push origin main
echo.

echo ========================================
echo Done! Check Vercel dashboard for build status
echo https://vercel.com/dashboard
echo ========================================
pause
