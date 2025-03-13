#!/bin/bash
# Deploy script for the Agent Registry React App

# Build the React app (creates a build folder)
echo "Building React application..."
npm run build

# Setting variables
S3_BUCKET="agent-registry-app-frontend"  # Change this to match your terraform bucket name
CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")

# Upload to S3
echo "Deploying to S3 bucket: $S3_BUCKET"
aws s3 sync build/ s3://$S3_BUCKET/ --delete

# Invalidate CloudFront cache (if ID is provided)
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "Invalidating CloudFront cache for distribution: $CLOUDFRONT_DISTRIBUTION_ID"
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
else
    echo "CloudFront distribution ID not found. Skipping cache invalidation."
fi

echo "Deployment complete!"
