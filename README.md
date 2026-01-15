# POS System Frontend

Frontend aplikasi Point of Sale (POS) dengan React dan TailwindCSS.

## Features

### 🔐 Authentication
- Login untuk Admin dan Kasir
- Protected routes dengan role-based access control

### 👨‍💼 Admin Dashboard
- **Dashboard**: Overview statistik sistem
- **Kategori**: CRUD kategori produk
- **Produk**: CRUD produk dengan image URL dan kategori
- **Modifier Groups**: CRUD grup modifier (single/multi selection)
- **Modifiers**: CRUD modifier dengan price delta
- **Kitchen Queue**: Monitor dan update status pesanan
- **Verifikasi Pembayaran**: Review dan verifikasi pembayaran QRIS

### 👤 Customer Interface
- Browse menu produk
- Pilih modifier untuk produk
- Shopping cart functionality
- Checkout (coming soon)

## Tech Stack

- **React** 18.2.0
- **React Router** v6
- **TailwindCSS** v3
- **Axios** untuk API calls

## Installation

### 1. Clone dan Install Dependencies

```bash
cd frontend-pos
npm install
```

### 2. Setup Environment

Buat file `.env` dari `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` dan sesuaikan dengan backend URL Anda:

```
REACT_APP_API_URL=http://localhost:3000/api
```

### 3. Run Development Server

```bash
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

## Default Login Credentials

### Admin
- **Username**: admin
- **Password**: admin123
- **Access**: Full admin dashboard

### Kasir
- **Username**: kasir
- **Password**: kasir123
- **Access**: Kitchen dan Payments

## Project Structure

```
frontend-pos/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminLayout.js       # Admin sidebar layout
│   │   └── shared/
│   │       └── ProtectedRoute.js    # Route protection
│   ├── contexts/
│   │   └── AuthContext.js           # Authentication context
│   ├── pages/
│   │   ├── Login.js                 # Login page
│   │   ├── AdminDashboard.js        # Admin dashboard
│   │   ├── Categories.js            # Category management
│   │   ├── Products.js              # Product management
│   │   ├── ModifierGroups.js        # Modifier group management
│   │   ├── Modifiers.js             # Modifier management
│   │   ├── Kitchen.js               # Kitchen queue
│   │   ├── Payments.js              # Payment verification
│   │   └── CustomerMenu.js          # Customer menu page
│   ├── services/
│   │   └── api.js                   # API service layer
│   ├── App.js                       # Main app with routing
│   ├── index.js                     # Entry point
│   └── index.css                    # Tailwind CSS
├── .env.example
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## API Integration

Aplikasi ini terintegrasi dengan backend API yang memiliki endpoint:

### Public API (Customer)
- `GET /api/public/menu` - Get menu lengkap
- `POST /api/public/orders` - Create order
- `GET /api/public/orders/:orderNo` - Get order detail
- `POST /api/public/orders/:orderNo/qris-proof` - Upload bukti bayar

### Staff API (Admin/Kasir)
- `POST /api/staff/pos/orders` - Create POS order
- `GET /api/staff/kitchen/queue` - Get kitchen queue
- `GET /api/staff/kitchen/orders/:orderId` - Get order detail
- `PATCH /api/staff/kitchen/orders/:orderId/status` - Update status
- `GET /api/staff/payments/pending` - Get pending payments
- `POST /api/staff/payments/:paymentId/verify` - Verify payment
- `GET /api/staff/catalog/categories` - List categories
- `POST /api/staff/catalog/categories` - Create category
- `PATCH /api/staff/catalog/categories/:id` - Update category
- `DELETE /api/staff/catalog/categories/:id` - Delete category
- Plus endpoints untuk products, modifier-groups, modifiers

## Build untuk Production

```bash
npm run build
```

Files akan di-generate di folder `build/`

## Notes

- Authentication saat ini menggunakan mock authentication di frontend
- Untuk production, implementasikan proper JWT authentication dengan backend
- Image upload untuk produk menggunakan URL eksternal
- Payment proof disimpan di backend dan diakses via file server

## Future Enhancements

- [ ] Proper JWT authentication
- [ ] Image upload functionality untuk produk
- [ ] Complete checkout flow untuk customer
- [ ] Order tracking untuk customer
- [ ] Real-time updates dengan WebSocket
- [ ] Print receipt functionality
- [ ] Report dan analytics
- [ ] Multi-language support

## Support

Untuk pertanyaan atau masalah, silakan buat issue di repository.
