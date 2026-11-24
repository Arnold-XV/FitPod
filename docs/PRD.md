# **Proposal Proyek FitPod**

**Aplikasi fitness dan health data hub terdesentralisasi berbasis Solid Pod**  
**Mata kuliah:** Implementasi Decentralized Apps  
**Penyusun:** Hafidz Kurniawan Nahruntoko (24/539859/PA/22920) dan Arnoldus Dharma Wasesa Mahasmara (24/545535/PA/23182)  
**Institusi:** Universitas Gadjah Mada  
**Versi:** Draf 1.0, Oktober 2026

## **Ringkasan Eksekutif**

FitPod layak dibangun sebagai prototipe karena menyelesaikan satu masalah nyata pada aplikasi kebugaran: data tubuh, latihan, dan kesehatan pengguna tersimpan di database satu perusahaan. Pengguna tidak bisa mengatur secara rinci siapa yang boleh melihat datanya, dan riwayatnya sulit dibawa saat berpindah aplikasi atau pelatih. Dengan menyimpan data di Solid Pod milik pengguna, FitPod memberi pengguna kendali atas data dan memungkinkan pembagian selektif kepada teman, personal trainer, ahli gizi, serta tenaga kesehatan.  
Kami merekomendasikan prototipe dengan scope terbatas: pencatatan tubuh, nutrisi, dan workout; fitur sosial dengan persetujuan pertemanan; serta satu peran profesional (personal trainer) dengan akses sementara dan ringkasan kesehatan minimal berbasis PAR-Q+. Peran dokter dan ahli gizi, verifikasi digital bertanda tangan, dan fitur untuk skala besar menjadi pengembangan lanjutan.  
Pendekatan ini membawa konsekuensi yang dibahas terbuka dalam dokumen ini. Logika aplikasi lebih berat di sisi client, penghitungan interaksi tidak sepenuhnya akurat, pencabutan akses tidak menarik kembali data yang sudah dibaca, dan verifikasi dokter yang sungguhan membutuhkan tanda tangan digital serta daftar penerbit tepercaya. FitPod bukan alat medis dan tidak memberikan diagnosis.

## **Latar Belakang dan Permasalahan**

Aplikasi kebugaran konvensional menyimpan seluruh data pengguna di server milik penyedia. Model ini sederhana bagi pengembang, tetapi menimbulkan beberapa masalah bagi pengguna:

> * Data terkunci pada satu penyedia. Berpindah aplikasi atau berganti pelatih berarti memulai riwayat dari awal.  
> * Aturan siapa yang boleh melihat data ditentukan oleh penyedia aplikasi, bukan oleh pengguna.  
> * Data kebugaran dan kesehatan bersifat sensitif. UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (Pasal 4 ayat 2\) menggolongkan data dan informasi kesehatan sebagai data pribadi yang bersifat spesifik.  
> * Pelatih membutuhkan konteks seperti cedera dan batasan gerak, tetapi tidak perlu melihat seluruh riwayat medis. Di Indonesia tidak ada gelar yang diwajibkan untuk menjadi personal trainer. Jalur akademis (misalnya Sarjana Ilmu Keolahragaan) dan jalur sertifikasi (NASM, ACE, ACSM, ISSA, atau sertifikasi kompetensi BNSP) bersifat opsional, sehingga kompetensi pelatih bervariasi dan akses data perlu dibatasi sesuai kebutuhan perannya.

## **Tujuan dan Sasaran**

Tujuan proyek adalah membangun prototipe fitness tracker yang menyimpan data pengguna di Solid Pod masing-masing dan mendemonstrasikan pembagian data selektif kepada pihak yang tepat. Sasaran khususnya:

> 1. Mengimplementasikan pencatatan tubuh, nutrisi, workout, routine, dan progress dengan data tersimpan di Pod pengguna.  
> 2. Mengimplementasikan fitur sosial tanpa database pusat: pertemanan dengan persetujuan, berbagi ringkasan workout, interaksi lewat inbox, dan timeline hasil agregasi.  
> 3. Merancang model akses berbasis peran untuk personal trainer, ahli gizi, dan dokter atau fisioterapis, dengan akses granular dan sementara.  
> 4. Merancang model data kesehatan yang mencatat asal data (provenance) dan alur medical clearance.  
> 5. Mendokumentasikan trade-off arsitektur berbasis Pod, termasuk performa, akurasi, dan keamanan.

## **Gambaran Solusi**

FitPod terdiri dari tiga lapisan. Lapisan pertama adalah tracking: body, kalori, workout, routine, dan progress. Lapisan kedua adalah fitur sosial seperti Strava: berbagi ringkasan aktivitas, mengikuti teman, dan memberi apresiasi. Lapisan ketiga adalah pembagian data ke profesional (personal trainer, ahli gizi, dokter atau fisioterapis) dengan akses yang dibatasi per kategori data dan per durasi. Data utama berada di Pod pengguna, sedangkan aplikasi berperan sebagai client yang membaca, menulis, dan merakit tampilan.

| Aspek | Aplikasi konvensional | FitPod |
| :---- | :---- | :---- |
| Lokasi data | Database perusahaan | Solid Pod milik pengguna |
| Pindah aplikasi atau pelatih | Riwayat sulit dibawa | Data tetap di Pod, aplikasi atau pelatih baru membaca data yang sama setelah diberi izin |
| Kontrol akses | Ditentukan penyedia | Ditentukan pengguna per folder atau file, dapat dicabut |
| Timeline | Disiapkan server pusat | Dirakit client dari Pod teman (agregasi) |
| Hitungan like dan komentar | Dihitung server | Dihitung aplikasi dari inbox, dengan indexer opsional |
| Beban komputasi | Di backend | Lebih banyak di sisi client |

