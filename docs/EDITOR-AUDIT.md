# Audit editor dan panduan Resolume — 26 September 2026

## Fitur yang ditambahkan

- Style Library: Festival Magenta/Lime, Acid Green/Blue, Cyan/Coral, LED Hex Badge Solar/Orange/Red, Coordinate Violet/Yellow, Electric Blue/Red.
- Warna primary, secondary, accent, garis, latar, dan label dapat diubah di Screen → Test Pattern. Teks badge, label A1–AA1, koordinat sudut, ukuran sel, lingkaran, diagonal, dan crosshair dapat disesuaikan.
- Terapkan preset ke seluruh screen atau selection. **Apply Test Card to All** menyalin penyesuaian test card dan mempertahankan teks badge setiap screen.
- Efek procedural: Wire Tunnel, Neon Flow, Digital Glitch, Slice Chase, Slice Bounce. Warna, kecepatan, dan arah tersedia di inspector. Chase memakai urutan spasial dan clock dari slice pertama menurut arah terpilih; gunakan **Apply Animation to All** untuk menyeragamkan setelan.
- Preset video sekarang menjadi overlay transparan: mempertahankan test card, grid, logo, dan label, lalu memulai preview. Menggunakan preset test card menghentikan preview.
- Pola, warna, animasi, dan metadata slice tersimpan dalam format proyek lokal/cloud yang sama; dokumen lama memakai default untuk properti baru.

## Dua arah workflow

### Layout dibuat di Resolume

1. Advanced Output → Save & Close. Dari dropdown preset, gunakan Reveal in Finder/Explorer untuk menemukan XML.
2. Di PixelMapVJM, buka **Resolume Slices → Import XML**. `ScreenSetup` langsung maupun preset pembungkus `XmlState` didukung.
3. Slice memakai koordinat **Input Selection**, bukan Output Transformation. Ukuran canvas mengikuti `CurrentCompositionTextureSize` jika opsi ukuran aktif; jika tidak ada, dihitung dari batas slice.
4. Atur style/efek, ekspor PNG untuk test card atau MP4 untuk video. Masukkan konten ke composition Resolume dengan resolusi yang sama agar sampling slice tepat. Jangan stretch atau fit ke rasio lain.
5. **Link XML** memakai file picker browser dan membaca file tersebut setiap 2 detik selama panel terbuka. Setelah Save & Close di Resolume, geometri/nama/status slice diperbarui; warna/efek/ID editor dipertahankan. Slice manual tetap ada, slice eksternal yang dihapus ikut dihapus. Perubahan masuk undo history.
6. Stop Auto Sync sebelum melakukan undo yang ingin dipertahankan. File yang tidak berubah tidak menghasilkan history baru.

Link memerlukan browser yang mendukung `showOpenFilePicker` pada secure context (HTTPS/localhost). Browser lain tetap bisa Import XML ulang. Jika Resolume mengganti file secara atomik dan handle lama tidak berlaku lagi, pilih Link XML ulang. Sinkronisasi berhenti jika panel ditutup, halaman berpindah, atau file tidak bisa dibaca. Ini bukan koneksi langsung ke proses/API Resolume.

### Layout dibuat di PixelMapVJM

1. Buat rectangle screen, atur nama/posisi/resolusi, lalu **Export New Layout XML**.
2. Load file hasilnya sebagai preset Advanced Output di Resolume. Hasilnya satu virtual output dengan input = output pada ukuran canvas. Pilih output fisik di Resolume.
3. Ekspor PNG/MP4 terpisah dan load sebagai konten composition.

XML baru hanya berisi geometri/nama slice rectangle yang terlihat; logo tidak menjadi slice. Warna, test card, dan efek berada dalam PNG/MP4, bukan file XML. Preset perangkat, routing, warp, blending, dan output asli tidak ditimpa ataupun direkonstruksi. Polygon mask harus menggunakan PNG/MP4 pada slice asli; exporter menolak polygon daripada merusak bentuk secara diam-diam. Kompatibilitas XML diuji dengan parser dan fixture; belum diuji langsung di aplikasi Resolume pengguna.

## Batas impor/render

