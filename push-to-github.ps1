# GitHub Push Script
# This script will help you push to GitHub using a Personal Access Token

Write-Host "GitHub Push Helper" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host ""

# Check if token is provided as argument
if ($args.Count -gt 0) {
    $token = $args[0]
} else {
    Write-Host "To push to GitHub, you need a Personal Access Token (PAT)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To create a PAT:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://github.com/settings/tokens/new" -ForegroundColor White
    Write-Host "2. Give it a name (e.g., 'ReAgents Push Token')" -ForegroundColor White
    Write-Host "3. Select expiration (recommended: 90 days or No expiration)" -ForegroundColor White
    Write-Host "4. Check the 'repo' scope (all repository permissions)" -ForegroundColor White
    Write-Host "5. Click 'Generate token'" -ForegroundColor White
    Write-Host "6. Copy the token (you won't see it again!)" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script with your token:" -ForegroundColor Cyan
    Write-Host "  .\push-to-github.ps1 YOUR_TOKEN_HERE" -ForegroundColor White
    Write-Host ""
    Write-Host "Or enter your token now:" -ForegroundColor Yellow
    $token = Read-Host -Prompt "Enter your GitHub Personal Access Token" -AsSecureString
    $token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))
}

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Error: Token is required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting up remote URL with token..." -ForegroundColor Yellow

# Update remote URL with token
$remoteUrl = "https://laziti:$token@github.com/Laziti/ReAgents.git"
git remote set-url origin $remoteUrl

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host ""

# Push to GitHub
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
    
    # Remove token from remote URL for security
    Write-Host "Cleaning up remote URL (removing token)..." -ForegroundColor Yellow
    git remote set-url origin https://github.com/Laziti/ReAgents.git
    Write-Host "Done!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Push failed. Please check your token and try again." -ForegroundColor Red
    Write-Host "Make sure your token has 'repo' permissions." -ForegroundColor Yellow
}