## **Dasar Teknologi: Solid Pod**

Solid adalah proyek yang dimulai oleh Tim Berners-Lee. Konsep yang dipakai FitPod:

> * **Pod:** penyimpanan data pribadi milik satu orang, di server yang ia pilih. Pod adalah penyimpanan pasif, bukan server dengan logika aplikasi.  
> * **WebID:** identitas berupa URL, misalnya https\://pod.example/alice/profile\#me. Dari WebID, aplikasi membaca profil publik dan menemukan lokasi Pod.  
> * **Inbox:** folder tempat pihak lain boleh menambahkan notifikasi (append-only) tanpa bisa membaca isinya. Dipakai untuk friend request, like, komentar, dan rekomendasi rujukan.  
> * **Access control:** setiap resource memiliki aturan akses sendiri (folder atau file), sehingga pemilik dapat memberi izin baca atau tulis secara selektif dan mencabutnya.  
> * **Agregasi di sisi client:** data dari banyak Pod digabung saat dibutuhkan, bukan diambil dari database pusat.

Solid tidak menyediakan pencarian pengguna. Akun baru yang kosong menjangkau orang lain dengan urutan berikut:

> 1. Pengguna mengetahui satu WebID, dari teman, dari tautan, atau dari index milik aplikasi (daftar WebID akun resmi dan pengguna yang bersedia ditampilkan).  
> 2. Aplikasi membaca profil dan postingan publik pemilik WebID tersebut. Tahap ini belum memerlukan interaksi.  
> 3. Pengguna melakukan interaksi (follow atau like). Interaksi tersimpan di Pod pengguna sendiri dan, bila perlu, dikirim sebagai notifikasi ke inbox pihak lain.  
> 4. Jaringan berkembang lewat daftar teman pada profil, siapa yang berinteraksi di postingan publik, dan saran berdasarkan riwayat di Pod pengguna sendiri.

## **Fitur Utama**

| Fitur | Deskripsi | Tahap |
| :---- | :---- | :---- |
| Body Tracking | Berat, tinggi, dan persentase body fat beserta metode pengukurannya. BMI dihitung dari data, tidak disimpan sebagai sumber. | MVP |
| Calorie Tracking | Catatan makanan dari USDA, Open Food Facts, atau input manual, dengan estimasi kalori terbakar. | MVP |
| Workout Tracking | Latihan, set, repetisi, beban, waktu istirahat, dan durasi sesi. | MVP |
| Routine Planner | Jadwal latihan, misalnya Push, Pull, Legs. | MVP |
| Progress Tracking | Riwayat pengukuran tubuh, personal record, dan grafik perkembangan. | MVP |
| Social Fitness | Berbagi ringkasan workout, follow dengan persetujuan, like, komentar, dan bookmark. | MVP |
| Selective sharing dan akses sementara | Pengguna memilih kategori data dan durasi akses untuk personal trainer. | MVP |
| Screening PAR-Q+ dan ringkasan untuk trainer | Kuesioner kesiapan latihan dan ringkasan minimal yang dapat dilihat trainer. | MVP |
| Vitals dan hasil lab | Riwayat heart rate, tekanan darah, dan hasil lab seperti kolesterol. | Lanjutan |
| Medical clearance bertanda tangan | Surat clearance dokter yang dapat diverifikasi secara digital. | Lanjutan |
| Peran ahli gizi dan dokter atau fisioterapis | Akses dan hak tulis sesuai kompetensi masing-masing. | Lanjutan |
| Indexer atau aggregator | Komponen tambahan untuk timeline, hitungan interaksi, dan pencarian. | Lanjutan |

## **Pengguna dan Hak Akses**

| Peran | Fungsi | Batas |
| :---- | :---- | :---- |
| Pemilik | Pengguna FitPod dan pemilik Pod | Kendali penuh atas semua data |
| Teman | Melihat aktivitas yang dibagikan | Hanya folder social/shared/ setelah pertemanan disetujui |
| Personal trainer | Menyusun program latihan, koreksi form, saran nutrisi dasar dan recovery dasar | Tidak melihat diagnosis, obat, atau hasil lab. Tidak menulis langsung ke log pengguna. |
| Ahli gizi | Menyusun meal plan | Melihat nutrisi, berat, alergi, dan kondisi medis yang relevan. Menulis ke folder prescriptions/. |
| Dokter atau fisioterapis | Menerbitkan clearance, catatan klinis, dan hasil lab | Akses sementara yang diberikan secara eksplisit oleh pengguna |

Scope kerja personal trainer mencakup program latihan perorangan, koreksi form dan progres, nutrisi dasar (kalori, protein, pola makan umum), dan saran recovery dasar. Diagnosis medis, rehabilitasi cedera serius, dan meal plan untuk kondisi medis berada di luar scope trainer dan menjadi wilayah dokter, fisioterapis, serta ahli gizi atau dietisien.  
Matriks akses berikut memakai singkatan R untuk hak baca. R \+ W berarti baca dan menulis rekomendasi ke folder prescriptions/ (dokter juga menulis ke clearance/ dan labs/). Opt-in berarti akses hanya berlaku jika pengguna menyetujuinya. Tanda hubung berarti tidak ada akses.

