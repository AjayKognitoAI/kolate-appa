# External Services Setup Guide

This guide provides detailed instructions for configuring all external services used by this FastAPI template.

## Table of Contents

1. [Overview](#overview)
2. [PostgreSQL Database](#postgresql-database)
3. [Redis Cache](#redis-cache)
4. [Email Services](#email-services)
   - [SMTP (Gmail, Outlook, Custom)](#smtp-configuration)
   - [AWS SES](#aws-ses-configuration)
5. [File Storage](#file-storage)
   - [Local Storage](#local-storage)
   - [AWS S3](#aws-s3-configuration)
6. [Authentication](#authentication)
7. [Environment Variables Reference](#environment-variables-reference)

---

## Overview

This template integrates with the following external services:

| Service | Purpose | Providers |
|---------|---------|-----------|
| Database | Data persistence | PostgreSQL |
| Cache | Session storage, rate limiting | Redis |
| Email | Notifications, verification | SMTP, AWS SES |
| File Storage | Media uploads | Local filesystem, AWS S3 |
| Authentication | User auth & RBAC | Auth0 |

### Quick Start (Docker Development)

For local development, all services are pre-configured in Docker Compose:

```bash
# Start all services
make dev

# Services available:
# - API: http://localhost:8000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - pgAdmin: http://localhost:5050
# - Redis Commander: http://localhost:8081
```

---

## PostgreSQL Database

### Development Setup (Docker)

The Docker Compose setup includes PostgreSQL with sensible defaults:

```yaml
# docker-compose.yml (already configured)
db:
  image: postgres:15
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres123
    POSTGRES_DB: app_db
  ports:
    - "5432:5432"
```

**Default Credentials:**
- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `postgres123`
- Database: `app_db`

### Production Setup

#### Option 1: Managed PostgreSQL (Recommended)

**AWS RDS:**
1. Create RDS PostgreSQL instance in AWS Console
2. Configure security groups for your application
3. Use connection string:
   ```
   DATABASE_URL=postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/dbname
   ```

**Google Cloud SQL:**
1. Create Cloud SQL PostgreSQL instance
2. Configure authorized networks
3. Use connection string with Cloud SQL proxy or direct connection

**DigitalOcean Managed Database:**
1. Create managed PostgreSQL cluster
2. Add your application to trusted sources
3. Use provided connection string

#### Option 2: Self-Hosted PostgreSQL

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE USER appuser WITH PASSWORD 'secure_password';
CREATE DATABASE app_db OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE app_db TO appuser;
\q
```

### Environment Configuration

```bash
# .env
DATABASE_URL=postgresql://username:password@host:5432/database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=app_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password
```

### Database Management Commands

```bash
# Run migrations
make migrate

# Create new migration
make migrate-create

# Access PostgreSQL shell
make db-shell

# Create backup
make backup

# Restore from backup
docker-compose exec -T db psql -U postgres app_db < backup.sql
```

### Connection Pooling

The template uses SQLAlchemy's async connection pooling. Configure in `app/core/database.py`:

```python
# Default settings (adjust for production)
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=5,        # Minimum connections
    max_overflow=10,    # Additional connections when needed
    pool_pre_ping=True, # Verify connections before use
)
```

---

## Redis Cache

### Development Setup (Docker)

Redis is pre-configured in Docker Compose:

```yaml
# docker-compose.yml (already configured)
redis:
  image: redis:7-alpine
  command: redis-server --requirepass redis123
  ports:
    - "6379:6379"
```

**Default Credentials:**
- Host: `localhost`
- Port: `6379`
- Password: `redis123`

### Production Setup

#### Option 1: Managed Redis (Recommended)

**AWS ElastiCache:**
1. Create ElastiCache Redis cluster
2. Configure security groups
3. Use cluster endpoint:
   ```
   REDIS_URL=redis://:password@your-cluster.cache.amazonaws.com:6379/0
   ```

**Redis Cloud:**
1. Create database at [redis.com](https://redis.com)
2. Copy connection details:
   ```
   REDIS_URL=redis://default:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345/0
   ```

**DigitalOcean Managed Redis:**
1. Create managed Redis cluster
2. Use provided connection string

#### Option 2: Self-Hosted Redis

```bash
# Install Redis
sudo apt-get install redis-server

# Configure password
sudo nano /etc/redis/redis.conf
# Add: requirepass your_secure_password

# Restart Redis
sudo systemctl restart redis
```

### Environment Configuration

```bash
# .env
REDIS_URL=redis://:password@localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_secure_password

# Cache type: "redis" or "memory" (for testing)
CACHE_TYPE=redis
```

### Redis Management

```bash
# Access Redis CLI
make redis-shell

# Common commands
> KEYS *           # List all keys
> GET key_name     # Get value
> DEL key_name     # Delete key
> FLUSHALL         # Clear all data (careful!)
> INFO             # Server info
```

### Cache Usage in Code

```python
from app.core.cache import get_cache

cache = await get_cache()

# Set value with expiration
await cache.set("key", "value", expire=3600)

# Get value
value = await cache.get("key")

# Delete value
await cache.delete("key")
```

---

## Email Services

The template supports two email providers: SMTP and AWS SES.

### SMTP Configuration

#### Gmail SMTP

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password:**
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Configure Environment:**
   ```bash
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # App password
   SMTP_USE_TLS=true
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=Your Application
   ```

#### Microsoft Outlook/Office 365

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your_password
SMTP_USE_TLS=true
SMTP_FROM_EMAIL=your-email@outlook.com
SMTP_FROM_NAME=Your Application
```

#### Custom SMTP Server

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USERNAME=noreply@your-domain.com
SMTP_PASSWORD=your_password
SMTP_USE_TLS=true
SMTP_FROM_EMAIL=noreply@your-domain.com
SMTP_FROM_NAME=Your Application
```

#### SendGrid SMTP

1. Create API key in SendGrid dashboard
2. Configure:
   ```bash
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USERNAME=apikey  # Literal "apikey"
   SMTP_PASSWORD=SG.your-api-key-here
   SMTP_USE_TLS=true
   SMTP_FROM_EMAIL=verified-sender@your-domain.com
   SMTP_FROM_NAME=Your Application
   ```

### AWS SES Configuration

#### Step 1: Set Up AWS SES

1. **Verify Domain or Email:**
   - Go to AWS Console → SES → Verified identities
   - Click "Create identity"
   - For production: Verify your domain (add DNS records)
   - For testing: Verify individual email addresses

2. **Request Production Access:**
   - By default, SES is in sandbox mode
   - Go to SES → Account dashboard → Request production access
   - Fill out the form with your use case

3. **Create IAM User:**
   - Go to IAM → Users → Create user
   - Attach policy: `AmazonSESFullAccess` (or custom policy below)
   - Save Access Key ID and Secret Access Key

   **Minimal IAM Policy:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ses:SendEmail",
           "ses:SendRawEmail"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

#### Step 2: Configure Environment

```bash
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@your-verified-domain.com
AWS_SES_FROM_NAME=Your Application
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key

# Optional: Configuration set for tracking
AWS_SES_CONFIGURATION_SET=my-config-set
```

### Email Usage in Code

```python
from app.services.email_service import email_service

# Send simple email
await email_service.send_email(
    to_email="user@example.com",
    subject="Welcome!",
    body="<h1>Welcome to our app!</h1>",
)

# Send with template
await email_service.send_verification_email(
    to_email="user@example.com",
    verification_code="123456",
)
```

### Testing Emails

```bash
# Test SMTP connection
docker-compose exec web python -c "
from app.services.email_service import email_service
import asyncio
asyncio.run(email_service.send_email(
    to_email='test@example.com',
    subject='Test Email',
    body='<p>This is a test email.</p>'
))
"
```

---

## File Storage

The template supports local filesystem and AWS S3 for file storage.

### Local Storage

Default for development. Files are stored in the `uploads/` directory.

```bash
FILE_STORAGE_TYPE=local
LOCAL_UPLOAD_PATH=uploads
MEDIA_BASE_URL=/media
API_BASE_URL=http://localhost:8000
```

**Directory Structure:**
```
uploads/
├── users/
│   ├── profile_123.jpg
│   └── avatar_456.png
├── documents/
│   └── report_789.pdf
└── temp/
```

### AWS S3 Configuration

#### Step 1: Create S3 Bucket

1. Go to AWS Console → S3 → Create bucket
2. Configure:
   - Bucket name: `your-app-uploads`
   - Region: Same as your application
   - Block public access: Configure based on needs

3. **For public files (images, avatars):**
   - Unblock public access
   - Add bucket policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

4. **Enable CORS (for direct uploads):**
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["https://your-frontend.com"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

#### Step 2: Create IAM User

Create an IAM user with S3 access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

#### Step 3: Configure Environment

```bash
FILE_STORAGE_TYPE=s3
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BASE_URL=https://your-bucket-name.s3.amazonaws.com
```

### File Storage Usage in Code

```python
from app.utils.storage_factory import get_file_storage

storage = get_file_storage()

# Upload file
url = await storage.upload(
    file_content=file.file.read(),
    file_path="users/profile_123.jpg",
    content_type="image/jpeg"
)

# Generate URL
url = storage.get_url("users/profile_123.jpg")

# Delete file
await storage.delete("users/profile_123.jpg")

# Check if file exists
exists = await storage.exists("users/profile_123.jpg")
```

### CloudFront CDN (Optional)

For better performance, serve S3 files through CloudFront:

1. Create CloudFront distribution pointing to S3
2. Update `AWS_S3_BASE_URL` to CloudFront URL:
   ```bash
   AWS_S3_BASE_URL=https://d1234567890.cloudfront.net
   ```

---

## Authentication

This template uses **Auth0** for authentication and authorization.

For detailed Auth0 setup instructions, see: **[AUTH0_SETUP.md](./AUTH0_SETUP.md)**

### Quick Reference

```bash
# Required Auth0 environment variables
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api.example.com
AUTH0_ALGORITHMS=RS256
AUTH0_PERMISSIONS_CLAIM=permissions
AUTH0_ROLES_CLAIM=https://your-namespace/roles
AUTH0_USE_RBAC=true
```

---

## Environment Variables Reference

### Complete `.env` Example

```bash
# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DATABASE_URL=postgresql://postgres:postgres123@db:5432/app_db
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_NAME=app_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123

# ===========================================
# REDIS CONFIGURATION
# ===========================================
REDIS_URL=redis://:redis123@redis:6379/0
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=redis123
CACHE_TYPE=redis

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
SECRET_KEY=your-super-secret-key-change-in-production
ENVIRONMENT=development
DEBUG=true
HOST=0.0.0.0
PORT=8000
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# ===========================================
# AUTH0 CONFIGURATION
# ===========================================
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api.example.com
AUTH0_ALGORITHMS=RS256
AUTH0_ISSUER=https://your-tenant.auth0.com/
AUTH0_PERMISSIONS_CLAIM=permissions
AUTH0_ROLES_CLAIM=https://your-namespace/roles
AUTH0_USE_RBAC=true

# ===========================================
# CORS CONFIGURATION
# ===========================================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
ALLOWED_METHODS=GET,POST,PUT,DELETE,PATCH
ALLOWED_HEADERS=*

# ===========================================
# EMAIL CONFIGURATION
# ===========================================
# Provider: "smtp" or "ses"
EMAIL_PROVIDER=smtp

# SMTP Settings (if EMAIL_PROVIDER=smtp)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true
SMTP_FROM_EMAIL=noreply@your-domain.com
SMTP_FROM_NAME=Your Application

# AWS SES Settings (if EMAIL_PROVIDER=ses)
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@your-domain.com
AWS_SES_FROM_NAME=Your Application
AWS_SES_CONFIGURATION_SET=

# ===========================================
# FILE STORAGE CONFIGURATION
# ===========================================
# Storage type: "local" or "s3"
FILE_STORAGE_TYPE=local

# Local storage settings
LOCAL_UPLOAD_PATH=uploads
MEDIA_BASE_URL=/media

# AWS S3 Settings (if FILE_STORAGE_TYPE=s3)
AWS_S3_BUCKET_NAME=your-bucket
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BASE_URL=https://your-bucket.s3.amazonaws.com

# ===========================================
# LOGGING CONFIGURATION
# ===========================================
LOG_LEVEL=INFO
ENABLE_FILE_LOGGING=true
LOG_DIRECTORY=logs
LOG_FORMAT=json
LOG_MAX_FILE_SIZE=10485760
LOG_BACKUP_COUNT=5
LOG_ERROR_FILE_SIZE=5242880
LOG_ERROR_BACKUP_COUNT=3

# ===========================================
# SECURITY CONFIGURATION
# ===========================================
PASSWORD_RESET_OTP_EXPIRE_MINUTES=10
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=5
PASSWORD_RESET_MAX_ATTEMPTS=3
PASSWORD_RESET_RATE_LIMIT_PER_HOUR=3
EMAIL_VERIFICATION_OTP_EXPIRE_MINUTES=10
EMAIL_VERIFICATION_MAX_ATTEMPTS=10
EMAIL_VERIFICATION_RATE_LIMIT_PER_HOUR=3
```

### Environment-Specific Configurations

| Variable | Development | Production |
|----------|-------------|------------|
| `DEBUG` | `true` | `false` |
| `ENVIRONMENT` | `development` | `production` |
| `LOG_LEVEL` | `DEBUG` | `INFO` or `WARNING` |
| `FILE_STORAGE_TYPE` | `local` | `s3` |
| `CACHE_TYPE` | `memory` or `redis` | `redis` |
| `ALLOWED_ORIGINS` | `localhost:*` | Your domains only |

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if database is running
make status

# Test connection
docker-compose exec web python -c "
from app.core.database import get_async_db
import asyncio
async def test():
    async for db in get_async_db():
        result = await db.execute('SELECT 1')
        print('Database connected!')
asyncio.run(test())
"
```

### Redis Connection Issues

```bash
# Check Redis status
docker-compose exec redis redis-cli -a redis123 ping
# Should return: PONG

# Check Redis info
docker-compose exec redis redis-cli -a redis123 INFO server
```

### Email Sending Issues

1. **Gmail "Less secure app" error**: Use App Password instead
2. **SES Sandbox**: Request production access
3. **Connection timeout**: Check firewall/security groups
4. **Authentication failed**: Verify credentials

### S3 Upload Issues

1. **Access Denied**: Check IAM permissions
2. **Bucket not found**: Verify region and bucket name
3. **CORS error**: Configure bucket CORS policy
4. **Slow uploads**: Consider using presigned URLs for direct upload

---

## Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Use strong `SECRET_KEY` (32+ random characters)
- [ ] Enable SSL/TLS for all connections
- [ ] Configure proper CORS origins
- [ ] Use managed services with encryption at rest
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Review IAM permissions (principle of least privilege)
- [ ] Set up monitoring and alerts
