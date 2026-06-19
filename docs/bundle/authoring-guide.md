# Zyx Course Bundle Authoring Guide (Schema V1.1.1)

Welcome to the Zyx Academy Course Bundle Authoring Guide. This handbook is designed for content authors, subject matter experts, and curriculum developers. It explains how to build, structure, and write high-quality course content from scratch using the **Zyx Bundle V1.1.1** specification.

---

## 1. Bundle Philosophy

Zyx is a delivery and learning personalization platform, not a content authoring tool. Content creation happens in external environments where authors have the freedom to use their preferred tools:
* **Gemini Workspace or other AI systems** (to draft, refine, and structure content)
* **LLMs like Claude or ChatGPT** (for feedback, translation, and validation assistance)
* **Local IDEs or text editors** (for manual organization and markdown writing)

Once the content is written, it is assembled into a single machine-readable JSON file called a **Course Bundle**.

```
External Workspace (Gemini/Claude/Manual)
         ↓
   Course Bundle (JSON, V1.1.1)
         ↓
  Zyx Importer Pipeline
         ↓
  Zyx App Delivery (Student Experience)
```

The Course Bundle represents a complete snapshot of the course. It includes chapters, concepts, knowledge objects, flashcards, website materials, and exam questions, along with their relationships. Validating and compiling this bundle ensures that content is version-controlled, complete, and free of broken links before it ever reaches a student.

---

## 2. Non-Authorable Data

Content authors should only focus on the core educational material. Do NOT attempt to include or mock any of the following fields or tracking states in your course bundle:

* **Mastery Levels**: Student skill and progress percentages.
* **Spaced Repetition States**: Next review dates, interval scores, or retention ratings.
* **Student Analytics**: Mastery history, correct/incorrect response counters, and trend logs.
* **Recommendations**: Recommended flashcard sets, remediation interventions, or study path directions.
* **Learning Streaks**: Daily active streaks and multiplier scores.
* **Review History**: Logs of student flashcard reviews or quiz attempts.
* **Vector IDs and Embeddings**: Pinecone vector indexes and floating point array values.
* **Generated Hashes**: Content verification keys.
* **AST Structures**: Compiled JSON syntax trees of website materials.
* **Progress Tracking**: Completed chapter logs and reading durations.

These elements are computed, generated, and managed dynamically by Zyx during runtime. Your job is solely to define the clean, static syllabus structure, text materials, and questions.

---

## 3. Course Design Workflow

When building a course, we recommend a top-down planning approach followed by a bottom-up referencing flow.

```
Course Design Flow (Top-Down):
Course → Chapters → Concepts → Knowledge Objects

Referencing Flow (Bottom-Up):
Flashcards & Assessments → Knowledge Objects (via $ref)
```

1. **Course Level**: Define the broad topic (e.g. Physics, Calculus).
2. **Chapters**: Partition the course into logical thematic chapters. In Zyx, **1 Chapter = 1 Master Teaching Document (MTD)**.
3. **Concepts**: For each chapter, identify the core conceptual pillars (e.g. "Newton's First Law", "Centripetal Acceleration").
4. **Knowledge Objects (KOs)**: Decompose each concept into atomic educational building blocks (definitions, formulas, examples, misconceptions).
5. **Flashcards & Assessments**: Write practice flashcards and exam questions. Every card and question must explicitly reference a specific Knowledge Object via its ID (`ko$ref`).
6. **Relationships**: Connect Knowledge Objects to establish learning paths (e.g. KO "A" is a prerequisite for KO "B").

This bottom-up referencing system allows Zyx to analyze a student's performance on a flashcard or exam question and trace it directly back to the exact definition or formula they are struggling with, enabling precision tutoring.

---

## 4. Chapter Authoring Guidelines

In Zyx, a chapter represents a single Master Teaching Document (MTD). It is a complete, self-contained learning unit.