| Data | Folder | Trainer | Ahli gizi | Dokter atau fisioterapis | Teman |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Profil (nama, foto) | profile/ | R | R | R | R |
| Body (berat, tinggi, body fat) | body/ | R | R | R | \- |
| Nutrisi dan kalori | nutrition/ | R (ringkasan) | R \+ W (meal plan) | R (opt-in) | \- |
| Routine dan session | routines/, sessions/ | R \+ W (program) | \- | R (opt-in) | \- |
| Cedera dan batasan gerak | health/injuries.ttl | R | R | R \+ W (catatan) | \- |
| Alergi | health/allergies.ttl | \- | R | R | \- |
| Kondisi dan diagnosis | health/conditions.ttl | \- | R | R \+ W | \- |
| Obat | health/medications.ttl | \- | R | R | \- |
| Vitals (heart rate, tekanan darah) | health/vitals/ | R (opt-in) | R (opt-in) | R | \- |
| Hasil lab | health/labs/ | \- | R | R \+ W | \- |
| Ringkasan PAR-Q+ dan clearance (status, intensitas, batasan) | health/trainer-summary.ttl | R | R (status) | R | \- |
| Jawaban PAR-Q+ rinci | health/screening/ | \- | \- | R | \- |
| Surat clearance | health/clearance/ | \- | \- | R \+ W | \- |
| Dokumen PDF | health/documents/ | \- | \- | R | \- |
| Aktivitas yang dibagikan | social/shared/ | \- | \- | \- | R |

Aturan desain akses:

> * Pengaturan akses berlaku per folder atau file, sehingga data dengan tingkat sensitivitas berbeda harus berada di file terpisah. Trainer dapat melihat cedera tanpa melihat obat karena keduanya disimpan terpisah, dan aplikasi membuat file ringkasan khusus untuk trainer.  
> * Profesional menulis ke folder prescriptions/, bukan langsung ke routines/ atau sessions/. Aplikasi menampilkan isinya dan pengguna memutuskan apakah akan mengimpornya. Log asli pengguna tidak dapat tertimpa.  
> * Akses sementara dicatat sebagai AccessGrant dengan tanggal berakhir. Aplikasi mencabut izin saat masa berlaku habis, karena server Pod umumnya tidak memiliki fitur kedaluwarsa otomatis.  
> * Peran dicatat oleh pengguna, bukan diverifikasi oleh sistem. Solid tidak mengetahui apakah sebuah WebID milik dokter yang sah.  
> * Semua data bersifat privat secara default. Berbagi hanya terjadi lewat tindakan eksplisit pengguna.

## **Arsitektur dan Struktur Data**

### **Usulan teknologi**

Aplikasi berupa web app sisi client (JavaScript atau TypeScript) yang memakai library Solid client dan autentikasi Solid-OIDC. Untuk pengembangan dan pengujian, Pod dapat dijalankan dengan Community Solid Server atau memakai penyedia Pod publik. Pilihan teknologi ini dapat disesuaikan oleh tim.

### **Struktur folder Pod**

`/fitpod/`  
  `profile/card.ttl            nama, foto, preferensi berbagi`  
  `body/                       satu file per pengukuran`  
  `nutrition/                  satu file per hari`  
  `routines/                   satu file per routine`  
  `sessions/                   satu file per sesi, berisi set log`  
  `progress/records.ttl        cache hasil olahan`  
  `health/`  
    `screening/                PAR-Q+ per tanggal`  
    `vitals/                   heart rate dan tekanan darah`  
    `labs/                     hasil lab`  
    `clearance/                surat clearance`  
    `documents/                PDF scan`  
    `conditions.ttl  injuries.ttl  allergies.ttl  medications.ttl`  
    `trainer-summary.ttl       ringkasan minimal untuk trainer (dibuat aplikasi)`  
  `prescriptions/              program, meal plan, catatan, rujukan dari profesional`  
  `social/`  
    `shared/                   ringkasan aktivitas yang dibagikan`  
    `connections.ttl           teman dan following`  
    `interactions/             like dan komentar yang dibuat pengguna`  
    `bookmarks.ttl`  
  `access/grants.ttl           catatan akses yang diberikan (privat)`  
  `inbox/                      notifikasi dari pihak lain (append-only)`

### **Konvensi data**

> * Satuan baku: kg, cm, kcal, gram, dan detik. Tanggal memakai format ISO 8601\. Setiap entri memiliki id berupa URL.  
> * Data turunan (BMI, durasi sesi, personal record, BMR dan TDEE) dihitung dari data sumber dan tidak menjadi sumber kebenaran. Folder progress/ hanya cache dan dapat dihitung ulang.  
> * Catatan makanan menyimpan snapshot nilai gizi saat dicatat, bukan hanya ID dari database eksternal. Riwayat tidak berubah bila database sumber diperbarui, dan aplikasi tidak perlu memanggil API lagi untuk menampilkan riwayat.  
> * Satu file per entri atau per hari, untuk menghindari konflik tulis dan memudahkan pengaturan akses per item.  
> * Vocabulary standar agar data dapat dipakai lintas aplikasi: foaf atau vcard untuk profil, schema.org untuk data umum, dan ActivityStreams (Like, Create) untuk interaksi sosial.

### **Skema data inti**

