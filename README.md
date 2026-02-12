# Kedai Yuru POS Frontend

Frontend aplikasi Point of Sale (POS) dan customer ordering Kedai Yuru, dibangun dengan React dan TailwindCSS.

## Features

### 🔐 Authentication
- Login untuk Admin dan Kasir (staff) dengan staff key
- Login khusus Customer menggunakan Google (Google OAuth)
- Protected routes dengan role-based access control (Admin / Kasir)

### 👨‍💼 Admin & Kasir
- **Dashboard**: Overview statistik sistem dengan responsivitas mobile/tablet
- **Kategori**: CRUD kategori produk
- **Produk**: CRUD produk dengan image URL dan kategori
- **Modifier Groups**: CRUD grup modifier (single/multi selection & required)
- **Modifiers**: CRUD modifier dengan price delta
- **Hot Deals Management**: Kelola produk hot deals dengan sistem tier otomatis berdasarkan jumlah terjual
- **Kitchen Queue**: Monitor dan update status pesanan
- **Verifikasi Pembayaran**: Review dan verifikasi pembayaran QRIS & POS
- **Sales Report**: Laporan penjualan dengan filter dan export CSV
- **Store Settings**: Atur jam buka/tutup otomatis & status order
- **Discount Management**: Kelola diskon dan kode promo
- **Staff Management**: Kelola akun staff & staff key
- **Customer Points Management**: Kelola sistem poin customer, riwayat transaksi, dan adjustment poin
- **Popup Banner Management**: Kelola popup banner promosi dengan pengaturan frekuensi dan durasi tampil
- **WhatsApp Settings**: Konfigurasi notifikasi WhatsApp

### 👤 Customer Interface (Web Ordering)
- Login dengan Google khusus untuk customer
- Browse menu produk lengkap dengan kategori & hot deals
- Pilih modifier (level pedas, topping, dll) dengan validasi grup wajib
- Shopping cart dengan perhitungan otomatis harga + modifier
- **Customer Points System**: Sistem poin customer dengan akumulasi dari pembelian
- **Customer Profile**: Modal profil customer dengan informasi akun dan statistik
- Checkout online dengan pilihan metode pembayaran (Cash / QRIS)
- Riwayat pesanan per customer (berdasarkan akun Google) dalam modal terpisah
- **Popup Banners**: Sistem popup promosi dengan pengaturan frekuensi tampil
- Tracking pesanan publik dengan token (status real-time + auto-expiry)
- Tombol "Lacak Pesanan" di riwayat hanya aktif untuk pesanan yang masih berjalan
- **Privacy Policy & Terms**: Halaman kebijakan privasi dan syarat & ketentuan

## Tech Stack