### Recommended Scope and Size
* **Thematic Unity**: A chapter must focus on a single major topic (e.g. "Kinematics in 1D" or "Newtonian Dynamics"). Do not combine unrelated topics into one chapter.
* **Volume Constraints**:
  * **Concepts**: 8 to 15 concepts per chapter.
  * **Knowledge Objects**: 15 to 30 KOs per chapter.
  * **Flashcards**: 20 to 40 flashcards per chapter.
  * **Website Materials**: 1 to 2 comprehensive reading materials per chapter.
* **Learning Objectives**: Every chapter must start with clear learning objectives mapping to Bloom's taxonomy.

*Example*: For a Calculus course, do not create a chapter named "Limits and Derivatives" (this is too broad). Instead, create two separate chapters: "Limits of Functions" and "Differentiation Rules".

---

## 5. Concept Authoring Guidelines

Concepts are the intellectual nodes of a course. They represent abstract ideas that a student must understand.

* **Canonical Concept Naming**: Give every concept a unique, descriptive slug (`canonicalSlug`). For example, use `kecepatan-sesaat` rather than `konsep-2` or `kecepatan`.
* **Concept Granularity**: A concept should be small enough to explain in 1 or 2 paragraphs, but large enough to stand alone. For example, "First Derivative Test" is a good concept. "Derivative of x^2" is too narrow (this is an example KO, not a standalone concept).
* **Avoiding Duplicates**: Ensure that concepts do not overlap. If you need the same concept in two different chapters, use relationships or refer back to the existing concept instead of duplicating it.
* **Localization Strategy**: Every concept must support at least Indonesian (`lang: "id"`) and optionally English (`lang: "en"`) display names (`displayName`) and search aliases (`aliases`).

*Example*:
```json
{
  "$id": "c-newton-1",
  "canonicalSlug": "hukum-1-newton",
  "localizations": [
    {
      "lang": "id",
      "displayName": "Hukum Pertama Newton",
      "aliases": ["hukum inersia", "inersia", "kelembaman"]
    },
    {
      "lang": "en",
      "displayName": "Newton's First Law",
      "aliases": ["inertia", "law of inertia"]
    }
  ]
}
```

---

## 6. Knowledge Object (KO) Authoring Guidelines

Knowledge Objects are the concrete educational elements that explain a concept. Every KO has a specific `type` which tells Zyx how to display it and how to use it in chat tutoring.

| KO Type | Purpose | When to Use |
| :--- | :--- | :--- |
| `concept_overview` | Introduces the concept in plain terms. | The starting point for any concept. |
| `definition` | Formal academic definition of a term. | For defining precise terminology or vocabulary. |
| `formula` | Mathematical equations, physical laws, or chemical reactions. | For equations, state variables, and constants. |
| `example` | A fully worked-out application of the concept. | To show how to apply a formula or definition. |
| `misconception` | Common mistakes made by students. | To call out pitfalls, errors, or common confusions. |
| `exercise` | A quick problem for the student to practice. | Inline questions within reading materials. |
| `summary` | A concise bulleted recap of the concept. | At the end of a topic or chapter. |
| `objective` | Formal learning objective. | To declare what the student will be able to do. |

### Recommended KO Coverage

To ensure a deep and robust learning experience for the student, each concept in the course should contain a balanced mix of KOs. Use the following baseline:

* **1 concept_overview** (required; introduces the core idea in plain language)
* **1 definition** (required; details the formal terminology or academic statement)
* **0-3 formulas** (optional; declares key equations if the concept is mathematical/scientific)
* **1-2 examples** (highly recommended; shows the concept or formulas applied to concrete problems)
* **0-2 misconceptions** (optional; addresses common student pitfalls and errors)
* **1 summary** (recommended; recaps the main takeaways of the concept)

A concept with only one KO is considered underdeveloped and does not provide enough learning depth for active recall or semantic tutoring.

---

## 7. Writing for Zyra Retrieval

