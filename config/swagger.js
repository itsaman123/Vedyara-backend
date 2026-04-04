const swaggerJsdoc = require('swagger-jsdoc')

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Vedyara Backend API',
            version: '1.0.0',
            description: 'API documentation for Vedyara Backend endpoints'
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
                AuthResponse: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' }
                    }
                },
                RefreshRequest: {
                    type: 'object',
                    required: ['refreshToken'],
                    properties: { refreshToken: { type: 'string' } }
                },
                Product: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        price: { type: 'number' },
                        discountedPrice: { type: 'number' },
                        summary: { type: 'string' },
                        description: { type: 'string' },
                        sku: { type: 'string' },
                        category: { type: 'string' },
                        image: { type: 'array', items: { type: 'string' } },
                        views: { type: 'integer' },
                        sales: { type: 'integer' },
                        revenue: { type: 'number' },
                        is_deleted: { type: 'boolean' }
                    }
                },
                DashboardStats: {
                    type: 'object',
                    properties: {
                        overall: {
                            type: 'object',
                            properties: {
                                totalProducts: { type: 'integer' },
                                totalViews: { type: 'integer' },
                                totalSales: { type: 'integer' },
                                totalRevenue: { type: 'number' }
                            }
                        },
                        topViewedProducts: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                        topSellingProducts: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
                    }
                },
                ProductTraffic: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        views: { type: 'integer' },
                        sales: { type: 'integer' },
                        revenue: { type: 'number' },
                        conversionRate: { type: 'string' }
                    }
                }
            }
        }
    },
    apis: []
}

const swaggerSpec = swaggerJsdoc(options)

swaggerSpec.paths = swaggerSpec.paths || {}

// Users API
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
            '200': { description: 'Auth tokens and user data', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
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

// Products API
swaggerSpec.paths['/products'] = {
    get: {
        tags: ['Products'],
        summary: 'Retrieve all products',
        responses: {
            '200': { description: 'List of products', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } },
            '500': { description: 'Server error' }
        }
    },
    post: {
        tags: ['Products'],
        summary: 'Create a new product (Admin Only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
            required: true,
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            price: { type: 'number' },
                            discountedPrice: { type: 'number' },
                            summary: { type: 'string' },
                            description: { type: 'string' },
                            sku: { type: 'string' },
                            category: { type: 'string' },
                            files: { type: 'array', items: { type: 'string', format: 'binary' } }
                        }
                    }
                }
            }
        },
        responses: {
            '201': { description: 'Product created successfully' },
            '400': { description: 'Bad request / File limit exceeded' },
            '401': { description: 'Not authenticated' },
            '403': { description: 'Forbidden (Not Admin)' },
            '500': { description: 'Server error' }
        }
    }
}

swaggerSpec.paths['/products/{id}'] = {
    get: {
        tags: ['Products'],
        summary: 'Retrieve a product by ID',
        parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
            '200': { description: 'Product object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
            '404': { description: 'Product not found' },
            '500': { description: 'Server error' }
        }
    },
    put: {
        tags: ['Products'],
        summary: 'Update a product by ID (Admin Only)',
        security: [{ bearerAuth: [] }],
        parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
            required: true,
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            price: { type: 'number' },
                            discountedPrice: { type: 'number' },
                            summary: { type: 'string' },
                            description: { type: 'string' },
                            sku: { type: 'string' },
                            category: { type: 'string' },
                            files: { type: 'array', items: { type: 'string', format: 'binary' } }
                        }
                    }
                }
            }
        },
        responses: {
            '200': { description: 'Product updated successfully' },
            '404': { description: 'Product not found' },
            '401': { description: 'Not authenticated' },
            '403': { description: 'Forbidden (Not Admin)' },
            '500': { description: 'Server error' }
        }
    },
    delete: {
        tags: ['Products'],
        summary: 'Soft delete a product by ID (Admin Only)',
        security: [{ bearerAuth: [] }],
        parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
            '200': { description: 'Product deleted successfully' },
            '404': { description: 'Product not found' },
            '401': { description: 'Not authenticated' },
            '403': { description: 'Forbidden (Not Admin)' },
            '500': { description: 'Server error' }
        }
    }
}

// Dashboard API
swaggerSpec.paths['/dashboard/stats'] = {
    get: {
        tags: ['Dashboard'],
        summary: 'Retrieve dashboard overall metrics (Admin Only)',
        security: [{ bearerAuth: [] }],
        responses: {
            '200': { description: 'Dashboard stats object', content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardStats' } } } },
            '401': { description: 'Not authenticated' },
            '403': { description: 'Forbidden (Not Admin)' },
            '500': { description: 'Server error' }
        }
    }
}

swaggerSpec.paths['/dashboard/product/{id}/traffic'] = {
    get: {
        tags: ['Dashboard'],
        summary: 'Retrieve traffic metrics for a specific product (Admin Only)',
        security: [{ bearerAuth: [] }],
        parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
            '200': { description: 'Product traffic stats object', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductTraffic' } } } },
            '404': { description: 'Product not found' },
            '401': { description: 'Not authenticated' },
            '403': { description: 'Forbidden (Not Admin)' },
            '500': { description: 'Server error' }
        }
    }
}

module.exports = swaggerSpec
