# Smart Presentation (Gesture-Controlled Slides)

Smart Presentation adalah aplikasi presentasi berbasis web yang memungkinkan pengguna **mengontrol slide menggunakan gesture tangan** secara real-time melalui webcam. Aplikasi ini memanfaatkan teknologi **MediaPipe** dan **hand landmark detection** untuk mengenali gesture seperti:

- 👍 Jempol (untuk slide sebelumnya)
- 🤙 Kelingking (untuk slide selanjutnya)
- ✋ Telapak tangan (untuk play)
- ✊ Tangan mengepal (untuk pause)

## 🚧 Status Proyek

> ⚠️ Aplikasi masih dalam tahap **pengembangan awal**, sehingga masih terdapat **bug** dan **fitur belum sempurna**. Gesture kadang tidak konsisten dideteksi, dan akurasi tergantung pada pencahayaan dan posisi tangan di kamera.

Fitur utama yang **sudah berjalan**:
- Kontrol presentasi pakai gesture
- Navigasi slide manual dan otomatis
- Dukungan MediaPipe (hand detection)
- Tampilan responsif dan caption

Fitur yang **masih perlu pengembangan**:
- Deteksi gesture yang lebih stabil dan cepat
- Integrasi laser pointer lebih akurat
- Kalibrasi per pengguna
- UI untuk debug gesture

## 📸 Tampilan Aplikasi

Berikut adalah beberapa cuplikan tampilan aplikasi (UI & gesture feedback):

| Slide 1 | Slide 2 | Slide 3 |
|--------|---------|---------|
| ![foto1](./public/image/foto%20(1).png) | ![foto2](./public/image/foto%20(2).png) | ![foto3](./public/image/foto%20(3).png) |

| Slide 4 | Slide 5 | Slide 6 |
|--------|---------|---------|
| ![foto4](./public/image/foto%20(4).png) | ![foto5](./public/image/foto%20(5).png) | ![foto6](./public/image/foto%20(6).png) |

| Slide 7 | Slide 8 | Slide 9 |
|--------|---------|---------|
| ![foto7](./public/image/foto%20(7).png) | ![foto8](./public/image/foto%20(8).png) | ![foto9](./public/image/foto%20(9).png) |

> Catatan: Gambar di atas diambil dari folder `public/image/` dan disusun secara otomatis berdasarkan urutan file.

## 🚀 Cara Menjalankan

1. Clone repo ini:
   ```bash
   git clone https://github.com/TobeRich-maker/Smartpresentation.git
   cd Smartpresentation
