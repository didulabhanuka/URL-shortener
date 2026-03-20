const Redis = require('ioredis')

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: true,
  enableOfflineQueue: false,
})

redis.on('error', () => {}) // suppress unhandled error events

const SLUG_TTL = 60 * 60 * 24 // 24 hours

async function cacheSlug(slug, originalUrl) {
  try {
    await redis.set(`slug:${slug}`, originalUrl, 'EX', SLUG_TTL)
  } catch {
    // Redis unavailable — skip cache, DB will handle it
  }
}

async function getCachedSlug(slug) {
  try {
    return await redis.get(`slug:${slug}`)
  } catch {
    return null
  }
}

async function deleteCachedSlug(slug) {
  try {
    await redis.del(`slug:${slug}`)
  } catch {
    // ignore
  }
}

module.exports = { redis, cacheSlug, getCachedSlug, deleteCachedSlug }