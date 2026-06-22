# Zeloh — Complete AWS Deployment Guide
> Based on actual codebase audit. ~1000 users. Singapore region for lowest Pakistan latency.

---

## PART 1 — PRE-DEPLOYMENT FINDINGS

### Components to deploy
| Component | Source folder | Target |
|---|---|---|
| Main React app | `i:\App` | S3 + CloudFront → `zeloh.site` |
| Express backend | `i:\App\whatsapp-server` | EC2 t3.small → `api.zeloh.site` |
| Admin panel | `i:\App\admin` | S3 + CloudFront → `velo.setoxhost.store` |

### Build commands (from actual package.json)
- Main app: `npm run build` → output: `i:\App\dist`
- Admin panel: `npm run build` → output: `i:\App\admin\dist`
- Backend: no build step — `node server.js` runs directly

### Node.js version
No `.nvmrc` or `engines` field found. Use **Node.js 20 LTS**.

### Express server port
`server.js` line 3054: `process.env.PORT || 3001` — listens on `0.0.0.0`.

### Cron jobs (built-in, no extra setup needed)
- Ticket profit: daily at `19:00 UTC` (= midnight PKT)
- Investment returns: hourly `0 * * * *`
- Log cleanup: daily at `19:00 UTC`
- All start automatically when server.js starts.

### External services
| Service | Purpose | Env vars |
|---|---|---|
| Supabase (Postgres) | All DB | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| Redis | OTP, rate limiting | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| AWS S3 | Screenshots, profile images | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` |
| Resend | Email OTP | `RESEND_API_KEY`, `RESEND_FROM` |
| whatsapp-web.js | WhatsApp OTP | Session file `.wwebjs_auth/` |
| Discord (optional) | Admin alerts | Stored in Supabase `app_settings` table |

### WhatsApp / Puppeteer config
`server.js` line 353 already reads `process.env.PUPPETEER_EXECUTABLE_PATH` — just set it in `.env`. No code change needed.

---

## ALL ENVIRONMENT VARIABLES

### Main app — create `i:\App\.env.production`
```
VITE_OTP_SERVER_URL=https://api.zeloh.site
VITE_SUPABASE_URL=https://cgmvoqwwuzsibzxzdirh.supabase.co
VITE_SUPABASE_ANON_KEY=<your supabase anon key from Supabase → Settings → API>
VITE_APP_URL=https://zeloh.site
```

### Admin panel — create `i:\App\admin\.env.production`
```
VITE_API_URL=https://api.zeloh.site
```

### Backend — create fresh on EC2 at `/home/ubuntu/zeloh-server/.env`
```
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
TEST_MODE=false
TEST_MODE_MINUTES=2
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
ALLOWED_ORIGINS=https://zeloh.site,https://www.zeloh.site,https://velo.setoxhost.store
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM=noreply@zeloh.site
OTP_TTL_SECONDS=600
MAX_WRONG_ATTEMPTS=5
BLOCK_TTL_SECONDS=1800
SUPABASE_URL=https://cgmvoqwwuzsibzxzdirh.supabase.co
SUPABASE_SERVICE_KEY=<service role key — Supabase → Settings → API → service_role>
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
AWS_ACCESS_KEY_ID=<IAM user access key>
AWS_SECRET_ACCESS_KEY=<IAM user secret key>
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=zeloh-uploads
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**Critical notes:**
- `SUPABASE_SERVICE_KEY` = service_role key, NOT the anon key
- `JWT_SECRET` must be a new 64-byte random string — never use `your-jwt-secret-here`
- `TEST_MODE=false` — MUST be false in production (true = profits distribute every 30s)
- `ALLOWED_ORIGINS` — no trailing slashes, exact match
- `RESEND_FROM` — use `onboarding@resend.dev` until you verify `zeloh.site` domain with Resend
- `REDIS_PASSWORD` — leave blank for local Redis; add value for ElastiCache

---

## PART 2 — AWS IAM SETUP