| Entitas | Field |
| :---- | :---- |
| Profile | webId, name, photoUrl, sharingPrefs (per kategori: private, friends, public) |
| BodyMeasurement | id, date, weightKg, heightCm, bodyFatPct (0 sampai 100, opsional), bodyFatMethod (bia, caliper, dexa, estimate), note |
| FoodEntry | id, datetime, meal (breakfast, lunch, dinner, snack), foodName, source (usda, off, tkpi, custom), sourceId, quantityG, kcal, proteinG, carbG, fatG |
| Routine | id, name, daysOfWeek\[\], items\[{exerciseRef, targetSets, targetReps, targetWeightKg}\], createdBy (WebID) |
| WorkoutSession | id, date, startTime, endTime, routineRef, estKcalBurned (estimasi), sets\[\], note |
| SetLog | exerciseRef {source, id}, setIndex, weightKg, reps, restSec, rpe (opsional) |
| PersonalRecord (turunan) | exerciseRef, type (maxWeight, maxReps, est1RM), value, achievedAt, sessionRef |
| Prescription | id, authorWebId, authorRole (trainer, dietitian, doctor), type (program, mealPlan, note, referralRequest, clinicalNote), content, validFrom, validUntil, status |
| SharedActivity | id, authorWebId, date, title, durationMin, totalVolumeKg, exerciseNames\[\], visibility |
| Connection | peerWebId, status (pending, accepted, blocked), since |
| Interaction | id, type (like, comment), targetUrl, targetOwnerWebId, text, createdAt |
| AccessGrant | granteeWebId, role, categories\[\], grantedAt, expiresAt, status (active, expired, revoked) |

## **Data Kesehatan dan Verifikasi**

Tidak semua data kesehatan harus diverifikasi dokter. Yang menentukan adalah siapa yang mengklaim data tersebut dan seberapa besar dampaknya terhadap keselamatan. Karena itu FitPod tidak memblokir data yang belum diverifikasi, tetapi memberi label asal data pada setiap record.

### **Tiga level kepercayaan data**

| Level | Arti | Contoh |
| :---- | :---- | :---- |
| Self-reported | Diinput sendiri oleh pengguna | Tekanan darah dari tensimeter di rumah, riwayat penyakit yang diingat pengguna |
| Measured | Ada alat atau metode yang tercatat | Heart rate dari smartwatch, body fat dari timbangan BIA atau caliper |
| Clinician-attested | Ditandatangani dokter atau laboratorium | Diagnosis hipertensi, riwayat serangan jantung, hasil kolesterol, surat clearance |

### **Pemetaan jenis data**

| Data | Level yang wajar | Catatan |
| :---- | :---- | :---- |
| Heart rate (istirahat, saat latihan) | Measured | Dipakai sebagai tren, bukan diagnosis |
| Tekanan darah | Measured | Berbeda dengan diagnosis hipertensi |
| Body fat | Measured, metode wajib dicatat | Akurasi berbeda antar metode (BIA, caliper, DEXA) |
| Metabolic rate (BMR dan TDEE) | Estimasi turunan | Dihitung dengan rumus Mifflin-St Jeor kecuali diukur di klinik |
| Kolesterol | Clinician-attested | Angka disertai dokumen hasil lab |
| Riwayat hipertensi atau serangan jantung | Clinician-attested (ideal), self-reported dengan label | Paling berdampak pada keselamatan latihan |
| Surat clearance latihan | Harus clinician-attested | Dasar keputusan trainer |

Rumus BMR Mifflin-St Jeor: 10 x berat (kg) \+ 6,25 x tinggi (cm) \- 5 x usia \+ 5 untuk pria, atau \- 161 untuk wanita. TDEE adalah BMR dikali faktor aktivitas. Perhitungan ini memerlukan tanggal lahir dan jenis kelamin biologis, yang disimpan di folder privat dan tidak dibagikan ke trainer.

### **Provenance**

Setiap record kesehatan memuat blok provenance dengan field: source (self, device, clinician), recordedBy (WebID), method (misalnya BIA scale atau nama perangkat), attestedBy (WebID dokter atau laboratorium, opsional), attestedAt, dan proofRef (tautan ke tanda tangan atau credential, opsional). Antarmuka menampilkan label ini agar trainer tahu data mana yang dapat menjadi dasar keputusan.

### **Verifikasi oleh dokter**

Pemilik Pod selalu dapat mengubah isi Podnya. Jika dokter hanya menulis file ke Pod pengguna, pengguna secara teknis dapat mengedit file itu dan menyebutnya terverifikasi. Verifikasi yang sungguhan karena itu membutuhkan tanda tangan digital dokter.  
Verifiable Credential (VC) dari W3C adalah standar untuk klaim bertanda tangan. Di ekosistem Solid sudah ada demo riset tempat pengguna meminta VC dari pengguna lain, menyimpannya di Pod sendiri, lalu memakainya untuk mengakses resource di Pod pihak ketiga. Pendekatan dengan selective disclosure (BBS+) memungkinkan sebagian atribut saja yang dibuka, misalnya "cleared" tanpa diagnosis. Implementasi yang ditemukan masih berupa demo atau riset, belum siap produksi.  
Penerbit credential juga harus tepercaya. Sistem memerlukan daftar WebID dokter atau klinik yang sah, misalnya diverifikasi manual dengan nomor STR (Surat Tanda Registrasi). Komponen ini semi-terpusat dan tidak dapat dihindari pada versi produksi.  
Untuk prototipe, verifikasi disimulasikan dengan akun dokter demo yang menerbitkan record berstatus attested. Versi produksi memakai VC bertanda tangan dan issuer registry, dan hal ini dicatat sebagai pengembangan lanjutan.

### **Peran personal trainer dalam data kesehatan**

Personal trainer tidak mendiagnosis dan tidak perlu mengetahui diagnosis. Yang ia butuhkan adalah jawaban atas dua pertanyaan: apakah klien aman berlatih, dan apa batasannya. Industri kebugaran sudah memiliki alat screening untuk ini, yaitu PAR-Q+ (Physical Activity Readiness Questionnaire for Everyone). Jika klien menjawab "ya" pada salah satu pertanyaan, ia dianjurkan memiliki surat clearance medis tertulis sebelum memulai program. Formulir PAR-Q+ disertai formulir clearance dokter (ePARmed-X+) yang dapat menjadi acuan struktur record clearance. PAR-Q bukan riwayat medis lengkap, dan trainer bergantung pada kejujuran klien.  
Alur di FitPod:

