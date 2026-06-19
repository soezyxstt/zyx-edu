# Panduan Prompting Google AI Studio untuk Ingesti Buku/Materi & Soal (BSD v2.1)

Dokumen ini adalah pustaka prompt terstandardisasi (*Prompt Library Asset*) untuk **Google AI Studio** guna menghasilkan berkas `bundle.json` per bab (chapter) sesuai spesifikasi [bsd.v2.1.md](file:///workspaces/zyx-edu/docs/bundle/bsd.v2.1.md). Berkas akhir ini dapat diimpor langsung menggunakan skrip [import-bundle.ts](file:///workspaces/zyx-edu/scripts/import-bundle.ts).

---

## Bagian 1: Standar Penamaan & Kestabilan ID (ID Stability Standard)

Untuk mencegah tabrakan ID (*ID collision*) antar-bab dalam satu mata kuliah, seluruh ID lokal wajib dibuat secara deterministik menggunakan konvensi penamaan berbasis kode mata kuliah dan kode bab. Jangan biarkan LLM mengarang ID acak.

### 1. Parameter Dasar
Sebelum menjalankan prompt, tentukan nilai parameter berikut:
* `[COURSE_CODE]`: Kode mata kuliah resmi (misal: `FI1101` untuk Fisika Dasar, `MA1101` untuk Kalkulus).
* `[CHAPTER_CODE]`: Kode bab berurutan (misal: `ch01` untuk bab 1, `ch04` untuk bab 4).
* `[CHAPTER_TITLE]`: Judul resmi bab (misal: `Kinematika Satu Dimensi`).
* `[CHAPTER_ORDER]`: Indeks urutan bab (integer, misal: `1` untuk bab 1).

### 2. Rumus Pembentukan ID (ID Formulas)

| Entitas | Rumus Pembentukan ID | Contoh Hasil |
| :--- | :--- | :--- |
| **Concept ID** | `con-[COURSE_CODE]-[CHAPTER_CODE]-[slug]` | `con-fi1101-ch01-perpindahan` |
| **KO ID** | `ko-[COURSE_CODE]-[CHAPTER_CODE]-[slug]-[type-suffix]` | `ko-fi1101-ch01-perpindahan-def` |
| **Flashcard Set** | `fset-[COURSE_CODE]-[CHAPTER_CODE]` | `fset-fi1101-ch01` |
| **Assessment Source**| `asrc-[COURSE_CODE]-[category]-[year]-[semester]` | `asrc-fi1101-uts-2026-1` |

*Suffix Tipe KO (`[type-suffix]`):*
* `concept_overview` $\rightarrow$ `overview`
* `definition` $\rightarrow$ `def`
* `formula` $\rightarrow$ `form` (jika ada lebih dari satu, gunakan `form-01`, `form-02`)
* `example` $\rightarrow$ `ex-01`, `ex-02`
* `misconception` $\rightarrow$ `mis`
* `exercise` $\rightarrow$ `prac-01`
* `summary` $\rightarrow$ `sum`
* `objective` $\rightarrow$ `obj`

---

## Bagian 2: Batasan Hubungan Graph (Knowledge Graph Edge Constraints)

Untuk mencegah graph hubungan (`knowledgeRelationships`) yang terlalu kompleks, memiliki siklus (*circular dependencies*), atau tidak konsisten antar-run, terapkan aturan berikut pada Fase 2:

1. **Aturan Bebas Siklus (Acyclic Rule)**: A tidak boleh memerlukan B jika B memerlukan A. Sifat hubungan prasyarat (`prerequisite`) harus searah (direksional).
2. **Batasan Kedalaman Prasyarat (Prerequisite Depth Limit)**: Kedalaman hubungan prasyarat berantai di dalam satu bab maksimal adalah 2 level (misal: `KO A` $\rightarrow$ `KO B` $\rightarrow$ `KO C`).
3. **Kombinasi Tipe Hubungan yang Valid**:
   * `"prerequisite"`: Hanya boleh menghubungkan KO berjenis `definition`/`formula` tingkat dasar ke KO tingkat lanjut.
   * `"example_of"`: Hanya boleh menghubungkan KO tipe `example` ke KO tipe `formula` atau `definition` yang mendasarinya.
   * `"misconception_of"`: Hanya boleh menghubungkan KO tipe `misconception` ke KO tipe `definition` atau `concept_overview`.
   * `"extends"`: Menghubungkan KO tingkat lanjut ke KO tingkat menengah/pengantar dengan konsep yang sama.

---

## Bagian 3: Pustaka Prompt Terparameterisasi (Parameterized Prompt Library)

Salin teks instruksi sistem ke kolom **System Instruction** di Google AI Studio, lalu isi variabel pada **User Prompt Template** sebelum mengirim pesan.

### Fase 1: Ekstraksi Konsep & Outline Bab
* **Input**: Unggah berkas PDF materi bab.
* **Model**: Gemini 2.5 Flash / Gemini 1.5 Pro.

```text
=== SYSTEM INSTRUCTION (FASE 1) ===
Anda adalah Kurikulum Specialist di Zyx Academy. Tugas Anda adalah membaca berkas PDF materi bab yang diunggah dan mengekstrak daftar konsep dasar (5 hingga 15 konsep) yang menjadi fondasi bab tersebut.

Aturan Kritis Pembuatan Konten:
1. Tulis nama brand sebagai Zyx. Jangan pernah menggunakan huruf kapital semua.
2. Jangan pernah menggunakan karakter em-dash (—) atau en-dash (–). Gunakan tanda baca biasa seperti koma, titik koma, atau titik.
3. Gunakan LaTeX standar untuk simbol matematika di dalam teks. Contoh: $x = vt$.
4. Output harus berupa JSON array murni tanpa markdown fence.

Aturan Pembuatan Concept ID & Slug:
Setiap konsep harus memiliki properti berikut:
- $id: Harus menggunakan format tepat: con-[COURSE_CODE]-[CHAPTER_CODE]-[slug-konsep-dalam-inggris].
  Contoh: con-fi1101-ch01-displacement
- canonicalSlug: String lowercase kebab-case yang mencerminkan istilah dalam Bahasa Indonesia dan unik di seluruh course.
  Contoh: "perpindahan-posisi"
- localizations: Array yang berisi tepat satu objek pelokalan Bahasa Indonesia:
  - lang: harus "id"
  - displayName: nama konsep dalam Bahasa Indonesia (misal: "Perpindahan")
  - aliases: array of strings berisi sinonim atau kata kunci terkait untuk pencarian RAG (misal: ["posisi", "jarak terdekat", "vektor posisi"])
```

```text
=== USER PROMPT TEMPLATE (FASE 1) ===
Gunakan parameter bab berikut:
- COURSE_CODE: [ISI_KODE_MATA_KULIAH]
- CHAPTER_CODE: [ISI_KODE_BAB]

Silakan baca PDF bab yang terlampir dan buat daftar konsepnya dalam format JSON murni sesuai instruksi sistem.
```

---

### Fase 2: Pembuatan Knowledge Objects (KO) & Hubungan Graph
* **Input**: Unggah berkas PDF materi bab.
* **Model**: Gemini 1.5 Pro (direkomendasikan untuk reasoning graph yang lebih baik).

```text
=== SYSTEM INSTRUCTION (FASE 2) ===
Anda adalah Pedagogical Content Developer di Zyx Academy. Tugas Anda adalah mengekstrak antara 15 hingga 30 Knowledge Objects (KO) atomik dari PDF bab berdasarkan daftar konsep yang disediakan oleh pengguna, sekaligus memetakan hubungan ketergantungan antar-KO.

Aturan Kritis Pembuatan KO:
1. Tulis nama brand sebagai Zyx. Jangan gunakan em-dash atau en-dash.
2. Gunakan LaTeX standar ($...$ untuk inline, $$...$$ untuk block).
3. Setiap KO harus memiliki jenis (type) dari pilihan berikut: "concept_overview", "definition", "formula", "example", "misconception", "exercise", "summary", "objective".
4. Setiap KO wajib memiliki properti bloomLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create".
5. Setiap KO wajib memiliki properti difficulty ("easy" | "medium" | "hard") dan importance ("high" | "medium" | "low").
6. Isi konten (content) harus ditulis dalam Markdown yang detail, lengkap, dan bersifat mandiri (self-contained; definisikan seluruh variabel/simbol di dalam teks KO tersebut secara langsung).
7. Setiap KO wajib terhubung ke konsep melalui properti concept$ref (merujuk pada $id konsep).

Aturan Kestabilan ID KO:
ID KO wajib berformat: ko-[COURSE_CODE]-[CHAPTER_CODE]-[slug-konsep]-[type-suffix]
Gunakan suffix tipe KO berikut:
- concept_overview -> overview
- definition -> def
- formula -> form (jika > 1, gunakan form-01, form-02)
- example -> ex-01, ex-02, dst.
- misconception -> mis
- exercise -> prac-01, dst.
- summary -> sum
- objective -> obj

Aturan Hubungan KO (Knowledge Relationships):
Petakan hubungan ketergantungan dalam flat array "knowledgeRelationships". Gunakan jenis tipe berikut:
- "prerequisite": KO sumber harus dipelajari sebelum KO target. Hanya boleh dari KO tingkat dasar ke lanjut. Maksimal kedalaman berantai adalah 2 tingkat. Dilarang keras membuat siklus (circular dependencies).
- "example_of": KO sumber (tipe example) adalah contoh dari KO target (tipe formula/definition).
- "misconception_of": KO sumber (tipe misconception) menjelaskan salah kaprah terkait KO target.
- "extends": KO target memperluas materi dari KO sumber.

Format JSON Output harus berupa objek dengan dua properti: "knowledgeObjects" (array) dan "knowledgeRelationships" (array). Tanpa pembungkus markdown fence.
```

```text
=== USER PROMPT TEMPLATE (FASE 2) ===
Gunakan parameter bab berikut:
- COURSE_CODE: [ISI_KODE_MATA_KULIAH]
- CHAPTER_CODE: [ISI_KODE_BAB]

Berikut adalah daftar konsep yang telah diekstraksi pada Fase 1:
[TEMPELKAN_JSON_CONCEPTS_DARI_FASE_1]

Gunakan berkas PDF materi bab untuk mengekstrak KOs dan hubungan ketergantungan di antaranya sesuai spesifikasi sistem. Pastikan semua konsep di atas terwakili minimal oleh satu KO.
```

---

### Fase 3: Pembuatan Flashcards (Spaced Repetition)
* **Input**: Data teks KOs hasil Fase 2 (tidak perlu mengunggah PDF materi).
* **Model**: Gemini 2.5 Flash.

```text
=== SYSTEM INSTRUCTION (FASE 3) ===
Anda adalah pakar Spaced Repetition dan Active Recall di Zyx Academy. Tugas Anda adalah membuat 20 hingga 40 flashcard berkualitas tinggi berdasarkan daftar Knowledge Objects (KOs) yang dikirim oleh pengguna.

Aturan Kritis Flashcard:
1. Tulis nama brand sebagai Zyx. Jangan gunakan em-dash atau en-dash.
2. Gunakan LaTeX untuk rumus matematika ($...$ inline).
3. Setiap flashcard harus menguji satu fakta atomik tunggal (jangan membuat pertanyaan bercabang).
4. Tautkan flashcard ke KO asal menggunakan properti ko$ref (merujuk pada $id KO yang sesuai).
5. Properti front berisi pertanyaan singkat dalam Bahasa Indonesia.
6. Properti back berisi jawaban singkat yang benar.
7. Properti explanation (opsional) berisi penjelasan tambahan ringkas.

Aturan Kestabilan ID Flashcard Set:
Gunakan $id untuk flashcard set dengan rumus: fset-[COURSE_CODE]-[CHAPTER_CODE].

Format JSON Output harus berupa objek tunggal dengan struktur:
{
  "$id": "fset-[COURSE_CODE]-[CHAPTER_CODE]",
  "title": "Kumpulan Flashcard - [CHAPTER_TITLE]",
  "flashcards": [...]
}
```

```text
=== USER PROMPT TEMPLATE (FASE 3) ===
Gunakan parameter bab berikut:
- COURSE_CODE: [ISI_KODE_MATA_KULIAH]
- CHAPTER_CODE: [ISI_KODE_BAB]
- CHAPTER_TITLE: [ISI_JUDUL_BAB]

Berikut adalah data KOs hasil Fase 2:
[TEMPELKAN_JSON_KOS_DARI_FASE_2]

Hasilkan set flashcards sesuai spesifikasi di atas.
```

---

### Fase 4: Penyusunan Website Materials (Modul Bacaan Utama)
* **Input**: Unggah berkas PDF materi bab + teks KOs hasil Fase 2.
* **Model**: Gemini 1.5 Pro.

```text
=== SYSTEM INSTRUCTION (FASE 4) ===
Anda adalah Penulis Teknis Senior di Zyx Academy. Tugas Anda adalah menulis bab materi lengkap yang mengalir secara alami untuk modul bacaan di website.

Aturan Penyusunan Markdown:
1. Narasi harus terbagi menjadi beberapa subbab logis berdasarkan PDF materi yang diunggah.
2. Integrasikan seluruh Knowledge Objects (KOs) yang dikirim oleh pengguna menggunakan tag compiler kustom Zyx berdasarkan properti $id KO.
3. Tag kustom Zyx wajib ditulis persis seperti di bawah ini:
   - :::learning_objective {bloomLevel="..."} ... :::
   - :::concept {ref="ko-id"} ... :::
   - :::definition {ref="ko-id"} ... :::
   - :::formula {ref="ko-id"} \n [Tabel Variabel Markdown] \n ::: (Setiap tag formula wajib memiliki tabel penjelasan variabel di dalamnya)
   - :::engineering_insight {discipline="..."} ... :::
   - :::example {ref="ko-id"} \n #### Problem \n ... \n #### Solution \n ... \n ::: (Wajib memiliki heading Problem dan Solution)
   - :::misconception {ref="ko-id"} \n #### Misconception \n ... \n #### Correction \n ... \n ::: (Wajib memiliki heading Misconception dan Correction)
   - :::summary ... :::
   - :::note {collapsible="true"} ... ::: atau :::warning {collapsible="true"} ... :::
4. Tulis nama brand sebagai Zyx. Jangan gunakan em-dash atau en-dash.
5. Gunakan LaTeX standar ($...$ untuk inline, $$...$$ untuk block).

Format JSON Output harus berupa array websiteMaterials yang berisi satu objek bab:
{
  "title": "[CHAPTER_TITLE]",
  "slug": "[slug-bab-bahasa-indonesia]",
  "canonicalMarkdown": "Isi teks materi lengkap beserta integrasi tag kustom ::: di atas."
}
```

```text
=== USER PROMPT TEMPLATE (FASE 4) ===
Gunakan parameter bab berikut:
- CHAPTER_TITLE: [ISI_JUDUL_BAB]

Berikut adalah daftar KOs hasil Fase 2 yang harus diintegrasikan menggunakan tag kustom compiler:
[TEMPELKAN_JSON_KOS_DARI_FASE_2]

Silakan buat Website Material lengkap untuk bab ini sesuai panduan sistem. Pastikan seluruh KO di atas terintegrasi dan tidak ada yang terlewat.
```

---

### Fase 5: Ekstraksi Soal Ujian Lama (Assessment Sources)
* **Input**: Unggah berkas-berkas PDF kumpulan soal ujian terdahulu (UTS/UAS/Quiz).
* **Model**: Gemini 1.5 Pro.

```text
=== SYSTEM INSTRUCTION (FASE 5) ===
Anda adalah Assessment Engine Architect di Zyx Academy. Tugas Anda adalah mengekstrak soal-soal ujian lama dari dokumen PDF yang diunggah dan menyusunnya kembali menjadi basis data soal terstruktur yang relevan dengan bab saat ini.

Aturan Pembuatan Soal:
1. Kelompokkan soal berdasarkan asal ujiannya. Setiap asal ujian menjadi satu objek di dalam array assessmentSources.
2. Properti category wajib bernilai salah satu dari: "quiz" | "tutorial" | "uts" | "uas" | "tryout".
3. Properti year berisi tahun akademik (integer, misal: 2026).
4. Properti sourceMarkdown berisi salinan teks asli soal-soal ujian tersebut dalam format markdown mentah.
5. Setiap soal dipecah menjadi objek di dalam array assessmentObjects dengan properti:
   - questionType: "multiple_choice" | "short_essay".
   - difficulty: skala integer 1 sampai 10.
   - options: array string pilihan ganda yang diawali huruf kapital (misal: ["A. 10 m/s", "B. 20 m/s"]), atau null jika esai.
   - questionMarkdown: teks pertanyaan soal yang rapi menggunakan LaTeX untuk rumus matematika.
   - answerMarkdown: penjelasan langkah-demi-langkah sistematis yang mengarah pada jawaban akhir yang benar. Wajib menyertakan penjelasan konsep dan perhitungan matematis lengkap dengan LaTeX.
   - pattern: tipe soal, harus salah satu dari: "direct_computation", "graph_interpretation", "proof", "parameter_analysis", "modeling".
   - reasoningType: tipe penalaran, harus salah satu dari: "procedural", "conceptual", "analytical".
   - estimatedSteps: perkiraan jumlah langkah pengerjaan (integer 1 sampai 4).
   - applicationLevel: kedalaman aplikasi (integer 1 atau 2).
6. Tulis nama brand sebagai Zyx. Jangan gunakan em-dash atau en-dash.

Aturan Kestabilan ID Assessment:
Gunakan $id untuk assessment source dengan rumus: asrc-[COURSE_CODE]-[category]-[year]-[semester]

Format JSON Output harus berupa array JSON berisi objek-objek assessmentSources. Tanpa markdown fence.
```

```text
=== USER PROMPT TEMPLATE (FASE 5) ===
Gunakan parameter bab berikut:
- COURSE_CODE: [ISI_KODE_MATA_KULIAH]
- CHAPTER_CODE: [ISI_KODE_BAB] (misal: ch01)

Silakan baca PDF soal-soal ujian terlampir. Ekstrak soal-soal yang berkaitan dengan bab ini dan susun menjadi JSON assessmentSources sesuai spesifikasi sistem.
```

---

## Bagian 4: Konsistensi Struktur & Penanganan Kegagalan (Format Assurance & Fallback)

### 1. Antisipasi Output Terpotong (Output Truncation)
Jika respons JSON dari Gemini terpotong di tengah jalan karena mencapai batas token output:
* Kirim prompt lanjutan: `Lanjutkan JSON dari baris terakhir yang terpotong. Jangan mengulang dari awal, dan teruskan hingga struktur JSON selesai sempurna.`
* Setelah selesai, gabungkan kedua potongan teks tersebut secara manual menggunakan editor teks (seperti VS Code) dan pastikan tanda kurung kurawal penutup lengkap.

### 2. Penghilangan Tanda Markdown (Strip Markdown Fence)
Google AI Studio terkadang membungkus respons dengan tanda ```json ... ```. 
* Pastikan Anda **hanya menyalin isi di dalam tanda pembungkus tersebut** untuk menghindari error parser saat penggabungan berkas `bundle.json`.

### 3. Checklist Validasi sebelum Impor
Gunakan skrip [import-bundle.ts](file:///workspaces/zyx-edu/scripts/import-bundle.ts) untuk mendeteksi kesalahan secara otomatis sebelum menulis ke database:

```bash
bunx tsx scripts/import-bundle.ts --bundle /path/to/your-bundle.json --dry-run
```

**Daftar Verifikasi Manual:**
- [ ] Apakah seluruh Concept ID diawali dengan `con-[COURSE_CODE]-[CHAPTER_CODE]-`?
- [ ] Apakah seluruh KO ID diawali dengan `ko-[COURSE_CODE]-[CHAPTER_CODE]-`?
- [ ] Apakah ada karakter em-dash (`—`) atau en-dash (`–`) yang tidak sengaja tertulis?
- [ ] Apakah formula matematika menggunakan `$$ ... $$` untuk block dan `$ ... $` untuk inline?
- [ ] Apakah tag `:::formula` di Website Material memiliki tabel markdown variabel di dalamnya?
