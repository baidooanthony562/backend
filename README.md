# Cindy Nut Enterprise

A modern full-stack eCommerce website for a home appliance and kitchenware business built with React, Tailwind CSS, Node.js, Express, and MongoDB.

## Project Structure

- `frontend/` - React + Vite customer and admin web application
- `backend/` - Express API server, MongoDB models, authentication, admin management

## Features

### Customer
- Homepage with hero, featured items, categories, best sellers, discounts, testimonials
- Shop page with search, category filter, price filter, sort options
- Product detail pages with stock, add to cart, buy now, related products
- Cart page with quantity updates and checkout
- Authentication with register/login and forgot password flow
- Responsive layout for mobile, tablet, desktop

### Admin
- Admin login
- Dashboard overview with totals and low stock alerts
- Product management (add/edit/delete/restock)
- Order management with status updates
- User list and details
- Inventory tracking

## Setup Instructions

### 1. Backend

1. Open `backend/` folder
2. Copy `.env.example` to `.env`
3. Install dependencies
   ```bash
   npm install
   ```
4. Start the server
   ```bash
   npm run dev
   ```

### 2. Frontend

1. Open `frontend/` folder
2. Install dependencies
   ```bash
   npm install
   ```
3. Start the development server
   ```bash
   npm run dev
   ```

### Routes
- Customer site: `/`
- Shop page: `/shop`
- Product detail: `/product/:id`
- Cart page: `/cart`
- Login: `/login`
- Register: `/register`
- User dashboard: `/dashboard`
- Admin login: `/admin/login`
- Admin dashboard: `/admin`

### Environment Variables

Create `.env` in `backend/` with the following values:

```ini
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/cindy-nut-db
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=admin@cindynut.com
ADMIN_PASSWORD=Admin@123
```

## Notes

- The frontend expects the backend API at `http://localhost:5000/api`
- Use the admin credentials configured in `.env`
- Seed demo products and categories by visiting `http://localhost:5000/api/seed` after starting the backend
- For production, replace the MongoDB URI and secrets with secure values
