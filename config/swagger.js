const swaggerJsdoc = require('swagger-jsdoc')

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Vedyara Backend API',
            version: '1.0.0',
            description: 'API documentation for user authentication endpoints'
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' }
                    }
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', format: 'password' }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', format: 'password' }
                    }
                },
                AdminLogin:{
                    type: 'object',
                    required: ['email', 'password', 'role'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', format: 'password' },
                        role: { type: 'string' }
                    }

                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' }
                    }
                },
                RefreshRequest: {
                    type: 'object',
                    required: ['refreshToken'],
                    properties: { refreshToken: { type: 'string' } }
                }
            }
        }
    },
    // no file globs needed since we define paths explicitly
    apis: []
}

const swaggerSpec = swaggerJsdoc(options)

// Manually add paths for the user routes
swaggerSpec.paths = swaggerSpec.paths || {}

swaggerSpec.paths['/users/register'] = {
    post: {
        tags: ['Users'],
        summary: 'Register a new user',
        requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } }
        },
        responses: {
            '201': { description: 'User created' },
            '400': { description: 'Missing fields' },
            '409': { description: 'Email already in use' }
        }
    }
}

swaggerSpec.paths['/users/login'] = {
    post: {
        tags: ['Users'],
        summary: 'Login and receive access and refresh tokens',
        requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
            '200': { description: 'Auth tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            '400': { description: 'Missing fields' },
            '401': { description: 'Invalid credentials' }
        }
    }
}

swaggerSpec.paths['/users/refresh'] = {
    post: {
        tags: ['Users'],
        summary: 'Exchange refresh token for new access (and rotated refresh token)',
        requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } }
        },
        responses: {
            '200': { description: 'New tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            '400': { description: 'Missing refreshToken' },
            '401': { description: 'Invalid or revoked refresh token' }
        }
    }
}

swaggerSpec.paths['/users/logout'] = {
    post: {
        tags: ['Users'],
        summary: 'Logout and revoke provided refresh token',
        requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } }
        },
        responses: {
            '200': { description: 'Logged out' }
        }
    }
}

swaggerSpec.paths['/users/me'] = {
    get: {
        tags: ['Users'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
            '200': { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            '401': { description: 'Not authenticated' }
        }
    }
}
swaggerSpec.paths['/admin-users/v1/login'] = {
    post: {
        tags: ['Admin'],
        summary: 'Login and receive access and refresh tokens',
        requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminLogin' } } }
        },
        responses: {
            '200': { description: 'Auth tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            '400': { description: 'Missing fields' },
            '401': { description: 'Invalid credentials' }
        }
    }
}

module.exports = swaggerSpec
