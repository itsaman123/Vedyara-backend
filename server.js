const app = require('./app')
const http = require('http')
const logger = require('./logging/logger')
const { connectDB } = require('./config/db')

const PORT = process.env.PORT || 8000

async function start() {
  await connectDB()
  const server = http.createServer(app)
  server.listen(PORT, () => {
    logger.info(`started server on port ${PORT}`)
  })
}

start().catch(err => {
  logger.error('Failed to start', err)
  process.exit(1)
})
