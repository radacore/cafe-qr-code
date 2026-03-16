# Cafe QR Ordering System

Sistem pemesanan cafe berbasis QR code dengan alur end-to-end:

- pelanggan scan QR meja tanpa login,
- order masuk ke kitchen board realtime,
- waiter antar pesanan,
- kasir kelola split pembayaran/merge/pelunasan,
- admin kelola menu, kategori, lantai, meja, dan QR print.

Project ini dibangun dengan Laravel 12 + Inertia + React + TypeScript + MySQL + Reverb (WebSocket).

---

## Daftar Isi

- [1. Ringkasan Fitur](#1-ringkasan-fitur)
- [2. Teknologi Utama](#2-teknologi-utama)
- [3. Arsitektur Aplikasi](#3-arsitektur-aplikasi)
- [4. Alur Bisnis Utama](#4-alur-bisnis-utama)
- [5. Struktur Data (Database)](#5-struktur-data-database)
- [6. Konfigurasi Environment](#6-konfigurasi-environment)
- [7. Instalasi dan Menjalankan Project](#7-instalasi-dan-menjalankan-project)
- [8. Akun Seed Default](#8-akun-seed-default)
- [9. Route Penting](#9-route-penting)
- [10. Realtime (Reverb + Echo)](#10-realtime-reverb--echo)
- [11. Modul Admin Management](#11-modul-admin-management)
- [12. Modul Cashier](#12-modul-cashier)
- [13. Modul Kitchen](#13-modul-kitchen)
- [14. Modul Finance](#14-modul-finance)
- [15. UI/UX Selia Patterns yang Dipakai](#15-uiux-selia-patterns-yang-dipakai)
- [16. Testing dan Quality Gate](#16-testing-dan-quality-gate)
- [17. Deployment Checklist](#17-deployment-checklist)
- [18. Troubleshooting](#18-troubleshooting)
- [19. Peta File Penting](#19-peta-file-penting)

---

## 1. Ringkasan Fitur

### Pelanggan (public)

- Scan QR meja: `GET /scan/{token}`.
- Lihat menu per kategori, tambah ke keranjang, update qty.
- Checkout tanpa login.
- Melihat halaman sukses order.

### Kitchen / Waiter

- Kitchen board dengan 3 tab queue:
  - pending,
  - preparing,
  - ready/served.
- Setiap tab pagination.
- Aksi status terkontrol berdasarkan role.
- Update realtime via channel WebSocket.

### Cashier

- Tab `open` dan `paid` untuk bill.
- Filter paid bill per periode (harian/mingguan/bulanan/custom).
- Merge bill via modal (UX clean).
- Split pembayaran dalam bill yang sama (item-level).
- Pelunasan bill via metode pembayaran (`cash`/`transfer`).
- Status order pada bill paid dikunci (tidak bisa diubah).

### Finance

- Dashboard metrik keuangan (harian/bulanan/open receivables).
- Riwayat pembayaran pagination.
- Filter metode pembayaran.
- Visual tren pendapatan dan komposisi metode pembayaran.

### Admin

- CRUD kategori menu.
- CRUD menu item.
- CRUD lantai.
- CRUD meja + drag-drop area (indoor/outdoor).
- Print QR per meja.
- Semua aksi edit/delete menggunakan modal + alert-dialog + toast.

---

## 2. Teknologi Utama

### Backend

- Laravel `^12.0`
- Inertia Laravel `^2.0`
- Laravel Fortify `^1.30`
- Laravel Reverb `*`
- Spatie Permission `*`

### Frontend

- React `^19.2.0`
- TypeScript
- Inertia React `^2.3.7`
- Vite `^7`
- Tailwind CSS v4
- Radix UI primitives
- Sonner (toast)
- Lucide Icons

### Realtime

- Laravel Reverb + Echo + Pusher JS protocol

---

## 3. Arsitektur Aplikasi

### Pola umum

- Backend mengirim data page lewat Inertia.
- Frontend React merender page berdasarkan props server.
- Shared props global disuplai dari `HandleInertiaRequests`:
  - `auth.user` + roles + permissions,
  - `flash.success` dan `flash.error`,
  - `sidebarOpen`.

### Role dan otorisasi

- Middleware alias di `bootstrap/app.php`:
  - `role`,
  - `permission`,
  - `role_or_permission`.
- Role utama:
  - `admin`, `cashier`, `kitchen`, `waiter`.

### Realtime domain

- Event lifecycle order dan bill dibroadcast ke channel privat.
- Halaman kitchen/cashier melakukan reload parsial saat event masuk.

---

## 4. Alur Bisnis Utama

1. Pelanggan scan QR meja dan membuat order.
2. Order masuk ke kitchen queue.
3. Kitchen memproses hingga ready, waiter menandai served.
4. Bill tetap `open` sampai pembayaran tuntas.
5. Cashier dapat:
   - split pembayaran item tertentu dalam bill yang sama,
   - merge beberapa bill open,
   - settle bill dengan metode pembayaran.
6. Saat bill lunas (`paid`), order terkait jadi completed dan status order dikunci.

---

## 5. Struktur Data (Database)

Entitas utama:

- `cafe_tables`: data meja + `qr_token`.
- `menu_categories`: kategori menu.
- `menu_items`: item menu.
- `orders`: order header.
- `order_items`: item order snapshot + `paid_at` untuk split pembayaran item.
- `bills`: bill agregat (`open|merged|paid`).
- `bill_tables`: pivot bill-meja.
- `bill_payments`: histori pembayaran (`cash|transfer`).
- Spatie tables: roles/permissions/model_has_roles/etc.

Catatan split pembayaran item:

- Item yang dibayar parsial ditandai via `order_items.paid_at`.
- Nilai pembayaran dicatat di `bill_payments`.
- Bill ditutup saat sisa tagihan mencapai 0.

---

## 6. Konfigurasi Environment

Lihat `.env.example`.

Default penting:

- DB: MySQL
  - `DB_DATABASE=cafe_qr`
  - `DB_USERNAME=root`
  - `DB_PASSWORD=root`
- Broadcast: `BROADCAST_CONNECTION=reverb`
- Queue/session/cache: database driver.

Untuk production, ganti seluruh secret/key/password.

---

## 7. Instalasi dan Menjalankan Project

## 7.1 Prasyarat

- PHP 8.2+
- Composer
- Node.js + npm
- MySQL

## 7.2 Setup awal

```bash
composer install
cp .env.example .env
php artisan key:generate
npm install
```

Buat database lalu migrasi + seed:

```bash
php artisan migrate --force
php artisan db:seed
```

## 7.3 Menjalankan aplikasi (opsi)

Opsi A (script custom project):

```bash
make dev-up
```

Script ini menjalankan:

- Laravel server,
- Vite,
- Reverb,

dan menulis log ke `storage/logs/`.

Opsi B (composer dev default):

```bash
composer run dev
```

---

## 8. Akun Seed Default

Seeder `StaffUserSeeder` membuat akun:

- `admin@cafeqr.test`
- `cashier@cafeqr.test`
- `kitchen@cafeqr.test`
- `waiter@cafeqr.test`

Password default: `password`

---

## 9. Route Penting

### Public

- `/` (landing)
- `/scan/{token}` + cart/checkout/success

### Authenticated

- `/dashboard`

### Cashier (`admin|cashier`)

- `GET /cashier/orders`
- `PATCH /cashier/orders/{order}/status`
- `POST /cashier/bills/{bill}/split`
- `POST /cashier/bills/{bill}/payments`
- `POST /cashier/bills/merge`
- `POST /cashier/bills/{bill}/settle`

### Finance (`admin|cashier`)

- `GET /finance`

### Kitchen

- `GET /kitchen/orders` (`admin|kitchen|waiter`)
- `PATCH /kitchen/orders/{order}/status` (`admin|kitchen`)
- `POST /kitchen/orders/{order}/served` (`admin|waiter`)

### Admin management (`admin`)

- `/admin/management/categories`
- `/admin/management/menu`
- `/admin/management/floors`
- `/admin/management/tables`
- `GET /admin/management/tables/{table}/print-qr`

---

## 10. Realtime (Reverb + Echo)

Channel utama (`routes/channels.php`):

- `kitchen.orders`
- `cashier.orders`
- `table.{tableId}`

Role gating channel:

- kitchen channel: `admin|kitchen`
- cashier channel: `admin|cashier`
- table channel: `admin|cashier|kitchen|waiter`

---

## 11. Modul Admin Management

Halaman admin dipisah per submenu:

- categories,
- menu,
- floors,
- tables.

UX pattern:

- Edit via modal dialog (bukan inline).
- Delete via alert dialog (destructive action merah).
- Feedback via toast terpusat, bukan banner inline.

Validasi bisnis penting:

- kategori tidak bisa dihapus jika masih punya menu item,
- floor tidak bisa dihapus jika masih punya table.

---

## 12. Modul Cashier

Tab utama:

- `open` (12/page)
- `paid` (10/page)

Paid filter:

- day,
- week,
- month,
- custom range.

Aksi utama:

- split pembayaran item-level dalam bill yang sama,
- merge bill open,
- settle bill.

Catatan penting split:

- dilakukan pada item yang belum dibayar,
- modal menampilkan harga item,
- total nominal item terpilih dihitung otomatis,
- bill tidak dipecah jadi bill baru.

---

## 13. Modul Kitchen

Queue tabs:

- pending,
- preparing,
- ready_served.

Setiap queue memiliki pagination.

Aksi status dibatasi role dan state untuk mencegah transisi tidak valid.

---

## 14. Modul Finance

Fitur utama:

- summary KPI (harian/bulanan/open receivables/collection rate),
- method filter (`all|cash|transfer`),
- riwayat pembayaran paginasi,
- visual tren dan komposisi metode.

---

## 15. UI/UX Selia Patterns yang Dipakai

- Tokenized design (light/dark) via CSS variables.
- Dialog untuk edit actions.
- Alert Dialog untuk destructive confirm.
- Toast typed API (default/info/success/warning/error).
- Layout role-aware sidebar + modular pages.

---

## 16. Testing dan Quality Gate

Perintah utama:

```bash
npm run types
npm run lint
npm run build
php artisan test
```

Test environment (`phpunit.xml`):

- sqlite in-memory,
- broadcast null,
- queue/session/cache aman untuk test.

---

## 17. Deployment Checklist

1. Set `.env` production (DB, APP_KEY, Reverb, cache, queue, mail).
2. Jalankan:

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

3. Build frontend:

```bash
npm ci
npm run build
```

4. Jalankan worker/reverb sesuai infra.
5. Pastikan websocket endpoint dan auth channel berfungsi.

---

## 18. Troubleshooting

### 18.1 Halaman admin gagal karena tabel belum ada

- Jalankan migrasi:

```bash
php artisan migrate --force
```

### 18.2 Realtime tidak update

- cek `BROADCAST_CONNECTION=reverb`.
- pastikan Reverb aktif.
- cek credential `VITE_REVERB_*`.

### 18.3 Toast sukses/error bertumpuk tidak konsisten

- Gunakan flash-driven toast pattern (satu sumber kebenaran dari flash backend).

### 18.4 Aksi cashier status order ditolak

- Memang dikunci untuk role cashier-only pada kondisi tertentu sesuai aturan bisnis.

---

## 19. Peta File Penting

Backend:

- `app/Http/Controllers/CafeOrderController.php`
- `app/Http/Controllers/CashierOrderController.php`
- `app/Http/Controllers/KitchenOrderController.php`
- `app/Http/Controllers/FinanceController.php`
- `app/Http/Controllers/AdminManagementController.php`
- `app/Models/Bill.php`
- `app/Models/BillPayment.php`
- `app/Models/Order.php`
- `app/Models/OrderItem.php`
- `routes/web.php`
- `routes/channels.php`

Frontend:

- `resources/js/pages/cashier/orders.tsx`
- `resources/js/pages/kitchen/orders.tsx`
- `resources/js/pages/finance/index.tsx`
- `resources/js/pages/dashboard.tsx`
- `resources/js/pages/admin/categories.tsx`
- `resources/js/pages/admin/menu.tsx`
- `resources/js/pages/admin/floors.tsx`
- `resources/js/pages/admin/tables.tsx`
- `resources/js/components/ui/alert-dialog.tsx`
- `resources/js/components/ui/sonner.tsx`
- `resources/js/lib/toast-manager.ts`

DevOps/Tooling:

- `Makefile`
- `scripts/dev-up.sh`
- `.env.example`
- `phpunit.xml`

---

## Catatan Akhir

README ini disusun berdasarkan analisis kode aktual project saat ini (backend, frontend, route, middleware, schema, seed, test, dan tooling). Jika Anda menambah modul baru, update bagian:

- route map,
- struktur data,
- flow bisnis,
- deployment checklist,
- file map.
