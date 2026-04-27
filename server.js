require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const orderSchema = new mongoose.Schema({
  customer: {
    name: String,
    phone: String,
    email: String,
    address: String,
    note: String
  },
  payment: {
    method: String,
    trxId: String,
    status: { type: String, default: 'Pending Verification' }
  },
  items: [{ id: String, name: String, price: Number, qty: Number, image: String }],
  subtotal: Number,
  delivery: Number,
  total: Number,
  status: { type: String, default: 'New Order' },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

async function connectDb() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI missing. Orders will not be saved until database is configured.');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
}
connectDb().catch(err => console.error('MongoDB connection error:', err.message));

function makeTransporter() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

app.get('/api/config', (req, res) => {
  res.json({
    storeWhatsApp: process.env.STORE_WHATSAPP || '8801XXXXXXXXX',
    bkashNumber: process.env.BKASH_NUMBER || '01XXXXXXXXX',
    nagadNumber: process.env.NAGAD_NUMBER || '01XXXXXXXXX'
  });
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token });
  }
  return res.status(401).json({ message: 'Invalid admin login' });
});

app.post('/api/orders', async (req, res) => {
  try {
    if (!mongoose.connection.readyState) {
      return res.status(503).json({ message: 'Database is not configured yet.' });
    }
    const { customer, payment, items, subtotal, delivery, total } = req.body;
    if (!customer?.name || !customer?.phone || !customer?.address || !payment?.method || !items?.length) {
      return res.status(400).json({ message: 'Required checkout information is missing.' });
    }
    if ((payment.method === 'bkash' || payment.method === 'nagad') && !payment.trxId) {
      return res.status(400).json({ message: 'Transaction ID is required for bKash/Nagad orders.' });
    }

    const order = await Order.create({ customer, payment, items, subtotal, delivery, total });

    const transporter = makeTransporter();
    if (transporter && customer.email) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: customer.email,
        subject: `Ashiq World order received #${order._id.toString().slice(-6)}`,
        text: `Hi ${customer.name},\n\nWe received your order. Total: ৳${total}. Payment: ${payment.method}.\n\nWe will verify and confirm soon.\n\nAshiq World`
      }).catch(err => console.warn('Email failed:', err.message));
    }

    res.status(201).json({ orderId: order._id, message: 'Order placed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/orders', adminAuth, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(200);
  res.json(orders);
});

app.patch('/api/admin/orders/:id', adminAuth, async (req, res) => {
  const { status, paymentStatus } = req.body;
  const update = {};
  if (status) update.status = status;
  if (paymentStatus) update['payment.status'] = paymentStatus;
  const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json(order);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Ashiq World server running on port ${PORT}`));
