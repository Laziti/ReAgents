#!/bin/bash

# Script to set R2 secrets for Supabase Edge Function
# Make sure you have Supabase CLI installed and are linked to your project

echo "Setting R2 secrets for Supabase Edge Function..."
echo ""

# Set R2 Endpoint
supabase secrets set R2_ENDPOINT=https://6d4e08f14f0c475766e828c85ac7bf6b.r2.cloudflarestorage.com
echo "✅ R2_ENDPOINT set"

# Set R2 Access Key ID
supabase secrets set R2_ACCESS_KEY_ID=6d057413d3cf93f0d75dae385585fcaa
echo "✅ R2_ACCESS_KEY_ID set"

# Set R2 Secret Access Key
supabase secrets set R2_SECRET_ACCESS_KEY=eef0b1e6b1cb2c05cf65f7a724e041af49e25428dedf68828118053fa9539951
echo "✅ R2_SECRET_ACCESS_KEY set"

# Set R2 Public URL
supabase secrets set R2_PUBLIC_URL=https://pub-1d96abbfacad43b0b45486bb96acbf7e.r2.dev
echo "✅ R2_PUBLIC_URL set"

# Prompt for bucket name
echo ""
read -p "Enter your R2 bucket name: " BUCKET_NAME
if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Bucket name is required!"
    exit 1
fi

supabase secrets set R2_BUCKET=$BUCKET_NAME
echo "✅ R2_BUCKET set to: $BUCKET_NAME"

echo ""
echo "🎉 All R2 secrets have been set successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy the Edge Function: supabase functions deploy upload-to-r2"
echo "2. Test the upload functionality in your application"




