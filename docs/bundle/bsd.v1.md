# ZYX Bundle Specification Document (BSD) — FROZEN v1.0

> [!WARNING]
> **DEPRECATED AND FROZEN**
> This version of the Bundle Specification Document (v1.0) is deprecated due to mismatches with implementation realities.
> Please use the updated canonical authoring contract: [BSD v2.0](file:///workspaces/zyx-edu/docs/bundle/bsd.v2.md).

---

Version: 1.0
Target Bundle Version: V1.1.1

---

# Purpose

This document defines the authoring contract used by external AI workspaces (Google AI Studio, ChatGPT, Claude, etc.) to generate course content for ZYX Academy.

The BSD is NOT a database schema.

The BSD defines:

* what content authors must produce
* what AI generation phases must output
* what structures are valid for Bundle generation

The importer is responsible for:

* UUID generation
* foreign key resolution
* metadata creation
* hash generation
* vector synchronization
* AST compilation

Authors and AI generators should never produce system-managed fields.

---

# Global Rules

## Authoring Principles

1. Content First
2. Deterministic Output
3. No Hidden Metadata
4. Human Readable
5. Git Friendly

---

## Forbidden Fields

Never generate:

* createdAt
* updatedAt
* status
* vectorId
* pineconeVectorId
* sourceHash
* derivedHash
* metadata.generatedAt
* mastery data
* analytics data
* recommendation data
* progress data

These fields belong to ZYX.

---

# Entity 1: Course

Purpose:

Represents a complete academic course.

Schema:

```json
{
  "$id": "course-physics-1a",

  "title": "Fisika Dasar 1A",

  "category": "Sains",

  "description": "..."
}
```

Rules:

* One bundle contains one course.
* Title must match official course title.
* Category should be broad and human-readable.

---

# Entity 2: Chapter

Purpose:

Represents a learning unit.

Architecture Rule:

1 Chapter = 1 MTD

Schema:

```json
{
  "$id": "ch-kinematics",

  "title": "Kinematika Satu Dimensi",

  "order": 1,

  "learningObjectives": [
    "..."
  ]
}
```

Rules:

* Chapters must be ordered.
* Chapters should represent a coherent learning unit.
* Recommended size:

  * 5 to 15 concepts
  * 15 to 50 KOs

---

# Entity 3: Concept

Purpose:

Represents a canonical knowledge concept.

Schema:

```json
{
  "$id": "c-displacement",

  "canonicalSlug": "displacement",

  "localizations": [
    {
      "lang": "id",
      "displayName": "Perpindahan"
    }
  ]
}
```

Rules:

* canonicalSlug must be unique.
* Use lowercase kebab-case.
* Concepts should be reusable.
* Avoid duplicates.

---

# Entity 4: Knowledge Object (KO)

Purpose:

Atomic knowledge unit.

Knowledge Objects are the primary retrieval unit for Zyra.

Every KO must be understandable in isolation.

Schema:

```json
{
  "$id": "ko-displacement-definition",

  "chapter$ref": "ch-kinematics",

  "concept$ref": "c-displacement",

  "title": "Definisi Perpindahan",

  "type": "definition",

  "difficulty": "easy",

  "bloomLevel": "remember",

  "importance": "high",

  "content": "Perpindahan adalah..."
}
```

---

## KO Types

Allowed:

* concept_overview
* definition
* formula
* example
* misconception
* exercise
* summary
* objective

---

## Recommended Coverage

Per concept:

Minimum:

* 1 concept_overview
* 1 definition
* 1 example

Recommended:

* 1 concept_overview
* 1 definition
* 1 example
* 1 summary
* 0 to 3 formulas
* 0 to 2 misconceptions
* 0 to 2 exercises

---

## Writing Rules

Good KO:

* self-contained
* defines terminology
* defines symbols
* includes context

Bad KO:

* "as shown above"
* "from the previous section"
* references unavailable context

---

# Entity 5: Knowledge Relationship

Purpose:

Represents graph relationships between concepts.

Schema:

```json
{
  "$id": "rel-limit-derivative",

  "sourceConcept$ref": "c-limit",

  "targetConcept$ref": "c-derivative",

  "type": "prerequisite"
}
```

Allowed Types:

* prerequisite
* related
* extension

Rules:

* prerequisite graph must be acyclic
* relationships should be meaningful

---

# Entity 6: Website Material

Purpose:

Human-readable chapter material.

Schema:

```json
{
  "$id": "wm-kinematics",

  "chapter$ref": "ch-kinematics",

  "title": "Kinematika Satu Dimensi",

  "canonicalMarkdown": "..."
}
```

---

## Markdown Blocks

Allowed:

```markdown
:::learning_objective

:::concept

:::formula

:::example

:::misconception

:::exercise

:::summary
```

---

## Reference Rule

Use:

```markdown
:::concept {ref="ko-displacement-definition"}
```

Never use:

```markdown
koId="..."
```

The importer resolves references.

---

## Formula Rule

Primary equations must appear inside:

```markdown
:::formula
```

Do not place equations inside concept blocks.

---

# Entity 7: Flashcard Set

Purpose:

Groups flashcards belonging to a chapter.

Schema:

```json
{
  "$id": "fs-kinematics",

  "chapter$ref": "ch-kinematics",

  "title": "Kinematika Satu Dimensi"
}
```

---

# Entity 8: Flashcard

Purpose:

Supports SM-2 review.

Schema:

```json
{
  "$id": "fc-displacement",

  "flashcardSet$ref": "fs-kinematics",

  "knowledgeObject$ref": "ko-displacement-definition",

  "front": "Apa yang dimaksud perpindahan?",

  "back": "Perpindahan adalah...",

  "explanation": "..."
}
```

Rules:

* Every flashcard must reference exactly one KO.
* Focus on atomic recall.

---

# Entity 9: Assessment Source

Purpose:

Represents UTS, UAS, Quiz, Tutorial, or Tryout sources.

Schema:

```json
{
  "$id": "uts-2025",

  "title": "UTS 2025",

  "category": "midterm",

  "year": 2025,

  "chapters": [
    "ch-kinematics"
  ]
}
```

Allowed Categories:

* quiz
* tutorial
* midterm
* final
* tryout

---

# Entity 10: Assessment Object

Purpose:

Represents an individual assessment item.

Schema:

```json
{
  "$id": "q-displacement-1",

  "assessmentSource$ref": "uts-2025",

  "concept$ref": "c-displacement",

  "type": "multiple_choice",

  "question": "...",

  "options": [
    "...",
    "...",
    "...",
    "..."
  ],

  "correctAnswer": 0,

  "explanation": "...",

  "difficulty": "medium",

  "pattern": "general",

  "reasoningType": "analytical",

  "estimatedSteps": 1,

  "applicationLevel": 1
}
```

Required Fields:

* pattern
* reasoningType
* estimatedSteps
* applicationLevel

These fields are mandatory because ZYX database requires them.

---

# Bundle Assembly

Final Bundle Structure

```json
{
  "metadata": {
    "schemaVersion": "1.1.1"
  },

  "course": {},

  "chapters": [],

  "concepts": [],

  "knowledgeObjects": [],

  "websiteMaterials": [],

  "flashcardSets": [],

  "flashcards": [],

  "assessmentSources": [],

  "assessmentObjects": [],

  "knowledgeRelationships": []
}
```

---

# Bundle Validation Rules

Before import:

* No duplicate $id values
* All references resolve
* No orphan concepts
* No orphan KOs
* No orphan flashcards
* No orphan questions
* No cyclic prerequisite relationships
* Every chapter has website material
* Every chapter has at least one concept
* Every concept has at least one KO
* Every flashcard references a KO
* Every assessment references a concept
* All markdown references are valid

Bundle is valid only if all rules pass.

---

# Zyra Optimization Rules

Remember:

Knowledge Objects are embedded individually.

Write content for retrieval.

Prefer:

* explicit definitions
* complete explanations
* symbol definitions
* domain terminology
* synonyms

Avoid:

* vague references
* missing context
* section-dependent explanations
* pronouns without antecedents

Every KO should remain understandable when retrieved alone.
