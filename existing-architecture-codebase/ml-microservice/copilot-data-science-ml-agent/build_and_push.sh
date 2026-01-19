#!/bin/bash

# Fail fast
set -e

# Config
projectName=$(grep 'APP_NAME' .env | cut -d "=" -f2 | sed 's/["\r]//g')
version=$(grep '^VERSION=' .env | cut -d "=" -f2 | sed 's/["\r]//g')
region="us-west-2"
account_id="767397887751"
repo="kolateai"
ecr_url="${account_id}.dkr.ecr.${region}.amazonaws.com"

# Auth to ECR
echo "Logging into AWS ECR..."
aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${ecr_url}

# Build Docker image
echo "Building Docker image..."
docker build -t kolate/${projectName}:latest .

# Tag image
echo "Tagging image as latest and version ${version}..."
docker tag kolate/${projectName}:latest ${ecr_url}/${repo}/${projectName}:latest
docker tag kolate/${projectName}:latest ${ecr_url}/${repo}/${projectName}:${version}

# Push both tags
echo "Pushing to ECR..."
docker push ${ecr_url}/${repo}/${projectName}:latest
docker push ${ecr_url}/${repo}/${projectName}:${version}

echo "Image pushed to ECR: ${ecr_url}/${repo}/${projectName}:${version}"
