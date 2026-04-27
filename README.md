# Ashiq World Live Ecommerce

Deploy-ready ecommerce system with:
- 3D professional product-sales website
- Manual bKash/Nagad payment collection
- WhatsApp order confirmation
- Order database with MongoDB
- Admin panel
- Email confirmation using SMTP/Nodemailer

## Local setup
1. Install Node.js 18+
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill your values
4. Run `npm start`
5. Open `http://localhost:5000`

## Admin panel
Open `/admin.html` and login using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

## Deploy on Render
1. Push this folder to GitHub
2. Create a Render Web Service
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables from `.env.example`
6. Use MongoDB Atlas for `MONGODB_URI`

## Important
This uses manual payment verification. Customers pay to your displayed bKash/Nagad number and submit a Transaction ID. You verify it in the admin panel.
