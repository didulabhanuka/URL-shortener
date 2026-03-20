const geoip = require('geoip-lite')
const UAParser = require('ua-parser-js')

function getCountry(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return 'Local'
  const geo = geoip.lookup(ip)
  return geo ? geo.country : 'Unknown'
}

function parseUserAgent(uaString) {
  const parser = new UAParser(uaString)
  const result = parser.getResult()
  return {
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
    device: result.device.type || 'desktop',
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || req.ip
}

module.exports = { getCountry, parseUserAgent, getClientIp }