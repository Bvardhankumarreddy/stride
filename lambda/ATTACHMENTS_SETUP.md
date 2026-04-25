# Attachment uploads — one-time AWS setup

The Lambda already exposes the `stride_upload_url` handler. For it to actually
mint presigned URLs you need to:

1. Create an S3 bucket
2. Configure CORS on the bucket so browsers can PUT to it
3. (Optional) Make objects publicly readable
4. Set Lambda env vars
5. Add S3 permissions to the Lambda's IAM role

All commands assume `us-east-1`. Change the region if your Lambda lives elsewhere.

---

### 1. Create the bucket

```bash
BUCKET=stride-attachments-yourname  # must be globally unique
REGION=us-east-1

aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
```

### 2. CORS (so the browser PUT works)

Save as `cors.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://stride.inferix.in", "http://localhost:3000"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders":  ["ETag"],
      "MaxAgeSeconds":  3000
    }
  ]
}
```

```bash
aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration file://cors.json
```

### 3. Public read (simplest option)

Allow public-read on the bucket so the saved `fileUrl` works without signing:

```bash
# Disable Block Public Access (only for this bucket)
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Bucket policy: anyone can GET
cat > policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*"
  }]
}
EOF

aws s3api put-bucket-policy --bucket "$BUCKET" --policy file://policy.json
```

### 4. Lambda env vars

In the Lambda console (or via CLI), add:

| Key | Value |
|---|---|
| `ATTACHMENTS_BUCKET` | `stride-attachments-yourname` |
| `PRESIGN_EXPIRES_SECONDS` | `900` (optional, default 15 min) |
| `MAX_UPLOAD_BYTES` | `26214400` (optional, default 25 MB) |

### 5. Lambda IAM permission to PutObject + presign

Attach this inline policy to the Lambda's execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject"],
    "Resource": "arn:aws:s3:::stride-attachments-yourname/*"
  }]
}
```

### 6. Test

```bash
curl -X POST https://<your-lambda-url> \
  -H "Content-Type: application/json" \
  -H "x-api-key: $STRIDE_API_KEY" \
  -d '{"type":"stride_upload_url","filename":"test.png","contentType":"image/png"}'
```

Expected response:
```json
{
  "uploadUrl": "https://...amazonaws.com/...?X-Amz-Algorithm=...",
  "fileUrl":   "https://stride-attachments-yourname.s3.us-east-1.amazonaws.com/attachments/global/misc/<uuid>-test.png",
  "key":       "attachments/global/misc/<uuid>-test.png"
}
```
