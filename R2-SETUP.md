# R2 + Supabase Configuration Guide

## Setting Edge Function Secrets

You need to set these secrets in your Supabase project. The project ID is: `wixmnvdmcnlbiyxnfpfc`

### Option 1: Using Supabase CLI (Recommended)

If you have the Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref wixmnvdmcnlbiyxnfpfc

# Set the R2 secrets (replace with your actual credentials)
supabase secrets set R2_ENDPOINT=your-r2-endpoint-here
supabase secrets set R2_ACCESS_KEY_ID=your-access-key-id-here
supabase secrets set R2_SECRET_ACCESS_KEY=your-secret-access-key-here
supabase secrets set R2_BUCKET=your-bucket-name-here
supabase secrets set R2_PUBLIC_URL=your-public-url-here
```

### Option 2: Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **REA** (wixmnvdmcnlbiyxnfpfc)
3. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**
4. Add the following secrets:

| Secret Name | Value |
|------------|-------|
| `R2_ENDPOINT` | Your R2 endpoint URL |
| `R2_ACCESS_KEY_ID` | Your R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | Your R2 secret access key |
| `R2_BUCKET` | Your R2 bucket name |
| `R2_PUBLIC_URL` | Your R2 public URL |

### Option 3: Using Supabase Management API

You can also set secrets programmatically using the Supabase Management API with your access token.

## Deploy the Edge Function

After setting the secrets, deploy the Edge Function:

```bash
supabase functions deploy upload-to-r2
```

## Verify Configuration

To verify the secrets are set correctly:

```bash
supabase secrets list
```

You should see all 5 R2-related secrets listed.

## Important Notes

1. **Bucket Name**: You need to provide your R2 bucket name. If you haven't created a bucket yet:
   - Go to Cloudflare Dashboard → R2 → Create Bucket
   - Note the bucket name and use it in the `R2_BUCKET` secret

2. **Public URL**: The public URL is for development. For production, you may want to use a custom domain.

3. **Security**: ⚠️ **NEVER commit these secrets to version control.** They are stored securely in Supabase.

4. **Getting Your Credentials**:
   - Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens
   - Create a new API token with read/write permissions
   - Copy the Access Key ID and Secret Access Key
   - Get your bucket endpoint from R2 settings

## Testing the Upload

Once configured, test the upload by:
1. Starting your development server: `npm run dev`
2. Uploading a file through your application
3. Checking the R2 bucket to verify the file was uploaded

## Troubleshooting

If uploads fail:
1. Verify all secrets are set correctly
2. Check the Edge Function logs in Supabase Dashboard
3. Ensure your R2 bucket exists and is accessible
4. Verify the bucket name matches exactly (case-sensitive)
5. Check that your R2 API token has the correct permissions

