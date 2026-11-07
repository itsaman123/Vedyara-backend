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

## Storefront checkout

Customers check out without a password. The first order with a new email creates the account, and the address used is saved to the profile. A returning email has to enter a 6-digit code sent by email before the order is placed. The same code flow powers `/login`.

### Environment

```js
RAZORPAY_KEY_ID=rzp_live_xxx          // online payments are offered only when both keys are set
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx           // optional, recommended (see below)
RESEND_API_KEY=re_xxx                 // sign-in codes
RESEND_FROM_EMAIL=Vedyara <orders@your-verified-domain.in>
```

`RESEND_FROM_EMAIL` must be on a domain verified in Resend; a Gmail address is rejected. With `NODE_ENV=development`, codes are also printed to the server log so checkout can be tested without email.

### Razorpay webhook

In the Razorpay dashboard, add a webhook to `https://<backend>/api/v1/orders/razorpay-webhook` for the `payment.captured` and `order.paid` events, using the same secret as `RAZORPAY_WEBHOOK_SECRET`. This records payments even if the customer closes the tab before the site confirms them.

### Main endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/orders/payment-config` | Which payment methods to show |
| POST | `/api/v1/users/checkout-auth` | `{ name, email, phone }` → session, or `{ otpRequired: true }` |
| POST | `/api/v1/users/otp/request`, `/otp/verify` | Email sign-in code |
| POST | `/api/v1/orders/create-cod` | `{ items, shippingAddress, saveAddress }` |
| POST | `/api/v1/orders/create`, `/verify` | Razorpay order + signature check |
| POST | `/api/v1/cart/merge`, `/api/v1/wishlist/merge` | Fold a guest cart/wishlist into the account |
| PATCH | `/api/admin/orders/:id/status` | Cancelling puts the stock back |

Prices and stock are always taken from the database, never from the request. COD orders take stock when placed; online orders take it once payment is confirmed.

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

