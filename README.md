# ShopEase – Beginner Full-Stack Online Store

A beginner-friendly e-commerce learning project built with HTML, CSS, JavaScript, Node.js, Express, MongoDB and Mongoose.

## Features
- Product listing with categories and search
- Shopping cart with quantity controls
- Checkout form and order creation
- Order lookup using order ID
- Admin demo: add, edit and delete products
- Admin demo: view orders and update order status
- MongoDB stores products and orders
- Starter products are inserted automatically on first run

## Requirements
- Node.js LTS: https://nodejs.org/
- MongoDB Community Server: https://www.mongodb.com/try/download/community
- VS Code: https://code.visualstudio.com/

## Run locally
1. Extract the ZIP and open `online-store-fullstack` in VS Code.
2. Open Terminal → New Terminal.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start MongoDB locally, or use MongoDB Atlas.
5. Optional: copy `.env.example` to `.env` and set your MongoDB URI.
6. Start the app:
   ```bash
   npm run dev
   ```
7. Open http://localhost:3000

The default local database URI is:
`mongodb://127.0.0.1:27017/onlinestore`

## MongoDB Atlas
1. Create a free cluster at https://www.mongodb.com/atlas.
2. Create a database user and allow your IP address in Network Access.
3. Copy the connection string from Connect → Drivers.
4. Create `.env` in the project root and set:
   ```text
   MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/onlinestore
   PORT=3000
   ```
5. Replace the placeholders with your actual Atlas details. Never share `.env` or commit it to Git.

## Folder structure
```text
online-store-fullstack/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/products` | List/search/filter products |
| GET | `/api/products/:id` | Product details |
| POST | `/api/products` | Add product |
| PUT | `/api/products/:id` | Edit product |
| DELETE | `/api/products/:id` | Delete product |
| POST | `/api/orders` | Place order |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Look up an order |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/summary` | Admin summary |

## Test the project
1. Browse products and filter by category.
2. Search for a product.
3. Add products to the bag and change quantities.
4. Continue to checkout and enter sample customer details.
5. Place an order and copy its order ID.
6. Use Order lookup to see its status.
7. Open Admin to add/edit/delete products and update order status.

## Important limitations and security
This is a classroom/demo project, not a production store:
- Admin panel and admin APIs have no login or authorization. Anyone who can access the site can manage products and orders. Do not deploy this publicly as-is.
- Checkout is a demo. It does not collect payments or integrate a payment gateway.
- Order stock updates are simple sequential updates, not a database transaction. A production store should use transactions and stronger inventory handling.
- Customer information is stored in MongoDB. Use test data only until authentication, authorization, validation, privacy and security protections are added.
- Product image URLs are entered by the admin; sample images need an internet connection.
