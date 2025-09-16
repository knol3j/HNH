# HashNHedge Platform Installer
# Downloads and sets up the HashNHedge mining/security platform

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    HashNHedge Platform Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js first:" -ForegroundColor Red
    Write-Host "  https://nodejs.org/en/download/" -ForegroundColor Yellow
    exit 1
}

# Check if Git is installed
try {
    $gitVersion = git --version
    Write-Host "✓ Git detected: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git not found. Please install Git first:" -ForegroundColor Red
    Write-Host "  https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Downloading HashNHedge platform..." -ForegroundColor Yellow

# Create HashNHedge directory
$installDir = "$env:USERPROFILE\HashNHedge"
if (Test-Path $installDir) {
    Write-Host "Removing existing installation..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $installDir
}

# Clone the repository
try {
    git clone https://github.com/knol3j/HNH.git $installDir
    Set-Location $installDir
    Write-Host "✓ Repository cloned successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to clone repository" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Install npm dependencies
try {
    npm install
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Platform installed to: $installDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the platform:" -ForegroundColor Yellow
Write-Host "  cd $installDir" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "Or double-click: start-server.cmd" -ForegroundColor Yellow
Write-Host ""
Write-Host "Platform will be available at: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Default Solana wallet: GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc" -ForegroundColor Cyan
Write-Host ""
Write-Host "Visit: https://hashnhedge.com for live platform" -ForegroundColor Green