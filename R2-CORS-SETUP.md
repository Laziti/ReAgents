# R2 CORS Configuration

The images are uploaded successfully but won't display due to CORS restrictions. Follow these steps to enable CORS on your R2 bucket:

## Steps to Configure CORS

1. **Go to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com/
   - Select your account
   - Go to **R2** from the left sidebar

2. **Select Your Bucket**
   - Click on the `realestate` bucket

3. **Configure CORS**
   - Go to the **Settings** tab
   - Scroll to **CORS Policy**
   - Click **Edit CORS Policy**

4. **Add This CORS Configuration**

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD",
      "PUT",
      "POST"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**Important:** Replace `https://yourdomain.com` with your actual production domain.

5. **Save the Configuration**

## Alternative: Use R2 Custom Domain (Recommended)

For better performance and no CORS issues:

1. In R2 bucket settings, go to **Public Access**
2. Add a **Custom Domain** (e.g., `cdn.yourdomain.com`)
3. Update the `R2_PUBLIC_URL` secret to use this domain
4. This bypasses CORS entirely since the images will be on your domain

## Test After Configuration

1. Clear browser cache
2. Refresh the page
3. Upload a new avatar
4. The image should now display correctly

## Current Configuration

- **Bucket:** realestate
- **Public URL:** https://pub-1d96abbfacad43b0b45486bb96acbf7e.r2.dev
- **Endpoint:** https://6d4e08f14f0c475766e828c85ac7bf6b.r2.cloudflarestorage.com




