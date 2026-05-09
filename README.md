# MERN Authentication Template

## Vedyara Admin Inventory Slice

This backend now includes the first Vedyara admin APIs:

### Admin Login

```http
POST /api/admin/auth/login
Content-Type: application/json

{
  "email": "admin@vedyara.com",
  "password": "your-password"
}
```

Successful responses return the admin profile and a JWT token, and also set the `jwt` HTTP-only cookie. The user account must have `role: "admin"`.

### Get Admin Profile

```http
GET /api/admin/auth/me
Authorization: Bearer <token>
```

### Add Inventory

```http
POST /api/admin/inventory/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "64f000000000000000000000",
  "quantity": 25,
  "type": "added",
  "note": "Initial organic produce stock"
}
```

`type` can be `added` or `removed`. The API writes an inventory movement and updates product stock in a MongoDB transaction.

### Get Inventory List

```http
GET /api/admin/inventory?page=1&limit=20&type=added&search=apple
Authorization: Bearer <token>
```

Supports pagination, type filtering, product filtering, product name/SKU search, and sorting by `createdAt`, `quantity`, or `type`.

This is a MERN (MongoDB, Express.js, React, Node.js) authentication template that demonstrates how user authentication works in a MERN stack application using JWT (JSON Web Tokens) and bcryptjs for password hashing. This template provides a basic structure and functionality for user registration, login, authentication and profile update, which you can use as a starting point for building your own secure web applications.

## Features

- User registration with validation.
- User login with authentication and JWT token generation.
- Secure password hashing using bcryptjs.
- MongoDB integration for storing user data.
- React frontend with form validation and error handling (To be added...)

## Prerequisites

Before getting started, ensure you have the following dependencies installed on your system:

- Node.js and npm: Make sure you have Node.js and npm installed on your machine. You can download them from [nodejs.org](https://nodejs.org/).

- MongoDB: You should have MongoDB installed and running. You can download and install MongoDB from [mongodb.com](https://www.mongodb.com/).

## Getting Started

1. Clone the repository to your local machine:

   ```bash
   git clone https://github.com/harsh661/mern-auth.git
   ```
2. Change into project directory

    ```bash
    cd mern-auth
    ```
3. Install dependencies

    ```bash
    npm install
    ```
4. Rename .env-example to .env and add following content:

    ```js
    NODE_ENV=development
    PORT=3000
    MONGODB_URI=your-mongodb-connection-string
    JWT_SECRET=your-secret-key
    CLIENT_URL=http://localhost:5173
    RESEND_API_KEY=your-resend-api-key
    RESEND_FROM_EMAIL=YourBrand <onboarding@resend.dev>
    ```
5. Start server:

    ```bash
    npm run devStart
    ```

