require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  category: { type: String, default: "General" },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 10, min: 0 },
  image: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});
const orderSchema = new mongoose.Schema({
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true }
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: String,
    price: Number,
    quantity: Number
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ["Placed", "Processing", "Shipped", "Delivered", "Cancelled"], default: "Placed" },
  createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model("Product", productSchema);
const Order = mongoose.model("Order", orderSchema);

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const starterProducts = [
  {name:"Everyday Sneakers",category:"Fashion",price:1499,stock:18,description:"Comfortable sneakers for everyday use.",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700"},
  {name:"Classic Wrist Watch",category:"Accessories",price:2199,stock:12,description:"A clean and timeless everyday watch.",image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700"},
  {name:"Wireless Headphones",category:"Electronics",price:1899,stock:15,description:"Enjoy your favourite music wirelessly.",image:"https://images.unsplash.com/photo-150好?w=700"},
  {name:"Travel Backpack",category:"Accessories",price:1299,stock:20,description:"A practical backpack for work and travel.",image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700"},
  {name:"Ceramic Coffee Mug",category:"Home",price:399,stock:30,description:"A minimal ceramic mug for your daily coffee.",image:"https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=700"},
  {name:"Desk Lamp",category:"Home",price:999,stock:9,description:"A modern lamp for your desk or bedside.",image:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700"},
  {name:"Cotton T-Shirt",category:"Fashion",price:599,stock:25,description:"Soft cotton T-shirt for everyday comfort.",image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700"},
  {name:"Sunglasses",category:"Accessories",price:799,stock:14,description:"Lightweight sunglasses with a classic shape.",image:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=700"}
];

async function seedProducts() {
  if (await Product.countDocuments() === 0) {
    await Product.insertMany(starterProducts.filter(p => !p.image.includes("好")));
    console.log("Starter products added.");
  }
}

// Product APIs
app.get("/api/products", asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.category && req.query.category !== "All") filter.category = req.query.category;
  if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };
  res.json(await Product.find(filter).sort({ createdAt: -1 }));
}));
app.get("/api/products/:id", asyncRoute(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({message:"Product not found"});
  res.json(product);
}));
app.post("/api/products", asyncRoute(async (req, res) => {
  const {name, price} = req.body;
  if (!name || price === undefined) return res.status(400).json({message:"Name and price are required"});
  res.status(201).json(await Product.create(req.body));
}));
app.put("/api/products/:id", asyncRoute(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {new:true, runValidators:true});
  if (!product) return res.status(404).json({message:"Product not found"});
  res.json(product);
}));
app.delete("/api/products/:id", asyncRoute(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({message:"Product not found"});
  res.json({message:"Product deleted"});
}));

// Create an order. Prices are read from MongoDB, never trusted from the browser.
app.post("/api/orders", asyncRoute(async (req, res) => {
  const {customer, items} = req.body;
  if (!customer?.name || !customer?.email || !customer?.address || !Array.isArray(items) || !items.length) {
    return res.status(400).json({message:"Enter customer details and add at least one item"});
  }
  const ids = items.map(item => item.productId);
  const products = await Product.find({_id: {$in: ids}});
  const productMap = new Map(products.map(p => [String(p._id), p]));
  const orderItems = [];
  let total = 0;
  for (const item of items) {
    const product = productMap.get(String(item.productId));
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({message:"One of the cart items is invalid"});
    }
    if (product.stock < quantity) return res.status(400).json({message:`Only ${product.stock} units left for ${product.name}`});
    orderItems.push({product: product._id, name: product.name, price: product.price, quantity});
    total += product.price * quantity;
  }
  // Reduce stock only after all cart lines have passed validation.
  for (const item of orderItems) {
    await Product.updateOne({_id:item.product}, {$inc:{stock:-item.quantity}});
  }
  const order = await Order.create({customer, items:orderItems, total});
  res.status(201).json({message:"Order placed successfully", order});
}));

app.get("/api/orders", asyncRoute(async (req, res) => {
  res.json(await Order.find().sort({createdAt:-1}));
}));
app.get("/api/orders/:id", asyncRoute(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({message:"Order not found"});
  res.json(order);
}));
app.patch("/api/orders/:id/status", asyncRoute(async (req, res) => {
  const allowed = ["Placed","Processing","Shipped","Delivered","Cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({message:"Invalid order status"});
  const order = await Order.findByIdAndUpdate(req.params.id, {status:req.body.status}, {new:true});
  if (!order) return res.status(404).json({message:"Order not found"});
  res.json(order);
}));

app.get("/api/summary", asyncRoute(async (req, res) => {
  const [products, orders, revenue] = await Promise.all([
    Product.countDocuments(), Order.countDocuments({status:{$ne:"Cancelled"}}),
    Order.aggregate([{$match:{status:{$ne:"Cancelled"}}},{$group:{_id:null,total:{$sum:"$total"}}}])
  ]);
  res.json({products, orders, revenue:revenue[0]?.total || 0});
}));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "CastError") return res.status(400).json({message:"Invalid ID format"});
  if (err.name === "ValidationError") return res.status(400).json({message:err.message});
  res.status(500).json({message:"Server error. Check the terminal."});
});

mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/onlinestore")
  .then(async () => {
    console.log("Connected to MongoDB");
    await seedProducts();
    app.listen(PORT, () => console.log(`Online Store running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });