# MiniCal – Keuangan Rumah Tangga

Aplikasi web ringan untuk mencatat keuangan rumah tangga: pemasukan, tabungan, tagihan, pengeluaran, utang/cicilan, dan daftar belanja. Semuanya berjalan di browser tanpa server dan tanpa proses build.

## Fitur

- **Dashboard**: Sisa Uang bulan berjalan, ringkasan per tipe, pos Spending terbesar, grafik donat distribusi Spending (Chart.js), total tabungan, dan transaksi terakhir.
- **Pengingat Unpaid**: daftar tagihan yang belum dibayar pada bulan terpilih dan utang yang masih tersisa. Tombol bayar langsung mengisi form transaksi.
- **Transaksi**: catat Income, Savings, Bills, Spending, dan Bayar Cicilan per bulan.
- **Utang & Tagihan**: setiap transaksi Bayar Cicilan otomatis mengurangi sisa utang. Status tagihan dihitung dari transaksi Bills di bulan terpilih.
- **Perencana Belanja**: daftar barang dengan estimasi harga dan centang keranjang.
- **Backup**: export CSV (transaksi + rekap utang) dan JSON (seluruh data).

Rumus utama:

```
Sisa Uang = Income − (Savings + Bills Paid + Spending + Bayar Cicilan)
```

## Cara pakai

Buka `index.html` langsung di browser (klik dua kali). Butuh koneksi internet untuk memuat Tailwind CSS, Chart.js, dan font Sora dari CDN.

Kalau ingin lewat server lokal:

```bash
python -m http.server 8000
```

lalu buka http://localhost:8000.

## Penyimpanan data

Data disimpan di `localStorage` browser dengan kunci `minical.v1`. Artinya:

- Data hanya ada di browser dan perangkat yang dipakai, tidak tersinkron ke tempat lain.
- Membuka lewat `file://` dan lewat `http://localhost` dihitung sebagai dua tempat penyimpanan yang berbeda.
- Menghapus data situs/riwayat browser akan menghapus data MiniCal. Rutin lakukan **Backup lengkap (JSON)**.

## Struktur file

| File | Isi |
| --- | --- |
| `index.html` | Kerangka halaman dan semua tampilan (Dashboard, Transaksi, Utang & Tagihan, Belanja) |
| `style.css` | Gaya tambahan di luar Tailwind (efek kaca, warna, tombol, navigasi) |
| `script.js` | Data awal, logika perhitungan, render tampilan, grafik, dan export |

## Mengubah data awal

Kategori, daftar tagihan, dan utang awal ada di bagian atas `script.js` (`CATS`, `BILLS`, `DEBTS`). Data awal hanya dipakai saat `localStorage` masih kosong. Kalau sudah ada data tersimpan, tambahkan tagihan/utang lewat menu **Utang & Tagihan**.
