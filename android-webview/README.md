# Pinang Market Android WebView

Proyek ini adalah wrapper Android sederhana yang membuka situs web Anda di dalam WebView.

## Langkah cepat

1. Buka folder android-webview di Android Studio.
2. Ubah URL di file app/src/main/java/com/pinangmarket/webview/MainActivity.java menjadi URL situs Anda yang sebenarnya.
   - Contoh: https://pinang-market.com
   - Atau http://192.168.1.10:3000 jika server Anda berjalan di komputer lokal.
3. Build project menjadi APK.
4. Instal APK ke ponsel.

## Catatan penting

- Jika situs Anda berjalan di komputer lokal, ponsel harus terhubung ke jaringan yang sama dan Anda harus memakai IP komputer, bukan localhost.
- Jika Anda sudah punya domain publik, lebih baik pakai domain tersebut agar aplikasi bisa dibuka dari mana saja.