- **React** 18.2.0
- **React Router** v6
- **TailwindCSS** v3 (dengan responsive design untuk mobile/tablet)
- **Axios** untuk API calls
- **React OAuth Google** v0.13.4 untuk autentikasi Google customer
- **React Hot Toast** v2.6.0 untuk notifikasi sistem
- **QRCode React** v4.2.0 untuk generate QR codes
- **Hello Pangea DnD** v18.0.1 untuk drag & drop functionality
- **React App Rewired** untuk custom webpack configuration
- **JavaScript Obfuscation** untuk production build security

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
│   ├── index.html
│   ├── manifest.json
│   ├── robots.txt
│   └── sitemap.xml
├── scripts/
│   └── generate-seo-files.js
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLayout.js        # Admin sidebar layout (responsive)
│   │   │   └── Receipt.js            # Receipt component
│   │   ├── common/
│   │   │   ├── ConfirmDialog.js      # Confirmation dialog component
│   │   │   ├── Toast.js              # Toast notification system
│   │   │   └── ui.js                 # UI utility components
│   │   ├── customer/
│   │   │   ├── Cart.js               # Keranjang customer
│   │   │   ├── Checkout.js           # Checkout online customer
│   │   │   ├── CustomerGoogleLogin.js # Komponen login Google customer
│   │   │   ├── CustomerHeader.js     # Header khusus customer
│   │   │   ├── CustomerPointsModal.js # Modal poin customer
│   │   │   ├── CustomerProfileModal.js # Modal profil customer
│   │   │   ├── OrderHistoryModal.js  # Modal riwayat pesanan
│   │   │   └── PopupBanner.js        # Komponen popup banner
│   │   └── shared/
│   │       └── ProtectedRoute.js     # Route protection (staff)
│   ├── contexts/
│   │   ├── AuthContext.js            # Staff authentication context
│   │   └── CustomerAuthContext.js    # Customer authentication context
│   ├── hooks/
│   │   └── useCustomer.js            # Custom hook untuk customer functionality
│   ├── pages/
│   │   ├── AdminDashboard.js         # Admin dashboard (mobile responsive)
│   │   ├── Categories.js             # Category management
│   │   ├── Products.js               # Product management
│   │   ├── ModifierGroups.js         # Modifier group management
│   │   ├── Modifiers.js              # Modifier management
│   │   ├── HotDeals.js               # Hot Deals management (mobile responsive)
│   │   ├── Kitchen.js                # Kitchen queue
│   │   ├── Login.js                  # Staff login page
│   │   ├── Orders.js                 # Order management
│   │   ├── OrderTracking.js          # Halaman tracking pesanan publik
│   │   ├── Payments.js               # Payment verification
│   │   ├── POSCounter.js             # POS kasir (order langsung)
│   │   ├── SalesReport.js            # Sales report dengan export CSV (mobile responsive)
│   │   ├── StaffManagement.js        # Staff management
│   │   ├── StoreSettings.js          # Store settings
│   │   ├── CustomerMenu.js           # Customer menu & order page
│   │   ├── CustomerPointsManagement.js # Manajemen poin customer (Admin)
│   │   ├── Discounts.js              # Discount management
│   │   ├── PopupBanners.js           # Popup banner management
│   │   ├── PrivacyPolicy.js          # Halaman kebijakan privasi
│   │   ├── TermsOfService.js         # Halaman syarat & ketentuan
│   │   └── WhatsAppSettings.js       # WhatsApp notification settings
│   ├── services/
│   │   └── api.js                    # API service layer (publicAPI & staffAPI)
│   ├── App.js                       # Main app with routing
│   ├── index.js                     # Entry point
│   └── index.css                    # Tailwind CSS
├── .env.example
├── .env.production
├── config-overrides.js              # React App Rewired configuration
├── package.json
├── postcss.config.js
└── tailwind.config.js
```

## API Integration (Ringkas)

Aplikasi ini terintegrasi dengan backend API dengan beberapa kelompok endpoint utama:

### Public API (Customer)
- `GET  /api/public/menu`                        - Ambil menu lengkap (produk, kategori, modifier, store settings)
- `POST /api/public/orders`                      - Buat online order (pickup/delivery/dine_in)
- `GET  /api/public/orders/:orderNo`            - Detail & tracking publik dengan token
- `POST /api/public/orders/:orderNo/qris-proof` - Upload bukti bayar QRIS
- `POST /api/public/discounts/validate`         - Validasi kode diskon
- `GET  /api/public/popup-banners`              - Ambil popup banners aktif

### Customer Auth API
- `POST /api/auth/customer/google`  - Login customer via Google
- `GET  /api/auth/customer/profile` - Ambil profil customer (butuh JWT)
- `GET  /api/auth/customer/orders`  - Riwayat pesanan customer (pagination)
- `GET  /api/auth/customer/points`  - Data poin customer dan riwayat transaksi
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
- `GET/POST/PATCH/DELETE /api/staff/hot-deals...`  - Manajemen hot deals & tier system
- `GET/POST/PATCH/DELETE /api/staff/management...` - Manajemen staff & staff key
- `GET/POST/PATCH/DELETE /api/staff/popup-banners...` - Manajemen popup banners
- `GET  /api/staff/customers/points`               - Data customer dengan sistem poin
- `GET  /api/staff/customers/:id/points/history`   - Riwayat poin customer
- `POST /api/staff/customers/:id/points/adjust`    - Adjustment poin customer (manual)
- `GET  /api/staff/orders/all`                     - Semua pesanan untuk sales report
- `GET  /api/staff/hot-deals/stats`                - Statistik hot deals
- `POST /api/staff/hot-deals/auto-update`          - Update otomatis hot deals berdasarkan tier

## Build untuk Production

```bash
# Development build
npm run build

# Production build dengan obfuscation
npm run build1
```

Files akan di-generate di folder `build/`

## Mobile & Tablet Support

Aplikasi ini telah dioptimasi untuk perangkat mobile dan tablet dengan:

- **Responsive Design**: Semua halaman admin menggunakan breakpoints Tailwind yang optimal
- **Mobile-First Approach**: Layout dirancang mulai dari mobile kemudian desktop
- **Touch-Friendly Interface**: Button sizes dan spacing yang optimal untuk touch devices
- **Dual View System**: Card view untuk mobile, table view untuk desktop pada data-heavy pages
- **Adaptive Typography**: Text sizing yang menyesuaikan ukuran layar

### Breakpoints:
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm - lg)
- **Desktop**: ≥ 1024px (lg+)

## Notes

- Staff authentication menggunakan staff key yang diverifikasi ke backend (bukan mock).
- Customer authentication menggunakan Google OAuth + JWT (disimpan di localStorage) dengan context management.
- **Customer Points System** terintegrasi penuh dengan riwayat transaksi dan manual adjustment.
- **Popup Banner System** dengan pengaturan frekuensi tampil dan durasi untuk promosi.
- Image produk saat ini menggunakan URL eksternal (belum ada upload dari frontend).
- Bukti pembayaran QRIS dan receipt disimpan di backend dan diakses via file server.
- Hot Deals system menggunakan tier otomatis berdasarkan jumlah produk terjual.
- Sales Report mendukung export ke CSV dengan berbagai filter.
- Customer interface dilengkapi dengan modular components (header, profile, points, order history).
- Semua halaman admin telah dioptimasi untuk mobile dan tablet responsiveness.
- Production build menggunakan JavaScript obfuscation untuk keamanan.

## Future Enhancements

- [ ] Image upload functionality untuk produk dari frontend
- [ ] Real-time notifications dengan WebSocket
- [ ] Advanced analytics dashboard dengan charts
- [ ] Multi-language support (ID/EN)
- [ ] PWA offline mode untuk kasir
- [ ] Dark mode theme
- [ ] Advanced reporting dengan date range picker
- [ ] Customer loyalty tier system berdasarkan poin
- [ ] Push notifications untuk customer mobile app
- [ ] Advanced popup banner scheduling dan targeting

## Support

Untuk pertanyaan atau masalah, silakan buat issue di repository atau hubungi pengembang internal Kedai Yuru.
