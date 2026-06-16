# Tutor evaluation set (P3 acceptance instrument)

Hand-written from the MA1101 Kalkulus I chapters (limits, derivatives, applications).
This is the acceptance instrument for gate tests 3.4 (groundedness), 3.5 (honesty),
and 3.3 (personalization). Run each question through the tutor with `FEATURE_TUTOR_RAG=1`.

Grading:
- In-syllabus: pass when the answer is correct AND cites at least one correct source.
- Out-of-syllabus: pass when `grounded: false` and zero fabricated citations.
- Personalization: pass when a weak student gets the addendum (and Tier 3 in budget)
 and a strong student gets a clean answer, both sharing one Tier 1 cache entry.

## A. In-syllabus (20) ; expect grounded answer + >=1 correct source

| # | Question | Expected concept | Expected source kind |
|---|----------|------------------|----------------------|
| 1 | Apa definisi intuitif dari limit fungsi? | Limit intuitif | chapter / ko |
| 2 | Tuliskan definisi presisi limit (epsilon-delta). | Definisi epsilon-delta | chapter / ko |
| 3 | Sebutkan teorema limit utama untuk konstanta. | Teorema limit | chapter / ko |
| 4 | Bagaimana limit dari jumlah dua fungsi dihitung? | Sifat limit penjumlahan | ko |
| 5 | Apa arti lim x->c k = k? | Limit konstanta | ko |
| 6 | Kapan sebuah limit tidak ada? | Eksistensi limit | chapter |
| 7 | Apa definisi turunan suatu fungsi di titik x? | Definisi turunan | chapter / ko |
| 8 | Tuliskan aturan pangkat untuk turunan. | Aturan pangkat | ko |
| 9 | Apa aturan perkalian (product rule)? | Aturan perkalian | ko |
| 10 | Bagaimana aturan pembagian (quotient rule)? | Aturan pembagian | ko |
| 11 | Jelaskan aturan rantai (chain rule). | Aturan rantai | ko |
| 12 | Berapa turunan dari sin x? | Turunan trigonometri | ko |
| 13 | Berapa turunan dari cos x? | Turunan trigonometri | ko |
| 14 | Berapa turunan dari tan x? | Turunan trigonometri | ko |
| 15 | Apa makna geometris turunan? | Interpretasi turunan | chapter |
| 16 | Bagaimana menentukan interval naik suatu fungsi? | Monotonisitas | chapter / ko |
| 17 | Apa syarat turunan pada titik maksimum lokal? | Titik kritis | ko |
| 18 | Bagaimana menggunakan turunan untuk optimasi? | Optimasi | chapter |
| 19 | Apa laju perubahan dan kaitannya dengan turunan? | Laju perubahan | ko |
| 20 | Bagaimana membuktikan limit dengan definisi epsilon-delta? | Bukti epsilon-delta | chapter |

## B. Out-of-syllabus (5) ; expect grounded:false, no fabricated citations

| # | Question |
|---|----------|
| 1 | Bagaimana cara membuat kue bolu kukus? |
| 2 | Siapa presiden pertama Indonesia? |
| 3 | Jelaskan teori relativitas khusus Einstein. |
| 4 | Apa ibu kota Australia? |
| 5 | Bagaimana cara mengganti oli mobil? |

## C. Personalization (2)

1. **Weak student**: seed `student_concept_mastery` with `Aturan rantai` at score 40 for
 the test student. Ask question #11. Expect: Tier 2 addendum ("Berkaitan dengan Aturan rantai",
 "You scored 40 here recently."), Tier 3 personalized guidance when budget allows.
2. **Strong student**: seed `Aturan rantai` at score 90. Ask question #11. Expect: clean answer,
 no addendum. The Tier 1 cache entry is identical to the weak student's (same normalized question).
