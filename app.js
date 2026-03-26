const express = require('express')
const app = express()

const compression = require('compression')
const morgan = require('./logging/morgan')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')

// Middlewares
app.use(express.json())
app.use(compression())
app.use(cors())

// Logging

app.use(morgan)

// Define routes
app.use('/', require('./routes'))
// User routes
app.use('/api/users', require('./routes/user.route'))

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

module.exports = app