1. AWS Console → **IAM → Users → Create user**
2. Name: `zeloh-deploy`
3. Attach policies directly:
   - `AmazonEC2FullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `AWSCertificateManagerFullAccess`
4. Create user → open it → **Security credentials** → **Create access key**
5. Use case: CLI → download CSV → store safely, never commit to git

### Region strategy
| Service | Region | Reason |
|---|---|---|
| EC2 | `ap-southeast-1` (Singapore) | ~60ms to Pakistan vs ~180ms us-east-1 |
| S3 buckets | `ap-southeast-1` | Same region as EC2 |
| ACM certs | **`us-east-1` ONLY** | CloudFront requires this |
| CloudFront | Global (CDN) | Region-agnostic |

---

## PART 3 — S3 BUCKETS

### Bucket 1 — Main app (`zeloh-site`)

```bash
aws s3 mb s3://zeloh-site --region ap-southeast-1

aws s3api put-public-access-block --bucket zeloh-site \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

aws s3api put-bucket-website --bucket zeloh-site \
  --website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'

aws s3api put-bucket-policy --bucket zeloh-site --policy '{
  "Version":"2012-10-17",
  "Statement":[{"Sid":"PublicRead","Effect":"Allow","Principal":"*",
    "Action":"s3:GetObject","Resource":"arn:aws:s3:::zeloh-site/*"}]}'
```

> Error document = `index.html` (same as index) so direct S3 links don't 404 before CloudFront handles them.

### Bucket 2 — Admin panel (`zeloh-admin-panel`)

```bash
aws s3 mb s3://zeloh-admin-panel --region ap-southeast-1

aws s3api put-public-access-block --bucket zeloh-admin-panel \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

aws s3api put-bucket-website --bucket zeloh-admin-panel \
  --website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'

aws s3api put-bucket-policy --bucket zeloh-admin-panel --policy '{
  "Version":"2012-10-17",
  "Statement":[{"Sid":"PublicRead","Effect":"Allow","Principal":"*",
    "Action":"s3:GetObject","Resource":"arn:aws:s3:::zeloh-admin-panel/*"}]}'
```

### Bucket 3 — File uploads (`zeloh-uploads`)

Private bucket — backend uploads, accessed via S3 URLs.

```bash
aws s3 mb s3://zeloh-uploads --region ap-southeast-1

aws s3api put-bucket-cors --bucket zeloh-uploads --cors-configuration '{
  "CORSRules":[{
    "AllowedHeaders":["*"],
    "AllowedMethods":["GET","PUT","POST"],
    "AllowedOrigins":[
      "https://zeloh.site",
      "https://www.zeloh.site",
      "https://velo.setoxhost.store"
    ],
    "ExposeHeaders":["ETag"],
    "MaxAgeSeconds":3000
  }]}'
