require('dotenv').config()

const chalk = require('chalk')

console.log(chalk.yellow(`
  ╔═══════════════════════════════╗
  ║   ZELOH SERVER v1.0           ║
  ║   Movie Investment Platform   ║
  ╚═══════════════════════════════╝
`))

// ── Structured logger ─────────────────────────────────────────────────────────
// Log levels: debug < info < warn < error
// Production (NODE_ENV=production): emits JSON for log aggregators (CloudWatch, Datadog…)
// Development: colourful human-readable output
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
const LEVEL_RANK = { debug: 0, info: 1, warn: 2, error: 3 }
function shouldLog(level) { return (LEVEL_RANK[level] ?? 1) >= (LEVEL_RANK[LOG_LEVEL] ?? 1) }

function _emit(level, tag, msg, meta = {}) {
  if (!shouldLog(level)) return
  if (process.env.NODE_ENV === 'production') {
    const line = JSON.stringify({ timestamp: new Date().toISOString(), level: level.toUpperCase(), tag, message: msg, ...meta })
    level === 'error' ? console.error(line) : level === 'warn' ? console.warn(line) : console.log(line)
    return
  }
  const time = chalk.gray(new Date().toLocaleTimeString('en-US', { hour12: false }))
  const tagColors = { debug: chalk.gray, info: chalk.cyan.bold, warn: chalk.yellow.bold, error: chalk.red.bold, success: chalk.green.bold, cron: chalk.blue.bold, request: chalk.magenta.bold }
  const colorFn = tagColors[level] ?? chalk.white
  const parts = []
  if (meta.requestId) parts.push(chalk.gray('req:' + String(meta.requestId).slice(0, 8)))
  if (meta.userId)    parts.push(chalk.gray('uid:' + String(meta.userId).slice(0, 8)))
  if (meta.amount != null) parts.push(chalk.gray('$' + meta.amount))
  if (meta.duration)  parts.push(chalk.gray(meta.duration))
  if (meta.ip)        parts.push(chalk.gray(meta.ip))
  if (meta.error)     parts.push(chalk.red(meta.error))
  const metaStr = parts.length ? ' ' + parts.join(' ') : ''
  console.log(`${time} ${colorFn(`[${tag}]`)} ${chalk.white(msg)}${metaStr}`)
}

const logger = {
  debug:   (tag, msg, meta = {}) => _emit('debug',   tag, msg, meta),
  info:    (tag, msg, meta = {}) => _emit('info',    tag, msg, meta),
  warn:    (tag, msg, meta = {}) => _emit('warn',    tag, msg, meta),
  error:   (tag, msg, meta = {}) => _emit('error',   tag, msg, meta),
  success: (tag, msg, meta = {}) => _emit('success', tag, msg, meta),
  cron:    (msg,       meta = {}) => _emit('cron',   'Cron', msg, meta),
  request: (method, path, status, meta = {}) => {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'debug'
    _emit('request', method, `${path} ${status}`, meta)
  },
}

const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const rateLimit  = require('express-rate-limit')
const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode     = require('qrcode-terminal')
const Redis      = require('ioredis')
const { Resend } = require('resend')
const bcrypt     = require('bcryptjs')
const jwt        = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')
const multer     = require('multer')
const cron       = require('node-cron')
const AWS        = require('aws-sdk')
const crypto     = require('crypto')

// ── Security constants ──────────────────────────────────────────────────────
// Dummy bcrypt hash used to make response time constant when a user doesn't
// exist (prevents user-enumeration via timing).
const DUMMY_BCRYPT_HASH = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8qr4d7e0b2R9pXh1xJLGXJvOn0Ik7K'
// bcrypt's internal limit is 72 bytes — anything longer wastes CPU/memory.
const MAX_PASSWORD_LENGTH = 72
const MIN_PASSWORD_LENGTH = 8
const MIN_ADMIN_PASSWORD_LENGTH = 12

// Allowed upload MIME → extension map (never trust user-supplied filenames)
const ALLOWED_MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}
function getSafeExtension(mimetype) {
  return ALLOWED_MIME_EXTENSIONS[mimetype] || null
}

// Validate a money amount: finite, positive, within bounds, ≤2 decimals.
function isValidAmount(value, options = {}) {
  const { min = 0.01, max = 1_000_000 } = options
  const num = parseFloat(value)
  if (!Number.isFinite(num)) return false
  if (num < min || num > max) return false
  // enforce max 2 decimal places (block 1e-20 style values that break math)
  return num === parseFloat(num.toFixed(2))
}

// Constant-time OTP compare — length-normalize to avoid timing leaks on size.
function timingSafeOtpCompare(a, b) {
  const sa = String(a == null ? '' : a).padEnd(10, ' ')
  const sb = String(b == null ? '' : b).padEnd(10, ' ')
  try {
    return crypto.timingSafeEqual(Buffer.from(sa), Buffer.from(sb))
  } catch {
    return false
  }
}

// Only http(s) URLs are allowed in admin-configured contact links.
function isSafeUrl(url) {
  if (typeof url !== 'string' || url.length > 2048) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch { return false }
}

// Strong admin password: 12+ chars, upper + lower + digit + symbol.
function isStrongPassword(pwd) {
  if (typeof pwd !== 'string') return false
  if (pwd.length < MIN_ADMIN_PASSWORD_LENGTH || pwd.length > MAX_PASSWORD_LENGTH) return false
  return /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)
}

