# QuickBasket – E-Commerce Clothing Marketplace

QuickBasket is a full-stack clothing marketplace where customers can browse products, manage a cart, and place orders through a secure checkout flow.

## Features

- Product catalog with search, category filters, and product detail pages
- User registration, login, and authenticated account features
- Shopping cart with product variants and quantity controls
- Checkout totals calculated from the server-side cart and current product prices
- Razorpay Payment Links with signed callback and provider payment verification
- Customer order history and order detail pages
- Admin tools for managing products, users, and orders
- Responsive React storefront

## Tech Stack

- **Frontend:** React, Redux Toolkit, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Payments:** Razorpay Payment Links

## Prerequisites

- Node.js and npm
- MongoDB
- Razorpay credentials for payment testing

## Setup

Install the project dependencies:

```bash
cd Backend && npm install
cd ../Frontend && npm install
```

Create a `.env` file in the project root:

```env
PORT=9000
MONGO_URI=mongodb://127.0.0.1:27017/quickbasket
JWT_SECRET=replace_with_a_long_random_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
FRONTEND_URL=http://localhost:5173
```

Create `Frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:9000
```

Use Razorpay test credentials during development. Keep `.env` files private and never commit secret keys.

## Run Locally

Start MongoDB, then run the backend from the project root:

```bash
node Backend/server.js
```

In a second terminal, start the frontend:

```bash
cd Frontend
npm run dev
```

Open the URL printed by Vite, usually [http://localhost:5173](http://localhost:5173).

## Payment Flow

The backend calculates checkout totals from the authenticated user's cart and current catalog prices. It creates a paid order only after verifying the Razorpay callback signature and confirming the payment details with Razorpay.

## Project Structure

```text
QuickBasket/
├── Backend/       # Express API, MongoDB models, payment and order routes
├── Frontend/      # React storefront and admin interface
└── README.md
```