- Maksimum 10 MB dan 512 slice; XML rusak, DTD/entity, serta koordinat tidak valid ditolak. Slice tanpa geometri valid dilewati dengan catatan, kecuali tidak ada slice valid sama sekali.
- Rectangle input yang diputar dibaca sebagai ukuran sisi lokal + rotasi, termasuk sudut negatif dan 90°/180°. Quad dengan skew/warp tetap menjadi polygon mask; warp tekstur, input mask tambahan, Bezier warp, soft edge, layer/group routing, dan color correction Resolume tidak direproduksi. Status/kelemahan impor ditampilkan di panel.
- Koordinat negatif atau slice di luar canvas tetap dicatat dan diperingatkan; area luar tidak muncul di ekspor.
- Physical dimensions pada Coordinate Card dihitung dari ukuran kabinet yang diatur pengguna, bukan ditebak dari XML.
- MP4 memakai MediaRecorder/H.264 browser dan waktu perekaman nyata. FPS aktual tergantung kemampuan komputer; ketika render lambat, frame dapat terlewat tanpa memperpanjang klip. Resolusi ganjil diberi padding satu piksel untuk encoder. Background transparan menjadi hitam pada MP4.
- Efek adalah generator visual asli, bukan rekaman footage berlisensi atau plugin FFGL/Wire.

## Temuan yang diperbaiki

| Temuan | Perbaikan |
| --- | --- |
| Renderer Konva dan ekspor berbeda sehingga label, masking, dan fitur baru berpotensi tidak cocok | Canvas preview dan ekspor memakai fungsi gambar yang sama |
| Pola solid keluar sebelum menjalankan animasi | Efek solid sekarang dirender |
| Gambar statis menampilkan overlay animasi pada detik nol | Render statis tidak menjalankan animasi |
| `showDiagonal` diabaikan pada calibration | Toggle kini dihormati |
| Checkerboard mengisi sebagian sel dan mencampur background sebagai warna ketiga | Semua sel bergantian antara dua warna yang dipilih |
| `includeLabels` ekspor diabaikan | Opsi dipakai saat menggambar label |
| Logo overlay di ekspor berbeda posisi dan mengabaikan toggle | Posisi/toggle sama dengan preview |
| MP4 membuat canvas dan memuat ulang logo per frame, menambah waktu render ke durasi dan dapat menggantung saat gagal | Canvas/image cache dipakai ulang; clock mengikuti elapsed time; error dan cleanup recorder/track ditangani |
| Schema proyek tidak mengenali pola/efek baru | Enum dan default schema diperbarui |

## Audit dependensi terpisah

`npm audit` pada 26 September 2026 melaporkan **11 temuan: 1 critical, 10 high**. Paket langsung yang terlibat: Next.js dan Prisma; sisanya dependency transitif. Severity berasal dari registry, bukan bukti bahwa semua jalur eksploitasi berlaku pada deployment ini.

