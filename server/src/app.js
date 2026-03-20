const express = require('express')
const cors = require('cors')
const helmet = require('helmet')

const authRoutes = require('./routes/auth')
const shortenRoutes = require('./routes/shorten')
const analyticsRoutes = require('./routes/analytics')
const redirectRoutes = require('./routes/redirect')
const { errorHandler } = require('./middleware/errorHandler')

const app = express()

// Security & parsing
app.use(helmet())

const allowedOrigins = [
  (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  'http://localhost:5173',
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true)
    }
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
}))

app.use(express.json())

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/shorten', shortenRoutes)
app.use('/api/analytics', analyticsRoutes)

// Redirect route — must come last (catches /:slug)
app.use('/', redirectRoutes)

// Global error handler
app.use(errorHandler)

module.exports = app