const express = require('express')
const prisma = require('../db/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// GET /api/analytics/overview — dashboard summary for current user
router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId

    const urls = await prisma.url.findMany({
      where: { userId },
      include: { _count: { select: { clicks: true } } },
    })

    const urlIds = urls.map((u) => u.id)
    const totalClicks = urls.reduce((sum, u) => sum + u._count.clicks, 0)

    // Clicks per day for last 7 days
    const since = new Date()
    since.setDate(since.getDate() - 6)
    since.setHours(0, 0, 0, 0)

    const recentClicks = await prisma.click.findMany({
      where: { urlId: { in: urlIds }, clickedAt: { gte: since } },
      select: { clickedAt: true, country: true, device: true, referrer: true },
    })

    // Clicks by day
    const clicksByDay = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-US', { weekday: 'short' })
      clicksByDay[key] = 0
    }
    recentClicks.forEach((c) => {
      const key = new Date(c.clickedAt).toLocaleDateString('en-US', { weekday: 'short' })
      if (key in clicksByDay) clicksByDay[key]++
    })

    // Device breakdown (all time)
    const allClicks = await prisma.click.findMany({
      where: { urlId: { in: urlIds } },
      select: { device: true, country: true, referrer: true },
    })

    const byDevice = allClicks.reduce((acc, c) => {
      const key = c.device || 'desktop'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    // Top referrers
    const byReferrer = allClicks.reduce((acc, c) => {
      const key = c.referrer || 'Direct'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    // Top country
    const byCountry = allClicks.reduce((acc, c) => {
      const key = c.country || 'Unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const topCountry = Object.entries(byCountry).sort(([, a], [, b]) => b - a)[0]

    // Unique IPs (approximate unique visitors)
    const uniqueVisitors = await prisma.click.findMany({
      where: { urlId: { in: urlIds } },
      select: { ip: true },
      distinct: ['ip'],
    })

    res.json({
      totalClicks,
      activeLinks: urls.length,
      uniqueVisitors: uniqueVisitors.length,
      topCountry: topCountry ? { name: topCountry[0], pct: Math.round((topCountry[1] / allClicks.length) * 100) } : null,
      clicksByDay,
      byDevice,
      byReferrer: Object.entries(byReferrer)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/analytics/:urlId — per-link analytics
router.get('/:urlId', authenticate, async (req, res, next) => {
  try {
    const url = await prisma.url.findFirst({
      where: { id: req.params.urlId, userId: req.user.userId },
    })
    if (!url) return res.status(404).json({ error: 'Link not found' })

    const clicks = await prisma.click.findMany({
      where: { urlId: url.id },
      orderBy: { clickedAt: 'asc' },
    })

    const clicksByDate = clicks.reduce((acc, c) => {
      const date = c.clickedAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    const byCountry = clicks.reduce((acc, c) => {
      acc[c.country || 'Unknown'] = (acc[c.country || 'Unknown'] || 0) + 1
      return acc
    }, {})

    const byBrowser = clicks.reduce((acc, c) => {
      acc[c.browser || 'Unknown'] = (acc[c.browser || 'Unknown'] || 0) + 1
      return acc
    }, {})

    const byDevice = clicks.reduce((acc, c) => {
      acc[c.device || 'desktop'] = (acc[c.device || 'desktop'] || 0) + 1
      return acc
    }, {})

    const byReferrer = clicks.reduce((acc, c) => {
      acc[c.referrer || 'Direct'] = (acc[c.referrer || 'Direct'] || 0) + 1
      return acc
    }, {})

    res.json({
      url: { id: url.id, slug: url.slug, originalUrl: url.originalUrl, createdAt: url.createdAt },
      totalClicks: clicks.length,
      clicksByDate,
      byCountry,
      byBrowser,
      byDevice,
      byReferrer,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router