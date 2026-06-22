/**
 * ONE-TIME MIGRATION: Move all existing images to Cloudflare R2
 * Run: node migrate-images-to-r2.js
 * Delete this file after running.
 */
require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const https = require('https')
const http  = require('http')
const path  = require('path')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const R2_BUCKET     = process.env.R2_BUCKET_NAME  || 'zeloh-media'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL   || 'https://cdn.zeloh.site'

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end',  () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function guessMime(url, contentType) {
  if (contentType && contentType.startsWith('image/')) return contentType
  const ext = path.extname(url.split('?')[0]).toLowerCase()
  return { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'image/jpeg'
}

function safeFilename(url) {
  const base = path.basename(url.split('?')[0])
  return base.replace(/[^a-zA-Z0-9.\-_]/g, '-').slice(0, 80) || 'image.jpg'
}

async function uploadToR2(buffer, filename, mimetype, folder) {
  const key = `${folder}/${Date.now()}-${safeFilename(filename)}`
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    CacheControl: 'public, max-age=31536000',
  }))
  return `${R2_PUBLIC_URL}/${key}`
}

async function migrateUrl(url, folder) {
  if (!url || url.startsWith(R2_PUBLIC_URL)) return null  // already on R2 or empty
  console.log(`  ↓ Downloading: ${url.slice(0, 80)}`)
  const { buffer, contentType } = await downloadBuffer(url)
  const mime    = guessMime(url, contentType)
  const newUrl  = await uploadToR2(buffer, url, mime, folder)
  console.log(`  ✓ Uploaded:    ${newUrl}`)
  return newUrl
}

// ── Migration tasks ───────────────────────────────────────────────────────────

async function migrateMovies() {
  console.log('\n── movies (poster_url) ──')
  const { data, error } = await supabase.from('movies').select('id, poster_url')
  if (error) return console.error('Fetch error:', error.message)
  for (const row of data) {
    try {
      const newUrl = await migrateUrl(row.poster_url, 'movies')
      if (newUrl) await supabase.from('movies').update({ poster_url: newUrl }).eq('id', row.id)
    } catch (err) { console.error(`  ✗ movies/${row.id}:`, err.message) }
  }
}

async function migrateBanners() {
  console.log('\n── banners (image_url) ──')
  const { data, error } = await supabase.from('banners').select('id, image_url')
  if (error) return console.error('Fetch error:', error.message)
  for (const row of data) {
    try {
      const newUrl = await migrateUrl(row.image_url, 'banners')
      if (newUrl) await supabase.from('banners').update({ image_url: newUrl }).eq('id', row.id)
    } catch (err) { console.error(`  ✗ banners/${row.id}:`, err.message) }
  }
}

async function migrateNews() {
  console.log('\n── news (image_url) ──')
  const { data, error } = await supabase.from('news').select('id, image_url')
  if (error) return console.error('Fetch error:', error.message)
  for (const row of data) {
    try {
      const newUrl = await migrateUrl(row.image_url, 'news')
      if (newUrl) await supabase.from('news').update({ image_url: newUrl }).eq('id', row.id)
    } catch (err) { console.error(`  ✗ news/${row.id}:`, err.message) }
  }
}

async function migrateInvestments() {
  console.log('\n── investment_products (image_url) ──')
  const { data, error } = await supabase.from('investment_products').select('id, image_url')
  if (error) return console.error('Fetch error:', error.message)
  for (const row of data) {
    try {
      const newUrl = await migrateUrl(row.image_url, 'investments')
      if (newUrl) await supabase.from('investment_products').update({ image_url: newUrl }).eq('id', row.id)
    } catch (err) { console.error(`  ✗ investment_products/${row.id}:`, err.message) }
  }
}

async function migrateWallets() {
  console.log('\n── wallet_addresses (qr_code_url) ──')
  const { data, error } = await supabase.from('wallet_addresses').select('id, network, qr_code_url')
  if (error) return console.error('Fetch error:', error.message)
  for (const row of data) {
    try {
      const newUrl = await migrateUrl(row.qr_code_url, 'qr')
      if (newUrl) await supabase.from('wallet_addresses').update({ qr_code_url: newUrl }).eq('id', row.id)
    } catch (err) { console.error(`  ✗ wallet_addresses/${row.id} (${row.network}):`, err.message) }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

;(async () => {
  console.log('=== Image Migration to Cloudflare R2 ===')
  console.log(`Bucket:     ${R2_BUCKET}`)
  console.log(`Public URL: ${R2_PUBLIC_URL}`)

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.error('\n✗ Missing R2 env vars. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.')
    process.exit(1)
  }

  await migrateMovies()
  await migrateBanners()
  await migrateNews()
  await migrateInvestments()
  await migrateWallets()

  console.log('\n=== Migration complete. Delete this file now. ===')
  process.exit(0)
})()
