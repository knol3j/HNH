@echo off
echo ========================================
echo    HashNHedge - INSTANT DEPLOYMENT
echo ========================================
echo.

echo Choose your deployment option:
echo.
echo 1. VERCEL (Recommended - Free, Fast)
echo 2. NETLIFY (Drag & Drop Easy)
echo 3. RAILWAY (Full Backend)
echo 4. GitHub Pages (Static only)
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto vercel
if "%choice%"=="2" goto netlify
if "%choice%"=="3" goto railway
if "%choice%"=="4" goto github
goto invalid

:vercel
echo.
echo Installing Vercel CLI...
call npm install -g vercel
echo.
echo Deploying to Vercel...
echo Follow the prompts:
echo - Login to Vercel
echo - Project name: hashnhedge
echo - Framework: Other
echo.
call vercel --prod
echo.
echo ✅ DEPLOYED! Your site is now live!
goto end

:netlify
echo.
echo Installing Netlify CLI...
call npm install -g netlify-cli
echo.
echo Deploying to Netlify...
call netlify deploy --prod --dir .
echo.
echo ✅ DEPLOYED! Your site is now live!
goto end

:railway
echo.
echo Installing Railway CLI...
call npm install -g @railway/cli
echo.
echo Deploying to Railway...
call railway login
call railway deploy
echo.
echo ✅ DEPLOYED! Your site is now live!
goto end

:github
echo.
echo For GitHub Pages:
echo 1. Push your code to GitHub
echo 2. Go to Settings > Pages
echo 3. Select main branch
echo 4. Your site will be live!
goto end

:invalid
echo Invalid choice. Please run again and choose 1-4.
goto end

:end
echo.
echo ========================================
echo     DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Next steps:
echo 1. Buy a custom domain (hashnhedge.com)
echo 2. Point domain to your hosting
echo 3. Enable SSL (automatic with most hosts)
echo 4. Launch your token!
echo.
pause