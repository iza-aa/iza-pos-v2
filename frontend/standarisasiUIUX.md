
STANDARISASI BADGE/LABEL
| Semantic Tone | Fungsi                                   | Background |      Text |    Border |
| ------------- | ---------------------------------------- | ---------: | --------: | --------: |
| `neutral`     | default, inactive, unknown               |  `#F7F7F5` | `#525252` | `#E5E5E0` |
| `dark`        | owner, completed final, POS cart         |  `#18181B` | `#FFFFFF` | `#18181B` |
| `info`        | informasi, QR, new order                 |  `#EEF6FF` | `#2563EB` | `#CFE4FF` |
| `progress`    | sedang diproses, cooking, active process |  `#F1F0FF` | `#5B5BD6` | `#DCD7FF` |
| `waiting`     | pending, unpaid, reserved, waiting       |  `#FFF7E6` | `#A16207` | `#F2D49B` |
| `success`     | aktif, paid, served, available           |  `#EAF7EF` | `#2F7D50` | `#BFE5CC` |
| `warning`     | low stock, partially served, early leave |  `#FFF1E6` | `#B45309` | `#F6C99F` |
| `danger`      | failed, cancelled, expired, late         |  `#FFF1F2` | `#BE123C` | `#F7B8C3` |
| `premium`     | reward, voucher, member, overtime        |  `#F7F0FF` | `#7E3AF2` | `#DFC7FF` |
| `coffee`      | barista, staff, coffee-specific identity |  `#F8EFE3` | `#8B5E34` | `#E8D5BE` |
| `cashier`     | cashier / POS operator                   |  `#EAF8F6` | `#168A7A` | 
`#BFE5DF` |
INI BISA DIAMBIL DARI theme.ts

STANDARISASI CARD CONTENT, INFOBOX, CARD ANALYTICS DI DASHBOARD OWNER
1. Tidak menggunakan icon 
2. warna contentnya tergantung standarisasi warna chart diatas
3. anda bisa mencontoh infobox yang ada didashboard

STANDARISASI TABLE
1. Menggunakan StandardTable.tsx
2. Menggunakan Title dulu dan deskripsi
3. TR tidak menggunakan rounded
4. Contoh Penerapan Table di Dashboard/owner
5. bukan cuma “pakai table”, tapi pola visualnya harus sama: ada judul + deskripsi, header title-case, row zebra rapi, dan table tidak terasa seperti raw HTML. 

STANDARISASI DATE FILTER
1. Menggunakan DateRangeFilter.tsx
2. Di default ke Today

STANDARISASI JARAK ANTAR CARD (PENTING)
1. Ikutin Jarak Card Yang ada di Dashboard/owner

PERATURAN STANDARISASI
1. Clean code
2. Menggunakan Component yang sudah ada, kalau belum ada dan kira kira bakal digunain lagi buat component baru di shared
3. Clean structure
4. Menggunakan full bahasa inggris
5. Anda Boleh menulis komponen apa aja yang dibawah yang sudah terstandarisasi agar anda terus mengingatnya