> 1. Pengguna mengisi PAR-Q+ di aplikasi. Hasil tersimpan di health/screening/.  
> 2. Jika ada jawaban "ya", aplikasi menandai bahwa medical clearance diperlukan. Template program berintensitas tinggi dapat dikunci sampai clearance tersedia atau pengguna mengakui risikonya.  
> 3. Pengguna mengundang dokter. Dokter menerbitkan MedicalClearance berisi intensitas yang diizinkan, batasan, dan masa berlaku.  
> 4. Aplikasi membuat trainer-summary otomatis. Trainer hanya melihat status clearance, batas intensitas, batasan gerak, cedera aktif, dan, jika pengguna menyetujui, vitals terbaru.  
> 5. Trainer tidak dapat menulis ke folder health/. Jika trainer melihat gejala seperti pusing atau nyeri dada saat sesi, ia menulis rekomendasi rujukan ke prescriptions/ dan aplikasi menampilkannya kepada pengguna.

Pengguna dengan riwayat serangan jantung, misalnya, cukup menampilkan kepada trainer: "Cleared (verified, dr. X), intensitas maksimal moderate, berlaku sampai Januari 2027", tanpa membuka diagnosisnya. Ini penerapan prinsip minimum necessary.  
Logika clearance yang sebenarnya lebih rinci daripada aturan "ada jawaban ya berarti perlu clearance". Pedoman ACSM yang diperbarui pada 2015 mempertimbangkan apakah orang tersebut rutin berolahraga dan apakah masih bergejala. Misalnya, orang yang rutin berlatih dengan penyakit kardiovaskular tetapi tanpa gejala tidak memerlukan clearance untuk intensitas sedang, sedangkan clearance dianjurkan untuk intensitas berat. Prototipe memakai aturan sederhana dan hal ini dicatat sebagai penyederhanaan.

### **Skema data kesehatan**

| Entitas | Field |
| :---- | :---- |
| VitalReading | id, datetime, type (heartRate, bloodPressure), bpm, context (resting, exercise, recovery), systolicMmHg, diastolicMmHg, provenance |
| LabResult | id, date, testType (totalCholesterol, LDL, HDL, triglycerides, dan lain-lain), value, unit (mg/dL), referenceRange, labName, documentRef, provenance |
| Condition | id, name, status (active, resolved), diagnosedAt, eventDates\[\] (misalnya tanggal serangan jantung), codeICD10 (opsional, misalnya I10), provenance |
| Injury | id, bodyPart, status (active, recovered), since, restrictions |
| Allergy | id, substance, severity (mild, moderate, severe) |
| Medication | id, name, dose, frequency, startDate |
| MetabolicEstimate (turunan) | bmrKcal, tdeeKcal, method (mifflin-st-jeor, measured), activityFactor, computedAt |
| ScreeningRecord | id, date, formVersion (PAR-Q+), answers\[\], anyYes, result (clear, clearanceRecommended) |
| MedicalClearance | id, issuerWebId, issuerRole, issuedAt, validUntil, maxIntensity (light, moderate, vigorous), restrictions\[\], status, provenance (attested dan proofRef) |
| TrainerSummary (dibuat aplikasi) | clearanceStatus, validUntil, maxIntensity, restrictions\[\], activeInjuries\[\], latestRestingHr dan latestBp (hanya jika pengguna menyetujui) |

Aplikasi tidak memberi label otomatis seperti "tinggi", "normal", atau "berbahaya" pada tekanan darah atau kolesterol, karena itu mendekati diagnosis. Aplikasi hanya menampilkan angka dan tren. Untuk interoperabilitas, struktur vitals dan lab dapat mengacu pada model Observation dari HL7 FHIR dan kode LOINC.

## **Sumber Data Eksternal**

Seluruh sumber data berikut dapat dipakai tanpa biaya. Ketentuan lisensi dan batas akses berasal dari dokumentasi masing-masing penyedia dan perlu diperiksa ulang saat implementasi.

| Sumber | Dipakai untuk | Lisensi dan akses | Catatan |
| :---- | :---- | :---- | :---- |
| USDA FoodData Central | Bahan makanan dasar | Public domain (CC0). Perlu API key gratis dari api.data.gov. Batas 1.000 request per jam per IP, jika terlampaui key diblokir selama 1 jam. | Penyedia meminta pencantuman sumber. Cakupan masakan Indonesia kemungkinan terbatas. |
| Open Food Facts | Produk kemasan dan pemindaian barcode | ODbL: wajib mencantumkan kredit, dan database turunan harus memakai lisensi yang sama. Tanpa API key, tetapi wajib mengirim User-Agent berformat NamaApp/Versi (email). Pencarian 10 request per menit, baca produk 15 request per menit menurut dokumentasi (versi lain menyebut 100). | Data diisi kontributor, sehingga field bisa kosong atau tidak lengkap. |
| TKPI (Tabel Komposisi Pangan Indonesia, Kemenkes) | Makanan Indonesia | Belum dikaji (lisensi dan format). | Berbentuk tabel, bukan API. Kandidat tambahan. |
| Input manual (custom food) | Cadangan untuk makanan yang tidak ditemukan | Tidak ada ketergantungan eksternal. | Wajib tersedia karena tidak ada database yang lengkap. |
| free-exercise-db | Database exercise utama | 873 exercise dalam file JSON, public domain. File statis sehingga dapat dibundel tanpa API. | Hanya gambar, tanpa GIF atau video. Status lisensi gambar perlu dicek pada file LICENSE di repositori. |
| wger | Alternatif exercise dengan REST API dan banyak bahasa | Aplikasi berlisensi AGPL. Data exercise berlisensi Creative Commons yang berbeda per entri, dengan atribusi. | Lebih dari 800 exercise dengan otot, equipment, dan gambar. |
| ExerciseDB (dengan GIF) | Tidak dipakai | Berbayar (sekitar 100 dolar AS). | Di luar syarat penggunaan gratis. |