Because Zyra uses a retrieval-augmented generation (RAG) system, individual Knowledge Objects are embedded separately in the vector database and retrieved on-demand. When a student asks a question, Zyra matches the query against single KOs. Therefore, how you write the content of a KO directly impacts the accuracy of the tutoring tutor.

### Guidelines for Good KO Content
* **Self-Contained**: Write the content so that it makes sense in isolation. Do not assume the reader knows what was discussed in other KOs.
* **Include Core Terminology**: Explicitly state the names of laws, definitions, or processes.
* **Include Synonyms**: Mention common alternative terms or synonyms that students might query (e.g. if writing about "Hukum Pertama Newton", mention "Inersia" and "Kelembaman").
* **Define Symbols**: If a KO contains a formula, explicitly define every variable inside that KO (e.g. write "di mana $F$ adalah gaya, $m$ adalah massa, dan $a$ adalah percepatan").
* **State Explicit Definitions**: Begin definitions with clear, direct declarations (e.g. "Hukum Kelembaman menyatakan bahwa...").

### Pitfalls of Bad KO Content
* **Relies on Surrounding Context**: Do not start a KO with phrases like "Ini kelanjutan dari hukum sebelumnya..." or "Dari sini kita tahu bahwa...".
* **Uses Ambiguous Pronouns**: Avoid using pronouns (e.g. "itu", "ini", "dia") to refer to key concepts defined in other KOs. Name the concept explicitly.
* **Omits Local Definitions**: Do not write formulas without defining their variables.
* **Relative References**: Do not use relative directional references such as "seperti terlihat pada rumus di atas" or "diagram di bawah ini". KOs are retrieved as flat list blocks, so there is no "above" or "below".

---

## 8. Markdown Authoring Rules

Zyx compiles markdown content into interactive documents. To enable this, you must write markdown using precise container tags and LaTeX syntax.

### Custom Container Blocks
You must wrap content matching specific Knowledge Objects in custom triple-colon (`:::`) containers. Use the `ref` attribute to point to the `$id` of the corresponding Knowledge Object in the same chapter.

```markdown
:::concept {ref="ko-def-perpindahan"}
Perpindahan adalah perubahan posisi suatu benda, dihitung dari titik awal ke titik akhir. Perpindahan merupakan besaran vektor.
:::
```

Supported container block tags include:
* `:::concept {ref="..."}`
* `:::formula {ref="..."}`
* `:::definition {ref="..."}`
* `:::example {ref="..."}`
* `:::misconception {ref="..."}`
* `:::exercise {ref="..."}`
* `:::learning_objective {bloomLevel=...}`
* `:::engineering_insight {discipline=...}`
* `:::glossary_term {term="..."}`
* `:::summary`

> [!WARNING]
> ### Formula Placement Rule
> Do not place primary mathematical or scientific equations directly inside `:::concept` blocks. 
> 
> Concept containers (`:::concept`) are reserved for explaining ideas and qualitative definitions. Any formal algebraic or physical equations must be placed inside their own `:::formula {ref="..."}` block. Mixing formulas into general concept containers can cause AST compiler parse failures and degrades the precision of tutor retrieval.

### Math and LaTeX Formatting
* **Inline Math**: Wrap mathematical symbols and variables in single dollar signs.
  * *Correct*: Kecepatan didefinisikan sebagai $v = \frac{ds}{dt}$ di mana $s$ adalah jarak.
  * *Incorrect*: Kecepatan didefinisikan sebagai v = ds/dt di mana s adalah jarak.
* **Display Block Math**: Wrap standalone equations on their own lines in double dollar signs.
  * *Correct*:
    ```markdown
    $$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$
    ```

### Common Compiler Pitfalls to Avoid
1. **Unclosed Container Block**: Forgetting the closing `:::` tag. This breaks the document parsing entirely.
2. **Incorrect Math Brackets**: Using `\( ... \)` or `\[ ... \]` for LaTeX. Zyx only supports `$` and `$$`.
3. **Invalid KO Reference**: Referencing a KO `$id` in a `ref` attribute that belongs to a different chapter. Container references must be local to the chapter.
4. **Markdown in JSON Escape Errors**: When writing markdown inside the JSON bundle (e.g. `canonicalMarkdown` or KO `content`), remember to escape newlines as `\n` and double quotes as `\"`.

