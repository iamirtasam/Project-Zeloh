# Zeloh WhatsApp OTP Server

Standalone Node.js server that sends OTP codes via WhatsApp using `whatsapp-web.js`.

## Setup

### 1. Install dependencies
```bash
cd whatsapp-server
npm install
```

### 2. Configure `.env`
- Set `REDIS_HOST` to your ElastiCache endpoint (or `127.0.0.1` for local dev)
- Set `INTERNAL_SECRET` to a long random string (share this with your Lambda backend)

### 3. First run — QR code scan
```bash
npm start
```
A QR code will print in the terminal. Scan it with your dedicated WhatsApp number.

Session is saved to `./.wwebjs_auth` — you only need to scan once. On restart, it auto-reconnects.

### 4. Deploy to EC2 or Railway
- **EC2 t2.micro**: Install Node.js, clone repo, run `npm start` with PM2 or systemd
- **Railway**: Connect GitHub repo, set env vars, auto-deploys on push

## Endpoints

### `POST /send-otp`
**Headers**: `x-internal-secret: <your_secret>`

**Body**:
```json
{ "phone": "+12345678900" }
```

**Response**:
```json
{ "success": true }
```

### `POST /verify-otp`
**Headers**: `x-internal-secret: <your_secret>`

**Body**:
```json
{ "phone": "+12345678900", "code": "123456" }
```

**Response**:
```json
{ "verified": true }
```
or
```json
{ "verified": false, "message": "Invalid code. 3 attempts remaining." }
```

### `GET /health`
Check if server and WhatsApp are ready.

## Security
- Frontend **never** calls this server directly
- Only your Lambda backend calls it (via `x-internal-secret` header)
- After 5 wrong OTP attempts, number is blocked for 30 minutes
- OTP expires after 10 minutes