```

---

## PART 4 — SSL CERTIFICATES (ACM)

> **Must be done in `us-east-1`** — CloudFront only accepts ACM certs from N. Virginia.

1. AWS Console → switch region to **us-east-1**
2. **Certificate Manager → Request certificate → Request public certificate**
3. Add all frontend domains in one cert:
   - `zeloh.site`
   - `www.zeloh.site`
   - `velo.setoxhost.store`
4. Validation: **DNS validation** → Request
5. Open the cert — it shows CNAME records like:
   ```
   Name:  _abc123def456.zeloh.site.
   Value: _xyz789.acm-validations.aws.
   ```
6. Add each CNAME in Cloudflare (strip the trailing dot). One record per domain.
7. Wait 5–30 min → cert status = **Issued**
8. Copy the **Certificate ARN** — needed for CloudFront

> `api.zeloh.site` uses Let's Encrypt on EC2 — not ACM.

---

## PART 5 — CLOUDFRONT DISTRIBUTIONS

### Distribution 1 — zeloh.site

1. CloudFront → **Create distribution**
2. Origin domain: `zeloh-site.s3-website-ap-southeast-1.amazonaws.com`
   *(this is the S3 website endpoint — not the bucket ARN)*
3. Origin protocol: **HTTP only**
4. Viewer protocol policy: **Redirect HTTP to HTTPS**
5. Allowed HTTP methods: **GET, HEAD**
6. Cache policy: **CachingOptimized**
7. Compress: **Yes**
8. Alternate domain names: `zeloh.site` and `www.zeloh.site`
9. SSL certificate: select the ACM cert (us-east-1)
10. Default root object: `index.html`
11. Custom error responses — add two:

| Error code | Response page | Response code |
|---|---|---|
| 403 | `/index.html` | 200 |
| 404 | `/index.html` | 200 |

> This is critical for React Router — S3 returns 403/404 for paths like `/assets`. CloudFront rewrites to `index.html` so React Router handles it.

12. Create distribution → wait 10–15 min
13. Copy **Domain name**: `dXXXXXXXXX.cloudfront.net` → `[MAIN_CF_DOMAIN]`
14. Copy **Distribution ID** → `[MAIN_CF_DIST_ID]`

### Distribution 2 — velo.setoxhost.store

Same steps but:
- Origin: `zeloh-admin-panel.s3-website-ap-southeast-1.amazonaws.com`
- Alternate domain: `velo.setoxhost.store` only
- Same ACM cert
- Same custom error responses
- Copy → `[ADMIN_CF_DOMAIN]` and `[ADMIN_CF_DIST_ID]`

---

## PART 6 — EC2 INSTANCE

### Launch

1. EC2 → **Launch Instance**
2. Name: `zeloh-api-server`
3. AMI: **Ubuntu Server 22.04 LTS** (search in console — verify current AMI ID for ap-southeast-1)
4. Instance type: **t3.small** (2 vCPU, 2GB RAM)
   > Why t3.small: whatsapp-web.js runs headless Chromium which alone needs ~300–500MB. t2.micro (1GB) causes OOM. t3.small (2GB) is safe. For 1000 users consider upgrading to t3.medium (4GB).
5. Key pair: Create new → `zeloh-key` → RSA → `.pem` → download
6. Security group `zeloh-sg` — inbound rules:

| Type | Port | Source |
|---|---|---|
| SSH | 22 | My IP only |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |
| Custom TCP | 3001 | 0.0.0.0/0 *(temporary — remove after Nginx works)* |

7. Storage: **20 GB gp3**
8. Launch → copy **Public IPv4** → `[YOUR_EC2_IP]`

### SSH (Windows PowerShell)

```powershell
icacls zeloh-key.pem /inheritance:r
icacls zeloh-key.pem /grant:r "$($env:USERNAME):R"
ssh -i zeloh-key.pem ubuntu@[YOUR_EC2_IP]
```

---

## PART 7 — EC2 SOFTWARE INSTALLATION

All commands run on the EC2 instance after SSH.

```bash
# System update
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip build-essential

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # v20.x.x
npm --version

# PM2
sudo npm install -g pm2
pm2 --version

# Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping    # PONG

# Tune Redis for production
sudo sed -i 's/^# maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
sudo systemctl restart redis-server
redis-cli ping    # PONG

# Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo nginx -t     # must say: test is successful

# Chromium (required by whatsapp-web.js)
sudo apt install -y chromium-browser
which chromium-browser    # /usr/bin/chromium-browser

# If not found, try:
# sudo apt install -y chromium
# which chromium    # /usr/bin/chromium

# Chromium system dependencies
sudo apt install -y \
  libgbm-dev libxkbcommon-x11-0 libatk-bridge2.0-0 libdrm2 \
  libxcomposite1 libxdamage1 libxrandr2 libxss1 fonts-liberation \
  libnss3 libnspr4 libatk1.0-0 libcups2

# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version

aws configure
# Access Key ID:     [from IAM CSV]
# Secret Access Key: [from IAM CSV]
# Default region:    ap-southeast-1
# Default format:    json
```

---

## PART 8 — UPLOAD AND CONFIGURE SERVER CODE

### Upload from Windows (PowerShell on local machine)

```powershell
# Pack only the needed files (exclude node_modules and .env)
Compress-Archive `
  -Path "I:\App\whatsapp-server\server.js",
        "I:\App\whatsapp-server\package.json",
        "I:\App\whatsapp-server\package-lock.json" `
  -DestinationPath "zeloh-server.zip" -Force

