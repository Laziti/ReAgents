# PowerShell script to set R2 secrets for Supabase Edge Function
# Make sure you have Supabase CLI installed and are linked to your project

Write-Host "Setting R2 secrets for Supabase Edge Function..." -ForegroundColor Cyan
Write-Host ""

# Set R2 Endpoint
supabase secrets set R2_ENDPOINT=https://6d4e08f14f0c475766e828c85ac7bf6b.r2.cloudflarestorage.com
Write-Host "✅ R2_ENDPOINT set" -ForegroundColor Green

# Set R2 Access Key ID
supabase secrets set R2_ACCESS_KEY_ID=6d057413d3cf93f0d75dae385585fcaa
Write-Host "✅ R2_ACCESS_KEY_ID set" -ForegroundColor Green

# Set R2 Secret Access Key
supabase secrets set R2_SECRET_ACCESS_KEY=eef0b1e6b1cb2c05cf65f7a724e041af49e25428dedf68828118053fa9539951
Write-Host "✅ R2_SECRET_ACCESS_KEY set" -ForegroundColor Green

# Set R2 Public URL
supabase secrets set R2_PUBLIC_URL=https://pub-1d96abbfacad43b0b45486bb96acbf7e.r2.dev
Write-Host "✅ R2_PUBLIC_URL set" -ForegroundColor Green

# Set R2 Bucket Name
supabase secrets set R2_BUCKET=re-agents
Write-Host "✅ R2_BUCKET set to: re-agents" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 All R2 secrets have been set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy the Edge Function: supabase functions deploy upload-to-r2"
Write-Host "2. Test the upload functionality in your application"

