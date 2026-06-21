# Matriks Black-Box Testing Customer Table Session

Table session adalah sesi dine-in Customer, bukan sesi login Owner. Browser hanya
menyimpan ID sesi sebagai capability reference; status sebenarnya divalidasi oleh
server melalui tabel `table_sessions` dan `tables`.

Traceability: `customer/table/[token]/page.tsx`, `lib/customer/customerSession.ts`,
dan `api/customer/table-session/{start,validate,end}`.

| ID | Skenario dan Input | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| CST-TS-01 | Scan QR dengan UUID meja aktif dan valid. | Server membuat/mengembalikan sesi aktif, key canonical `customer_table_session` disimpan, dan menu dibuka. |  |  |
| CST-TS-02 | Scan QR dengan UUID tidak valid atau meja tidak ditemukan. | Session tidak dibuat dan pesan QR/meja tidak valid tampil. |  |  |
| CST-TS-03 | Scan QR untuk meja dengan `is_active=false`. | Session ditolak dan Customer tidak masuk sebagai dine-in pada meja tersebut. |  |  |
| CST-TS-04 | Scan ulang QR meja yang sama ketika sesi aktif masih valid. | Sesi aktif yang sesuai dipakai tanpa membuat duplikasi sesi aktif. |  |  |
| CST-TS-05 | Scan QR meja baru ketika browser menyimpan previous session meja lain. | Previous session ditutup jika aman dan sesi meja baru menjadi sesi canonical. |  |  |
| CST-TS-06 | Validasi session UUID aktif. | API mengembalikan detail meja terbaru dan storage diperbarui. |  |  |
| CST-TS-07 | Validasi session yang sudah mempunyai `ended_at`. | API mengembalikan `410`, storage canonical dan legacy dibersihkan. |  |  |
| CST-TS-08 | Validasi sesi berumur minimal 240 menit tanpa blocking order. | Sesi ditutup otomatis, meja dilepas jika aman, dan client membersihkan storage. |  |  |
| CST-TS-09 | Validasi sesi berumur minimal 240 menit dengan order new/preparing/partially-served. | Sesi tidak ditutup otomatis agar order aktif tetap terhubung ke meja. |  |  |
| CST-TS-10 | Server/network tidak dapat memvalidasi sesi. | Client bersifat fail-closed: sesi lokal dibersihkan dan tidak dipakai untuk dine-in. |  |  |
| CST-TS-11 | End session dengan UUID aktif tanpa blocking order. | `ended_at` terisi, storage dibersihkan, dan status meja menjadi `free` jika tidak ada sesi lain. |  |  |
| CST-TS-12 | End session ketika masih ada blocking order. | Sesi dapat ditandai selesai sesuai flow, tetapi meja tidak dilepas secara tidak aman selama order masih aktif. |  |  |
| CST-TS-13 | End session dengan UUID kosong/tidak valid/tidak ditemukan. | API menolak request dengan status validasi/not-found yang sesuai. |  |  |
| CST-TS-14 | Storage canonical berisi JSON rusak atau field wajib hilang. | Client menghapus storage rusak dan menganggap tidak ada table session. |  |  |
| CST-TS-15 | Browser masih memiliki key legacy `customer_table` dan `table_session_start`. | Setelah validasi/start/clear berikutnya, key legacy dihapus dan hanya key canonical yang digunakan. |  |  |

## Catatan Batasan

- Table session bukan authentication session dan tidak memberikan hak akses Owner.
- UUID session berfungsi sebagai capability untuk guest dine-in; jangan ditampilkan
  pada log atau UI yang tidak memerlukannya.
- Aplikasi online-only, sehingga kegagalan validasi server tidak boleh memakai
  session lokal lama sebagai sumber kebenaran.