Keputusan: USDA untuk bahan dasar, Open Food Facts untuk barcode, dan custom food untuk sisanya, dengan TKPI sebagai tambahan bila memungkinkan. Untuk exercise, prototipe memakai free-exercise-db, dengan wger sebagai alternatif bila diperlukan API atau multi-bahasa. Hasil pencarian disimpan lokal (cache) untuk menghindari batas request. Pada SetLog, exerciseRef menyimpan source dan id, dengan opsi exercise buatan pengguna.

## **Alur Pengguna Utama**

### **Pertemanan**

> 1. Pengguna A memasukkan WebID atau tautan khusus milik pengguna B pada menu Temukan Pengguna.  
> 2. Aplikasi menulis permintaan pertemanan ke inbox B.  
> 3. Jika B menolak, notifikasi penolakan ditulis ke inbox A.  
> 4. Jika B menyetujui, B memberi izin baca folder social/shared/ kepada A, dan masing-masing menambahkan WebID lawan ke connections.ttl.

### **Berbagi workout**

Sesi asli tetap privat. Jika pengguna memilih membagikan aktivitas, aplikasi menulis ringkasan ke social/shared/, misalnya nama latihan, total volume, dan durasi. Detail seperti waktu istirahat tidak ikut terbuka, dan pengaturan aksesnya menjadi lebih sederhana.

### **Timeline**

> 1. Aplikasi membaca daftar teman dari connections.ttl pengguna.  
> 2. Aplikasi mengambil isi social/shared/ dari Pod tiap teman secara paralel.  
> 3. Hasil digabung (concat) lalu diurutkan berdasarkan waktu dan ditampilkan sebagai beranda.

### **Like, komentar, dan penghitungannya**

> 1. Pengguna membuat like atau komentar. Datanya tersimpan di social/interactions/ pada Pod pembuatnya.  
> 2. Aplikasi pembuat menulis notifikasi ke inbox pemilik postingan.  
> 3. Aplikasi pemilik membaca inbox dan menghitung jumlah interaksi per postingan.  
> 4. Hasil hitungan dapat disimpan sebagai counter di Pod pemilik. Setiap notifikasi memiliki id agar tidak dihitung dua kali.

Inbox hanya menampung notifikasi mentah. Penambahan angka dilakukan oleh kode aplikasi, bukan oleh Pod.

### **Undangan trainer dan akses sementara**

> 1. Pengguna mengundang trainer dengan memberikan WebID atau tautan undangan.  
> 2. Pengguna memilih kategori data dan durasi akses.  
> 3. Aplikasi menulis aturan akses di Pod dan mencatat AccessGrant.  
> 4. Trainer membaca data yang diizinkan dan menulis program ke prescriptions/.  
> 5. Saat tanggal berakhir tiba atau pengguna mencabut akses, aplikasi menghapus aturan akses tersebut.

## **Ruang Lingkup**

### **Termasuk dalam MVP**

> * Login Solid, profil WebID, dan struktur folder Pod.  
> * Body tracking, nutrisi (USDA, Open Food Facts, input manual), workout, routine, dan progress.  
> * Pertemanan dengan persetujuan, berbagi ringkasan workout, timeline hasil agregasi, serta like dan komentar dasar.  
> * Satu peran profesional, yaitu personal trainer, dengan akses sementara, folder prescriptions/, screening PAR-Q+, dan trainer-summary.  
> * Akun dokter demo untuk mensimulasikan record clinician-attested.

### **Di luar scope dan pengembangan lanjutan**

> * Verifikasi dokter dengan Verifiable Credential bertanda tangan dan issuer registry.  
> * Peran ahli gizi dan dokter atau fisioterapis secara penuh, termasuk vitals dan hasil lab.  
> * Indexer untuk timeline, hitungan interaksi, dan pencarian pengguna.  
> * Integrasi perangkat wearable dan integrasi dengan sistem kesehatan nasional seperti SATUSEHAT milik Kementerian Kesehatan. Kelayakan integrasi belum dikaji.  
> * Algoritma rekomendasi "for you", enkripsi tambahan di atas Pod, dan fitur foto progress.  
> * Fungsi diagnosis atau interpretasi medis. FitPod bukan alat medis.

## **Batasan dan Risiko**