scp -i zeloh-key.pem zeloh-server.zip ubuntu@[YOUR_EC2_IP]:/home/ubuntu/
```

### On EC2

```bash
cd /home/ubuntu
mkdir zeloh-server
unzip zeloh-server.zip -d zeloh-server
cd zeloh-server
npm install --omit=dev
```

### Create .env on EC2

```bash
nano /home/ubuntu/zeloh-server/.env
```

Paste and fill the full backend `.env` block from Part 1. Save: `Ctrl+O` → Enter → `Ctrl+X`

### Verify server starts

```bash
cd /home/ubuntu/zeloh-server
node server.js
# Should print the ZELOH SERVER banner
# Should print: Production mode — real timing active
# Should NOT print: TEST MODE ACTIVE
# Press Ctrl+C — PM2 will manage it
```

---

## PART 9 — WHATSAPP SESSION TRANSFER

### On local machine (PowerShell)

```powershell
Compress-Archive `
  -Path "I:\App\whatsapp-server\.wwebjs_auth" `
  -DestinationPath "wwebjs_auth.zip" -Force

scp -i zeloh-key.pem wwebjs_auth.zip ubuntu@[YOUR_EC2_IP]:/home/ubuntu/zeloh-server/
```

### On EC2

```bash
cd /home/ubuntu/zeloh-server
unzip wwebjs_auth.zip
ls -la .wwebjs_auth/
```

### If session fails (Chrome version mismatch)

```bash
pm2 logs zeloh-api --lines 50
# A QR code prints in the terminal
# Open WhatsApp → Settings → Linked Devices → Link a Device → scan QR
# Session saves to .wwebjs_auth/ automatically
```

---

## PART 10 — PM2 SETUP

### Create ecosystem.config.js on EC2

```bash
nano /home/ubuntu/zeloh-server/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'zeloh-api',
    script: 'server.js',
    cwd: '/home/ubuntu/zeloh-server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '800M',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    out_file: '/home/ubuntu/logs/zeloh-out.log',
    error_file: '/home/ubuntu/logs/zeloh-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '30s'
  }]
}
```

> `instances: 1` because whatsapp-web.js holds a single WhatsApp connection — cannot be shared across processes.

### Start PM2

```bash
mkdir -p /home/ubuntu/logs
cd /home/ubuntu/zeloh-server
pm2 start ecosystem.config.js
pm2 status             # zeloh-api should show "online"
pm2 logs zeloh-api     # verify startup logs

pm2 save               # persist process list

pm2 startup            # prints a sudo command — RUN THAT COMMAND
# e.g.: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7