---

## 9. Flashcard Authoring Guidelines

Flashcards are utilized for active recall testing. They must follow strict quality rules to remain effective.

* **Principle of Atomic Recall**: A flashcard must ask exactly one question and expect exactly one answer. Do not write "double-barreled" flashcards.
  * *Bad Front*: Apa perbedaan perpindahan dan jarak, dan apa satuan SI keduanya? (Too many questions)
  * *Good Front*: Apakah perpindahan merupakan besaran skalar atau vektor? (Single atomic question)
* **Explanation Quality**: The `explanation` field must explain *why* the answer is correct and address why a student might make a mistake.
* **KO Mapping**: Always supply a `ko$ref` pointing to the Knowledge Object that explains this flashcard.

*Example*:
```json
{
  "front": "Apakah jarak merupakan besaran skalar atau vektor?",
  "back": "Jarak adalah besaran skalar.",
  "ko$ref": "ko-jarak-perpindahan",
  "explanation": "Jarak hanya memiliki nilai besar (magnitudo) tanpa arah. Berbeda dengan perpindahan yang merupakan besaran vektor karena memperhitungkan arah perubahan posisi."
}
```

---

## 10. Assessment Authoring Guidelines

Assessments are used for evaluation (UTS/UAS, Quizzes). They consist of multiple-choice questions (MCQs).

* **Unambiguous Distractors**: Make distractors realistic but completely incorrect. Avoid trick questions, double negatives, and lazy options like "semua jawaban di atas benar" (all of the above) or "tidak ada jawaban yang benar" (none of the above).
* **Misconception-Driven Distractors**: Every incorrect option (distractor) should map to a common student misconception.
* **Detailed Step-by-Step Explanation**: Write the `answerMarkdown` explaining the complete logical flow to solve the question.
* **Difficulty Scaling**: Rate questions on a scale of 1 (basic recall) to 10 (advanced derivation and synthesis).

*Example*:
```json
{
  "questionType": "multiple_choice",
  "difficulty": 4,
  "options": [
    "A. Perpindahan = 0 m, Jarak = 20 m",
    "B. Perpindahan = 20 m, Jarak = 20 m",
    "C. Perpindahan = 0 m, Jarak = 0 m",
    "D. Perpindahan = 10 m, Jarak = 20 m"
  ],
  "questionMarkdown": "Sebuah mobil bergerak ke timur sejauh 10 meter, kemudian berputar arah dan kembali ke barat sejauh 10 meter. Tentukan besar perpindahan dan jarak total yang ditempuh mobil tersebut.",
  "answerMarkdown": "1. **Analisis Jarak**: Jarak adalah panjang lintasan total tanpa melihat arah. \n   $$\\text{Jarak} = 10\\text{ m} + 10\\text{ m} = 20\\text{ m}$$\n2. **Analisis Perpindahan**: Perpindahan adalah perubahan posisi dari titik awal ke akhir. Karena mobil kembali ke titik semula, posisi akhirnya sama dengan posisi awalnya.\n   $$\\text{Perpindahan} = 10\\text{ m} - 10\\text{ m} = 0\\text{ m}$$\n\nOleh karena itu, jawaban yang benar adalah **A**.",
  "source": { "reference": "UTS Fisika Dasar 1A" }
}
```

---

## 11. Knowledge Relationship Guidelines

Relationships link Knowledge Objects together, building the dependency graph that Zyx uses to generate learning paths.