| Kategori | Batasan | Mitigasi atau keputusan |
| :---- | :---- | :---- |
| Teknis | Timeline lambat bila following banyak, karena aplikasi harus membaca banyak Pod. | Fetch paralel, cache, dan batas jumlah following pada prototipe. |
| Teknis | Hitungan like tidak selalu akurat: notifikasi bisa hilang, inbox bisa dibanjiri spam, dan notifikasi bisa terproses dua kali. | Counter tersimpan dengan id notifikasi, filter hanya dari koneksi yang disetujui, indexer pada pengembangan lanjutan. |
| Teknis | Kedaluwarsa akses bergantung pada aplikasi. Jika aplikasi tidak berjalan, izin tidak otomatis dicabut. | Pemeriksaan saat aplikasi dibuka, pencabutan eksplisit, dan opsi server kecil terjadwal. |
| Teknis | Pod tidak otomatis memberi tahu pemilik siapa yang membaca datanya. Aplikasi hanya dapat mencatat pemberian dan pencabutan akses yang ia lakukan sendiri. | Mencatat grant dan revoke di access/grants.ttl. Log baca bergantung pada fitur penyedia Pod. |
| Teknis | Penyedia Pod tetap pihak yang dipercaya. Tanpa enkripsi tambahan, administrator server secara teknis dapat mengakses file. | Memakai penyedia tepercaya atau self-host. Enkripsi tambahan menjadi pengembangan lanjutan. |
| Teknis | Jika Pod seseorang offline, datanya tidak tampil di beranda teman atau tidak dapat diakses trainer. | Menampilkan cache terakhir dengan penanda waktu. |
| Teknis | Solid tidak menyediakan pencarian pengguna, sehingga pengguna baru membutuhkan titik awal. | WebID atau tautan dari teman, serta index aplikasi. |
| Teknis | API eksternal memiliki batas request. | Cache hasil pencarian dan snapshot nilai gizi pada setiap catatan. |
| Privasi | Data yang sudah dibaca tidak dapat ditarik kembali. Mencabut akses hanya menghentikan pembacaan berikutnya. | Prinsip minimum necessary, ringkasan menggantikan data mentah, dan peringatan kepada pengguna saat memberi akses. |
| Verifikasi | Pemilik Pod dapat mengubah isinya, sehingga label "verified" tidak bermakna tanpa tanda tangan digital. | VC dan issuer registry pada versi produksi. Prototipe memakai simulasi dan menyatakannya. |
| Verifikasi | Data self-reported dapat tidak jujur atau tidak lengkap, dan PAR-Q+ bergantung pada kejujuran klien. | Label provenance dan disclaimer. |
| Produk | FitPod bukan alat medis. BMI dan estimasi kalori terbakar adalah perkiraan kasar. | Tidak ada diagnosis atau label "normal" dan "tinggi". Menampilkan disclaimer dan instruksi berhenti berlatih serta mencari bantuan medis bila muncul nyeri dada, sesak, atau pusing berat. |
| Produk | Scope trainer terbatas dan kompetensinya bervariasi. | Akses trainer dibatasi pada ringkasan dan data yang relevan. |
| Produk | Logika clearance disederhanakan menjadi "ada jawaban ya berarti clearance dianjurkan". | Dicatat sebagai penyederhanaan prototipe. Clearance memiliki validUntil. |
| Produk | Fitur kalori dapat memicu perilaku makan atau latihan yang tidak sehat pada sebagian pengguna. | Tidak ada target kalori atau berat yang agresif secara default. Target diserahkan kepada ahli gizi. |
| Kualitas data | Open Food Facts diisi kontributor, USDA terbatas untuk masakan Indonesia, dan estimasi kalori terbakar kasar. | Input manual, penandaan estimasi, dan TKPI sebagai kandidat tambahan. |

## **Pertimbangan Hukum dan Etika**

UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, Pasal 4 ayat (2), mengelompokkan data dan informasi kesehatan sebagai data pribadi yang bersifat spesifik. Penjelasan pasal tersebut mengartikannya sebagai catatan atau keterangan individu yang berkaitan dengan kesehatan fisik, kesehatan mental, dan atau pelayanan kesehatan. Implikasinya bagi FitPod: persetujuan harus eksplisit dan granular, tujuan penggunaan data harus jelas, dan pengguna harus dapat mengakses, memperbaiki, serta menghapus datanya. Model Pod sejalan dengan hal ini karena data berada di tangan pengguna.  
UU No. 17 Tahun 2023 tentang Kesehatan (Pasal 351 ayat 1\) mewajibkan penyelenggara sistem informasi kesehatan menjamin pelindungan data dan informasi kesehatan individu. Apakah FitPod termasuk penyelenggara sistem informasi kesehatan, serta apakah pengelola aplikasi atau penyedia Pod berstatus pengendali atau prosesor data pribadi, perlu dikaji lebih lanjut bila FitPod dioperasikan untuk publik. Dokumen ini bukan nasihat hukum.  
Prinsip etika yang diterapkan: semua data privat secara default, persetujuan diberikan per kategori dan per durasi, pencabutan akses mudah dilakukan, tidak ada klaim medis, dan tidak ada dorongan target kalori atau berat badan yang agresif.

## **Rencana Pengembangan**

Durasi setiap tahap disesuaikan dengan jadwal mata kuliah.

| Tahap | Pekerjaan | Keluaran |
| :---- | :---- | :---- |
| Fondasi | Menyiapkan server Pod, login Solid-OIDC, profil WebID, dan struktur folder. | Aplikasi terhubung ke Pod dan dapat membaca serta menulis data. |
| Tracking inti | Body, nutrisi (USDA, Open Food Facts, input manual), workout, routine, dan progress. | Pencatatan lengkap dengan grafik perkembangan. |
| Sosial | Connections, friend request lewat inbox, ringkasan yang dibagikan, timeline agregasi, like dan komentar. | Alur sosial dari awal sampai akhir. |
| Akses profesional dan kesehatan | AccessGrant, peran trainer, PAR-Q+, trainer-summary, prescriptions, dan akun dokter demo. | Berbagi selektif dengan masa berlaku dan pencabutan. |
| Evaluasi dan dokumentasi | Pengujian skenario, pengukuran waktu muat timeline, dan penulisan laporan trade-off. | Laporan dan demo akhir. |

## **Kriteria Keberhasilan dan Pengujian**

