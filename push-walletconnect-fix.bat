@echo off
echo ========================================
echo Pushing WalletConnect Fix to GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Adding files...
git add lib/web3/config.ts vercel.json

echo [2/4] Committing...
git commit -m "Fix: WalletConnect modal - show all wallets, not just MetaMask"

echo [3/4] Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Done! Wait 2-3 minutes for Vercel deploy
echo ========================================
echo.
echo Check deployment: https://vercel.com/dashboard
echo.
pause
