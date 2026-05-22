Dokumen ini mengatur standar visual, interaksi, dan fungsionalitas untuk komponen tabel yang digunakan secara global (shared component) di seluruh halaman aplikasi.

1. Visual & Pewarnaan (Zebra Striping)
Untuk meningkatkan keterbacaan (readability) pada data yang padat, tabel wajib menggunakan metode zebra striping dengan ketentuan:

Baris Ganjil (odd:bg-...): Menggunakan warna latar belakang putih bersih (#FFFFFF).

Baris Genap (even:bg-...): Menggunakan warna latar belakang abu-abu sangat muda (#F8F8F8).

Header Tabel (<thead>): Menggunakan latar belakang #F8F8F8 untuk memberikan batas kontras yang tegas antara judul kolom dan baris data pertama.

2. Perilaku Interaksi (Hover Effect)
Untuk memberikan umpan balik visual (visual feedback) yang interaktif kepada pengguna saat mengamati data:

Row Hover (tr:hover): Ketika kursor berada di atas suatu baris (<tr>), seluruh baris tersebut akan berubah warna latarnya (rekomendasi: sedikit lebih gelap dari warna genap, misalnya #F3F4F6 atau tingkat keabuan di bawahnya) untuk membantu mata pengguna fokus secara horizontal.

Cell Hover (td:hover): Ketika kursor berada tepat di atas sel tertentu (<td>), sel tersebut akan mendapatkan efek penekanan visual tambahan (misalnya perubahan warna teks menjadi lebih tegas, perubahan latar belakang sel, atau kursor berubah menjadi pointer jika sel tersebut memiliki aksi khusus).

3. Fungsionalitas Pengurutan (Sorting)
Semua kolom pada komponen tabel ini bersifat interaktif untuk pengurutan data, dengan aturan:

Elemen Interaktif: Setiap komponen Header Tabel (<th>) dapat diklik untuk mengubah urutan data secara Ascending (A-Z / Terkecil ke Terbesar) atau Descending (Z-A / Terbesar ke Kecil).

Pengecualian Kolom: Fitur sorting ini berlaku untuk semua kolom, kecuali kolom "Action" (jika ada kolom untuk tombol edit/delete di ujung kanan). Kolom aksi harus tetap statis.

Indikator Visual: Header yang bisa diurutkan wajib menampilkan ikon indikator arah panah kecil (🔼/🔽) di samping teks judul kolom untuk menandakan status urutan saat ini.