> * Pengguna baru dapat login, membuat struktur folder, dan mencatat data, serta data langsung terlihat di Pod.  
> * Data privat tidak dapat dibaca oleh akun lain tanpa izin, diuji dengan akun kedua.  
> * Pada friend request yang ditolak, notifikasi penolakan muncul. Pada yang disetujui, timeline menampilkan ringkasan aktivitas teman.  
> * Sesi yang dibagikan hanya menampilkan ringkasan, dan waktu istirahat tidak terbuka.  
> * Akses trainer hanya mencakup kategori yang dipilih. Setelah akses dicabut atau berakhir, pembacaan oleh trainer gagal.  
> * Trainer-summary tidak memuat diagnosis, obat, atau hasil lab.  
> * Program dari trainer tampil di aplikasi pengguna tanpa mengubah log asli.  
> * Waktu muat timeline dicatat terhadap jumlah following sebagai data evaluasi.

## **Kesimpulan**

FitPod menunjukkan penggunaan Solid Pod pada kasus yang nilainya mudah dijelaskan: data kebugaran dan kesehatan yang sensitif dan perlu dibagikan secara selektif kepada pihak yang berbeda dengan kebutuhan berbeda. Prototipe yang diusulkan membatasi scope pada pencatatan inti, fitur sosial, dan satu peran profesional, sehingga dapat diselesaikan sambil tetap memperlihatkan trade-off utama arsitektur berbasis Pod. Bagian yang belum dapat diselesaikan penuh, seperti verifikasi dokter bertanda tangan dan indexer, dicatat secara terbuka sebagai pengembangan lanjutan.

## **Referensi**

> * USDA FoodData Central, API Guide: [https\://fdc.nal.usda.gov/api-guide](https://fdc.nal.usda.gov/api-guide)  
> * Open Food Facts, API documentation: [https\://openfoodfacts.github.io/openfoodfacts-server/api/](https://openfoodfacts.github.io/openfoodfacts-server/api/)  
> * free-exercise-db (yuhonas): [https\://github.com/yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db)  
> * wger Workout Manager: [https\://github.com/wger-project/wger](https://github.com/wger-project/wger)  
> * BCRPA, Fitness Essentials: Exercise Screening Tools (PAR-Q+ dan ePARmed-X): [https\://healthyliving.bcrpa.bc.ca/fitness-essentials-exercise-screening-tools/](https://healthyliving.bcrpa.bc.ca/fitness-essentials-exercise-screening-tools/)  
> * NFPT, Pre-participation Health-Screening Guidelines (pembaruan ACSM 2015): [https\://nfpt.com/?p=5608](https://nfpt.com/?p=5608)  
> * Privacy-friendly Credentials, Verifiable Credentials pada Solid: [https\://ceur-ws.org/Vol-3235/paper1.pdf](https://ceur-ws.org/Vol-3235/paper1.pdf)  
> * Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi: [https\://id.wikisource.org/wiki/Undang-Undang\_Republik\_Indonesia\_Nomor\_27\_Tahun\_2022](https://id.wikisource.org/wiki/Undang-Undang_Republik_Indonesia_Nomor_27_Tahun_2022)  
> * BP Lawyers, ulasan pelindungan data kesehatan (UU 17/2023): [https\://bplawyers.co.id/?p=11451](https://bplawyers.co.id/?p=11451)

## **Lampiran A: Contoh Data**

Nilai pada contoh berikut adalah ilustrasi, bukan data resmi.

### **FoodEntry**

`{`  
  `"@type": "FoodEntry",`  
  `"datetime": "2026-10-29T12:30:00+07:00",`  
  `"meal": "lunch",`  
  `"foodName": "Chicken breast, cooked",`  
  `"source": "usda",`  
  `"sourceId": "FDC-ID-CONTOH",`  
  `"quantityG": 150,`  
  `"kcal": 248, "proteinG": 46.5, "carbG": 0, "fatG": 5.4`  
`}`

### **WorkoutSession**

`{`  
  `"@id": "sessions/2026-10-29-push.jsonld",`  
  `"@type": "WorkoutSession",`  
  `"date": "2026-10-29",`  
  `"startTime": "17:00", "endTime": "18:10",`  
  `"routine": "routines/ppl-push",`  
  `"exercises": [`  
    `{ "name": "Bench Press", "sets": [`  
      `{ "weightKg": 60, "reps": 8, "restSec": 120 },`  
      `{ "weightKg": 60, "reps": 7, "restSec": 120 } ] }`  
  `]`  
`}`

### **AccessGrant**

`{`  
  `"@type": "AccessGrant",`  
  `"granteeWebId": "https://pod.example/coach-budi/profile#me",`  
  `"role": "trainer",`  
  `"categories": ["body", "routines", "sessions", "health/trainer-summary"],`  
  `"grantedAt": "2026-10-29",`  
  `"expiresAt": "2027-01-29",`  
  `"status": "active"`  
`}`

### **MedicalClearance**

`{`  
  `"@type": "MedicalClearance",`  
  `"issuerWebId": "https://pod.example/dr-sari/profile#me",`  
  `"issuerRole": "doctor",`  
  `"issuedAt": "2026-10-29",`  
  `"validUntil": "2027-01-29",`  
  `"maxIntensity": "moderate",`  
  `"restrictions": ["hindari angkat beban maksimal", "berhenti jika nyeri dada atau pusing"],`  
  `"provenance": {`  
    `"source": "clinician",`  
    `"attestedBy": "https://pod.example/dr-sari/profile#me",`  
    `"attestedAt": "2026-10-29",`  
    `"proofRef": "health/clearance/proof-0001.jsonld"`  
  `}`  
`}`