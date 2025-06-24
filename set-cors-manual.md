# Manual CORS Configuration for Firebase Storage

Since service account key creation is restricted by your organization, you'll need to configure CORS manually through Google Cloud Console.

## Option 1: Using Google Cloud Console (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `fibreflow-73daf`
3. Navigate to **Cloud Storage** > **Buckets**
4. Find your bucket: `fibreflow-73daf.firebasestorage.app`
5. Click on the bucket name
6. Go to the **Configuration** tab
7. In the **CORS configuration** section, click **Edit**
8. Add this configuration:

```json
[
  {
    "origin": ["https://fibreflow-73daf.web.app", "https://fibreflow-73daf.firebaseapp.com", "http://localhost:4200"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
  }
]
```

9. Click **Save**

## Option 2: Using Cloud Shell

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the **Cloud Shell** button (terminal icon) in the top right
3. In Cloud Shell, run:

```bash
# First, create the cors.json file
cat > cors.json << 'EOF'
[
  {
    "origin": ["https://fibreflow-73daf.web.app", "https://fibreflow-73daf.firebaseapp.com", "http://localhost:4200"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
  }
]
EOF

# Then apply it to your bucket
gsutil cors set cors.json gs://fibreflow-73daf.firebasestorage.app

# Verify the configuration
gsutil cors get gs://fibreflow-73daf.firebasestorage.app
```

## Option 3: Ask Your Firebase/GCP Admin

If you don't have access to Google Cloud Console, ask your Firebase project admin or Google Cloud admin to:

1. Apply the CORS configuration above to the bucket `fibreflow-73daf.firebasestorage.app`
2. Or temporarily grant you Cloud Storage Admin role to configure it yourself

## Verification

After applying CORS configuration, test image upload again. The CORS error should be resolved and uploads should work properly.

## Note About Organization Policies

Your organization has restricted service account key creation for security reasons. This is a good security practice, but it means you'll need to use the Google Cloud Console or have appropriate IAM permissions to manage storage settings.