# Verify auto-start
sudo systemctl status pm2-ubuntu
```

---

## PART 11 — NGINX CONFIGURATION

```bash
sudo nano /etc/nginx/sites-available/zeloh
```

```nginx
server {
    listen 80;
    server_name api.zeloh.site;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 10M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain application/json application/javascript text/css;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/zeloh /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
# Must say: configuration file test is successful
sudo systemctl restart nginx

# Quick test (before SSL)
curl http://[YOUR_EC2_IP]/health
# Expected: {"status":"ok","whatsappReady":false}
```

---

## PART 12 — SSL ON EC2 (Let's Encrypt)

> DNS must point `api.zeloh.site` → `[YOUR_EC2_IP]` **before** this step.

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d api.zeloh.site \
  --non-interactive \
  --agree-tos \
  --email your@email.com \
  --redirect

# Verify
curl https://api.zeloh.site/health
# Expected: {"status":"ok","whatsappReady":true}

# Test auto-renewal
sudo certbot renew --dry-run
# Expected: All renewals succeeded
```

---

## PART 13 — BUILD AND DEPLOY FRONTEND

Run on local Windows machine.

### Create production .env files

**`i:\App\.env.production`:**
```
VITE_OTP_SERVER_URL=https://api.zeloh.site
VITE_SUPABASE_URL=https://cgmvoqwwuzsibzxzdirh.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
VITE_APP_URL=https://zeloh.site
```

**`i:\App\admin\.env.production`:**
```
VITE_API_URL=https://api.zeloh.site
```

### Configure AWS CLI locally

```powershell
aws configure
# Region: ap-southeast-1
```

### Build

```powershell
cd I:\App
npm run build
dir I:\App\dist   # must contain index.html

cd I:\App\admin
npm run build
dir I:\App\admin\dist   # must contain index.html
```

### Upload to S3

```powershell
# Main app — hashed assets (cache forever)
aws s3 sync "I:\App\dist" "s3://zeloh-site" `
  --delete --exclude "index.html" `
  --cache-control "public,max-age=31536000,immutable" `
  --region ap-southeast-1

# Main app — index.html (never cache)
aws s3 cp "I:\App\dist\index.html" "s3://zeloh-site/index.html" `
  --cache-control "no-cache,no-store,must-revalidate" `
  --region ap-southeast-1

# Admin — hashed assets
aws s3 sync "I:\App\admin\dist" "s3://zeloh-admin-panel" `
  --delete --exclude "index.html" `
  --cache-control "public,max-age=31536000,immutable" `
  --region ap-southeast-1

# Admin — index.html (never cache)
aws s3 cp "I:\App\admin\dist\index.html" "s3://zeloh-admin-panel/index.html" `
  --cache-control "no-cache,no-store,must-revalidate" `
  --region ap-southeast-1
```

### Invalidate CloudFront

```powershell
aws cloudfront create-invalidation `
  --distribution-id [MAIN_CF_DIST_ID] --paths "/*" --region us-east-1

aws cloudfront create-invalidation `
  --distribution-id [ADMIN_CF_DIST_ID] --paths "/*" --region us-east-1
```

---

## PART 14 — DNS (Cloudflare)

### Setup

1. [cloudflare.com](https://cloudflare.com) → Add site → `zeloh.site` → Free plan
2. Copy the 2 nameservers Cloudflare gives you
3. Go to your registrar → replace nameservers with Cloudflare's
4. Repeat for `setoxhost.store` (or just add CNAME if already in Cloudflare)

### DNS records

**zeloh.site:**

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | `@` | `[MAIN_CF_DOMAIN].cloudfront.net` | Orange (proxied) |
| CNAME | `www` | `[MAIN_CF_DOMAIN].cloudfront.net` | Orange (proxied) |
| A | `api` | `[YOUR_EC2_IP]` | **Grey (DNS only)** |

**velo.setoxhost.store:**

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | `velo` | `[ADMIN_CF_DOMAIN].cloudfront.net` | Orange (proxied) |

> `api` MUST be grey/DNS-only — if proxied, Certbot's HTTP challenge fails.

**ACM validation records** — add the CNAME records from Part 4 in Cloudflare.

### Cloudflare SSL
- `zeloh.site` → SSL/TLS → **Full (strict)**
- `api.zeloh.site` is DNS-only — Certbot handles SSL

---

## PART 15 — VERIFICATION CHECKLIST

```bash
# API health
curl https://api.zeloh.site/health
# Expected: {"status":"ok","whatsappReady":true}

# Movies
curl https://api.zeloh.site/movies
# Expected: {"success":true,"movies":[...]}

# WhatsApp status
pm2 logs zeloh-api --lines 20
# Expected line: [WhatsApp] Client ready to send messages

# Cron status
pm2 logs zeloh-api --lines 50 | grep -i cron
# Expected:
#   Production: ticket profit cron at 12:00 AM PST daily
#   Production: investment cron runs every hour
```

Browser checks:
```
https://zeloh.site               → login page loads
https://www.zeloh.site           → redirects to zeloh.site
https://zeloh.site/assets        → React Router loads assets (not 404)
https://zeloh.site/my            → loads
https://zeloh.site/service       → loads
https://velo.setoxhost.store     → admin login loads
```

CORS test (run in browser console at zeloh.site):
```javascript
fetch('https://api.zeloh.site/movies').then(r=>r.json()).then(console.log)
// Must show movies array, no CORS error
```

SSL test: https://www.ssllabs.com/ssltest/ → `zeloh.site` → expect **A or A+**

---

## PART 16 — deploy.ps1 (save as `i:\App\deploy.ps1`)

```powershell
param(
  [string]$MainDistId  = "[MAIN_CF_DIST_ID]",
  [string]$AdminDistId = "[ADMIN_CF_DIST_ID]",
  [string]$MainBucket  = "zeloh-site",
  [string]$AdminBucket = "zeloh-admin-panel",
  [string]$Region      = "ap-southeast-1"
)

$ErrorActionPreference = "Stop"
$t = Get-Date

Write-Host "`n=== ZELOH DEPLOY ===" -ForegroundColor Cyan

Write-Host "[1/6] Building main app..." -ForegroundColor Yellow
Set-Location "I:\App"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Main app build failed" }

Write-Host "[2/6] Building admin panel..." -ForegroundColor Yellow
Set-Location "I:\App\admin"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Admin build failed" }

Write-Host "[3/6] Uploading main app to S3..." -ForegroundColor Yellow
aws s3 sync "I:\App\dist" "s3://$MainBucket" `
  --delete --exclude "index.html" `
  --cache-control "public,max-age=31536000,immutable" --region $Region
aws s3 cp "I:\App\dist\index.html" "s3://$MainBucket/index.html" `
  --cache-control "no-cache,no-store,must-revalidate" --region $Region

Write-Host "[4/6] Uploading admin panel to S3..." -ForegroundColor Yellow
aws s3 sync "I:\App\admin\dist" "s3://$AdminBucket" `
  --delete --exclude "index.html" `
  --cache-control "public,max-age=31536000,immutable" --region $Region
aws s3 cp "I:\App\admin\dist\index.html" "s3://$AdminBucket/index.html" `
  --cache-control "no-cache,no-store,must-revalidate" --region $Region

Write-Host "[5/6] Invalidating CloudFront..." -ForegroundColor Yellow
aws cloudfront create-invalidation --distribution-id $MainDistId `
  --paths "/*" --region us-east-1 | Out-Null
aws cloudfront create-invalidation --distribution-id $AdminDistId `
  --paths "/*" --region us-east-1 | Out-Null

$elapsed = [math]::Round(((Get-Date) - $t).TotalSeconds, 1)
Write-Host "`n[6/6] Done in ${elapsed}s" -ForegroundColor Green
Write-Host "  Main app : https://zeloh.site"
Write-Host "  Admin    : https://velo.setoxhost.store"
Write-Host "  API      : https://api.zeloh.site/health`n"
```

Replace `[MAIN_CF_DIST_ID]` and `[ADMIN_CF_DIST_ID]` with real values before first use.

---

## PART 17 — UPDATING SERVER CODE

```powershell
# Upload single changed file (local machine)
scp -i zeloh-key.pem "I:\App\whatsapp-server\server.js" `
  ubuntu@[YOUR_EC2_IP]:/home/ubuntu/zeloh-server/server.js
```

```bash
# On EC2
cd /home/ubuntu/zeloh-server
npm install --omit=dev   # only if package.json changed
pm2 restart zeloh-api
pm2 logs zeloh-api --lines 20
```

---

## PART 18 — MONITORING AND MAINTENANCE

```bash
pm2 logs zeloh-api                          # live logs
pm2 logs zeloh-api --lines 200 --nostream | grep ERROR  # errors only
pm2 monit                                   # CPU + memory dashboard
free -m                                     # system memory
df -h                                       # disk space
redis-cli info memory | grep used_memory_human
redis-cli dbsize                            # OTP key count

# If disk fills up
pm2 flush
npm cache clean --force
sudo journalctl --vacuum-time=7d

# After any EC2 reboot
pm2 status
# If empty:
pm2 resurrect
```

Free uptime monitoring: [uptimerobot.com](https://uptimerobot.com) — add:
- `https://zeloh.site` (HTTP)
- `https://api.zeloh.site/health` (keyword: `"ok"`)
- `https://velo.setoxhost.store` (HTTP)

---

## PART 19 — SECURITY HARDENING

```bash
# Remove temporary port 3001 rule after Nginx works
# EC2 Console → Security Groups → zeloh-sg → remove port 3001 inbound rule

# UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status

# Fail2Ban (SSH brute-force protection)
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## PART 20 — COST ESTIMATE (1000 users, ap-southeast-1)

| Service | Tier | Monthly USD |
|---|---|---|
| EC2 t3.small on-demand | 24/7 | ~$17.00 |
| EC2 t3.small 1-yr reserved | save ~40% | ~$10.50 |
| EC2 storage 20GB gp3 | | ~$1.60 |
| S3 zeloh-site | ~100MB static | ~$0.01 |
| S3 zeloh-admin-panel | ~5MB static | <$0.01 |
| S3 zeloh-uploads | ~10GB, 1000 users | ~$0.30 |
| CloudFront main app | ~50GB transfer | ~$4.25 |
| CloudFront admin | ~2GB transfer | ~$0.17 |
| ACM SSL | Free | $0 |
| Cloudflare DNS | Free plan | $0 |
| Supabase Free | 500MB DB | $0 |
| Supabase Pro | Recommended for financial app | $25 |
| Resend | Free (3000 emails/mo) | $0 |
| UptimeRobot | Free plan | $0 |
| **Total (on-demand + Supabase free)** | | **~$23/mo** |
| **Total (reserved + Supabase Pro)** | | **~$41/mo** |

**Recommendation:** Buy 1-year EC2 reserved instance immediately — saves ~$78/year. Upgrade to Supabase Pro — for a financial app with real money, daily backups and no 500MB limit are essential.

---

## MASTER DEPLOYMENT CHECKLIST

Follow in exact order:

**AWS + Certificates**
- [ ] 1. Create IAM user `zeloh-deploy`, download CSV
- [ ] 2. Create S3 bucket `zeloh-site` (ap-southeast-1, public website)
- [ ] 3. Create S3 bucket `zeloh-admin-panel` (ap-southeast-1, public website)
- [ ] 4. Create S3 bucket `zeloh-uploads` (ap-southeast-1, private, add CORS)
- [ ] 5. Switch to **us-east-1**, request ACM cert for `zeloh.site`, `www.zeloh.site`, `velo.setoxhost.store`

**DNS**
- [ ] 6. Add `zeloh.site` to Cloudflare, change registrar nameservers
- [ ] 7. Add `setoxhost.store` to Cloudflare (or add CNAME to existing zone)
- [ ] 8. Add ACM DNS validation CNAME records in Cloudflare
- [ ] 9. Wait for ACM cert status = **Issued**

**EC2**
- [ ] 10. Launch EC2 t3.small Ubuntu 22.04 in ap-southeast-1, download `.pem` key
- [ ] 11. SSH into EC2
- [ ] 12. Install Node.js 20, PM2, Redis, Nginx, Chromium, AWS CLI
- [ ] 13. Upload `zeloh-server.zip` via SCP, extract, run `npm install --omit=dev`
- [ ] 14. Create `/home/ubuntu/zeloh-server/.env` with all production values
- [ ] 15. Create `ecosystem.config.js`
- [ ] 16. Upload `.wwebjs_auth` session folder via SCP
- [ ] 17. Start PM2: `pm2 start ecosystem.config.js && pm2 save && pm2 startup`
- [ ] 18. Run the `sudo env PATH=...` command that `pm2 startup` prints

**DNS → EC2 linkup**
- [ ] 19. Add `A` record in Cloudflare: `api` → `[YOUR_EC2_IP]` (grey/DNS-only)
- [ ] 20. Wait for DNS propagation: `nslookup api.zeloh.site` returns EC2 IP

**Nginx + SSL**
- [ ] 21. Create Nginx config, enable site, restart Nginx
- [ ] 22. Run Certbot for `api.zeloh.site`
- [ ] 23. Test: `curl https://api.zeloh.site/health` returns `{"status":"ok"}`
- [ ] 24. Remove port 3001 from EC2 security group

**CloudFront**
- [ ] 25. Create CloudFront distribution for `zeloh.site` (custom error pages!)
- [ ] 26. Create CloudFront distribution for `velo.setoxhost.store`
- [ ] 27. Add CNAME records in Cloudflare: `@` and `www` → main CF domain, `velo` → admin CF domain

**Frontend deploy**
- [ ] 28. Create `i:\App\.env.production` and `i:\App\admin\.env.production`
- [ ] 29. Build main app: `cd I:\App && npm run build`
- [ ] 30. Build admin panel: `cd I:\App\admin && npm run build`
- [ ] 31. Upload both to S3 (hashed assets + index.html separately)
- [ ] 32. Invalidate both CloudFront distributions

**Verify**
- [ ] 33. Open `https://zeloh.site` — login page loads
- [ ] 34. Open `https://velo.setoxhost.store` — admin login loads
- [ ] 35. Check `pm2 logs zeloh-api` — WhatsApp ready, crons scheduled
- [ ] 36. Register test account — OTP received
- [ ] 37. Add UptimeRobot monitors
- [ ] 38. Run `.\deploy.ps1` for all future frontend deployments

---

*End of deployment guide. All commands verified against actual `server.js`, `package.json`, `.env.example`, and `vite.config.js` files.*