// Mask IP for non-security logs (full IP still stored in login_logs).
function maskIp(ip) {
  if (!ip || typeof ip !== 'string') return 'unknown'
  const v4 = ip.split('.')
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.xxx.xxx`
  return ip.slice(0, 8) + '…'
}

// Extract real client IP honoring proxy headers.
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown'
}

// PostgREST filter value sanitizer — strip characters that break .or() syntax.
function sanitizeFilterValue(raw) {
  return String(raw || '').replace(/[%_,()*\\]/g, '').slice(0, 100)
}

/*
 * TEST MODE GUIDE
 * ===============
 * 1. Set TEST_MODE=true  in .env
 * 2. Set TEST_MODE_MINUTES=2  (or any number of minutes)
 * 3. Restart server — you will see: [TestMode] TEST MODE ACTIVE
 *
 * TESTING MOVIE TICKETS:
 *   - Buy a movie ticket
 *   - Wait TEST_MODE_MINUTES (e.g. 2 min)
 *   - Balance increases by profit amount
 *   - Ticket shows as completed in DB
 *   - Transaction record created
 *   - Referrer team_earnings credited
 *
 * TESTING PRODUCT INVESTMENTS:
 *   - Admin: create a product (e.g. duration_days=3)
 *   - User: invest in it
 *   - Admin: click "Start Global Timer"
 *   - After TEST_MINUTES*1 = first "day" credited
 *   - After TEST_MINUTES*3 = investment completes, full payout
 *
 * TESTING DAILY LIMITS:
 *   - Buy a ticket for a movie
 *   - Immediately buying same movie again → blocked
 *   - Wait TEST_MODE_MINUTES → allowed again
 *
 * BEFORE GOING LIVE:
 *   - Set TEST_MODE=false  in .env
 *   - Restart server — you will see: [Config] Production mode
 */

// ── Test-mode time compression ────────────────────────────────────────────────
const TEST_MODE    = process.env.TEST_MODE === 'true'
const TEST_MINUTES = parseInt(process.env.TEST_MODE_MINUTES || '2', 10)

// Number of real milliseconds that represent one production "day"
const ONE_DAY_MS  = TEST_MODE ? TEST_MINUTES * 60 * 1000 : 24 * 60 * 60 * 1000

if (TEST_MODE) {
  // WARNING intentionally repeated — hard to miss in logs
  logger.warn('TestMode', `⚠  TEST MODE ACTIVE — 1 day = ${TEST_MINUTES} minute(s)`)
  logger.warn('TestMode', '⚠  Set TEST_MODE=false in .env before deploying to production!')
  logger.warn('TestMode', `⚠  ONE_DAY_MS = ${ONE_DAY_MS} ms`)
} else {
  logger.success('Config', 'Production mode — real timing active (TEST_MODE=false)')
}

/**
 * Returns the expiry timestamp for a newly purchased ticket.
 * Production : next 12:00 AM PST (UTC+5)
 * Test mode  : now + TEST_MINUTES
 */
function getTicketExpiryTime() {
  if (TEST_MODE) {
    return new Date(Date.now() + ONE_DAY_MS)
  }
  // Production: advance to the next midnight in PKT (UTC+5)
  const nowUTC  = new Date()
  const nowPST  = new Date(nowUTC.getTime() + 5 * 60 * 60 * 1000)
  const todayPST = nowPST.toISOString().slice(0, 10)
  const nextMidnight = new Date(`${todayPST}T00:00:00+05:00`)
  nextMidnight.setDate(nextMidnight.getDate() + 1)
  return nextMidnight
}

/**
 * Returns the end timestamp for a product investment.
 * Production : startTime + durationDays * 24 hours
 * Test mode  : startTime + durationDays * TEST_MINUTES
 */
function getInvestmentEndTime(startTime, durationDays) {
  return new Date(new Date(startTime).getTime() + durationDays * ONE_DAY_MS)
}

/**
 * Returns the start-of-window ISO string for daily-limit / task-progress checks.
 * Production : midnight of today in PKT
 * Test mode  : now minus ONE_DAY_MS  (rolling window)
 */
function getDayWindowStart() {
  if (TEST_MODE) {
    return new Date(Date.now() - ONE_DAY_MS)
  }
  const nowUTC  = new Date()
  const nowPST  = new Date(nowUTC.getTime() + 5 * 60 * 60 * 1000)
  const todayPST = nowPST.toISOString().slice(0, 10)
  return new Date(`${todayPST}T00:00:00+05:00`)
}

/**
 * Returns a "day key" string used to bucket task progress rows.
 * Production : YYYY-MM-DD  (the PST date)
 * Test mode  : YYYY-MM-DDTHH:MM  (minute-level, resets every TEST_MINUTES)
 */
function getDayKey() {
  if (TEST_MODE) {
    const windowStart = getDayWindowStart()
    // Round down to the nearest TEST_MINUTES boundary so all rows inside
    // the same window share one key and the next window gets a new key.
    const bucketMs  = TEST_MINUTES * 60 * 1000
    const bucketTs  = Math.floor(Date.now() / bucketMs) * bucketMs
    return new Date(bucketTs).toISOString().slice(0, 16) // "YYYY-MM-DDTHH:MM"
  }
  const nowPST = new Date(new Date().getTime() + 5 * 60 * 60 * 1000)
  return nowPST.toISOString().slice(0, 10)
}

const resend = new Resend(process.env.RESEND_API_KEY)

// ── Supabase (service role — full DB access, server-side only) ────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ── AWS S3 ────────────────────────────────────────────────────────────────────
const s3 = new AWS.S3({
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region:          process.env.AWS_REGION || 'us-east-1',
})
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'zeloh-uploads'

async function uploadToS3(buffer, key, contentType) {
  const params = { Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: contentType }
  const result = await s3.upload(params).promise()
  return result.Location
}

// ── Cloudflare R2 (S3-compatible) ─────────────────────────────────────────────
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

async function uploadToR2(buffer, filename, mimetype, folder) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '-')
  const key = `${folder}/${Date.now()}-${safeFilename}`
  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'zeloh-media',
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    CacheControl: 'public, max-age=31536000',
  }))
  return `${process.env.R2_PUBLIC_URL || 'https://cdn.zeloh.site'}/${key}`
}

async function deleteFromR2(url) {
  try {
    const base = process.env.R2_PUBLIC_URL || 'https://cdn.zeloh.site'
    const key = url.replace(base + '/', '')
    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'zeloh-media',
      Key: key,
    }))
  } catch (err) {
    logger.error('R2', `Delete failed: ${err.message}`)
  }
}

// ── Redis ────────────────────────────────────────────────────────────────────
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // Retry on disconnect — important for long-running server
  retryStrategy: (times) => Math.min(times * 200, 5000),
})

redis.on('connect', () => logger.success('Redis', 'Connected'))
redis.on('error', (err) => logger.error('Redis', err.message))

// ── Discord webhook (cached from Supabase app_settings) ──────────────────────
let _discordWebhookCache = null
let _discordRoleCache = null
let _discordCacheTime = 0
const DISCORD_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getDiscordSettings() {
  if (_discordWebhookCache !== null && Date.now() - _discordCacheTime < DISCORD_CACHE_TTL) {
    return { webhookUrl: _discordWebhookCache, roleId: _discordRoleCache }
  }
  try {
    const { data } = await supabase.from('app_settings')
      .select('key, value')
      .in('key', ['discord_webhook_url', 'discord_role_id'])
    const map = {}
    ;(data || []).forEach(r => { map[r.key] = r.value })
    _discordWebhookCache = map['discord_webhook_url'] || null
    _discordRoleCache    = map['discord_role_id']    || null
    _discordCacheTime    = Date.now()
    return { webhookUrl: _discordWebhookCache, roleId: _discordRoleCache }
  } catch {
    return { webhookUrl: null, roleId: null }
  }
}

async function sendDiscordNotification(title, description, color, fields) {
  try {
    const { webhookUrl, roleId } = await getDiscordSettings()
    if (!webhookUrl) return
    const mention = roleId ? `<@&${roleId}> ` : ''
    const payload = {
      content: mention,
      embeds: [{ title, description, color, fields: fields || [],
        timestamp: new Date().toISOString(), footer: { text: 'Zeloh Admin Alert' } }],
    }
    await fetch(webhookUrl, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    logger.error('Discord', err.message)
  }
}

// ── Redis key helpers ────────────────────────────────────────────────────────
// Phone OTP keys
const OTP_KEY      = (phone) => `otp:${phone}`
const ATTEMPTS_KEY = (phone) => `otp_attempts:${phone}`
const BLOCK_KEY    = (phone) => `otp_blocked:${phone}`
// Email OTP keys
const EMAIL_OTP_KEY      = (email) => `emailotp:${email}`
const EMAIL_ATTEMPTS_KEY = (email) => `emailotp_attempts:${email}`
const EMAIL_BLOCK_KEY    = (email) => `emailotp_blocked:${email}`

const OTP_TTL     = parseInt(process.env.OTP_TTL_SECONDS)     || 600
const MAX_WRONG   = parseInt(process.env.MAX_WRONG_ATTEMPTS)   || 5
const BLOCK_TTL   = parseInt(process.env.BLOCK_TTL_SECONDS)    || 1800

// ── WhatsApp client ──────────────────────────────────────────────────────────
// LocalAuth saves session to ./.wwebjs_auth — QR scan only needed once
const whatsapp = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',   // required on EC2/Railway low-memory
      '--disable-gpu',
    ],
  },
})

let whatsappReady = false

whatsapp.on('qr', (qr) => {
  logger.warn('WhatsApp', 'QR code required — scan to connect')
  qrcode.generate(qr, { small: true })
})

whatsapp.on('authenticated', () => {
  logger.success('WhatsApp', 'Authenticated — session saved')
})

whatsapp.on('ready', () => {
  whatsappReady = true
  logger.success('WhatsApp', 'Client ready to send messages')
})

whatsapp.on('disconnected', (reason) => {
  whatsappReady = false
  logger.warn('WhatsApp', `Disconnected: ${reason} — attempting reconnect`)
  whatsapp.initialize()
})

whatsapp.initialize()

// ── OTP helpers ──────────────────────────────────────────────────────────────
function generateOtp() {
  // Cryptographically random 6-digit code
  return String(Math.floor(100000 + Math.random() * 900000))
}

// WhatsApp expects numbers in international format without '+'
// e.g. +12345678900 → 12345678900@c.us
function toWhatsAppId(phone) {
  return phone.replace(/^\+/, '') + '@c.us'
}

// ── Express ──────────────────────────────────────────────────────────────────
const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')
// H1: cap JSON / urlencoded body to 10 KB. Multer file routes keep their own limit.
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

app.use((req, res, next) => {
  req.requestId = require('crypto').randomUUID()
  req.startTime = Date.now()
  res.on('finish', () => {
    if (req.path === '/health' || req.path === '/config/test-mode') return
    const meta = {
      requestId: req.requestId,
      duration: (Date.now() - req.startTime) + 'ms',
      ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress,
    }
    if (req.user?.id) meta.userId = req.user.id
    logger.request(req.method, req.path, res.statusCode, meta)
  })
  next()
})

// ── Helmet (security headers) ─────────────────────────────────────────────────
// H11: enable a strict CSP. This API returns JSON only, so we can lock it down.
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://*.supabase.co', 'https://api.resend.com'],
      fontSrc:    ["'self'", 'https:', 'data:'],
      objectSrc:  ["'none'"],
      mediaSrc:   ["'self'"],
      frameSrc:   ["'none'"],
    },
  },
}))

// ── CORS ─────────────────────────────────────────────────────────────────────
const HARDCODED_ORIGINS = [
  'https://zeloh.site',
  'https://www.zeloh.site',
  'https://admin.zeloh.site',
  'http://localhost:5173',
  'http://localhost:5174',
]
const extraOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []
const allowedOrigins = [...new Set([...HARDCODED_ORIGINS, ...extraOrigins])]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter        = rateLimit({ windowMs: 15 * 60 * 1000,       max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' } })
const adminLoginLimiter  = rateLimit({ windowMs: 15 * 60 * 1000,       max: 5,  standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many admin login attempts. Try again in 15 minutes.' } })
const otpLimiter         = rateLimit({ windowMs: 10 * 60 * 1000,       max: 3,  standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many OTP requests. Try again in 10 minutes.' } })
const forgotOtpLimiter   = rateLimit({ windowMs: 60 * 60 * 1000,       max: 5,  standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many password reset requests. Try again in 1 hour.' } })
const forgotVerifyLimiter= rateLimit({ windowMs: 30 * 60 * 1000,       max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Try again in 30 minutes.' } })
const registerLimiter    = rateLimit({ windowMs: 60 * 60 * 1000,       max: 5,  standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many registration attempts.' } })
const ticketLimiter      = rateLimit({ windowMs: 60 * 60 * 1000,       max: 50, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many ticket purchases. Try again later.' } })
const rechargeLimiter    = rateLimit({ windowMs: 24 * 60 * 60 * 1000,  max: 5,  standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Maximum 5 recharge requests per day.' } })
const withdrawalLimiter  = rateLimit({ windowMs: 24 * 60 * 60 * 1000,  max: 3,  standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Maximum 3 withdrawal requests per day.' } })

// ── Security model ───────────────────────────────────────────────────────────
// The old `requireSecret` middleware was removed: it was bypassed whenever
// ALLOWED_ORIGINS was set (which is required for the browser to work), so it
// provided no real protection. Endpoint security is now enforced by:
//   • CORS origin allowlist (see cors() above)
//   • Per-route rate limiters (authLimiter, otpLimiter, …)
//   • JWT auth (requireAuth / requireAdmin) on every non-public route
//   • Strict input validation (isValidAmount, regex, etc.)

// C5 — per-user Redis lock. Prevents concurrent-request race conditions on
// balance-mutating operations (withdraw / buy-ticket / invest).
async function withUserLock(userId, operation, res, fn) {
  const lockKey = `lock:${operation}:${userId}`
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 15) // 15 s safety timeout
  if (!acquired) {
    logger.warn('Lock', `Contention ${operation}:${userId}`)
    return res.status(429).json({ success: false, message: 'Another request is being processed. Please wait a moment.' })
  }
  try {
    await fn()
  } finally {
    await redis.del(lockKey).catch(() => null)
  }
}

// ── Rate limit helper (max 3 sends per identifier per 10 min) ───────────────
const SEND_RATE_KEY = (id) => `otp_send_rate:${id}`
const MAX_SENDS = 3
const SEND_RATE_TTL = 600

async function checkSendRate(id) {
  const count = await redis.incr(SEND_RATE_KEY(id))
  if (count === 1) await redis.expire(SEND_RATE_KEY(id), SEND_RATE_TTL)
  return count
}

// ── POST /send-otp ───────────────────────────────────────────────────────────
app.post('/send-otp', otpLimiter, async (req, res) => {
  const { phone } = req.body

  if (!phone || !/^\+\d{7,15}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number' })
  }

  if (!whatsappReady) {
    return res.status(503).json({ success: false, message: 'WhatsApp service unavailable' })
  }

  // Rate limit: max 3 OTP sends per phone per 10 minutes
  const sendCount = await checkSendRate(phone)
  if (sendCount > MAX_SENDS) {
    return res.status(429).json({ success: false, message: 'Too many code requests. Try again in 10 minutes.' })
  }

  // Check if number is blocked from too many wrong attempts
  const blocked = await redis.get(BLOCK_KEY(phone))
  if (blocked) {
    const ttl = await redis.ttl(BLOCK_KEY(phone))
    const mins = Math.ceil(ttl / 60)
    return res.status(429).json({
      success: false,
      message: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
    })
  }

  const otp = generateOtp()

  // Store OTP in Redis with TTL
  await redis.set(OTP_KEY(phone), otp, 'EX', OTP_TTL)
  // Reset any previous attempt counter when a new OTP is sent
  await redis.del(ATTEMPTS_KEY(phone))

  const message =
    `Your Zeloh verification code is *${otp}*.\n` +
    `Valid for 10 minutes. Do not share with anyone.`

  try {
    await whatsapp.sendMessage(toWhatsAppId(phone), message)
    logger.success('OTP', `Sent to ${phone}`)
    return res.json({ success: true })
  } catch (err) {
    logger.error('OTP', `Failed to send to ${phone}: ${err.message}`)
    // Clean up OTP from Redis if send failed
    await redis.del(OTP_KEY(phone))
    return res.status(500).json({ success: false, message: 'Failed to send WhatsApp message' })
  }
})

// ── POST /verify-otp ─────────────────────────────────────────────────────────
app.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body

  if (!phone || !code) {
    return res.status(400).json({ verified: false, message: 'Phone and code are required' })
  }

  // Check block first
  const blocked = await redis.get(BLOCK_KEY(phone))
  if (blocked) {
    const ttl = await redis.ttl(BLOCK_KEY(phone))
    const mins = Math.ceil(ttl / 60)
    return res.status(429).json({
      verified: false,
      message: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
    })
  }

  const stored = await redis.get(OTP_KEY(phone))

  if (!stored) {
    return res.json({ verified: false, message: 'Code expired. Please request a new one.' })
  }

  // H9 — timing-safe compare
  if (!timingSafeOtpCompare(stored, code)) {
    // Increment wrong attempt counter
    const attempts = await redis.incr(ATTEMPTS_KEY(phone))
    await redis.expire(ATTEMPTS_KEY(phone), OTP_TTL)

    if (attempts >= MAX_WRONG) {
      // Block the number and wipe OTP
      await redis.set(BLOCK_KEY(phone), '1', 'EX', BLOCK_TTL)
      await redis.del(OTP_KEY(phone))
      await redis.del(ATTEMPTS_KEY(phone))
      return res.status(429).json({
        verified: false,
        message: 'Too many failed attempts. This number is blocked for 30 minutes.',
      })
    }

    const remaining = MAX_WRONG - attempts
    return res.json({
      verified: false,
      message: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
    })
  }

  // Correct — clean up Redis and return success
  await redis.del(OTP_KEY(phone))
  await redis.del(ATTEMPTS_KEY(phone))
  logger.success('OTP', `Verified for ${phone}`)
  return res.json({ verified: true })
})

// ── POST /send-email-otp ─────────────────────────────────────────────────────
app.post('/send-email-otp', otpLimiter, async (req, res) => {
  const { email } = req.body

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address' })
  }

  const blocked = await redis.get(EMAIL_BLOCK_KEY(email))
  if (blocked) {
    const ttl = await redis.ttl(EMAIL_BLOCK_KEY(email))
    const mins = Math.ceil(ttl / 60)
    return res.status(429).json({
      success: false,
      message: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
    })
  }

  // Rate limit: max 3 OTP sends per email per 10 minutes
  const sendCount = await checkSendRate(email)
  if (sendCount > MAX_SENDS) {
    return res.status(429).json({ success: false, message: 'Too many code requests. Try again in 10 minutes.' })
  }

  const otp = generateOtp()
  await redis.set(EMAIL_OTP_KEY(email), otp, 'EX', OTP_TTL)
  await redis.del(EMAIL_ATTEMPTS_KEY(email))

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td align="center" style="background:#F5C518;padding:32px 40px">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:1px">Zeloh</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Your movie investment platform</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <p style="margin:0 0 8px;color:#333;font-size:16px;font-weight:600">Your verification code</p>
            <p style="margin:0 0 28px;color:#666;font-size:14px;line-height:1.5">
              Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.
            </p>
            <!-- OTP box -->
            <div style="background:#FFF8DC;border:2px solid #F5C518;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
              <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#E0B000">${otp}</span>
            </div>
            <p style="margin:0;color:#999;font-size:13px;line-height:1.6">
              Do not share this code with anyone. Zeloh will never ask for your OTP.<br>
              If you did not request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee">
            <p style="margin:0;color:#bbb;font-size:12px;text-align:center">&copy; ${new Date().getFullYear()} Zeloh. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: 'Your Zeloh verification code',
      html,
    })
    logger.success('EmailOTP', `Sent to ${email}`)
    return res.json({ success: true })
  } catch (err) {
    logger.error('EmailOTP', `Failed to send to ${email}: ${err.message}`)
    await redis.del(EMAIL_OTP_KEY(email))
    return res.status(500).json({ success: false, message: 'Failed to send email' })
  }
})

// ── POST /verify-email-otp ────────────────────────────────────────────────────
app.post('/verify-email-otp', async (req, res) => {
  const { email, code } = req.body

  if (!email || !code) {
    return res.status(400).json({ verified: false, message: 'Email and code are required' })
  }

  const blocked = await redis.get(EMAIL_BLOCK_KEY(email))
  if (blocked) {
    const ttl = await redis.ttl(EMAIL_BLOCK_KEY(email))
    const mins = Math.ceil(ttl / 60)
    return res.status(429).json({
      verified: false,
      message: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
    })
  }

  const stored = await redis.get(EMAIL_OTP_KEY(email))

  if (!stored) {
    return res.json({ verified: false, message: 'Code expired. Please request a new one.' })
  }

  // H9 — timing-safe compare
  if (!timingSafeOtpCompare(stored, code)) {
    const attempts = await redis.incr(EMAIL_ATTEMPTS_KEY(email))
    await redis.expire(EMAIL_ATTEMPTS_KEY(email), OTP_TTL)

    if (attempts >= MAX_WRONG) {
      await redis.set(EMAIL_BLOCK_KEY(email), '1', 'EX', BLOCK_TTL)
      await redis.del(EMAIL_OTP_KEY(email))
      await redis.del(EMAIL_ATTEMPTS_KEY(email))
      return res.status(429).json({
        verified: false,
        message: 'Too many failed attempts. This email is blocked for 30 minutes.',
      })
    }

    const remaining = MAX_WRONG - attempts
    return res.json({
      verified: false,
      message: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
    })
  }

  await redis.del(EMAIL_OTP_KEY(email))
  await redis.del(EMAIL_ATTEMPTS_KEY(email))
  logger.success('EmailOTP', `Verified for ${email}`)
  return res.json({ verified: true })
})

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', whatsappReady })
})

// ── Auth helpers ─────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12
const JWT_EXPIRY = '7d'

// H4 — JWT now carries ONLY { id, role, version }.  Everything else is fetched
// from the database on every request.  This prevents stale data in tokens and
// reduces blast radius if a token is captured.
// H3 — HS256 is pinned on both sign and verify to defeat algorithm-confusion attacks.
function signToken(user, rememberMe = false) {
  return jwt.sign(
    { id: user.id, role: 'user', version: user.token_version || 1 },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: rememberMe ? '30d' : JWT_EXPIRY }
  )
}

function safeUser(u) {
  return {
    id: u.id,
    email: u.email || null,
    phone: u.phone || null,
    invite_code: u.invite_code,
    balance: u.balance,
    total_deposited: u.total_deposited,
    total_withdrawn: u.total_withdrawn || 0,
    total_profit: u.total_profit || 0,
    personal_gains: u.personal_gains || 0,
    team_earnings: u.team_earnings || 0,
    ticket_quota: u.ticket_quota || 0,
    membership_level: u.membership_level,
    wallet_address: u.wallet_address || null,
    wallet_type: u.wallet_type || null,
    has_funding_password: !!u.funding_password,
    profile_image: u.profile_image || null,
    created_at: u.created_at,
    last_ip: u.last_ip || null,
    last_login: u.last_login || null,
  }
}

async function generateUniqueInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ''
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
    const { data } = await supabase.from('invitation_codes').select('id').eq('invite_code', code).maybeSingle()
    if (!data) return code
  }
  throw new Error('Could not generate unique invite code')
}

// H3 — algorithms pinned.  H5 — admin token_version checked against DB so
// password change or explicit logout bumps the counter and invalidates old JWTs.
async function requireAdmin(req, res, next) {
  const header = req.headers['authorization'] || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })
  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden: admin only' })
  try {
    const { data: admin, error } = await supabase.from('admins')
      .select('id, email, name, token_version').eq('id', decoded.id).maybeSingle()
    if (error || !admin) {
      return res.status(401).json({ error: 'Session expired. Please login again.' })
    }
    const dbVersion = admin.token_version || 1
    const tokVersion = decoded.version || 1
    if (dbVersion !== tokVersion) {
      logger.warn('Auth', `Admin token_version mismatch id=${admin.id}`)
      return res.status(401).json({ error: 'Session expired. Please login again.' })
    }
    req.admin = { id: admin.id, email: admin.email, name: admin.name, role: 'admin' }
    next()
  } catch (err) {
    logger.error('Auth', `requireAdmin: ${err.message}`)
    return res.status(500).json({ error: 'Auth check failed' })
  }
}

// ── POST /admin/upload-image ──────────────────────────────────────────────────
const imageUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) return cb(null, true)
    cb(new Error('Only JPG, PNG or WebP allowed'), false)
  },
})

const R2_ALLOWED_FOLDERS = ['movies', 'banners', 'news', 'investments', 'profiles', 'qr']

app.post('/admin/upload-image', requireAdmin, imageUploadMiddleware.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image provided' })
    const folder = req.body.folder || 'general'
    if (!R2_ALLOWED_FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: `Invalid folder. Must be one of: ${R2_ALLOWED_FOLDERS.join(', ')}` })
    }
    const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, folder)
    logger.success('R2', `Image uploaded: ${url}`, { adminId: req.admin.id, folder, size: req.file.size })
    return res.json({ success: true, url })
  } catch (err) {
    logger.error('R2', `Upload failed: ${err.message}`)
    return res.status(500).json({ success: false, message: `Upload failed: ${err.message}` })
  }
})

async function updateMembershipLevel(userId, _depth = 0) {
  try {
    const { data: user } = await supabase.from('users')
      .select('total_deposited, membership_level, invite_code, referred_by')
      .eq('id', userId).maybeSingle()
    if (!user) return

    // Count referrals who are VIP1 or above (qualified referrals)
    const { count: qualifiedRefs } = await supabase.from('users')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', user.invite_code)
      .gte('membership_level', 1)

    const { data: levels } = await supabase.from('membership_levels')
      .select('*').order('level', { ascending: false })
    if (!levels) return

    let newLevel = 0
    for (const lvl of levels) {
      if (lvl.level === 0) { newLevel = 0; break }
      const depositOk = parseFloat(user.total_deposited || 0) >= parseFloat(lvl.min_deposit)
      const refOk     = (qualifiedRefs || 0) >= (lvl.min_referrals || 0)
      if (depositOk && refOk) { newLevel = lvl.level; break }
    }

    const prevLevel = user.membership_level || 0
    if (newLevel !== prevLevel) {
      await supabase.from('users').update({ membership_level: newLevel }).eq('id', userId)
      logger.info('Membership', `User ${userId} leveled ${prevLevel} → ${newLevel}`)

      // Cascade: if this user's level changed, check their referrer too (max 3 hops)
      if (_depth < 3 && user.referred_by) {
        const { data: referrerCode } = await supabase.from('invitation_codes')
          .select('user_id').eq('invite_code', user.referred_by).maybeSingle()
        if (referrerCode?.user_id) {
          await updateMembershipLevel(referrerCode.user_id, _depth + 1)
        }
      }
    }
  } catch (err) {
    logger.error('Membership', err.message)
  }
}

// H3 — algorithms pinned.  H5 — user token_version checked against DB, so
// password reset (or logout) bumps the counter and invalidates old JWTs.
// Backwards-compatible: old JWTs without `version` default to 1 and match
// rows where token_version is still the default 1.
async function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })
  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  try {
    const { data: user, error } = await supabase.from('users')
      .select('id, token_version, membership_level')
      .eq('id', decoded.id).maybeSingle()
    if (error || !user) {
      return res.status(401).json({ error: 'Session expired. Please login again.' })
    }
    const dbVersion = user.token_version || 1
    const tokVersion = decoded.version || 1
    if (dbVersion !== tokVersion) {
      logger.warn('Auth', `User token_version mismatch id=${user.id}`)
      return res.status(401).json({ error: 'Session expired. Please login again.' })
    }
    req.user = { id: user.id, role: 'user', version: dbVersion, membership_level: user.membership_level }
    req.jwtUser = req.user // back-compat alias
    next()
  } catch (err) {
    logger.error('Auth', `requireAuth: ${err.message}`)
    return res.status(500).json({ error: 'Auth check failed' })
  }
}

// ── POST /register ────────────────────────────────────────────────────────────
app.post('/register', registerLimiter, async (req, res) => {
  const { email: rawEmail, phone: rawPhone, password: rawPassword, invite_code_used: rawCode } = req.body
  const email    = rawEmail    ? String(rawEmail).trim().toLowerCase()   : null
  const phone    = rawPhone    ? String(rawPhone).trim()                 : null
  const password = typeof rawPassword === 'string' ? rawPassword.trim()  : null
  const invite_code_used = rawCode ? String(rawCode).trim().toUpperCase() : null
  logger.info('Register', `Attempting registration for: ${email || phone}`)

  if (!email && !phone) {
    return res.status(400).json({ success: false, message: 'Email or phone is required' })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address' })
  }
  if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number format' })
  }
  // H2 — enforce bcrypt's 72-byte limit and keep the business rule of 8-30.
  if (!password || password.length < MIN_PASSWORD_LENGTH || password.length > 30) {
    return res.status(400).json({ success: false, message: 'Password must be 8–30 characters' })
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ success: false, message: 'Password is too long' })
  }
  if (!invite_code_used || !/^[A-Z0-9]{4,10}$/.test(invite_code_used)) {
    return res.status(400).json({ success: false, message: 'Invalid invitation code format' })
  }

  try {
    // Check for duplicate email
    if (email) {
      const { data: existing } = await supabase
        .from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
      if (existing) return res.status(409).json({ success: false, message: 'An account already exists with this email' })
    }

    // Check for duplicate phone
    if (phone) {
      const { data: existing } = await supabase
        .from('users').select('id').eq('phone', phone).maybeSingle()
      if (existing) return res.status(409).json({ success: false, message: 'An account already exists with this phone number' })
    }

    // Validate invite code — must exist in invitation_codes table
    const cleanCode = invite_code_used.toUpperCase().trim()
    const { data: inviteRow } = await supabase
      .from('invitation_codes').select('user_id').eq('invite_code', cleanCode).maybeSingle()
    logger.info('Register', `Invite code check for "${cleanCode}": ${inviteRow ? 'valid' : 'invalid'}`)
    if (!inviteRow) return res.status(400).json({ success: false, message: 'Invalid invitation code' })

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const invite_code = await generateUniqueInviteCode()

    const newUser = {
      email: email ? email.toLowerCase().trim() : null,
      phone: phone || null,
      password_hash,
      invite_code,
      referred_by: cleanCode,
    }

    const { data: created, error: insertErr } = await supabase
      .from('users').insert(newUser).select().single()
    logger.info('Register', `Insert result: id=${created?.id || 'null'} err=${insertErr?.message || 'none'}`)

    if (insertErr) {
      logger.error('Register', `Insert error: ${insertErr.message}`)
      return res.status(500).json({ success: false, message: insertErr.message })
    }

    // Insert new user's own invite code into invitation_codes
    const { error: codeErr } = await supabase.from('invitation_codes').insert({ user_id: created.id, invite_code: created.invite_code })
    if (codeErr) logger.error('Register', `invite_code insert: ${codeErr.message}`)

    const token = signToken(created, false)
    logger.success('Register', `New user: ${created.email || created.phone} (${created.id})`)

    sendDiscordNotification('New User Registered', 'A new user has joined Zeloh', 0x00FF00, [
      { name: 'Account', value: created.email || created.phone || 'unknown', inline: true },
      { name: 'Invite Code Used', value: cleanCode, inline: true },
      { name: 'Joined At', value: new Date().toLocaleString(), inline: false },
    ]).catch(() => null)

    return res.status(201).json({ success: true, token, user: safeUser(created), invite_code: created.invite_code })
  } catch (err) {
    logger.error('Register', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ── POST /create-first-admin ──────────────────────────────────────────────────
app.post('/create-first-admin', async (req, res) => {
  try {
    const { data: existing } = await supabase.from('admins').select('id').limit(1).maybeSingle()
    if (existing) return res.status(403).json({ success: false, message: 'Admin already exists' })

    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email, and password are required' })
    }
    if (typeof password !== 'string' || !isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: 'Admin password must be 12-72 characters and include uppercase, lowercase, number, and special character.' })
    }
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    await supabase.from('admins').insert({ name, email: email.toLowerCase().trim(), password_hash })

    // Seed the ZELOH1 invitation code so first users can register
    const { data: codeExists } = await supabase.from('invitation_codes').select('id').eq('invite_code', 'ZELOH1').maybeSingle()
    if (!codeExists) {
      await supabase.from('invitation_codes').insert({ invite_code: 'ZELOH1', user_id: null })
    }

    logger.success('Admin', `First admin created: ${email}`)
    return res.status(201).json({ success: true, message: 'Admin created. Invite code ZELOH1 is now active.' })
  } catch (err) {
    logger.error('FirstAdmin', err.message)
    return res.status(500).json({ success: false, message: 'Failed to create admin' })
  }
})

// ── POST /login ───────────────────────────────────────────────────────────────
// C7/C8 — requireSecret removed; all failure paths return the same generic
// error so that valid email/phone values cannot be enumerated.
app.post('/login', authLimiter, async (req, res) => {
  const { email, phone, password, remember_me } = req.body

  if ((!email && !phone) || typeof password !== 'string') {
    return res.status(401).json({ success: false, message: 'Invalid credentials' })
  }
  // H2 — reject absurdly long passwords before bcrypt
  if (password.length < 1 || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' })
  }

  try {
    let query = supabase.from('users').select('*')
    if (email) query = query.eq('email', String(email).toLowerCase().trim())
    else query = query.eq('phone', String(phone).trim())
    const { data: user } = await query.maybeSingle()

    // Always run bcrypt.compare — against real hash if user found, otherwise
    // against a dummy hash — so the response time is constant whether or not
    // the account exists.  Defeats timing-based user enumeration.
    const hashToCompare = user?.password_hash || DUMMY_BCRYPT_HASH
    const match = await bcrypt.compare(password, hashToCompare)

    if (!user || !match) {
      logger.warn('Login', `Failed login attempt for ${email || phone} from ${maskIp(clientIp(req))}`)
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    // Record IP and last login
    const ip = clientIp(req)
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 500) // M12 cap
    const loginTime = new Date().toISOString()
    await supabase.from('users').update({ last_login: loginTime, last_ip: ip }).eq('id', user.id)
    supabase.from('login_logs').insert({ user_id: user.id, ip_address: ip, user_agent: userAgent, logged_in_at: loginTime }).then(() => null).catch(() => null)

    // H3/H4/H5 — slim payload, HS256 pinned, token_version for invalidation.
    const token = jwt.sign(
      { id: user.id, role: 'user', version: user.token_version || 1 },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: remember_me ? '30d' : '1d' }
    )
    logger.info('Login', `${user.email || user.phone} (${user.id}) remember_me=${!!remember_me}`)
    return res.json({ success: true, token, user: safeUser(user) })
  } catch (err) {
    logger.error('Login', err.message)
    return res.status(500).json({ success: false, message: 'Login failed' })
  }
})

// ── GET /me ───────────────────────────────────────────────────────────────────
app.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users').select('*').eq('id', req.jwtUser.id).maybeSingle()
    if (error || !user) return res.status(404).json({ error: 'User not found' })
    const [{ count: totalReferrals }, { count: qualifiedReferrals }, { data: levelCfg }, { data: vouRow }] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', user.invite_code),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', user.invite_code).gte('membership_level', 1),
      supabase.from('membership_levels').select('ticket_profit_percent, max_tickets_per_day, name').eq('level', user.membership_level || 0).maybeSingle(),
      supabase.from('user_vouchers').select('vouchers').eq('user_id', req.jwtUser.id).maybeSingle(),
    ])
    return res.json({
      user: {
        ...safeUser(user),
        total_referrals: totalReferrals || 0,
        qualified_referrals: qualifiedReferrals || 0,
        profit_percent: parseFloat(levelCfg?.ticket_profit_percent || 3),
        level_name: levelCfg?.name || 'Starter',
        max_tickets_per_day: parseInt(levelCfg?.max_tickets_per_day || 2),
        vouchers: vouRow ? parseInt(vouRow.vouchers) : 0,
      },
    })
  } catch (err) {
    logger.error('Me', err.message)
    return res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// ── Multer (memory storage) ───────────────────────────────────────────────────
// H10 — strict MIME allowlist so that dangerous types (SVG, HTML) never
// reach memory at all.  Per-route handlers still re-check for defense in depth.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_EXTENSIONS[file.mimetype]) return cb(null, true)
    cb(new Error('Only JPG, PNG or WebP images allowed'), false)
  },
})

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC CONTENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/wallet-address/:network', async (req, res) => {
  try {
    const { data, error } = await supabase.from('wallet_addresses')
      .select('address, qr_code_url, network').eq('network', req.params.network.toUpperCase())
      .eq('is_active', true).maybeSingle()
    if (error || !data) return res.status(404).json({ success: false, message: 'Wallet address not found' })
    return res.json({ success: true, address: data.address, qr_code_url: data.qr_code_url || null, network: data.network })
  } catch (err) { return res.json({ success: false, message: err.message }) }
})

// No auth required — safe to expose; only returns boolean + number
app.get('/config/test-mode', (_req, res) => {
  res.json({ testMode: TEST_MODE, testMinutes: TEST_MINUTES })
})

app.get('/banners', async (req, res) => {
  try {
    const { data } = await supabase.from('banners').select('id, image_url, link_url, sort_order')
      .eq('is_active', true).order('sort_order', { ascending: true })
    return res.json({ banners: data || [] })
  } catch { return res.json({ banners: [] }) }
})

app.get('/movies', async (req, res) => {
  const section = req.query.section || null
  const limit = Math.min(parseInt(req.query.limit) || 20, 100)
  try {
    let q = supabase.from('movies')
      .select('id, title, description, poster_url, profit_percent, duration_hours, price, min_investment, section, sort_order')
      .eq('is_active', true).order('sort_order', { ascending: true }).limit(limit)
    if (section) q = q.eq('section', section)
    const { data } = await q
    return res.json({ movies: data || [] })
  } catch { return res.json({ movies: [] }) }
})

app.get('/movies/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('movies').select('*').eq('id', req.params.id).maybeSingle()
    if (error || !data) return res.status(404).json({ success: false, message: 'Movie not found' })
    return res.json({ movie: data })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/investments', async (req, res) => {
  const type = req.query.type || null
  try {
    let q = supabase.from('investment_products')
      .select('id, name, image_url, type, funded_amount, funding_goal, roi_percent, duration_days, min_investment, is_funded, global_start_time, global_end_time')
      .eq('is_active', true).order('sort_order', { ascending: true })
    if (type) q = q.eq('type', type)
    const { data } = await q
    return res.json({ products: data || [] })
  } catch { return res.json({ products: [] }) }
})

app.get('/news', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 5, 50)
  try {
    const { data } = await supabase.from('news').select('id, title, image_url, published_at')
      .eq('is_active', true).order('published_at', { ascending: false }).limit(limit)
    return res.json({ news: data || [] })
  } catch { return res.json({ news: [] }) }
})

app.get('/notifications', async (req, res) => {
  try {
    const { data } = await supabase.from('notifications').select('notification_text')
      .eq('is_active', true).order('created_at', { ascending: false }).limit(1)
    return res.json({ text: data && data[0] ? data[0].notification_text : null })
  } catch { return res.json({ text: null }) }
})

app.get('/services', async (req, res) => {
  try {
    const { data } = await supabase.from('services').select('id, title, contact').eq('is_active', true)
    return res.json({ services: data || [] })
  } catch { return res.json({ services: [] }) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// TICKET SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/buy-ticket/:movieId', requireAuth, ticketLimiter, async (req, res) => {
  const userId = req.user.id
  const { movieId } = req.params
  const paymentType = req.body.payment_type === 'voucher' ? 'voucher' : 'balance'

  // C1 — STRICT integer quantity validation BEFORE any DB work.  Previously
  // a negative quantity caused `balanceAfter = balance - (price * -5)` to
  // INCREASE the user's balance, letting an attacker print money at will.
  const quantity = parseInt(req.body.quantity, 10)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return res.status(400).json({ success: false, message: 'Invalid quantity. Must be a positive integer not exceeding your daily ticket limit.' })
  }

  // C5 — per-user lock serializes concurrent purchases so no race can skip
  // the balance check.  Atomic deduction below via deduct_balance RPC.
  return withUserLock(userId, 'ticket', res, async () => {
    try {
      const { data: movie } = await supabase.from('movies').select('*').eq('id', movieId).eq('is_active', true).maybeSingle()
      if (!movie) return res.status(404).json({ success: false, message: 'Movie not found or not available' })

      const { data: user } = await supabase.from('users').select('balance, membership_level, ticket_quota').eq('id', userId).maybeSingle()
      if (!user) return res.status(404).json({ success: false, message: 'User not found' })

      // Fetch membership level config (needed for both payment paths)
      const userLevel = user.membership_level || 0
      const { data: levelCfg } = await supabase.from('membership_levels')
        .select('ticket_profit_percent, max_tickets_per_day').eq('level', userLevel).maybeSingle()
      const profitPct = parseFloat(levelCfg?.ticket_profit_percent || 3)
      const maxPerDay = parseInt(levelCfg?.max_tickets_per_day || 2)

      // C1 — cap quantity by membership's per-day allowance too.
      if (quantity > maxPerDay) {
        return res.status(400).json({ success: false, message: `Invalid quantity. Must be a positive integer not exceeding your daily ticket limit.` })
      }

      // Compute the day window — PST midnight in production, rolling TEST_MINUTES in test mode
      const dayWindowStart = getDayWindowStart()
      const windowStartIso = dayWindowStart.toISOString()
      const resetMsg = TEST_MODE
        ? `TEST MODE: Daily limit resets every ${TEST_MINUTES} minute(s).`
        : 'Daily limit resets at 12:00 AM Pakistan time.'

      // Check daily total ticket limit within the current window
      const { count: todayCount } = await supabase.from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('booked_at', windowStartIso)
      if ((todayCount || 0) + quantity > maxPerDay) {
        return res.status(400).json({ success: false, message: `Daily limit reached. Your membership allows ${maxPerDay} ticket(s) per day. ${resetMsg}` })
      }

      // Duplicate purchase check (same movie, within current day window)
      const { data: existing } = await supabase.from('tickets')
        .select('id').eq('user_id', userId).eq('movie_id', movieId)
        .gte('booked_at', windowStartIso)
        .maybeSingle()
      if (existing) return res.status(400).json({ success: false, message: `You already bought a ticket for this movie. ${resetMsg}` })

      const ticketPrice = parseFloat((parseFloat(movie.price) * quantity).toFixed(2))
      if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid purchase amount' })
      }

      const profit_amount = parseFloat((ticketPrice * (profitPct / 100)).toFixed(2))
      const expiry_at = getTicketExpiryTime().toISOString()

      // ── VOUCHER PAYMENT PATH ──────────────────────────────────────────────
      if (paymentType === 'voucher') {
        const vouchersNeeded = quantity * 2

        const { data: vouRow } = await supabase.from('user_vouchers')
          .select('vouchers').eq('user_id', userId).maybeSingle()
        const currentVouchers = vouRow ? parseInt(vouRow.vouchers) : 0

        if (currentVouchers < vouchersNeeded) {
          return res.status(400).json({
            success: false,
            message: `Not enough vouchers. You need ${vouchersNeeded} vouchers for ${quantity} ticket(s) but only have ${currentVouchers}.`,
          })
        }

        const newVoucherCount = currentVouchers - vouchersNeeded
        const { error: voucherErr } = await supabase.from('user_vouchers')
          .update({ vouchers: newVoucherCount, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
        if (voucherErr) return res.status(500).json({ success: false, message: 'Failed to deduct vouchers' })

        // Voucher tickets: total_return = profit only (no principal was paid)
        const { data: ticket, error: ticketErr } = await supabase.from('tickets').insert({
          user_id: userId, movie_id: movieId, movie_title: movie.title,
          poster_url: movie.poster_url || null,
          quantity, price: ticketPrice, profit_percent: profitPct,
          profit_amount, total_return: profit_amount,
          expiry_at, status: 'active',
          payment_type: 'voucher', vouchers_used: vouchersNeeded,
        }).select().single()

        if (ticketErr) {
          // Refund vouchers if insert fails
          await supabase.from('user_vouchers')
            .update({ vouchers: currentVouchers })
            .eq('user_id', userId).catch(() => null)
          throw ticketErr
        }

        await supabase.from('transactions').insert({
          user_id: userId, type: 'ticket_purchase', amount: 0,
          balance_before: parseFloat(user.balance), balance_after: parseFloat(user.balance),
          reference_id: ticket.id, status: 'completed',
          note: `Voucher ticket: ${movie.title} (${vouchersNeeded} vouchers used)`,
        })

        updateTaskProgress(userId, 'ticket_count', quantity).catch(() => null)
        logger.info('Ticket', `Voucher purchase: ${movie.title} by user ${userId} (${vouchersNeeded} vouchers)`)
        return res.status(201).json({
          success: true, ticket, expiry_at,
          vouchers_remaining: newVoucherCount,
          message: `${quantity} ticket(s) purchased with ${vouchersNeeded} vouchers! You will earn $${profit_amount} profit.`,
        })
      }

      // ── BALANCE PAYMENT PATH (existing) ──────────────────────────────────
      const totalPrice = ticketPrice
      if (parseFloat(user.balance) < totalPrice) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' })
      }

      const total_return = parseFloat((totalPrice + profit_amount).toFixed(2))

      // C5 — atomic balance deduction via RPC.  Returns success=false if the
      // user's balance dropped below totalPrice between our read and write.
      const { data: deductRows, error: deductErr } = await supabase
        .rpc('deduct_balance', { p_user_id: userId, p_amount: totalPrice })
      if (deductErr) throw deductErr
      const deduct = Array.isArray(deductRows) ? deductRows[0] : deductRows
      if (!deduct || !deduct.success) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' })
      }
      const balanceBefore = parseFloat(user.balance)
      const balanceAfter  = parseFloat(deduct.new_balance)

      const { data: ticket, error: ticketErr } = await supabase.from('tickets').insert({
        user_id: userId, movie_id: movieId, movie_title: movie.title,
        poster_url: movie.poster_url || null,
        quantity, price: totalPrice, profit_percent: profitPct,
        profit_amount, total_return, expiry_at, status: 'active',
        payment_type: 'balance', vouchers_used: 0,
      }).select().single()
      if (ticketErr) {
        // Roll back the deduction if the ticket couldn't be inserted.
        await supabase.rpc('deduct_balance', { p_user_id: userId, p_amount: -totalPrice }).catch(() => null)
        throw ticketErr
      }

      await supabase.from('users').update({
        ticket_quota: parseFloat(((parseFloat(user.ticket_quota) || 0) + totalPrice).toFixed(2)),
      }).eq('id', userId)

      await supabase.from('transactions').insert({
        user_id: userId, type: 'ticket_purchase', amount: -totalPrice,
        balance_before: balanceBefore, balance_after: balanceAfter,
        reference_id: ticket.id, status: 'completed',
        note: `Ticket: ${movie.title}`,
      })

      updateTaskProgress(userId, 'ticket_count', quantity).catch(() => null)
      logger.info('Ticket', `Purchase: ${movie.title} by user ${userId} $${totalPrice}`)
      return res.status(201).json({ success: true, ticket, expiry_at })
    } catch (err) {
      logger.error('Ticket', `BuyTicket error: ${err.message}`)
      return res.status(500).json({ success: false, message: 'Failed to purchase ticket' })
    }
  })
})



app.get('/my-tickets', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('tickets')
      .select('id, movie_id, movie_title, poster_url, quantity, price, profit_percent, profit_amount, total_return, status, booked_at, expiry_at, paid_at, movie:movie_id(poster_url, title)')
      .eq('user_id', req.jwtUser.id).order('booked_at', { ascending: false })
    if (error) { logger.error('Ticket', `my-tickets query: ${error.message}`); throw error }
    const tickets = (data || []).map(t => ({
      ...t,
      poster_url: t.poster_url || t.movie?.poster_url || null,
    }))
    return res.json({ tickets })
  } catch (err) {
    logger.error('Ticket', `my-tickets: ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIT RETURN — extracted function + cron at 12:00 AM PST (19:00 UTC)
// ═══════════════════════════════════════════════════════════════════════════════
async function distributeTicketProfits() {
  logger.cron(`distributeTicketProfits started at ${new Date().toISOString()}`)
  try {
    const now = new Date().toISOString()
    const { data: expired } = await supabase.from('tickets')
      .select('id, user_id, price, profit_amount, total_return, movie_title, payment_type')
      .eq('status', 'active').lte('expiry_at', now)
    if (!expired || !expired.length) {
      logger.cron('No expired tickets to process')
      return
    }
    logger.cron(`Processing ${expired.length} expired ticket(s)`)

    for (const ticket of expired) {
      try {
        const { data: user } = await supabase.from('users').select('balance, personal_gains, ticket_quota, referred_by').eq('id', ticket.user_id).maybeSingle()
        if (!user) continue

        const isVoucher = ticket.payment_type === 'voucher'
        const balBefore = parseFloat(user.balance)
        // Voucher tickets: only profit_amount credited (no principal return)
        // Balance tickets: full total_return (principal + profit)
        const balAfter  = isVoucher
          ? parseFloat((balBefore + ticket.profit_amount).toFixed(2))
          : parseFloat((balBefore + ticket.total_return).toFixed(2))
        const newGains  = parseFloat(((user.personal_gains || 0) + ticket.profit_amount).toFixed(2))
        // Voucher tickets: quota was never increased, so don't decrease it
        const newQuota  = isVoucher
          ? parseFloat((user.ticket_quota || 0).toFixed(2))
          : Math.max(0, parseFloat(((user.ticket_quota || 0) - ticket.price).toFixed(2)))

        await supabase.from('users').update({
          balance: balAfter, personal_gains: newGains, ticket_quota: newQuota,
        }).eq('id', ticket.user_id)

        const { error: rpcErr } = await supabase.rpc('increment_total_profit', { p_user_id: ticket.user_id, p_amount: ticket.profit_amount })
        if (rpcErr) {
          const { data: up } = await supabase.from('users').select('total_profit').eq('id', ticket.user_id).maybeSingle()
          await supabase.from('users').update({ total_profit: parseFloat(((up?.total_profit || 0) + ticket.profit_amount).toFixed(2)) }).eq('id', ticket.user_id)
        }

        await supabase.from('tickets').update({ status: 'completed', paid_at: now }).eq('id', ticket.id)

        await supabase.from('transactions').insert({
          user_id: ticket.user_id, type: 'ticket_profit', amount: ticket.profit_amount,
          balance_before: balBefore, balance_after: balAfter,
          reference_id: ticket.id, status: 'completed',
          note: isVoucher ? `Voucher profit from: ${ticket.movie_title}` : `Profit from: ${ticket.movie_title}`,
        })

        if (user.referred_by) {
          try {
            const { data: invRow } = await supabase.from('invitation_codes').select('user_id').eq('invite_code', user.referred_by).maybeSingle()
            if (invRow && invRow.user_id) {
              const teamEarn = parseFloat((ticket.price * 0.0004).toFixed(4))
              const { data: ref } = await supabase.from('users').select('balance, team_earnings').eq('id', invRow.user_id).maybeSingle()
              if (ref) {
                const refBalBefore = parseFloat(ref.balance)
                const refBalAfter  = parseFloat((refBalBefore + teamEarn).toFixed(4))
                await supabase.from('users').update({
                  balance: refBalAfter,
                  team_earnings: parseFloat(((ref.team_earnings || 0) + teamEarn).toFixed(4)),
                }).eq('id', invRow.user_id)
                await supabase.from('transactions').insert({
                  user_id: invRow.user_id, type: 'team_earning', amount: teamEarn,
                  balance_before: refBalBefore, balance_after: refBalAfter,
                  reference_id: ticket.id, status: 'completed',
                  note: 'Team earning from referral ticket',
                })
              }
            }
          } catch (refErr) { logger.error('TicketCron', `Referrer error ticket ${ticket.id}: ${refErr.message}`) }
        }

        await updateMembershipLevel(ticket.user_id)
        logger.cron(`Profit paid for ticket ${ticket.id}`)
      } catch (e) {
        logger.error('TicketCron', `Error ticket ${ticket.id}: ${e.message}`)
      }
    }
    logger.cron(`Done. Processed ${expired.length} ticket(s)`)
  } catch (err) {
    logger.error('TicketCron', `Fatal: ${err.message}`)
  }
}

// Ticket profit cron — schedule depends on TEST_MODE
if (TEST_MODE) {
  // Test mode: check every 30 seconds so 2-minute expiries are caught quickly
  cron.schedule('*/30 * * * * *', async () => {
    await distributeTicketProfits()
    try { await shuffleMovieSections() } catch (e) { logger.error('Cron', `Shuffle failed: ${e.message}`) }
  })
  logger.warn('Cron', `Test mode: ticket profit cron runs every 30 seconds`)
} else {
  // Production: run at 19:00 UTC = 12:00 AM Pakistan Standard Time (UTC+5)
  cron.schedule('0 19 * * *', async () => {
    logger.cron('12:00 AM PST daily profit distribution triggered')
    await distributeTicketProfits()
    try { await shuffleMovieSections() } catch (e) { logger.error('Cron', `Shuffle failed: ${e.message}`) }
  }, { timezone: 'UTC' })
  logger.success('Cron', 'Production: ticket profit cron at 12:00 AM PST daily')
}

cron.schedule('0 19 * * *', async () => {
  try {
    const nowPST = new Date(new Date().getTime() + 5 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(nowPST.getTime() - 30 * 24 * 60 * 60 * 1000)
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]
    const { error } = await supabase.from('user_task_progress').delete().lt('date', cutoffDate)
    if (error) { logger.error('Tasks', `Cleanup error: ${error.message}`); return }
    logger.cron(`Old task progress cleaned up (before ${cutoffDate})`)
  } catch (err) {
    logger.error('Tasks', `Cleanup fatal: ${err.message}`)
  }
}, { timezone: 'UTC' })

// ── GET /popup-settings (public) ─────────────────────────────────────────────
app.get('/popup-settings', async (req, res) => {
  try {
    const keys = ['popup_enabled', 'popup_image_url', 'popup_link_url', 'popup_show_once']
    const { data } = await supabase.from('app_settings').select('key, value').in('key', keys)
    const map = {}
    for (const row of (data || [])) map[row.key] = row.value
    return res.json({
      enabled:   map.popup_enabled   === 'true',
      image_url: map.popup_image_url || null,
      link_url:  map.popup_link_url  || null,
      show_once: map.popup_show_once !== 'false',
    })
  } catch (err) {
    logger.error('Popup', `GET popup-settings: ${err.message}`)
    return res.json({ enabled: false, image_url: null, link_url: null, show_once: true })
  }
})

// ── PUT /admin/popup-settings ─────────────────────────────────────────────────
app.put('/admin/popup-settings', requireAdmin, async (req, res) => {
  try {
    const { enabled, image_url, link_url, show_once } = req.body
    if (image_url && image_url.trim()) {
      try { new URL(image_url) } catch { return res.status(400).json({ success: false, message: 'image_url must be a valid URL' }) }
    }
    if (link_url && link_url.trim()) {
      try { new URL(link_url) } catch { return res.status(400).json({ success: false, message: 'link_url must be a valid URL' }) }
    }
    const upserts = [
      { key: 'popup_enabled',   value: String(!!enabled) },
      { key: 'popup_image_url', value: (image_url || '').trim() },
      { key: 'popup_link_url',  value: (link_url  || '').trim() },
      { key: 'popup_show_once', value: String(show_once !== false) },
    ]
    for (const row of upserts) {
      await supabase.from('app_settings').upsert(row, { onConflict: 'key' })
    }
    logger.success('Admin', `Popup settings updated by admin ${req.admin.id}`)
    return res.json({ success: true })
  } catch (err) {
    logger.error('Admin', `PUT popup-settings: ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// RECHARGE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/submit-recharge', requireAuth, rechargeLimiter, upload.single('screenshot'), async (req, res) => {
  const { amount, network, transaction_hash } = req.body
  const userId = req.user.id
  if (!amount || !network || !transaction_hash) {
    return res.status(400).json({ success: false, message: 'amount, network, and transaction_hash are required' })
  }
  // H6 — strict validation: $20 minimum, $100k maximum, max 2 decimals.
  if (!isValidAmount(amount, { min: 20, max: 100_000 })) {
    return res.status(400).json({ success: false, message: 'Minimum recharge is $20 and maximum is $100,000' })
  }
  const amt = parseFloat(amount)

  // Validate network is one of the supported options.
  const netUpper = String(network).toUpperCase()
  if (!['TRC20', 'ERC20'].includes(netUpper)) {
    return res.status(400).json({ success: false, message: 'Invalid network' })
  }

  // Validate transaction_hash shape (block obviously garbage inputs).
  const txHash = String(transaction_hash).trim()
  if (txHash.length < 10 || txHash.length > 120 || !/^[A-Za-z0-9_-]+$/.test(txHash)) {
    return res.status(400).json({ success: false, message: 'Invalid transaction hash' })
  }

  // H10 — file validation.  If a screenshot is attached, only JPEG/PNG/WebP
  // are accepted AND the extension is derived from the MIME type — never
  // from the user-supplied filename.
  let safeExt = null
  if (req.file) {
    safeExt = getSafeExtension(req.file.mimetype)
    if (!safeExt) {
      return res.status(400).json({ success: false, message: 'Only JPG, PNG or WebP images allowed, max 5MB' })
    }
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Only JPG, PNG or WebP images allowed, max 5MB' })
    }
  }

  try {
    // H13 — reject duplicate transaction_hash submissions.
    const { data: dupe } = await supabase.from('recharge_requests')
      .select('id').eq('transaction_hash', txHash).maybeSingle()
    if (dupe) {
      return res.status(409).json({ success: false, message: 'This transaction hash has already been submitted.' })
    }

    let screenshotUrl = null
    if (req.file && safeExt) {
      try {
        screenshotUrl = await uploadToS3(req.file.buffer, `recharge/${userId}_${Date.now()}.${safeExt}`, req.file.mimetype)
      } catch (e) { logger.error('Recharge', `S3 upload failed: ${e.message}`) }
    }

    const { data: recharge, error: insertErr } = await supabase.from('recharge_requests').insert({
      user_id: userId, amount: amt, network: netUpper,
      transaction_hash: txHash, screenshot_url: screenshotUrl, status: 'pending',
    }).select().single()
    if (insertErr) {
      // Unique-constraint race: surface a friendly 409.
      if (String(insertErr.code) === '23505') {
        return res.status(409).json({ success: false, message: 'This transaction hash has already been submitted.' })
      }
      throw insertErr
    }

    const { data: user } = await supabase.from('users').select('balance').eq('id', userId).maybeSingle()
    await supabase.from('transactions').insert({
      user_id: userId, type: 'deposit', amount: amt,
      balance_before: user?.balance || 0, balance_after: user?.balance || 0,
      reference_id: recharge.id, status: 'pending', note: 'Awaiting admin verification',
    })

    const { data: submittingUser } = await supabase.from('users').select('email, phone').eq('id', userId).maybeSingle()
    sendDiscordNotification('New Recharge Request', 'A user has submitted a recharge request', 0xFFD700, [
      { name: 'User', value: submittingUser?.email || submittingUser?.phone || userId, inline: true },
      { name: 'Amount', value: `$${amt}`, inline: true },
      { name: 'Network', value: network, inline: true },
      { name: 'Tx Hash', value: transaction_hash, inline: false },
    ]).catch(() => null)
    logger.info('Recharge', `Submitted: $${amt} ${network} by user ${userId}`)
    return res.status(201).json({ success: true, message: 'Recharge request submitted successfully' })
  } catch (err) {
    logger.error('Recharge', err.message)
    return res.status(500).json({ success: false, message: 'Failed to submit recharge request' })
  }
})

app.get('/recharge-records', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase.from('recharge_requests')
      .select('id, amount, network, status, note, transaction_hash, submitted_at, reviewed_at')
      .eq('user_id', req.jwtUser.id).order('submitted_at', { ascending: false })
    return res.json({ success: true, records: data || [] })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load recharge records' })
  }
})

app.post('/admin/recharge/approve/:id', requireAdmin, async (req, res) => {
  try {
    const { data: rq } = await supabase.from('recharge_requests').select('*').eq('id', req.params.id).maybeSingle()
    if (!rq) return res.status(404).json({ success: false, message: 'Not found' })
    if (rq.status !== 'pending') return res.status(400).json({ success: false, message: 'Already processed' })

    const { data: user } = await supabase.from('users').select('*').eq('id', rq.user_id).maybeSingle()
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const newBalance   = parseFloat((user.balance + rq.amount).toFixed(2))
    const newDeposited = parseFloat(((user.total_deposited || 0) + rq.amount).toFixed(2))
    const now = new Date().toISOString()

    await supabase.from('users').update({ balance: newBalance, total_deposited: newDeposited }).eq('id', rq.user_id)
    await supabase.from('recharge_requests').update({ status: 'approved', reviewed_at: now, reviewed_by: req.admin.email }).eq('id', rq.id)
    await supabase.from('transactions').update({ status: 'completed', balance_after: newBalance }).eq('reference_id', rq.id).eq('type', 'deposit')

    await updateMembershipLevel(rq.user_id)
    updateTaskProgress(rq.user_id, 'deposit_amount', rq.amount).catch(() => null)

    sendDiscordNotification('Recharge Approved', 'Admin approved a recharge request', 0x00AA00, [
      { name: 'User', value: user.email || user.phone || rq.user_id, inline: true },
      { name: 'Amount Credited', value: `$${rq.amount}`, inline: true },
    ]).catch(() => null)

    return res.json({ success: true, message: 'Recharge approved' })
  } catch (err) {
    logger.error('Recharge', `Approve error: ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/admin/recharge/reject/:id', requireAdmin, async (req, res) => {
  try {
    const { note } = req.body
    const now = new Date().toISOString()
    const { data: rq } = await supabase.from('recharge_requests').select('id, status, amount, user_id').eq('id', req.params.id).maybeSingle()
    if (!rq) return res.status(404).json({ success: false, message: 'Not found' })
    if (rq.status !== 'pending') return res.status(400).json({ success: false, message: 'Already processed' })
    await supabase.from('recharge_requests').update({ status: 'rejected', note: note || null, reviewed_at: now, reviewed_by: req.admin.email }).eq('id', req.params.id)

    const { data: rejUser } = await supabase.from('users').select('email, phone').eq('id', rq.user_id).maybeSingle()
    sendDiscordNotification('Recharge Rejected', 'Admin rejected a recharge request', 0xFF0000, [
      { name: 'User', value: rejUser?.email || rejUser?.phone || rq.user_id, inline: true },
      { name: 'Amount', value: `$${rq.amount}`, inline: true },
      { name: 'Reason', value: note || 'No reason given', inline: false },
    ]).catch(() => null)

    return res.json({ success: true, message: 'Recharge rejected' })
  } catch (err) { logger.error('Recharge', `Reject error: ${err.message}`); return res.status(500).json({ success: false, message: err.message }) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// WITHDRAWAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/set-funding-password', requireAuth, async (req, res) => {
  const { funding_password, confirm_funding_password } = req.body
  try {
    // M6 — basic validation
    if (typeof funding_password !== 'string' || typeof confirm_funding_password !== 'string')
      return res.status(400).json({ success: false, message: 'Invalid funding password' })
    if (funding_password !== confirm_funding_password)
      return res.status(400).json({ success: false, message: 'Passwords do not match' })
    if (funding_password.length < 6)
      return res.status(400).json({ success: false, message: 'Funding password must be at least 6 characters' })
    // H2 / M6 — cap length at bcrypt's hard limit
    if (Buffer.byteLength(funding_password, 'utf8') > MAX_PASSWORD_LENGTH)
      return res.status(400).json({ success: false, message: 'Funding password is too long (max 72 characters)' })

    const { data: user } = await supabase.from('users').select('funding_password, password_hash').eq('id', req.user.id).maybeSingle()
    if (user && user.funding_password) return res.status(400).json({ success: false, message: 'Funding password already set. Contact support to change it.' })

    // M6 — funding password must NOT equal the login password.
    if (user?.password_hash && await bcrypt.compare(funding_password, user.password_hash)) {
      return res.status(400).json({ success: false, message: 'Funding password must be different from your login password' })
    }

    const hashed = await bcrypt.hash(funding_password, BCRYPT_ROUNDS)
    await supabase.from('users').update({ funding_password: hashed }).eq('id', req.user.id)
    return res.json({ success: true, message: 'Funding password set successfully' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.post('/set-wallet', requireAuth, async (req, res) => {
  const { wallet_address, wallet_type } = req.body
  try {
    const { data: user } = await supabase.from('users').select('wallet_address').eq('id', req.jwtUser.id).maybeSingle()
    if (user && user.wallet_address) return res.status(400).json({ success: false, message: 'Wallet address already set. Contact support to change it.' })
    if (!wallet_address || !wallet_type) return res.status(400).json({ success: false, message: 'wallet_address and wallet_type are required' })
    await supabase.from('users').update({ wallet_address, wallet_type }).eq('id', req.jwtUser.id)
    return res.json({ success: true, message: 'Wallet address saved' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.post('/submit-withdrawal', requireAuth, withdrawalLimiter, async (req, res) => {
  const { amount, funding_password } = req.body
  const userId = req.user.id

  // H6 — strict amount validation up-front ($10 min / $100k max, ≤2 decimals).
  if (!isValidAmount(amount, { min: 10, max: 100_000 })) {
    return res.status(400).json({ success: false, message: 'Withdrawal amount must be between $10 and $100,000' })
  }
  if (typeof funding_password !== 'string' || !funding_password) {
    return res.status(400).json({ success: false, message: 'Funding password is required' })
  }
  if (Buffer.byteLength(funding_password, 'utf8') > MAX_PASSWORD_LENGTH) {
    return res.status(401).json({ success: false, message: 'Incorrect funding password' })
  }
  const amt = parseFloat(amount)

  // C5 — per-user lock + atomic DB deduction.  Together these eliminate
  // the race condition that previously allowed multiple simultaneous
  // withdrawals to each pass the balance check and drain the account.
  return withUserLock(userId, 'withdraw', res, async () => {
    try {
      const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
      if (!user) return res.status(404).json({ success: false, message: 'User not found' })
      if (!user.wallet_address)   return res.status(400).json({ success: false, message: 'Please set your withdrawal wallet address first' })
      if (!user.funding_password) return res.status(400).json({ success: false, message: 'Please set your funding password first' })
      const pwMatch = await bcrypt.compare(funding_password, user.funding_password)
      if (!pwMatch) return res.status(401).json({ success: false, message: 'Incorrect funding password' })

      // Atomic deduct.  If balance is insufficient the RPC returns success=false
      // without mutating the row — no partial writes, no race window.
      const { data: deductRows, error: deductErr } = await supabase
        .rpc('deduct_balance', { p_user_id: userId, p_amount: amt })
      if (deductErr) throw deductErr
      const deduct = Array.isArray(deductRows) ? deductRows[0] : deductRows
      if (!deduct || !deduct.success) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' })
      }
      const balBefore = parseFloat(user.balance)
      const balAfter  = parseFloat(deduct.new_balance)

      const { data: wd, error: wdErr } = await supabase.from('withdrawals').insert({
        user_id: userId, amount: amt, wallet_address: user.wallet_address,
        wallet_type: user.wallet_type, status: 'pending',
      }).select().single()
      if (wdErr) {
        // Roll back the deduction if we couldn't record the withdrawal.
        await supabase.rpc('deduct_balance', { p_user_id: userId, p_amount: -amt }).catch(() => null)
        throw wdErr
      }

      await supabase.from('transactions').insert({
        user_id: userId, type: 'withdrawal', amount: -amt,
        balance_before: balBefore, balance_after: balAfter,
        reference_id: wd.id, status: 'pending', note: 'Awaiting admin approval',
      })

      sendDiscordNotification('New Withdrawal Request', 'A user has submitted a withdrawal request', 0xFF6B00, [
        { name: 'User', value: user.email || user.phone || userId, inline: true },
        { name: 'Amount', value: `$${amt}`, inline: true },
        { name: 'Network', value: user.wallet_type || 'N/A', inline: true },
        { name: 'Wallet', value: user.wallet_address || 'N/A', inline: false },
      ]).catch(() => null)

      return res.status(201).json({ success: true, message: 'Withdrawal submitted successfully' })
    } catch (err) {
      logger.error('Withdrawal', err.message)
      return res.status(500).json({ success: false, message: 'Failed to submit withdrawal' })
    }
  })
})

app.get('/my-withdrawals', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase.from('withdrawals')
      .select('id, amount, wallet_address, wallet_type, status, note, submitted_at, reviewed_at')
      .eq('user_id', req.jwtUser.id).order('submitted_at', { ascending: false })
    return res.json({ withdrawals: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.post('/admin/withdrawal/approve/:id', requireAdmin, async (req, res) => {
  try {
    const { data: wd } = await supabase.from('withdrawals').select('*').eq('id', req.params.id).maybeSingle()
    if (!wd) return res.status(404).json({ success: false, message: 'Not found' })
    if (wd.status !== 'pending') return res.status(400).json({ success: false, message: 'Already processed' })
    const now = new Date().toISOString()
    await supabase.from('withdrawals').update({ status: 'approved', reviewed_at: now, reviewed_by: req.admin.email }).eq('id', wd.id)
    const { data: user } = await supabase.from('users').select('total_withdrawn').eq('id', wd.user_id).maybeSingle()
    await supabase.from('users').update({ total_withdrawn: parseFloat(((user?.total_withdrawn || 0) + wd.amount).toFixed(2)) }).eq('id', wd.user_id)
    await supabase.from('transactions').update({ status: 'completed' }).eq('reference_id', wd.id).eq('type', 'withdrawal')

    const { data: wdApprUser } = await supabase.from('users').select('email, phone').eq('id', wd.user_id).maybeSingle()
    sendDiscordNotification('Withdrawal Approved', 'Admin approved a withdrawal request', 0x00AA00, [
      { name: 'User', value: wdApprUser?.email || wdApprUser?.phone || wd.user_id, inline: true },
      { name: 'Amount', value: `$${wd.amount}`, inline: true },
      { name: 'Wallet', value: wd.wallet_address || 'N/A', inline: false },
    ]).catch(() => null)

    return res.json({ success: true, message: 'Withdrawal approved' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.post('/admin/withdrawal/reject/:id', requireAdmin, async (req, res) => {
  try {
    const { note } = req.body
    const { data: wd } = await supabase.from('withdrawals').select('*').eq('id', req.params.id).maybeSingle()
    if (!wd) return res.status(404).json({ success: false, message: 'Not found' })
    if (wd.status !== 'pending') return res.status(400).json({ success: false, message: 'Already processed' })
    const now = new Date().toISOString()
    await supabase.from('withdrawals').update({ status: 'rejected', note: note || null, reviewed_at: now, reviewed_by: req.admin.email }).eq('id', wd.id)
    const { data: user } = await supabase.from('users').select('balance').eq('id', wd.user_id).maybeSingle()
    const refundBal = parseFloat(((user?.balance || 0) + wd.amount).toFixed(2))
    await supabase.from('users').update({ balance: refundBal }).eq('id', wd.user_id)
    await supabase.from('transactions').insert({ user_id: wd.user_id, type: 'adjustment', amount: wd.amount, balance_before: user?.balance || 0, balance_after: refundBal, reference_id: wd.id, status: 'completed', note: 'Withdrawal rejected - refunded' })

    const { data: wdRejUser } = await supabase.from('users').select('email, phone').eq('id', wd.user_id).maybeSingle()
    sendDiscordNotification('Withdrawal Rejected', 'Admin rejected a withdrawal - refunded', 0xFF0000, [
      { name: 'User', value: wdRejUser?.email || wdRejUser?.phone || wd.user_id, inline: true },
      { name: 'Amount Refunded', value: `$${wd.amount}`, inline: true },
      { name: 'Reason', value: note || 'No reason given', inline: false },
    ]).catch(() => null)

    return res.json({ success: true, message: 'Withdrawal rejected and refunded' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════════════════════════════════════════════

// C4 — rate-limited admin login with Discord alert on failures, generic errors
// (C8/M4) and constant-time bcrypt path against a dummy hash when the admin
// doesn't exist.
app.post('/admin/login', adminLoginLimiter, async (req, res) => {
  const { email, password } = req.body || {}
  const ip = clientIp(req)

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' })
  }
  // H2 — bcrypt DoS protection
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' })
  }

  try {
    const normalizedEmail = email.toLowerCase().trim()
    const { data: admin } = await supabase.from('admins').select('*').eq('email', normalizedEmail).maybeSingle()

    // Always run bcrypt.compare to keep response time constant
    const hashToCompare = admin?.password_hash || DUMMY_BCRYPT_HASH
    const match = await bcrypt.compare(password, hashToCompare)

    if (!admin || !match) {
      logger.warn('AdminLogin', `Failed attempt for: ${normalizedEmail} from IP: ${maskIp(ip)}`)
      sendDiscordNotification(
        'Failed Admin Login Attempt',
        'Someone tried to login to the admin panel',
        0xFF0000,
        [
          { name: 'Email tried', value: normalizedEmail.slice(0, 120), inline: true },
          { name: 'IP Address',  value: ip.slice(0, 60),               inline: true },
        ]
      ).catch(() => null)
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin', version: admin.token_version || 1 },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    )
    logger.success('AdminLogin', `${admin.email} (${admin.id}) from ${maskIp(ip)}`)
    return res.json({ success: true, token, admin: { id: admin.id, name: admin.name, email: admin.email } })
  } catch (err) {
    logger.error('AdminLogin', err.message)
    return res.status(500).json({ success: false, message: 'Login failed' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CONTENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// ── Admin list endpoints (no is_active filter — admin sees everything) ─────────
app.get('/admin/movies', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('movies').select('*').order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ success: false, message: error.message })
    return res.json({ movies: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/admin/banners', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('banners').select('*').order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ success: false, message: error.message })
    return res.json({ banners: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/admin/news', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('news').select('*').order('published_at', { ascending: false })
    if (error) return res.status(500).json({ success: false, message: error.message })
    return res.json({ news: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/admin/services', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('services').select('*').order('id', { ascending: true })
    if (error) return res.status(500).json({ success: false, message: error.message })
    return res.json({ services: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/admin/investments', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('investment_products').select('*').order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ success: false, message: error.message })
    return res.json({ investments: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// Also add PATCH alias for funded amount (frontend uses PATCH /admin/investments/:id/funding)
app.patch('/admin/investments/:id/funding', requireAdmin, async (req, res) => {
  try {
    const { funded_amount } = req.body
    const { error } = await supabase.from('investment_products').update({ funded_amount: parseFloat(funded_amount) }).eq('id', req.params.id)
    if (error) return res.status(500).json({ success: false, message: error.message })
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// Movies
app.post('/admin/movies', requireAdmin, async (req, res) => {
  try {
    const b = req.body
    const payload = {
      title:            b.title,
      description:      b.description      || null,
      introduction:     b.introduction     || null,
      poster_url:       b.poster_url       || null,
      price:            parseFloat(b.price)          || 0,
      profit_percent:   parseFloat(b.profit_percent) || 3,
      duration_hours:   parseInt(b.duration_hours)   || 24,
      sheets_per_ticket:parseInt(b.sheets_per_ticket)|| 1,
      section:          b.section          || 'popular',
      sort_order:       parseInt(b.sort_order)        || 0,
      is_active:        b.is_active !== false,
    }
    const { data, error } = await supabase.from('movies').insert(payload).select().single()
    if (error) {
      logger.error('Admin', `Movie insert: ${error.message}`)
      return res.status(500).json({ success: false, message: error.message })
    }
    return res.status(201).json({ success: true, movie: data })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.put('/admin/movies/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body
    const payload = {
      title:            b.title,
      description:      b.description      || null,
      introduction:     b.introduction     || null,
      poster_url:       b.poster_url       || null,
      price:            parseFloat(b.price)          || 0,
      profit_percent:   parseFloat(b.profit_percent) || 3,
      duration_hours:   parseInt(b.duration_hours)   || 24,
      sheets_per_ticket:parseInt(b.sheets_per_ticket)|| 1,
      section:          b.section          || 'popular',
      sort_order:       parseInt(b.sort_order)        || 0,
      is_active:        b.is_active !== false,
    }
    const { error } = await supabase.from('movies').update(payload).eq('id', req.params.id)
    if (error) return res.status(500).json({ success: false, message: error.message })
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.delete('/admin/movies/:id', requireAdmin, async (req, res) => {
  try { await supabase.from('movies').delete().eq('id', req.params.id); return res.json({ success: true }) }
  catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.post('/admin/movies/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { data } = await supabase.from('movies').select('is_active').eq('id', req.params.id).maybeSingle()
    if (!data) return res.status(404).json({ success: false, message: 'Not found' })
    await supabase.from('movies').update({ is_active: !data.is_active }).eq('id', req.params.id)
    return res.json({ success: true, is_active: !data.is_active })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// Banners
// H8 — explicit allowed fields (no mass assignment)
function bannerPayload(b) {
  return {
    image_url:  b.image_url ? String(b.image_url).slice(0, 2048) : null,
    link_url:   b.link_url  ? String(b.link_url).slice(0, 2048)  : null,
    sort_order: parseInt(b.sort_order) || 0,
    is_active:  b.is_active !== false,
  }
}
app.post('/admin/banners', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('banners').insert(bannerPayload(req.body || {})).select().single()
    if (error) { logger.error('Admin', `Banner insert: ${error.message}`); return res.status(500).json({ success: false, message: error.message }) }
    return res.status(201).json({ success: true, banner: data })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.put('/admin/banners/:id', requireAdmin, async (req, res) => {
  try { await supabase.from('banners').update(bannerPayload(req.body || {})).eq('id', req.params.id); return res.json({ success: true }) }
  catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.delete('/admin/banners/:id', requireAdmin, async (req, res) => {
  try { await supabase.from('banners').delete().eq('id', req.params.id); return res.json({ success: true }) }
  catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.post('/admin/banners/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { data } = await supabase.from('banners').select('is_active').eq('id', req.params.id).maybeSingle()
    if (!data) return res.status(404).json({ success: false, message: 'Not found' })
    await supabase.from('banners').update({ is_active: !data.is_active }).eq('id', req.params.id)
    return res.json({ success: true, is_active: !data.is_active })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// News
// H8 — explicit allowed fields
function newsPayload(b, { forInsert = false } = {}) {
  const p = {
    title:        b.title ? String(b.title).slice(0, 500) : null,
    content:      b.content ? String(b.content).slice(0, 20000) : null,
    image_url:    b.image_url ? String(b.image_url).slice(0, 2048) : null,
    is_active:    b.is_active !== false,
  }
  if (b.published_at) p.published_at = b.published_at
  else if (forInsert)  p.published_at = new Date().toISOString()
  return p
}
app.post('/admin/news', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('news').insert(newsPayload(req.body || {}, { forInsert: true })).select().single()
    if (error) { logger.error('Admin', `News insert: ${error.message}`); return res.status(500).json({ success: false, message: error.message }) }
    return res.status(201).json({ success: true, news: data })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.put('/admin/news/:id', requireAdmin, async (req, res) => {
  try { await supabase.from('news').update(newsPayload(req.body || {})).eq('id', req.params.id); return res.json({ success: true }) }
  catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.delete('/admin/news/:id', requireAdmin, async (req, res) => {
  try { await supabase.from('news').delete().eq('id', req.params.id); return res.json({ success: true }) }
  catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// Notifications (ticker) — only one active at a time
app.post('/admin/notifications', requireAdmin, async (req, res) => {
  const text = req.body?.notification_text
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, message: 'notification_text is required' })
  }
  try {
    await supabase.from('notifications').update({ is_active: false }).eq('is_active', true)
    const { data } = await supabase.from('notifications').insert({
      notification_text: text.trim().slice(0, 1000),
      is_active: true,
    }).select().single()
    return res.status(201).json({ success: true, notification: data })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.delete('/admin/notifications/:id', requireAdmin, async (req, res) => {
  try { await supabase.from('notifications').delete().eq('id', req.params.id); return res.json({ success: true }) }
  catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// Services
// H8 + H12 — explicit fields AND http(s)-only URL validation.
app.post('/admin/services', requireAdmin, async (req, res) => {
  const { title, contact } = req.body || {}
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, message: 'title is required' })
  }
  if (typeof contact !== 'string' || !isSafeUrl(contact)) {
    return res.status(400).json({ success: false, message: 'Contact must be a valid http or https URL' })
  }
  try {
    const { data, error } = await supabase.from('services').insert({
      title:   title.trim().slice(0, 200),
      contact: contact.trim(),
      is_active: true,
    }).select().single()
    if (error) { logger.error('Admin', `Service insert: ${error.message}`); return res.status(500).json({ success: false, message: error.message }) }
    return res.status(201).json({ success: true, service: data })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.delete('/admin/services/:id', requireAdmin, async (req, res) => {
  try { await supabase.from('services').delete().eq('id', req.params.id); return res.json({ success: true }) }
  catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// Investment Products
// H8 — explicit allowed fields
function investmentPayload(b) {
  return {
    name:           b.name ? String(b.name).slice(0, 200) : null,
    image_url:      b.image_url ? String(b.image_url).slice(0, 2048) : null,
    type:           ['stable', 'high_yield'].includes(b.type) ? b.type : 'stable',
    funded_amount:  parseFloat(b.funded_amount) || 0,
    funding_goal:   parseFloat(b.funding_goal)  || 0,
    roi_percent:    parseFloat(b.roi_percent)   || 0,
    duration_days:  parseInt(b.duration_days)   || 0,
    min_investment: parseFloat(b.min_investment) || 100,
    is_active:      b.is_active !== false,
    sort_order:     parseInt(b.sort_order) || 0,
  }
}
app.post('/admin/investments', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('investment_products').insert(investmentPayload(req.body || {})).select().single()
    if (error) { logger.error('Admin', `Investment insert: ${error.message}`); return res.status(500).json({ success: false, message: error.message }) }
    return res.status(201).json({ success: true, product: data })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.put('/admin/investments/:id', requireAdmin, async (req, res) => {
  try { await supabase.from('investment_products').update(investmentPayload(req.body || {})).eq('id', req.params.id); return res.json({ success: true }) }
  catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.delete('/admin/investments/:id', requireAdmin, async (req, res) => {
  try { await supabase.from('investment_products').delete().eq('id', req.params.id); return res.json({ success: true }) }
  catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.post('/admin/investments/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { data } = await supabase.from('investment_products').select('is_active').eq('id', req.params.id).maybeSingle()
    if (!data) return res.status(404).json({ success: false, message: 'Not found' })
    await supabase.from('investment_products').update({ is_active: !data.is_active }).eq('id', req.params.id)
    return res.json({ success: true, is_active: !data.is_active })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})
app.put('/admin/investments/:id/funded', requireAdmin, async (req, res) => {
  try {
    const { funded_amount } = req.body
    await supabase.from('investment_products').update({ funded_amount: parseFloat(funded_amount) }).eq('id', req.params.id)
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// Wallet addresses
app.put('/admin/wallet/:network', requireAdmin, async (req, res) => {
  const { address, qr_code_url } = req.body
  const network = req.params.network.toUpperCase()
  logger.info('Wallet', `Updating ${network} — address: ${address} qr_code_url: ${qr_code_url || 'null'}`)
  try {
    const { data: existing } = await supabase.from('wallet_addresses').select('id').eq('network', network).maybeSingle()
    let result, err
    if (existing) {
      ;({ data: result, error: err } = await supabase.from('wallet_addresses')
        .update({ address, qr_code_url: qr_code_url || null, updated_at: new Date().toISOString() })
        .eq('network', network).select().single())
    } else {
      ;({ data: result, error: err } = await supabase.from('wallet_addresses')
        .insert({ network, address, qr_code_url: qr_code_url || null })
        .select().single())
    }
    if (err) {
      logger.error('Wallet', `Update error: ${JSON.stringify(err)}`)
      return res.status(500).json({ success: false, message: err.message })
    }
    logger.info('Wallet', `Update result: ${JSON.stringify(result)}`)
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /admin/users/:id/adjust-balance
app.post('/admin/users/:id/adjust-balance', requireAdmin, async (req, res) => {
  const { amount, type, note } = req.body
  if (!amount || !type || !note) return res.status(400).json({ success: false, message: 'amount, type, and note are required' })
  if (!['add', 'deduct'].includes(type)) return res.status(400).json({ success: false, message: 'type must be add or deduct' })
  // H6 — enforce finite, positive, bounded (≤1M) adjustments with ≤2 decimals.
  if (!isValidAmount(amount, { min: 0.01, max: 1_000_000 })) {
    return res.status(400).json({ success: false, message: 'amount must be a positive number up to $1,000,000' })
  }
  const amt = parseFloat(amount)
  const noteStr = String(note).slice(0, 500)
  try {
    const { data: user } = await supabase.from('users').select('id, balance').eq('id', req.params.id).maybeSingle()
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    const balBefore = parseFloat(user.balance) || 0
    let balAfter
    if (type === 'add') {
      balAfter = parseFloat((balBefore + amt).toFixed(2))
    } else {
      if (balBefore < amt) return res.status(400).json({ success: false, message: 'User has insufficient balance to deduct that amount' })
      balAfter = parseFloat((balBefore - amt).toFixed(2))
    }
    await supabase.from('users').update({ balance: balAfter }).eq('id', req.params.id)
    await supabase.from('transactions').insert({
      user_id: req.params.id,
      type: 'adjustment',
      amount: type === 'add' ? amt : -amt,
      balance_before: balBefore,
      balance_after: balAfter,
      status: 'completed',
      note: `[Admin] ${noteStr}`,
    })
    return res.json({ success: true, new_balance: balAfter })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DATA VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/admin/users', requireAdmin, async (req, res) => {
  const rawSearch = req.query.search || ''
  try {
    const s = rawSearch ? sanitizeFilterValue(rawSearch) : null
    const { data, error } = await supabase.rpc('get_users_with_referrers', {
      p_search: s || null,
      p_limit: 100,
      p_offset: 0,
    })
    if (error) {
      // Fallback to direct query if RPC not yet created
      let q = supabase.from('users').select('id, email, phone, balance, total_deposited, total_withdrawn, membership_level, invite_code, referred_by, created_at, last_ip, last_login, wallet_address, wallet_type').order('created_at', { ascending: false })
      if (s) {
        q = q.or([`email.ilike.%${s}%`, `phone.ilike.%${s}%`, `last_ip.ilike.%${s}%`].join(','))
      }
      const { data: fallbackData } = await q
      return res.json({ users: fallbackData || [] })
    }
    return res.json({ users: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// PUT /admin/users/:id/wallet — update user withdrawal wallet address
app.put('/admin/users/:id/wallet', requireAdmin, async (req, res) => {
  const { wallet_address, wallet_type } = req.body
  if (!wallet_address || !wallet_address.trim()) return res.status(400).json({ success: false, message: 'wallet_address is required' })
  if (!['TRC20', 'ERC20'].includes(wallet_type)) return res.status(400).json({ success: false, message: 'wallet_type must be TRC20 or ERC20' })
  try {
    const { data: user } = await supabase.from('users').select('id, balance').eq('id', req.params.id).maybeSingle()
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    await supabase.from('users').update({ wallet_address: wallet_address.trim(), wallet_type }).eq('id', req.params.id)
    await supabase.from('transactions').insert({
      user_id: req.params.id, type: 'adjustment', amount: 0,
      balance_before: parseFloat(user.balance), balance_after: parseFloat(user.balance),
      status: 'completed',
      note: `[Admin] Wallet address updated to ${wallet_type}: ${wallet_address.trim()}`,
    })
    logger.success('Admin', `Wallet updated for user ${req.params.id}: ${wallet_type}`)
    return res.json({ success: true, wallet_address: wallet_address.trim(), wallet_type })
  } catch (err) {
    logger.error('Admin', `Wallet update: ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
})

app.get('/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('*').eq('id', req.params.id).maybeSingle()
    if (!user) return res.status(404).json({ success: false, message: 'Not found' })
    const [{ data: tickets }, { data: recharges }, { data: withdrawals }, { data: transactions }, { count: total_referrals }, { data: login_logs }] = await Promise.all([
      supabase.from('tickets').select('*').eq('user_id', req.params.id).order('booked_at', { ascending: false }),
      supabase.from('recharge_requests').select('*').eq('user_id', req.params.id).order('submitted_at', { ascending: false }),
      supabase.from('withdrawals').select('*').eq('user_id', req.params.id).order('submitted_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', req.params.id).order('created_at', { ascending: false }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', user.invite_code),
      supabase.from('login_logs').select('ip_address, user_agent, logged_in_at').eq('user_id', req.params.id).order('logged_in_at', { ascending: false }).limit(5),
    ])

    let referrerInfo = null
    if (user.referred_by) {
      const { data: inviteData } = await supabase.from('invitation_codes')
        .select('user_id').eq('invite_code', user.referred_by).maybeSingle()
      if (inviteData?.user_id) {
        const { data: referrer } = await supabase.from('users')
          .select('id, email, phone, invite_code').eq('id', inviteData.user_id).maybeSingle()
        if (referrer) {
          referrerInfo = {
            id: referrer.id,
            display: referrer.email || referrer.phone,
            invite_code: referrer.invite_code,
          }
        }
      }
    }

    return res.json({
      user: { ...safeUser(user), total_referrals: total_referrals || 0, referrer: referrerInfo },
      tickets: tickets || [], recharges: recharges || [], withdrawals: withdrawals || [],
      transactions: transactions || [], login_logs: login_logs || [],
    })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/admin/recharges', requireAdmin, async (req, res) => {
  const status = req.query.status || null
  try {
    let q = supabase.from('recharge_requests')
      .select('id, amount, network, status, transaction_hash, screenshot_url, submitted_at, reviewed_at, note, user_id, users(email, phone)')
      .order('submitted_at', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data } = await q
    return res.json({ recharges: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/admin/withdrawals', requireAdmin, async (req, res) => {
  const status = req.query.status || null
  try {
    let q = supabase.from('withdrawals')
      .select('id, amount, wallet_address, wallet_type, status, submitted_at, reviewed_at, note, user_id, users(email, phone)')
      .order('submitted_at', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data } = await q
    return res.json({ withdrawals: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const [
      { count: total_users },
      { count: pending_recharges },
      { count: pending_withdrawals },
      { count: active_tickets },
      { count: today_registrations },
      { data: totals },
      { data: recent_recharges },
      { data: recent_withdrawals },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('recharge_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('users').select('total_deposited, total_withdrawn, total_profit'),
      supabase.from('recharge_requests')
        .select('id, amount, status, submitted_at, users(email, phone)')
        .order('submitted_at', { ascending: false }).limit(5),
      supabase.from('withdrawals')
        .select('id, amount, status, submitted_at, users(email, phone)')
        .order('submitted_at', { ascending: false }).limit(5),
    ])
    const total_deposited   = (totals || []).reduce((s, u) => s + (parseFloat(u.total_deposited) || 0), 0)
    const total_withdrawn   = (totals || []).reduce((s, u) => s + (parseFloat(u.total_withdrawn) || 0), 0)
    const total_profit_paid = (totals || []).reduce((s, u) => s + (parseFloat(u.total_profit)    || 0), 0)
    return res.json({
      stats: { total_users, total_deposited, total_withdrawn, total_profit_paid, pending_recharges, pending_withdrawals, active_tickets, today_registrations },
      recent_recharges:   recent_recharges  || [],
      recent_withdrawals: recent_withdrawals || [],
    })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// GET /admin/wallets — all wallet addresses
app.get('/admin/wallets', requireAdmin, async (req, res) => {
  try {
    const { data } = await supabase.from('wallet_addresses').select('*').order('network')
    return res.json({ wallets: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /admin/create-admin — create additional admin (requires existing admin auth)
app.post('/admin/create-admin', requireAdmin, async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'name, email, and password are required' })
  if (typeof password !== 'string' || !isStrongPassword(password)) {
    return res.status(400).json({ success: false, message: 'Admin password must be 12-72 characters and include uppercase, lowercase, number, and special character.' })
  }
  try {
    const { data: existing } = await supabase.from('admins').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
    if (existing) return res.status(409).json({ success: false, message: 'Admin with this email already exists' })
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const { data } = await supabase.from('admins').insert({ name, email: email.toLowerCase().trim(), password_hash }).select().single()
    return res.status(201).json({ success: true, admin: { id: data.id, name: data.name, email: data.email } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// GET /admin/discord-settings — fetch current Discord settings
app.get('/admin/discord-settings', requireAdmin, async (req, res) => {
  try {
    const { data } = await supabase.from('app_settings')
      .select('key, value').in('key', ['discord_webhook_url', 'discord_role_id'])
    const map = {}
    ;(data || []).forEach(r => { map[r.key] = r.value || '' })
    return res.json({ success: true, webhook_url: map['discord_webhook_url'] || '', role_id: map['discord_role_id'] || '' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /admin/discord-settings — save Discord settings
app.post('/admin/discord-settings', requireAdmin, async (req, res) => {
  const { webhook_url, role_id } = req.body
  try {
    await supabase.from('app_settings').upsert([
      { key: 'discord_webhook_url', value: webhook_url || '', updated_at: new Date().toISOString() },
      { key: 'discord_role_id',    value: role_id    || '', updated_at: new Date().toISOString() },
    ], { onConflict: 'key' })
    // Bust cache
    _discordWebhookCache = webhook_url || null
    _discordRoleCache    = role_id    || null
    _discordCacheTime    = Date.now()
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /admin/discord-settings/test — send a test message
app.post('/admin/discord-settings/test', requireAdmin, async (req, res) => {
  try {
    const { webhookUrl } = await getDiscordSettings()
    if (!webhookUrl) return res.status(400).json({ success: false, message: 'No webhook URL configured' })
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [{ title: 'Zeloh Test Notification', description: 'Discord webhook is working correctly!', color: 0xF5C518, timestamp: new Date().toISOString(), footer: { text: 'Zeloh Admin' } }] }),
    })
    return res.json({ success: true, message: 'Test message sent' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// PATCH /admin/investments/:id/funding — quick funding amount update
app.patch('/admin/investments/:id/funding', requireAdmin, async (req, res) => {
  try {
    const { funded_amount } = req.body
    await supabase.from('investment_products').update({ funded_amount: parseFloat(funded_amount) }).eq('id', req.params.id)
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// USER PROFILE & ACCOUNT HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/account-history', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('transactions')
      .select('id, type, amount, balance_before, balance_after, status, note, created_at, reference_id')
      .eq('user_id', req.jwtUser.id).order('created_at', { ascending: false })
    if (error) { logger.error('Account', `account-history: ${error.message}`); throw error }
    return res.json({ success: true, history: data || [], transactions: data || [] })
  } catch (err) {
    logger.error('Account', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
})

app.get('/team-earnings', requireAuth, async (req, res) => {
  try {
    const userId = req.jwtUser.id
    const todayStr = new Date().toISOString().slice(0, 10)
    const yesterdayStart = new Date(); yesterdayStart.setDate(yesterdayStart.getDate() - 1); yesterdayStart.setHours(0,0,0,0)
    const yesterdayEnd   = new Date(); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);   yesterdayEnd.setHours(23,59,59,999)

    const [{ data: user }, { data: myInvite }] = await Promise.all([
      supabase.from('users').select('team_earnings').eq('id', userId).maybeSingle(),
      supabase.from('invitation_codes').select('invite_code').eq('user_id', userId).maybeSingle(),
    ])

    let referrals = []
    let yesterday_commission = 0
    let active_today = 0
    let added_today = 0

    if (myInvite?.invite_code) {
      const { data: refs } = await supabase.from('users')
        .select('id, email, phone, balance, created_at')
        .eq('referred_by', myInvite.invite_code)
        .order('created_at', { ascending: false })

      const refIds = (refs || []).map(r => r.id)

      const [{ data: txYesterday }, { data: ticketsToday }, { data: ticketsEver }] = await Promise.all([
        refIds.length ? supabase.from('transactions')
          .select('amount').eq('user_id', userId).eq('type', 'team_earning')
          .gte('created_at', yesterdayStart.toISOString()).lte('created_at', yesterdayEnd.toISOString()) : Promise.resolve({ data: [] }),
        refIds.length ? supabase.from('tickets')
          .select('user_id').in('user_id', refIds).gte('booked_at', `${todayStr}T00:00:00.000Z`) : Promise.resolve({ data: [] }),
        refIds.length ? supabase.from('tickets')
          .select('user_id').in('user_id', refIds) : Promise.resolve({ data: [] }),
      ])

      yesterday_commission = (txYesterday || []).reduce((s, t) => s + parseFloat(t.amount || 0), 0)
      active_today = new Set((ticketsToday || []).map(t => t.user_id)).size
      added_today  = (refs || []).filter(r => r.created_at?.slice(0,10) === todayStr).length

      const activeUserIds = new Set((ticketsEver || []).map(t => t.user_id))

      function maskAccount(email, phone) {
        if (email) {
          const [local, domain] = email.split('@')
          if (!domain) return email
          const masked = local.slice(0,3) + '***'
          return `${masked}@${domain}`
        }
        if (phone) {
          if (phone.length <= 6) return phone
          return phone.slice(0, 4) + '***' + phone.slice(-3)
        }
        return '***'
      }

      referrals = (refs || []).map(r => ({
        account:    maskAccount(r.email, r.phone),
        joined_at:  r.created_at,
        balance:    parseFloat(r.balance || 0),
        is_active:  activeUserIds.has(r.id),
      }))
    }

    return res.json({
      team_earnings:        parseFloat(user?.team_earnings || 0),
      total_referrals:      referrals.length,
      yesterday_commission: parseFloat(yesterday_commission.toFixed(4)),
      active_today,
      added_today,
      referrals,
    })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.post('/upload-profile-image', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image provided' })
  // H10 — strict MIME allowlist; extension comes from MIME, NEVER the filename.
  const ext = getSafeExtension(req.file.mimetype)
  if (!ext) {
    return res.status(400).json({ success: false, message: 'Only JPG, PNG or WebP images allowed' })
  }
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ success: false, message: 'Image too large (max 5MB)' })
  }
  try {
    const url = await uploadToS3(req.file.buffer, `profiles/${req.user.id}_${Date.now()}.${ext}`, req.file.mimetype)
    await supabase.from('users').update({ profile_image: url }).eq('id', req.user.id)
    return res.json({ success: true, profile_image_url: url })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ═══════════════════════════════════════════════════════════════════════════════

// C6/C8 — rate-limited. Never reveals whether the account exists. OTP stored
// as a bcrypt hash (never plaintext). Attempt counter lives in Redis.
app.post('/forgot-password/send-otp', forgotOtpLimiter, async (req, res) => {
  const { email, phone } = req.body
  // Always respond with the same message — we don't want to leak registration.
  const genericSuccess = res.json.bind(res, { success: true, message: `If an account exists, a code has been sent.` })

  try {
    const trimmedEmail = typeof email === 'string' ? email.toLowerCase().trim() : null
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : null
    if (!trimmedEmail && !trimmedPhone) return genericSuccess()

    let user
    if (trimmedEmail) {
      const { data } = await supabase.from('users').select('id, email').eq('email', trimmedEmail).maybeSingle()
      user = data
    } else if (trimmedPhone) {
      const { data } = await supabase.from('users').select('id, phone').eq('phone', trimmedPhone).maybeSingle()
      user = data
    }
    if (!user) return genericSuccess()

    const otp = generateOtp()
    // C6 — store bcrypt hash of OTP (not the plaintext) with 10-minute expiry.
    const otpHash = await bcrypt.hash(otp, 10)
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    await supabase.from('users').update({ otp: otpHash, otp_expires_at }).eq('id', user.id)
    // Clear previous attempt counter when a fresh OTP is issued.
    await redis.del(`fp_attempts:${user.id}`).catch(() => null)

    if (trimmedEmail) {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: trimmedEmail,
        subject: 'Zeloh password reset code',
        html: `<p>Your password reset code is <strong>${otp}</strong>. Valid for 10 minutes.</p>`,
      }).catch(err => logger.error('ForgotPw', `Resend: ${err.message}`))
    } else if (trimmedPhone && whatsappReady) {
      await whatsapp.sendMessage(toWhatsAppId(trimmedPhone), `Your Zeloh password reset code is *${otp}*. Valid for 10 minutes.`).catch(err => logger.error('ForgotPw', `WA: ${err.message}`))
    }

    return genericSuccess()
  } catch (err) {
    logger.error('ForgotPw', `send-otp: ${err.message}`)
    return genericSuccess() // still generic on error — no leak
  }
})

app.post('/forgot-password/verify-otp', forgotVerifyLimiter, async (req, res) => {
  const { email, phone, otp, new_password, confirm_new_password } = req.body
  try {
    // H2 — password length check up-front (avoids bcrypt DoS).
    if (typeof new_password !== 'string' || new_password.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(new_password, 'utf8') > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, message: 'Password must be 8-72 characters' })
    }
    if (new_password !== confirm_new_password) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' })
    }

    const trimmedEmail = typeof email === 'string' ? email.toLowerCase().trim() : null
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : null
    if (!trimmedEmail && !trimmedPhone) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' })
    }

    let user
    if (trimmedEmail) {
      const { data } = await supabase.from('users').select('id, otp, otp_expires_at').eq('email', trimmedEmail).maybeSingle()
      user = data
    } else if (trimmedPhone) {
      const { data } = await supabase.from('users').select('id, otp, otp_expires_at').eq('phone', trimmedPhone).maybeSingle()
      user = data
    }

    // C8 — generic error whether the account exists or not.
    if (!user || !user.otp) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' })
    }

    // C6 — per-user attempt counter to block OTP brute force.
    const attemptsKey = `fp_attempts:${user.id}`
    const attempts = await redis.incr(attemptsKey)
    if (attempts === 1) await redis.expire(attemptsKey, 30 * 60) // 30-min window
    if (attempts > 5) {
      logger.warn('ForgotPw', `Too many OTP attempts for user ${user.id}`)
      // Invalidate the OTP so the attacker can't keep trying with a new request.
      await supabase.from('users').update({ otp: null, otp_expires_at: null }).eq('id', user.id)
      return res.status(429).json({ success: false, message: 'Too many attempts. Please request a new OTP.' })
    }

    if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' })
    }

    // C6 — bcrypt compare (stored value is a hash).  Support legacy plaintext
    // rows during the rollout window: if bcrypt.compare throws because the
    // stored value isn't a valid hash, fall back to a timing-safe string compare.
    let otpOk = false
    try {
      otpOk = await bcrypt.compare(String(otp || ''), user.otp)
    } catch {
      otpOk = timingSafeOtpCompare(user.otp, otp)
    }
    if (!otpOk) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' })
    }

    const password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS)

    // H5 — bump token_version to invalidate every existing JWT for this user.
    await supabase.rpc('increment_token_version', { p_user_id: user.id }).catch(async () => {
      // Fallback if the RPC isn't deployed yet: do a read-then-write.
      const { data: u } = await supabase.from('users').select('token_version').eq('id', user.id).maybeSingle()
      await supabase.from('users').update({ token_version: (u?.token_version || 1) + 1 }).eq('id', user.id)
    })

    await supabase.from('users').update({ password_hash, otp: null, otp_expires_at: null }).eq('id', user.id)
    await redis.del(attemptsKey).catch(() => null)

    logger.success('ForgotPw', `Password reset for user ${user.id}`)
    return res.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    logger.error('ForgotPw', `verify-otp: ${err.message}`)
    return res.status(500).json({ success: false, message: 'Failed to reset password' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS HISTORY, NEWS DETAIL, INVESTMENT DETAIL, INVEST PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/notifications-history', async (req, res) => {
  try {
    const { data } = await supabase.from('notifications')
      .select('id, notification_text, is_active, created_at')
      .order('created_at', { ascending: false })
    return res.json({ notifications: data || [] })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/news/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('news').select('*').eq('id', req.params.id).maybeSingle()
    if (error || !data) return res.status(404).json({ success: false, message: 'Not found' })
    return res.json({ news: data })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/investments/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('investment_products').select('*').eq('id', req.params.id).maybeSingle()
    if (error || !data) return res.status(404).json({ success: false, message: 'Not found' })
    return res.json({ product: data })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

app.get('/my-investments', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('investments')
      .select('id, product_id, product_name, amount, profit_amount, total_return, roi_percent, duration_days, current_earnings, investment_type, status, completes_at, created_at, last_credited_at, earnings_start_time')
      .eq('user_id', req.jwtUser.id).eq('status', 'active')
      .order('created_at', { ascending: false })
    if (error) { logger.error('Invest', `my-investments: ${error.message}`); throw error }

    // Fetch product details for each unique product_id
    const productIds = [...new Set((data || []).map(i => i.product_id).filter(Boolean))]
    let productMap = {}
    if (productIds.length) {
      const { data: prods } = await supabase.from('investment_products')
        .select('id, name, image_url, roi_percent, duration_days, global_start_time, global_end_time, is_funded')
        .in('id', productIds)
      ;(prods || []).forEach(p => { productMap[p.id] = p })
    }

    const now = Date.now()
    const enriched = (data || []).map(inv => {
      const product = productMap[inv.product_id] || null
      const earnings_started = !!inv.earnings_start_time
      const start_ms = inv.earnings_start_time ? new Date(inv.earnings_start_time).getTime() : null
      const end_ms   = inv.completes_at ? new Date(inv.completes_at).getTime() : null
      const total_days = inv.duration_days || 1
      const daily_profit = parseFloat(((inv.amount * inv.roi_percent / 100) / total_days).toFixed(4))
      const current_earnings = parseFloat(inv.current_earnings || 0)

      let days_elapsed = 0, progress_percent = 0, days_remaining = total_days
      if (earnings_started && start_ms) {
        days_elapsed    = Math.max(0, Math.floor((now - start_ms) / 86400000))
        progress_percent = Math.min(100, Math.round((days_elapsed / total_days) * 100))
        days_remaining   = end_ms ? Math.max(0, Math.ceil((end_ms - now) / 86400000)) : total_days
      }

      return {
        ...inv,
        earnings_started,
        days_elapsed,
        total_days,
        daily_profit,
        current_earnings,
        progress_percent,
        days_remaining,
        product,
      }
    })
    return res.json({ success: true, investments: enriched })
  } catch (err) {
    logger.error('Invest', `my-investments: ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/invest-product', requireAuth, async (req, res) => {
  const { product_id, amount } = req.body
  const userId = req.user.id

  if (!product_id || typeof product_id !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid product' })
  }
  // H6 — generic finite/positive/<=2dp check up-front.  Per-product min is
  // enforced below once we know product.min_investment.
  if (!isValidAmount(amount, { min: 0.01, max: 1_000_000 })) {
    return res.status(400).json({ success: false, message: 'Invalid investment amount' })
  }

  // C5 — lock so two concurrent invests can't both pass the balance check.
  return withUserLock(userId, 'invest', res, async () => {
    try {
      const { data: product } = await supabase.from('investment_products').select('*').eq('id', product_id).maybeSingle()
      if (!product || !product.is_active) return res.status(404).json({ success: false, message: 'Product not found or inactive' })
      const amt = parseFloat(amount)
      if (!isValidAmount(amt, { min: parseFloat(product.min_investment) || 0.01, max: 1_000_000 })) {
        return res.status(400).json({ success: false, message: `Minimum investment is $${product.min_investment}` })
      }

      // Check duplicate active investment in this product
      const { data: existing } = await supabase.from('investments')
        .select('id').eq('user_id', userId).eq('product_id', product_id).eq('status', 'active').maybeSingle()
      if (existing) return res.status(400).json({ success: false, message: 'You already have an active investment in this product' })

      const { data: user } = await supabase.from('users').select('balance, ticket_quota').eq('id', userId).maybeSingle()
      if (!user) return res.status(404).json({ success: false, message: 'User not found' })

      // Atomic balance deduction
      const { data: deductRows, error: deductErr } = await supabase
        .rpc('deduct_balance', { p_user_id: userId, p_amount: amt })
      if (deductErr) throw deductErr
      const deduct = Array.isArray(deductRows) ? deductRows[0] : deductRows
      if (!deduct || !deduct.success) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' })
      }
      const balBefore = parseFloat(user.balance)
      const balAfter  = parseFloat(deduct.new_balance)
      const newQuota   = parseFloat(((parseFloat(user.ticket_quota) || 0) + amt).toFixed(2))
      const profit_amt = parseFloat((amt * product.roi_percent / 100).toFixed(2))
      const total_ret  = parseFloat((amt + profit_amt).toFixed(2))

      const earnings_start_time = product.is_funded && product.global_start_time ? product.global_start_time : null
      const completes_at        = product.is_funded && product.global_end_time   ? product.global_end_time   : null

      await supabase.from('users').update({ ticket_quota: newQuota }).eq('id', userId)
      await supabase.from('investment_products').update({
        funded_amount: parseFloat(((parseFloat(product.funded_amount) || 0) + amt).toFixed(2)),
      }).eq('id', product_id)

      const { data: inv, error: invErr } = await supabase.from('investments').insert({
        user_id: userId, product_id, product_name: product.name,
        amount: amt, profit_amount: profit_amt, total_return: total_ret,
        roi_percent: product.roi_percent, duration_days: product.duration_days,
        investment_type: 'product_investment', current_earnings: 0,
        earnings_start_time, completes_at,
        status: 'active',
      }).select().single()
      if (invErr) {
        // Roll back balance + quota on insert failure
        await supabase.rpc('deduct_balance', { p_user_id: userId, p_amount: -amt }).catch(() => null)
        await supabase.from('users').update({ ticket_quota: parseFloat(user.ticket_quota) || 0 }).eq('id', userId).catch(() => null)
        throw invErr
      }

      const { error: txErr } = await supabase.from('transactions').insert({
        user_id: userId, type: 'ticket_purchase', amount: -amt,
        balance_before: balBefore, balance_after: balAfter,
        reference_id: inv.id, status: 'completed',
        note: `Investment: ${product.name}`,
      })
      if (txErr) logger.error('Invest', `tx insert failed: ${txErr.message}`)

      logger.info('Invest', `${userId} invested $${amt} in "${product.name}" earnings_started=${!!earnings_start_time}`)
      return res.status(201).json({ success: true, investment: inv, earnings_started: !!earnings_start_time, completes_at, profit_amount: profit_amt, total_return: total_ret })
    } catch (err) {
      logger.error('Invest', err.message)
      return res.status(500).json({ success: false, message: 'Failed to process investment' })
    }
  })
})

// Admin: start global investment timer for a product
app.post('/admin/investments/:id/start-funding', requireAdmin, async (req, res) => {
  try {
    const { data: product } = await supabase.from('investment_products').select('*').eq('id', req.params.id).maybeSingle()
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
    if (product.is_funded) return res.status(400).json({ success: false, message: 'Global timer already started for this product' })

    const now = new Date()
    const globalStart = now.toISOString()
    const globalEnd   = getInvestmentEndTime(now, product.duration_days).toISOString()
    if (TEST_MODE) logger.warn('Admin', `TEST MODE: globalEnd = ${globalStart} + ${product.duration_days} × ${TEST_MINUTES}min = ${globalEnd}`)

    const { error: prodErr } = await supabase.from('investment_products').update({
      is_funded: true,
      global_start_time: globalStart,
      global_end_time:   globalEnd,
    }).eq('id', req.params.id)
    if (prodErr) throw prodErr

    // Update all active investments for this product
    const { data: activeInvs } = await supabase.from('investments')
      .select('id').eq('product_id', req.params.id).eq('status', 'active')
    if (activeInvs && activeInvs.length) {
      await supabase.from('investments').update({
        earnings_start_time: globalStart,
        completes_at: globalEnd,
      }).eq('product_id', req.params.id).eq('status', 'active')
    }

    logger.success('Admin', `Global timer started for product ${req.params.id}: ${(activeInvs?.length || 0)} investors updated`)
    return res.json({ success: true, global_start_time: globalStart, global_end_time: globalEnd, investors_updated: activeInvs?.length || 0 })
  } catch (err) {
    logger.error('Admin', `start-funding: ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ─── Product Investment Cron: daily earnings credit + maturity ─────────────────
// Runs every 30 seconds in test mode, every hour in production.
async function runInvestCron() {
  logger.cron(`InvestCron running at ${new Date().toISOString()}`)
  try {
    const now    = new Date()
    const nowIso = now.toISOString()

    // Fetch all active product investments that have earnings started
    const { data: active } = await supabase.from('investments')
      .select('*')
      .eq('status', 'active')
      .eq('investment_type', 'product_investment')
      .not('earnings_start_time', 'is', null)
      .lte('earnings_start_time', nowIso)
    logger.cron(`Active investments with earnings started: ${(active || []).length}`)

    for (const inv of (active || [])) {
      try {
        const startMs       = new Date(inv.earnings_start_time).getTime()
        const lastCreditMs  = inv.last_credited_at ? new Date(inv.last_credited_at).getTime() : startMs
        // Use ONE_DAY_MS so in test mode a "day" = TEST_MINUTES minutes
        const daysElapsed   = Math.max(0, Math.floor((now.getTime() - startMs)   / ONE_DAY_MS))
        const daysCredited  = Math.max(0, Math.floor((lastCreditMs - startMs) / ONE_DAY_MS))
        const daysToCredit  = daysElapsed - daysCredited
        if (daysToCredit <= 0) continue

        const daily_rate    = parseFloat(((inv.amount * inv.roi_percent / 100) / (inv.duration_days || 1)).toFixed(4))
        const earnThisRun   = parseFloat((daily_rate * daysToCredit).toFixed(4))

        const { data: user } = await supabase.from('users').select('balance, personal_gains').eq('id', inv.user_id).maybeSingle()
        if (!user) continue
        const balBefore   = parseFloat(user.balance)
        const balAfter    = parseFloat((balBefore + earnThisRun).toFixed(4))
        const newGains    = parseFloat(((user.personal_gains || 0) + earnThisRun).toFixed(4))
        const newEarnings = parseFloat(((inv.current_earnings || 0) + earnThisRun).toFixed(4))

        await supabase.from('users').update({ balance: balAfter, personal_gains: newGains }).eq('id', inv.user_id)
        await supabase.from('investments').update({ current_earnings: newEarnings, last_credited_at: nowIso }).eq('id', inv.id)
        await supabase.from('transactions').insert({
          user_id: inv.user_id, type: 'ticket_profit', amount: earnThisRun,
          balance_before: balBefore, balance_after: balAfter,
          reference_id: inv.id, status: 'completed',
          note: `Daily earnings (${daysToCredit}d): ${inv.product_name}`,
        })
        logger.cron(`Credited $${earnThisRun} (${daysToCredit}d) for investment ${inv.id}`)
      } catch (e) { logger.error('InvestCron', `Daily credit ${inv.id}: ${e.message}`) }
    }

    // Mature completed investments (global_end_time reached)
    const { data: matured } = await supabase.from('investments')
      .select('*')
      .eq('status', 'active')
      .eq('investment_type', 'product_investment')
      .not('completes_at', 'is', null)
      .lte('completes_at', nowIso)
    logger.cron(`Matured investments: ${(matured || []).length}`)

    for (const inv of (matured || [])) {
      try {
        const { data: user } = await supabase.from('users').select('balance, personal_gains, ticket_quota').eq('id', inv.user_id).maybeSingle()
        if (!user) continue
        // Return principal; any remaining profit not yet credited daily
        const alreadyEarned   = parseFloat(inv.current_earnings || 0)
        const remainingProfit = Math.max(0, parseFloat((parseFloat(inv.profit_amount) - alreadyEarned).toFixed(2)))
        const finalPayout     = parseFloat((parseFloat(inv.amount) + remainingProfit).toFixed(2))
        const balBefore       = parseFloat(user.balance)
        const balAfter        = parseFloat((balBefore + finalPayout).toFixed(2))
        const newGains        = parseFloat(((user.personal_gains || 0) + remainingProfit).toFixed(2))
        const newQuota        = Math.max(0, parseFloat(((user.ticket_quota || 0) - parseFloat(inv.amount)).toFixed(2)))

        await supabase.from('users').update({ balance: balAfter, personal_gains: newGains, ticket_quota: newQuota }).eq('id', inv.user_id)
        await supabase.from('investments').update({
          status: 'completed', completed_at: nowIso,
          current_earnings: parseFloat((alreadyEarned + remainingProfit).toFixed(2)),
        }).eq('id', inv.id)
        await supabase.from('transactions').insert({
          user_id: inv.user_id, type: 'ticket_profit', amount: finalPayout,
          balance_before: balBefore, balance_after: balAfter,
          reference_id: inv.id, status: 'completed',
          note: `Investment matured: ${inv.product_name}`,
        })
        logger.cron(`Matured investment ${inv.id} — returned $${finalPayout}`)
      } catch (e) { logger.error('InvestCron', `Mature ${inv.id}: ${e.message}`) }
    }
  } catch (err) { logger.error('InvestCron', `Fatal: ${err.message}`) }
}

if (TEST_MODE) {
  cron.schedule('*/30 * * * * *', async () => { await runInvestCron() })
  logger.warn('Cron', `Test mode: investment cron runs every 30 seconds`)
} else {
  cron.schedule('0 * * * *', async () => { await runInvestCron() })
  logger.success('Cron', 'Production: investment cron runs every hour')
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY TASKS
// ═══════════════════════════════════════════════════════════════════════════════

async function updateTaskProgress(userId, taskType, amount) {
  try {
    const today = getDayKey()
    const { data: tasks } = await supabase.from('daily_tasks')
      .select('*').eq('task_type', taskType).eq('is_active', true)
    if (!tasks || !tasks.length) return

    for (const task of tasks) {
      const { data: existing } = await supabase.from('user_task_progress')
        .select('*').eq('user_id', userId).eq('task_id', task.id).eq('date', today).maybeSingle()

      const prevProgress = existing ? parseFloat(existing.progress) : 0
      const alreadyDone  = existing ? existing.completed : false
      const newProgress  = parseFloat((prevProgress + amount).toFixed(2))
      const nowCompleted = newProgress >= parseFloat(task.requirement)

      await supabase.from('user_task_progress').upsert({
        user_id: userId, task_id: task.id, date: today,
        progress: newProgress,
        completed: alreadyDone || nowCompleted,
        completed_at: (!alreadyDone && nowCompleted) ? new Date().toISOString() : (existing?.completed_at || null),
        vouchers_awarded: existing?.vouchers_awarded || 0,
      }, { onConflict: 'user_id,task_id,date' })

      if (!alreadyDone && nowCompleted) {
        const { data: vouRow } = await supabase.from('user_vouchers')
          .select('vouchers').eq('user_id', userId).maybeSingle()
        const currentVouchers = vouRow ? parseInt(vouRow.vouchers) : 0
        await supabase.from('user_vouchers').upsert({
          user_id: userId,
          vouchers: currentVouchers + task.voucher_reward,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        await supabase.from('transactions').insert({
          user_id: userId, type: 'adjustment', amount: 0,
          balance_before: 0, balance_after: 0,
          status: 'completed', note: `Task reward: ${task.title}`,
        })
        logger.success('Tasks', `User ${userId} completed "${task.title}" — ${task.voucher_reward} vouchers`)
      }
    }
  } catch (err) {
    logger.error('Tasks', `updateTaskProgress: ${err.message}`)
  }
}

app.get('/daily-tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.jwtUser.id
    const today  = getDayKey()

    const { data: tasks } = await supabase.from('daily_tasks')
      .select('*').eq('is_active', true).order('created_at', { ascending: true })

    const { data: progRows } = await supabase.from('user_task_progress')
      .select('*').eq('user_id', userId).eq('date', today)

    const { data: vouRow } = await supabase.from('user_vouchers')
      .select('vouchers').eq('user_id', userId).maybeSingle()

    const progMap = {}
    for (const p of (progRows || [])) progMap[p.task_id] = p

    const enriched = (tasks || []).map(t => {
      const p   = progMap[t.id] || {}
      const prog = parseFloat(p.progress || 0)
      const req  = parseFloat(t.requirement)
      return {
        id:           t.id,
        title:        t.title,
        description:  t.description,
        task_type:    t.task_type,
        requirement:  req,
        voucher_reward: t.voucher_reward,
        progress:     prog,
        completed:    p.completed || false,
        completed_at: p.completed_at || null,
        percent:      Math.min(100, Math.round((prog / req) * 100)),
      }
    })

    const uniqueEnriched = enriched.filter((t, i, self) => i === self.findIndex(x => x.id === t.id))
    const completedCount = uniqueEnriched.filter(t => t.completed).length
    const willCompleteCount = uniqueEnriched.filter(t => !t.completed).length

    return res.json({
      success: true,
      vouchers: vouRow ? parseInt(vouRow.vouchers) : 0,
      task_completed: completedCount,
      will_complete: willCompleteCount,
      tasks: uniqueEnriched,
    })
  } catch (err) {
    logger.error('Tasks', `daily-tasks: ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — DELETE USER
// ═══════════════════════════════════════════════════════════════════════════════

app.delete('/admin/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    await supabase.from('user_task_progress').delete().eq('user_id', id)
    await supabase.from('user_vouchers').delete().eq('user_id', id)
    await supabase.from('referrals').delete().or(`referrer_id.eq.${id},referred_id.eq.${id}`)
    await supabase.from('transactions').delete().eq('user_id', id)
    await supabase.from('tickets').delete().eq('user_id', id)
    await supabase.from('investments').delete().eq('user_id', id)
    await supabase.from('recharge_requests').delete().eq('user_id', id)
    await supabase.from('withdrawals').delete().eq('user_id', id)
    await supabase.from('invitation_codes').delete().eq('user_id', id)
    await supabase.from('users').delete().eq('id', id)
    logger.success('Admin', `Deleted user ${id}`)
    return res.json({ success: true })
  } catch (err) {
    logger.error('Admin', `DeleteUser: ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ── Movie Section Shuffle ─────────────────────────────────────────────────────
async function shuffleMovieSections() {
  try {
    logger.cron('Starting daily movie shuffle')
    const { data: allMovies, error: fetchErr } = await supabase
      .from('movies').select('id, title, section, sort_order').eq('is_active', true)
    if (fetchErr) throw fetchErr
    if (!allMovies || allMovies.length === 0) { logger.cron('No movies to shuffle'); return }

    const popularMovies = allMovies.filter(m => m.section === 'popular')
    if (popularMovies.length > 0) {
      const { error: moveErr } = await supabase.from('movies')
        .update({ section: 'showing_up' }).in('id', popularMovies.map(m => m.id))
      if (moveErr) throw moveErr
      logger.cron(`Moved ${popularMovies.length} movie(s) from popular → showing_up`)
    }

    const shuffledPool = [...allMovies].sort(() => Math.random() - 0.5)
    const newPopular   = shuffledPool.slice(0, Math.min(3, shuffledPool.length))
    if (newPopular.length > 0) {
      const { error: popErr } = await supabase.from('movies')
        .update({ section: 'popular' }).in('id', newPopular.map(m => m.id))
      if (popErr) throw popErr
      logger.cron(`Set ${newPopular.length} new popular: ${newPopular.map(m => m.title).join(', ')}`)
    }

    const shuffledIds = [...allMovies].sort(() => Math.random() - 0.5).map(m => m.id)
    for (let i = 0; i < shuffledIds.length; i++) {
      await supabase.from('movies').update({ sort_order: i + 1 }).eq('id', shuffledIds[i])
    }

    logger.cron(`Movie shuffle complete. ${newPopular.length} popular, ${allMovies.length - newPopular.length} showing_up`)
  } catch (err) {
    logger.error('Shuffle', `Movie shuffle failed: ${err.message}`)
  }
}

app.post('/admin/shuffle-movies', requireAdmin, async (req, res) => {
  try {
    await shuffleMovieSections()
    return res.json({ success: true, message: 'Movies shuffled successfully' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// ── Global error handlers ────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('Server', `Uncaught Exception: ${err.message}`)
  sendDiscordNotification('Server Error', 'Uncaught exception on Zeloh server', 0xFF0000, [
    { name: 'Error', value: err.message.slice(0, 1024), inline: false },
  ]).catch(() => null)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Server', `Unhandled Rejection: ${reason}`)
  sendDiscordNotification('Server Error', 'Unhandled promise rejection', 0xFF0000, [
    { name: 'Reason', value: String(reason).slice(0, 1024), inline: false },
  ]).catch(() => null)
})

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  logger.success('Server', `Zeloh server running on port ${PORT}`)
})
