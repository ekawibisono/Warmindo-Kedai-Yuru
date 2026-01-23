# Kedai Yuru POS Frontend

Frontend aplikasi Point of Sale (POS) dan customer ordering Kedai Yuru, dibangun dengan React dan TailwindCSS.

## Features

### 🔐 Authentication
- Login untuk Admin dan Kasir (staff) dengan staff key
- Login khusus Customer menggunakan Google (Google OAuth)
- Protected routes dengan role-based access control (Admin / Kasir)

### 👨‍💼 Admin & Kasir
- **Dashboard**: Overview statistik sistem
- **Kategori**: CRUD kategori produk
- **Produk**: CRUD produk dengan image URL dan kategori
- **Modifier Groups**: CRUD grup modifier (single/multi selection & required)
- **Modifiers**: CRUD modifier dengan price delta
- **Kitchen Queue**: Monitor dan update status pesanan
- **Verifikasi Pembayaran**: Review dan verifikasi pembayaran QRIS & POS
- **Store Settings**: Atur jam buka/tutup otomatis & status order
- **Discount & Hot Deals**: Kelola diskon dan produk promo
- **Staff Management**: Kelola akun staff & staff key

### 👤 Customer Interface (Web Ordering)
- Login dengan Google khusus untuk customer
- Browse menu produk lengkap dengan kategori & hot deals
- Pilih modifier (level pedas, topping, dll) dengan validasi grup wajib
- Shopping cart dengan perhitungan otomatis harga + modifier
- Checkout online dengan pilihan metode pembayaran (Cash / QRIS)
- Riwayat pesanan per customer (berdasarkan akun Google)
- Tracking pesanan publik dengan token (status real-time + auto-expiry)
- Tombol "Lacak Pesanan" di riwayat hanya aktif untuk pesanan yang masih berjalan

## Tech Stack

- **React** 18.2.0
- **React Router** v6
- **TailwindCSS** v3
- **Axios** untuk API calls

## Installation

### 1. Clone dan Install Dependencies

```bash
cd Warmindo-Kedai-Yuru
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

## Default Login (Dev)

> Catatan: Untuk production, gunakan staff key dari backend, jangan hardcode.

### Admin / Kasir (via staff key)
- Login menggunakan staff key yang dibuat dari modul Staff Management di backend.
- Frontend menyimpan `staff_user` dan `staff_key` di localStorage.

### Customer
- Login menggunakan Google (button "Masuk dengan Google" di halaman Customer Menu).
- Data customer dan token JWT disimpan di localStorage (`customer_data` dan `customer_token`).

## Project Structure

```
Warmindo-Kedai-Yuru/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminLayout.js        # Admin sidebar layout
│   │   ├── customer/
│   │   │   ├── Cart.js               # Keranjang customer
│   │   │   ├── Checkout.js           # Checkout online customer
│   │   │   └── CustomerGoogleLogin.js# Tombol login Google customer
│   │   └── shared/
│   │       └── ProtectedRoute.js     # Route protection (staff)
│   ├── contexts/
│   │   ├── AuthContext.js            # Staff authentication context
│   │   └── CustomerAuthContext.js    # Customer authentication context (Google + JWT)
│   ├── pages/
│   │   ├── Login.js                  # Staff login page
│   │   ├── AdminDashboard.js         # Admin dashboard
│   │   ├── Categories.js             # Category management
│   │   ├── Products.js               # Product management
│   │   ├── ModifierGroups.js         # Modifier group management
│   │   ├── Modifiers.js              # Modifier management
│   │   ├── Kitchen.js                # Kitchen queue
│   │   ├── Payments.js               # Payment verification
│   │   ├── POSCounter.js             # POS kasir (order langsung)
│   │   ├── CustomerMenu.js           # Customer menu & order page
│   │   └── OrderTracking.js          # Halaman tracking pesanan publik
│   ├── services/
│   │   └── api.js                    # API service layer (publicAPI & staffAPI)
│   ├── App.js                       # Main app with routing
│   ├── index.js                     # Entry point
│   └── index.css                    # Tailwind CSS
├── .env.example
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## API Integration (Ringkas)

Aplikasi ini terintegrasi dengan backend API dengan beberapa kelompok endpoint utama:

### Public API (Customer)
- `GET  /api/public/menu`                        - Ambil menu lengkap (produk, kategori, modifier, store settings)
- `POST /api/public/orders`                      - Buat online order (pickup/delivery/dine_in)
- `GET  /api/public/orders/:orderNo`            - Detail & tracking publik dengan token
- `POST /api/public/orders/:orderNo/qris-proof` - Upload bukti bayar QRIS
- `POST /api/public/discounts/validate`         - Validasi kode diskon

### Customer Auth API
- `POST /api/auth/customer/google`  - Login customer via Google
- `GET  /api/auth/customer/profile` - Ambil profil customer (butuh JWT)
- `GET  /api/auth/customer/orders`  - Riwayat pesanan customer (pagination)
- `POST /api/auth/customer/logout`  - Logout customer (invalidate di client)

### Staff API (Admin/Kasir)
- `POST /api/staff/auth/verify`                    - Verifikasi staff key
- `POST /api/staff/pos/orders`                     - Buat POS order (kasir)
- `GET  /api/staff/kitchen/queue`                  - Antrian dapur
- `GET  /api/staff/kitchen/orders/:orderId`        - Detail order di dapur
- `PATCH /api/staff/kitchen/orders/:orderId/status`- Update status order
- `GET  /api/staff/payments/pending`               - Payment pending
- `POST /api/staff/payments/:paymentId/verify`     - Verifikasi pembayaran
- `GET/POST/PATCH/DELETE /api/staff/catalog/...`   - CRUD kategori, produk, modifier groups, modifiers, mapping
- `GET/PUT/PATCH /api/staff/settings`              - Store settings & auto-schedule
- `GET/POST/PUT/DELETE /api/staff/discounts...`    - Manajemen diskon
- `GET/POST/DELETE /api/staff/hot-deals...`        - Manajemen hot deals
- `GET/POST/PATCH/DELETE /api/staff/management...` - Manajemen staff & staff key

## Build untuk Production

```bash
npm run build
```

Files akan di-generate di folder `build/`

## Notes

- Staff authentication menggunakan staff key yang diverifikasi ke backend (bukan mock).
- Customer authentication menggunakan Google OAuth + JWT (disimpan di localStorage).
- Image produk saat ini menggunakan URL eksternal (belum ada upload dari frontend).
- Bukti pembayaran QRIS dan receipt disimpan di backend dan diakses via file server.

## Future Enhancements

- [ ] Image upload functionality untuk produk dari frontend
- [ ] Laporan dan analytics yang lebih lengkap di dashboard
- [ ] Multi-language support
- [ ] PWA offline mode untuk kasir

## Support

Untuk pertanyaan atau masalah, silakan buat issue di repository atau hubungi pengembang internal Kedai Yuru.