- Next.js 16.2.12: registry menyarankan 16.3.6, termasuk advisory [AVIF image optimization](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) dan [Windows hosting](https://github.com/advisories/GHSA-p293-qw3h-jr36).
- Prisma: saran otomatis registry adalah turun major ke 6.19.3; jangan menggunakan `npm audit fix --force` tanpa verifikasi kompatibilitas Prisma 7 dan adapter PostgreSQL proyek ini.
- Transitif: brace-expansion, deepmerge-ts, fast-uri, js-yaml, mysql2, nanoid, postcss, sharp, @prisma/config.

Perubahan ini tidak mengupgrade framework/database. Temuan perlu ditangani sebelum deployment produksi berikutnya dengan regresi autentikasi, database, dan image pipeline.

## Referensi desain dan format

- [Resolume Advanced Output](https://resolume.com/support/advanced-output): preset XML dan workflow berbagi layout.
- [Resolume Input Selection](https://resolume.com/support/en/input-selection): slice, input geometry, mask.
- [Chaser File Menu](https://hybridconstructs.com/support/chaser/file-menu/): pembaruan Advanced Output setelah Save & Close.
- [Katalog style Resolume](https://resolume.com/footage/styles), [WireTunnel](https://www.resolume.com/footage/WireTunnel), [GlitchRhythm](https://resolume.com/footage/glitchrhythm): referensi genre neon, tunnel, glitch yang tersedia di katalog saat audit. Ini bukan klaim ranking/tren berdasarkan statistik.
- [Contoh preset Arena](https://github.com/stoatworks-labs/test-card/blob/main/test/fixtures/resolume-arena-preset.xml): verifikasi struktur `Params`, `InputRect/v`, dan `OutputDeviceVirtual`. Fixture pengujian proyek dibuat sendiri.

## Verifikasi

```sh
npm ci
npx playwright install chromium
npm run test:editor
npm run typecheck
npm run lint
npm run build
```

Suite browser menguji parser valid/invalid, multi-output, visibility, polygon, identitas slice, pelestarian style ketika sync, undo/redo, XML round trip, schema persistence, chase, animasi pada solid, ekspor statis, kontrol React, download XML dan perekaman MP4. Screenshot QA dan MP4 contoh ditulis ke folder temp `pixelmap-qa`.


## Perbaikan grid kabinet — 27 September 2026

Bug: preset test card memakai `gridSize=108`, sementara kabinet P3.91 berukuran 128 × 128. Memilih ulang preset kabinet mengubah `gridSize` sehingga tampilan baru terlihat benar. Grid juga bisa bergeser mengikuti posisi global, memakai ukuran persegi untuk kabinet persegi panjang, dan meninggalkan sel terpotong. Counter array masih menampilkan 1 × 1.

Perbaikan:
- Default **Grid Source → Cabinet** mengikuti lebar dan tinggi kabinet secara terpisah. Sel dimulai dari sudut kiri atas setiap screen; perpindahan screen atau pilihan global tidak menggeser batas kabinet.
- Jumlah kolom/baris adalah bilangan bulat terdekat, minimal satu, yang dihitung dari ukuran slice dibagi resolusi kabinet. Sel dibagi merata di dalam slice, tanpa potongan sel pada tepi. Pembagian piksel membulatkan batas kumulatif agar tidak menyisakan celah.
- Slice 903 × 1280 dengan P3.91 diperkirakan sebagai 7 × 10 kabinet. Native-nya 896 × 1280; visual berisi 70 sel penuh yang diskalakan ke ukuran slice. Mapping XML tidak dipindah atau diubah ukurannya otomatis. Inspector menjelaskan perbedaan ini dan meminta pengguna memeriksa jumlah fisik kabinet.
- **Use Native Cabinet Size** mengubah W/H menjadi 896 × 1280 pada contoh tersebut; X/Y tetap. Undo/redo didukung. Columns/Rows mengubah dimensi screen menjadi kelipatan kabinet utuh.
- Load dokumen lama, pembuatan screen, resize, preset/ukuran kabinet, impor dan sinkronisasi XML menghitung ulang counter kabinet. Tidak perlu mengganti preset bolak-balik. Ukuran fisik label memakai jumlah kabinet bulat.
- **Custom graphic grid** tersedia terpisah untuk pola artistik berbasis piksel. Mode ini memang boleh terpotong; tidak merepresentasikan batas kabinet fisik. Field Grid Size dan mode global/local hanya ditampilkan untuk mode custom.
- Preview dan ekspor memakai perhitungan sel yang sama. Grid kabinet sangat besar (>12.000 sel) menyembunyikan detail sel agar tidak menggambar kabinet palsu dengan ukuran lebih besar.

Regresi browser mencakup kasus 903 × 1280, pixel sampling 7 kolom penuh, kesamaan render sebelum/sesudah reapply, legacy load, preset bolak-balik, strip 512 × 256, perpindahan posisi global, native correction, Columns/Rows, undo/redo, resize dan sinkronisasi XML.


## Overlay video dan logo tengah — 27 September 2026

- Semua animasi dirender di atas test card dengan blending Screen dan **Overlay Opacity 0–100%** (default 45%). Opacity nol identik dengan frame tanpa efek; opacity screen keseluruhan tetap terpisah. Efek tidak lagi mengganti pola dengan solid hitam ataupun menghapus label saat preset dipilih.
- Wipe menjadi pita cahaya dengan tepi lembut, radial menjadi halo yang mengembang dengan glow/fade, wire tunnel memakai frame heksagon dengan ilusi kedalaman. Semua menggunakan renderer preview/ekspor yang sama.
- Urutan gambar: test card → overlay video → badge screen/logo → label. Logo dan label kecil tetap jelas di depan efek.
- **Center Mode**: Screen number / Logo. Mode screen dapat dipakai pada semua pola melalui Center Badge; nomor dan setelan logo tersimpan terpisah. Memilih mode screen mengisi nomor dari urutan screen.
- Logo bawaan: VJM Monogram, Diamond Emblem, Orbit Emblem. Teks dan warna dapat diganti. Upload PNG/JPG/WebP hingga 5 MB didukung, disimpan sebagai PNG maksimum 1024 px; transparansi dan rasio asli dipertahankan. PNG transparan memberi silhouette extrude terbaik.
- **Extrude / 3D look**, **Shining**, **Rotate**, **Extrude Depth**, dan **Logo Speed** dapat diatur terpisah. Kedalaman merupakan rendering 2.5D bertumpuk, bukan mesh 3D. Rotasi tidak memutar nama screen. Efek logo tetap berjalan saat efek video None atau opacity overlay nol.
- **Preview Logo Motion** memulai preview dan **Apply Logo to All** menyalin branding ke semua screen tanpa mengganti pola/efeknya. PNG menampilkan pose waktu nol; MP4 memuat gerakan kilau dan rotasi.
- Pengujian meliputi opacity nol/setengah/penuh pada sembilan efek, tidak adanya lapisan hitam pengganti, pemulihan state canvas, persistensi schema, tiga template logo, extrude, animasi kilau tanpa rotasi, upload logo, pergantian mode, dan ekspor MP4 H.264.


## Slice berotasi — 27 September 2026

Bug: semua InputRect miring sebelumnya diperlakukan sebagai bounding box dengan polygon mask. Sebuah kabinet 128 × 128 pada 45° tampak sebagai sekitar 182 × 182; pola tidak mengikuti sisi kabinet dan label terpotong oleh mask diamond.

- Parser kini mengenali rectangle berotasi dari keempat vertex. X/Y adalah origin lokal, W/H adalah panjang sisi, dan Rotation berasal dari arah sisinya. Grid kabinet, overlay, logo, label, serta border memakai transform yang sama pada preview dan ekspor.
- Slice persegi maupun persegi panjang mendukung sudut bebas. Geometri subpiksel dipertahankan hingga empat desimal pada state, schema simpan, dan XML; resolusi kabinet tetap bilangan bulat. Rotasi tidak mengubah jumlah kabinet.
- Dokumen lama yang berisi polygon rectangle hasil impor Resolume diperbaiki saat dibuka. ID, nama, branding, efek, posisi sudut, dan warna dipertahankan. Mask manual dan quad dengan skew/warp tetap menjadi mask. Impor/sync baru ditandai versi geometri agar mask yang kemudian diedit pengguna tidak dikonversi ulang.
- Rotation di inspector berputar pada pusat slice. Drag memakai batas dunia setelah rotasi dan tidak lagi menyentuh W/H. Transform slice miring tidak menjalankan snap ukuran axis-aligned yang sebelumnya dapat merusak dimensi. Koordinat sudut dan urutan chase memakai posisi setelah rotasi.
- Canvas otomatis dihitung dari semua sudut yang telah diputar. Ekspor XML dan impor ulang mempertahankan bentuk, sudut, dan ukuran sisi. Ini mendukung Input Selection; Output Transformation/warp perangkat tetap dikelola Resolume.
- Regresi menguji 10 sudut × 3 ukuran, tiga kali round trip XML/schema, subpiksel, migrasi legacy, undo/redo, sync, drag snapping, cabinet pixel sampling, dan penolakan quad skew. Preview QA memuat angka/logo pada 45°, −30°, 90°, 135°, 22.5°, dan −45°.

Perilaku input berotasi mengikuti konsep [Input Selection Resolume](https://resolume.com/support/en/input-selection). Integrasi ini belum diverifikasi di sesi Resolume pengguna secara langsung.