| Relationship Type | Purpose | Example |
| :--- | :--- | :--- |
| `prerequisite` | KO A must be mastered before studying KO B. | "Definisi Limit" is a prerequisite for "Definisi Turunan". |
| `related` | KO A has conceptual overlap with KO B. | "Gaya Normal" is related to "Gaya Gesek". |
| `extends` | KO B builds directly upon the concept of KO A. | "Gerak Melingkar Berubah Beraturan" extends "Gerak Melingkar Beraturan". |
| `example_of` | Links an example KO to its parent concept/definition KO. | "Contoh Soal GLB" is an example of "Definisi GLB". |
| `misconception_of` | Links a misconception KO to the concept/definition it confuses. | "Miskonsepsi Gaya Sentripetal" is a misconception of "Hukum Kedua Newton". |

Relationships are declared at the course level using `$id` references (`sourceKo$ref` and `targetKo$ref`).

---

## 12. Minimum Viable Chapter (Pilot Ready)

To maintain a consistent quality baseline for student pilot tests, a chapter is considered ready for publication only when it meets the following minimum thresholds:

* **5+ Concepts**: Covers all essential conceptual milestones in the syllabus.
* **15+ Knowledge Objects**: Provides thorough semantic mapping (overview, definitions, formulas, examples, misconceptions).
* **20+ Flashcards**: Generates enough card variations for active spaced-repetition testing.
* **10+ Assessment Questions**: Provides enough variation for quiz/exam delivery.
* **1+ Website Material**: Offers a complete, compiled reading document mapping the KOs.
* **Prerequisite Relationships**: Contains explicitly declared dependency mappings between KOs to enable custom learning paths.

Chapters failing to meet these thresholds will not be unlocked for student pilot releases.

---

## 13. Recommended Production Workflow

When developing course materials for Zyx, follow this step-by-step Standard Operating Procedure (SOP):

```
Write Markdown → Define Concepts & KOs → Embed References → Flashcards & Questions → Relationships → Validate → Import → Release Check
```

1. **Write Canonical Markdown**: Draft the comprehensive chapter reading text.
2. **Define Concepts**: Identify the core concept pillars and set up localizations.
3. **Define Knowledge Objects**: Break the text down into atomic definitions, formulas, and examples. Assign unique `$id`s.
4. **Add KO References to Markdown**: Wrap the corresponding text segments in the reading materials with `:::concept {ref="ko-id"}` etc.
5. **Create Flashcards**: Author front/back recall cards pointing to the KOs.
6. **Create Assessments**: Write multiple-choice test questions with detailed steps.
7. **Create Relationships**: Define prerequisites and misconception links between KOs.
8. **Run Bundle Validation**: Use the offline bundle validator to verify syntax and reference links.
9. **Import Bundle**: Run the import command to write the course into the database.
10. **Run Production Readiness Checklist**: Execute the readiness tests on the published course.

---

## 14. Content Quality Standards

To maintain the high standards of Zyx Academy, all course bundles must adhere to these rules:

1. **No Em/En Dashes**: Never use em dashes (—) or en dashes (–) in any bundle field (including descriptions, titles, questions, or markdown). Use commas, semicolons, or regular hyphens (-) instead.
2. **Casing & Branding**: Write the brand name as **Zyx** (capitalized Z, lowercase yx), never "ZYX".
3. **No Placeholders**: Do not use placeholders (e.g. "TBD", "Lorem Ipsum", "Contoh konten nanti diisi"). All fields must contain fully authored content.
4. **Tone and Language**: Use standard academic Indonesian (Ejaan Yang Disempurnakan) with a clear, direct, and encouraging tone. Avoid exclamation marks in explanations.
5. **No Duplicate Material**: Do not copy-paste definitions or examples across multiple KOs. Each KO must be distinct.

---

## 15. Bundle Validation Checklist

Before submitting a bundle for import, run through this checklist:

* [ ] **Metadata Valid**: `schemaVersion` is set to `"1.1.1"`.
* [ ] **1 Chapter = 1 MTD**: Every chapter contains its corresponding concepts, KOs, flashcard sets, and website materials.
* [ ] **No Missing Refs**: Every `knowledgeObject` has a valid `concept$ref` pointing to a concept in the same chapter.
* [ ] **Flashcards Connected**: Every flashcard has a `ko$ref` pointing to an existing KO in the same chapter.
* [ ] **Container Blocks Verified**: Every custom markdown block (e.g. `:::concept {ref="..."}`) matches a KO `$id` defined in the chapter.
* [ ] **No Long Dashes**: Zero occurrences of `—` or `–` characters in the JSON file.
* [ ] **Valid LaTeX Syntax**: All math expressions use `$` or `$$` only.
* [ ] **Assessment Chapters Linked**: Every `assessmentSource` lists its relevant chapter `$id`s in the `chapters` array.

---

## 16. Complete Miniature Example

Below is a complete, valid Course Bundle V1.1.1 containing 1 chapter, 2 concepts, 4 KOs, 2 flashcards, 2 assessment questions, and 1 relationship.

```json
{
  "metadata": {
    "schemaVersion": "1.1.1",
    "generatedAt": "2026-06-18T14:10:00Z",
    "generatedBy": "manual-authoring/fisika-1a",
    "language": "id",
    "courseCode": "FI1101"
  },
  "author": {
    "email": "author@zyx.academy",
    "name": "Dosen Fisika Zyx"
  },
  "course": {
    "title": "Fisika Dasar 1A (Mini)",
    "category": "Sains",
    "description": "Pengantar Kinematika Satu Dimensi.",
    "chapters": [
      {
        "$id": "ch-kinematika-1d",
        "title": "Kinematika Satu Dimensi",
        "description": "Mempelajari gerak benda dalam garis lurus tanpa melihat penyebabnya.",
        "concepts": [
          {
            "$id": "c-posisi",
            "canonicalSlug": "definisi-posisi",
            "localizations": [
              {
                "lang": "id",
                "displayName": "Posisi Benda",
                "aliases": ["kedudukan", "koordinat"]
              }
            ]
          },
          {
            "$id": "c-perpindahan",
            "canonicalSlug": "perpindahan-dan-jarak",
            "localizations": [
              {
                "lang": "id",
                "displayName": "Perpindahan dan Jarak",
                "aliases": ["selisih posisi", "panjang lintasan"]
              }
            ]
          }
        ],
        "knowledgeObjects": [
          {
            "$id": "ko-def-posisi",
            "title": "Definisi Posisi",
            "concept$ref": "c-posisi",
            "content": "Posisi adalah kedudukan suatu benda pada titik waktu tertentu terhadap suatu titik acuan.",
            "type": "definition",
            "bloomLevel": "remember",
            "difficulty": "easy",
            "importance": "high"
          },
          {
            "$id": "ko-def-perpindahan",
            "title": "Definisi Perpindahan",
            "concept$ref": "c-perpindahan",
            "content": "Perpindahan adalah perubahan posisi suatu benda, dihitung dari koordinat akhir dikurangi koordinat awal. Perpindahan didefinisikan sebagai $\\Delta x = x_f - x_i$.",
            "type": "definition",
            "bloomLevel": "understand",
            "difficulty": "easy",
            "importance": "high"
          },
          {
            "$id": "ko-def-jarak",
            "title": "Definisi Jarak",
            "concept$ref": "c-perpindahan",
            "content": "Jarak adalah panjang seluruh lintasan yang ditempuh oleh benda selama bergerak. Jarak selalu bernilai positif.",
            "type": "definition",
            "bloomLevel": "remember",
            "difficulty": "easy",
            "importance": "medium"
          },
          {
            "$id": "ko-miskonsepsi-jarak",
            "title": "Miskonsepsi Jarak vs Perpindahan",
            "concept$ref": "c-perpindahan",
            "content": "Siswa sering menganggap bahwa perpindahan dan jarak selalu bernilai sama. Padahal perpindahan mengukur selisih kedudukan terpendek beserta arahnya, sedangkan jarak mengukur total lintasan.",
            "type": "misconception",
            "bloomLevel": "understand",
            "difficulty": "medium",
            "importance": "high"
          }
        ],
        "websiteMaterials": [
          {
            "title": "Materi Belajar Kinematika",
            "slug": "materi-kinematika",
            "canonicalMarkdown": "# Memahami Posisi dan Gerak\n\nSelamat datang di perkuliahan fisika. Untuk memulai, kita harus memahami cara mendeskripsikan lokasi benda.\n\n:::concept {ref=\"ko-def-posisi\"}\nPosisi adalah kedudukan benda terhadap titik acuan.\n:::\n\nSetelah posisi dipahami, kita dapat mengukur perubahannya saat benda bergerak.\n\n:::concept {ref=\"ko-def-perpindahan\"}\nPerpindahan adalah selisih posisi akhir dan awal: $\\Delta x = x_f - x_i$.\n:::\n\n:::concept {ref=\"ko-def-jarak\"}\nJarak adalah total panjang lintasan.\n:::\n\n:::misconception {ref=\"ko-miskonsepsi-jarak\"}\nHati-hati dalam membedakan jarak dan perpindahan. Untuk gerak bolak-balik, keduanya berbeda.\n:::\n"
          }
        ],
        "flashcardSets": [
          {
            "title": "Kartu Belajar Perpindahan",
            "flashcards": [
              {
                "front": "Apa rumus dari perpindahan?",
                "back": "Rumusnya adalah $\\Delta x = x_f - x_i$.",
                "ko$ref": "ko-def-perpindahan",
                "explanation": "Perpindahan dihitung dengan mengurangkan posisi awal ($x_i$) dari posisi akhir ($x_f$)."
              },
              {
                "front": "Apakah perpindahan bisa bernilai negatif?",
                "back": "Ya, bisa.",
                "ko$ref": "ko-def-perpindahan",
                "explanation": "Perpindahan adalah besaran vektor, sehingga nilainya bisa negatif jika posisi akhir berada di sebelah kiri atau berlawanan arah dengan acuan positif dari posisi awal."
              }
            ]
          }
        ]
      }
    ],
    "knowledgeRelationships": [
      {
        "sourceKo$ref": "ko-def-posisi",
        "targetKo$ref": "ko-def-perpindahan",
        "type": "prerequisite"
      }
    ],
    "assessmentSources": [
      {
        "title": "Kuis Pendahuluan Kinematika",
        "category": "quiz",
        "year": 2026,
        "semester": 1,
        "chapters": ["ch-kinematika-1d"],
        "sourceMarkdown": "---\ncategory: quiz\nyear: 2026\nsemester: 1\n---\n\n## Soal 1\nSebuah titik berada pada posisi awal $x = 2$ m dan bergerak ke posisi akhir $x = 8$ m. Hitunglah perpindahannya.\n\n## Soal 2\nSebutkan jenis besaran untuk jarak.",
        "assessmentObjects": [
          {
            "questionType": "multiple_choice",
            "difficulty": 2,
            "options": ["A. 6 m", "B. -6 m", "C. 10 m", "D. 8 m"],
            "questionMarkdown": "Sebuah titik berada pada posisi awal $x = 2$ m dan bergerak ke posisi akhir $x = 8$ m. Hitunglah perpindahannya.",
            "answerMarkdown": "Perpindahan dihitung as berikut:\n$$\\Delta x = x_f - x_i = 8\\text{ m} - 2\\text{ m} = 6\\text{ m}$$\nJawaban yang benar adalah **A**."
          },
          {
            "questionType": "multiple_choice",
            "difficulty": 1,
            "options": ["A. Skalar", "B. Vektor", "C. Tensor", "D. Fundamental"],
            "questionMarkdown": "Sebutkan jenis besaran untuk jarak.",
            "answerMarkdown": "Jarak hanya memiliki nilai magnitudo tanpa informasi arah, sehingga merupakan besaran skalar.\nJawaban yang benar adalah **A**."
          }
        ]
      }
    ]
  }
}
```
