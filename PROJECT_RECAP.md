# ZYX Academy Project Architecture & Recap

Welcome to the **ZYX Academy** codebase. This document serves as a complete recap of the project layout, technical system architecture, visual design language, core features, and user workflows. Use this document as a quick-start guide and code preview prior to making any development modifications.

---

## 1. Project Directory Layout

```
zyx-edu/                        # Physical root directory of the ZYX Academy project
├── app/                        # Next.js App Router (Routing and Pages)
│   ├── sign-in/                # Sign-in page (credentials + Google OAuth)
│   ├── sign-up/                # Sign-up registration page
│   ├── sign-out/               # Sign-out confirmation page
│   ├── about/                  # Marketing: About us page
│   ├── testimonial/            # Marketing: Testimonials grid (Schema.org Review markup)
│   ├── plans/                  # Marketing: Subscription pricing page (dynamic calculator)
│   ├── admin/                  # Administrative tools
│   │   ├── page.tsx            # Admin overview dashboard with section cards
│   │   ├── ai/                 # AI Curation & Management Portal
│   │   │   ├── jobs/           # Generation jobs monitor & logs
│   │   │   ├── materials/      # AI Knowledge Material Instance manager
│   │   │   ├── questions/      # Question Bank curation grid
│   │   │   └── quizzes/        # Quiz template manager (create/edit selection rules)
│   │   ├── files/              # UploadThing file manager with folder tree (Google Drive style)
│   │   └── tokens/             # Enrollment token generator & manager
│   ├── actions/                # Server Actions (tutor scheduling, tutor extras)
│   │   ├── tutor.ts            # Tutor slot & booking CRUD
│   │   └── tutor-extra.ts      # Extended tutor data queries
│   ├── api/                    # Backend route handlers
│   │   ├── admin/              # Admin-only endpoints
│   │   │   ├── analytics/      # Question bank, job, and attempt metrics
│   │   │   ├── generation-jobs/# Queue control for AI generation
│   │   │   ├── material-instances/ # Ingest AI Material Instances
│   │   │   └── questions/      # Question bank CRUD and soft retirement
│   │   ├── auth/               # Better Auth API handler (credentials + OAuth)
│   │   ├── inngest/            # Inngest webhook endpoint (background job router)
│   │   ├── quiz/               # Student quiz APIs
│   │   │   ├── attempts/       # Quiz attempt start, submit, and grading
│   │   │   ├── daily/          # Progress-linked Daily Quiz fetch & submit
│   │   │   ├── templates/      # Create / list quiz templates
│   │   │   └── weekly-generate/# Cost-aware Weekly Quiz dynamic generator
│   │   └── uploadthing/        # UploadThing file upload route handler
│   ├── calendar/               # Calendar page (placeholder — events & schedules)
│   ├── courses/                # Course catalog listing page
│   │   └── [id]/               # Specific course portal
│   │       ├── page.tsx        # Course overview with material & exam lists
│   │       ├── leaderboard/    # Per-course student score leaderboard
│   │       ├── material/       # Material viewer (PDFs, articles, images, videos, links, markdown)
│   │       ├── my-results/     # Submission review & tutor explanations
│   │       ├── quiz/           # Quiz assessment interface
│   │       └── tryout/         # Tryout assessment interface
│   ├── dashboard/              # Student main hub & enrollment activation
│   │   ├── page.tsx            # Active classes, in-progress docs, weak concepts, available exams
│   │   ├── actions.ts          # Server actions for enrollments, progress, submissions
│   │   ├── search-actions.ts   # Dynamic search documents for student context
│   │   └── schedule/           # Availability slot allocator & session scheduler
│   ├── feedback/               # Student feedback submission page
│   ├── leaderboard/            # Global per-course student leaderboard
│   ├── profile/                # User stats, activities, and profile details
│   ├── settings/               # Settings page (placeholder — theme & typography controls)
│   ├── globals.css             # Theme definitions, Tailwind directives & CSS variables
│   ├── layout.tsx              # Root HTML wrapper with fonts initialization
│   └── page.tsx                # Marketing landing page (hero, features, pricing preview)
├── components/                 # Shared UI & Layout Components
│   ├── admin/                  # Admin-specific UI
│   │   ├── drive-explorer.tsx  # Google Drive-style file browser with folder tree
│   │   └── tokens-dashboard.tsx# Token generation & management table
│   ├── auth/                   # Authentication forms and security widgets
│   ├── course/                 # Course-level widgets and exam interfaces
│   │   ├── course-layout-chrome.tsx  # Course page shell with sub-navigation
│   │   ├── course-page-shell.tsx     # Reusable course page wrapper
│   │   ├── course-sub-nav.tsx        # Course tabs (Overview, Material, Quiz, etc.)
│   │   ├── daily-quiz-popup.tsx      # Daily quiz modal popup
│   │   ├── daily-quiz-section.tsx    # Daily quiz dashboard section
│   │   ├── dashboard-weak-concepts.tsx # Weak concept analysis widget
│   │   ├── markdown-renderer.tsx     # Custom Markdown-to-React renderer (:::blocks support)
│   │   ├── material-viewer.tsx       # Universal material viewer (PDF, article, image, video, link)
│   │   ├── math-text.tsx             # LaTeX math rendering (KaTeX)
│   │   ├── quiz-player.tsx           # Quiz session player (MC, short answer, essay)
│   │   ├── simulator-widget.tsx      # Interactive simulation embeds
│   │   ├── tryout-form.tsx           # Tryout exam form (timed, multi-question-type)
│   │   └── tutor-drawer.tsx          # AI tutor side-drawer (Gemini-powered chat)
│   ├── landing/                # Marketing page sections
│   │   ├── landing-hero.tsx          # Hero section
│   │   ├── landing-advantages.tsx    # Platform advantages showcase
│   │   ├── landing-closing-cta.tsx   # Final CTA section
│   │   ├── landing-course-preview.tsx# Course preview cards
│   │   ├── landing-feature-band.tsx  # Feature band section
│   │   ├── landing-how-it-works.tsx  # How it works walkthrough
│   │   ├── landing-integrations.tsx  # Integration logos/badges
│   │   ├── landing-interactive-lab.tsx# Interactive math lab (Desmos graph + 3D)
│   │   ├── landing-pricing-preview.tsx# Pricing plan preview
│   │   ├── landing-subject-showcase.tsx# Subject area showcase
│   │   ├── landing-testimonials.tsx  # Testimonial carousel
│   │   ├── landing-value-props.tsx   # Value proposition section
│   │   ├── desmos-graphing-embed.tsx # Desmos calculator embed
│   │   ├── desmos-style-graph.tsx    # Custom Desmos-style graph renderer
│   │   └── volume-of-revolution-canvas.tsx # 3D volume of revolution visualization
│   ├── layout/                 # Page layouts (e.g. SectionContainer)
│   ├── ui/                     # Shadcn primitives (button, sheet, table, dialog, input, reveal, etc.)
│   ├── admin-navbar.tsx        # Admin-specific top navigation bar
│   ├── admin-sidebar.tsx       # Admin dashboard side navigation panel
│   ├── animated-ornament-canvas.tsx # Three.js custom background canvas
│   ├── app-chrome.tsx          # Application shell wrapper (sidebar + main area)
│   ├── app-toaster.tsx         # Toast notification provider
│   ├── command-menu.tsx        # Global Cmd+K command palette (Fuse.js fuzzy search)
│   ├── desmos-calculator-script.tsx  # Desmos API script loader
│   ├── enrollment-form.tsx     # Enrollment token redemption form
│   ├── footer.tsx              # Global site footer with links & WhatsApp CTA
│   ├── logo.tsx                # ZYX Academy logo component
│   ├── marketing-hero-loops.tsx # Marketing hero text animation loops
│   ├── marketing-page-hero.tsx  # Reusable marketing page hero section
│   ├── nav-profile-or-sign-in.tsx # Navbar user profile dropdown or sign-in button
│   ├── nav-scroll-provider.tsx  # Navbar scroll-aware context provider
│   ├── navbar.tsx              # Global responsive header navigation
│   ├── page-header.tsx         # Reusable page header component
│   ├── shell-page.tsx          # Generic titled page shell
│   ├── site-main.tsx           # Main content area wrapper
│   ├── student-sidebar.tsx     # Student dashboard side navigation panel
│   └── testimonial-split-card.tsx # Testimonial split-card component
├── db/                         # Database Configuration & Schema
│   ├── index.ts                # Drizzle Client initializer (NeonDB)
│   ├── schema.ts               # Full database schema (42+ tables, enums, indices & relations)
│   └── seed.ts                 # Database seeding utilities for mock testing
├── lib/                        # Shared utility libraries
│   ├── auth.ts                 # Better Auth server instance
│   ├── auth-client.ts          # Better Auth client-side helper
│   ├── auth-redirect.ts        # Auth redirect logic & session guards
│   ├── auth-secret.ts          # Auth secret key management
│   ├── auth-site-url.ts        # Auth site URL resolution
│   ├── env.ts                  # Injected environment config (Gemini, Pinecone, WhatsApp keys)
│   ├── gemini.ts               # Google Gemini client (embeddings, generation with model fallback)
│   ├── pinecone.ts             # Pinecone search and namespace management
│   ├── inngest.ts              # Inngest client initialization
│   ├── inngest-functions.ts    # Background job functions (vector sync worker + cron)
│   ├── ingestion-parser.ts     # Chunk splitter with sliding overlaps
│   ├── generation-pipeline.ts  # Asynchronous RAG context generation loop
│   ├── ko-extractor.ts         # Gemini-powered Knowledge Object extraction from chapters
│   ├── knowledge-service.ts    # Knowledge Object CRUD service
│   ├── context-assembly.ts     # AI context assembly for prompt execution
│   ├── prompt-executor.ts      # Prompt execution engine (Gemini routing)
│   ├── question-actions.ts     # Question CRUD actions
│   ├── question-blueprint-engine.ts # Question blueprint/template engine
│   ├── question-generator.ts   # Gemini-powered question generation pipeline
│   ├── question-validator.ts   # Question quality validation gates
│   ├── material-generator.ts   # Website material Markdown generation from KOs (Gemini)
│   ├── material-storage.ts     # Website material CRUD and versioning
│   ├── markdown-compiler.ts    # Custom Markdown → structured AST compiler (:::blocks)
│   ├── ast-validator.ts        # AST structure validation for compiled materials
│   ├── diktat-actions.ts       # Diktat compilation workflow (draft → publish → PDF)
│   ├── diktat-generator.ts     # Diktat structure generation from chapters/KOs
│   ├── diktat-renderer.ts      # Diktat HTML renderer for Puppeteer PDF generation
│   ├── diktat-validator.ts     # Diktat quality validation checks
│   ├── flashcard-actions.ts    # Flashcard review queue & SM-2 grade submission
│   ├── flashcard-generator.ts  # AI-powered flashcard generation from KOs
│   ├── flashcard-scheduler.ts  # SM-2 spaced repetition scheduling algorithm
│   ├── analytics-service.ts    # Weak concept analysis, quiz attempt metrics
│   ├── usage-budget-service.ts # AI usage rate limiting (30 requests/day cap)
│   ├── plan-tiers.ts           # Subscription plan definitions (Free → Custom)
│   ├── pricing-constants.ts    # Dynamic pricing calculator (power-law scaling formulas)
│   ├── site-search.ts          # Site search helpers (group ordering)
│   ├── site-search-index.ts    # Full site search index (static pages + dynamic courses/exams)
│   ├── student-course-fixtures.ts # Mock course data (materials, exams, leaderboard, reviews)
│   ├── testimonials.ts         # Testimonial story data
│   ├── tutor-actions.ts        # Tutor availability & booking management
│   ├── drive.ts                # Admin drive tree operations (CRUD for driveItem)
│   ├── uploadthing.ts          # UploadThing client-side config
│   ├── uploadthing-admin.ts    # UploadThing admin helpers
│   ├── uploadthing-utapi.ts    # UploadThing UTAPI instance
│   ├── desmos-script.ts        # Desmos calculator API integration
│   ├── public-app-url.ts       # Public URL resolver
│   ├── resend.ts               # Resend email client
│   ├── site.ts                 # Site metadata (title helper, brand constants)
│   ├── whatsapp-admin.ts       # WhatsApp admin chat link generator
│   ├── youtube.ts              # YouTube embed URL parser
│   └── utils.ts                # General utility helpers (cn, formatters)
├── types/                      # Common TypeScript interfaces
│   └── desmos-calculator.d.ts  # Desmos API type definitions
├── drizzle/                    # Drizzle migration files
├── public/                     # Static assets (images, icons, vectors)
├── prompts/                    # AI prompt templates
├── AGENTS.md                   # Rulebook and constraints for AI Coding Agents
├── ui-visual-style.md          # Visual styling rules and layouts guidelines
└── PROJECT_RECAP.md            # [This File] Codebase preview, rules, features & workflows
```

---

## 2. Technical System Architecture & Stack

- **Framework**: Next.js (v15 App Router). Uses Server Actions for data-modifying mutations and Server Components for page rendering.
- **Database Layer**: Drizzle ORM paired with PostgreSQL (NeonDB).
- **Vector Indexing**: Pinecone Vector Database with namespace isolation per course (`course_{courseId}`).
- **AI Models**: Google Gemini API via `@google/genai` (utilizing `text-embedding-004` for vectors and `gemini-flash` with model fallback for structured generation).
- **Background Jobs**: Inngest for event-driven and cron-scheduled workers (vector sync, batch processing).
- **Authentication**: Better Auth (credentials + Google OAuth via Drizzle adapters).
- **Styling Engine**: Tailwind CSS v4 featuring `@theme inline` mapping to semantic CSS variables.
- **File Management**: UploadThing (hosting course PDFs, diktat PDFs, and materials under admin drive).
- **Core Interfaces**: Custom-styled Shadcn components utilizing Tailwind utilities.
- **Math Rendering**: KaTeX for inline/display LaTeX math across materials and quizzes.
- **Interactive Graphs**: Desmos API integration for graphing calculators and 3D visualizations.
- **Search**: Fuse.js client-side fuzzy search with weighted fields (Cmd+K command palette).
- **Email**: Resend client for transactional email.
- **Communication**: WhatsApp deep links for enrollment CTA and admin contact.

---

## 3. Style Taste & Design System Rules

These style guidelines must be followed without exception to preserve the premium, minimalist design aesthetics of ZYX Academy:

### 🚫 Pills (Rounded-Full) Constraint
- **No Pill Designs**: Elongated shapes using `rounded-full` (e.g. pill buttons, badges, tag chips, input elements) are **strictly forbidden**. The site owner hates pills.
- **Allowed Border Radii**:
  - Buttons/interactive inputs: `rounded-lg` or `rounded-md`.
  - Badges, tags, and toggles: `rounded-md` or `rounded`.
  - Content containers/panels: `rounded-xl`, `rounded-2xl`, or `rounded-3xl`.
  - **Exception**: Circular elements with a strict 1:1 aspect ratio (such as user avatars, 1:1 circular checkmarks, status indicator dots) are allowed to use `rounded-full`.

### 🚫 Minimizing Card & Box Nesting
- **No Card Slop**: Avoid excessive card containers, nested boxes, or redundant grid cards. 
- **Typography and Dividers First**: Differentiate content and layouts using clean typographic scaling, high-contrast text hierarchy, generous padding, and subtle lines (`border-border`) rather than placing everything inside a card.
- **Required Cards**: When card blocks are necessary, apply the standardized pattern:
  `bg-card border border-border shadow-sm` and appropriate corner rounding (`rounded-xl` or above).

### 🔠 Typography Constraints
- **Brand Headings**: **Lexend** (Google Fonts) mapped to `font-heading`. Utilized for titles `h1`–`h6` with a line-height multiplier of **1.1**.
- **Body & UI Text**: **Inter** (Google Fonts) mapped to `font-sans`. Utilized for paragraphs, input fields, code, tables, and description tags. Line-height multiplier of **1.4**.
- **Paragraph Spacing**: Plain `<p>` gets `text-body-base`. Sequential paragraphs should receive a top margin `p + p` to build a clean reading rhythm.

### 🎨 Color Hierarchy (Adapts to Light/Dark Modes)
- **Semantic Primaries**: Use semantic tokens to handle background swaps (`bg-background` / `text-foreground` and `bg-muted` / `text-muted-foreground`) to maintain dark mode styling automatically.
- **Brand Colors**:
  - Brand Primary Blue: Mapped to `--primary` (`bg-primary`, `text-primary`). Used for core CTA triggers, interactive accents, and brand branding.
  - Brand Secondary Orange: Mapped to `--secondary` (`bg-secondary`, `text-secondary`). Reserved for secondary highlights, badge flags, and warning alerts.
- **No Color Literals**: Never inline arbitrary hex values or Tailwind default color classes (`bg-slate-100`, `text-zinc-800`). Stick strictly to the semantic theme variables.

---

## 4. Database Schema Overview

The PostgreSQL database contains **42+ tables** organized into five major domains:

### A. Core Auth & User Domain
| Table | Purpose |
|-------|---------|
| `user` | User accounts (id, name, email, role: `admin`/`teacher`/`student`, lastActivityAt) |
| `session` | Active login sessions (Better Auth) |
| `account` | OAuth account links (Google, credentials) |
| `verification` | Email/token verification records |

### B. Enrollment & Group Domain
| Table | Purpose |
|-------|---------|
| `courses` | Course definitions (id, title, category, description) |
| `enrollments` | Student-course enrollment records with expiration dates |
| `groups` | Study groups for collaborative learning |
| `group_members` | Many-to-many user ↔ group membership |
| `enrollment_tokens` | One-time activation codes (`ZYX-{8chars}-{capacity}-{courses}`) |
| `enrollment_token_courses` | Many-to-many token ↔ course mappings |

### C. Assessment Domain (Legacy Exams)
| Table | Purpose |
|-------|---------|
| `exams` | Exam definitions (quiz/tryout, draft/published/ended, jsonb settings) |
| `questions` | Per-exam questions (MC, short answer, essay via jsonb content) |
| `submissions` | Student exam submissions (score, status, teacherNotes) |
| `progress` | Material completion tracking per user |

### D. AI Knowledge Ecosystem
| Table | Purpose |
|-------|---------|
| `chapters` | Ordered course chapters with publish status |
| `student_chapter_progress` | Per-student chapter unlock/completion tracking |
| `master_teaching_documents` | Source-of-truth Markdown documents (versioned, linked to Drive files) |
| `knowledge_objects` | Atomic knowledge units (definition, formula, example, misconception, etc.) with Bloom taxonomy, difficulty, and importance |
| `knowledge_relationships` | Prerequisite/related/extends/example_of/misconception_of links between KOs |
| `ai_material_instances` | Top-level knowledge asset metadata (legacy ingestion path) |
| `ai_material_instance_sections` | Subtopic groupings within material instances |
| `ai_material_instance_chunks` | Physical text segments synced with Pinecone |
| `ai_generation_jobs` | Background Gemini generation request tracking |
| `ai_question_bank` | Permanent reusable question repository with five-state lifecycle |
| `quiz_templates` | Publishable quiz configs with selection rules (daily/weekly/chapter/premium) |
| `student_quiz_attempts` | Quiz sessions with deep question snapshots and answer records |
| `vector_sync_queue` | Transactional outbox for Pinecone sync (pending → processing → completed/failed) |

### E. Generated Content Domain
| Table | Purpose |
|-------|---------|
| `website_materials` | AI-generated website learning materials per chapter (canonical Markdown + structured AST) |
| `website_material_versions` | Version history for website materials (author, changeSummary, isAiGenerated) |
| `flashcard_sets` | Per-chapter flashcard collections linked to MTD |
| `flashcards` | Individual flashcard items (front/back/explanation, linked to KOs) |
| `student_flashcard_progress` | SM-2 spaced repetition progress (box, ease factor, interval, review history) |
| `diktats` | Auto-compiled PDF study guides from chapters/KOs (draft → generating → ready/failed) |

### F. Analytics & Budgeting
| Table | Purpose |
|-------|---------|
| `ai_usage_events` | Per-user AI usage ledger (feature, model, tokens, requestType) for rate limiting |

### G. File Storage
| Table | Purpose |
|-------|---------|
| `drive_item` | Admin drive tree nodes (folder/file, parent hierarchy, UploadThing key, mimeType) |

### H. Tutor Scheduling
| Table | Purpose |
|-------|---------|
| `tutor_courses` | Tutor-course teaching assignments |
| `tutor_slots` | Weekly availability slots (dayOfWeek, startTime, endTime) |
| `bookings` | Student session bookings (first-come-first-served, unique per slot) |

---

## 5. Key Platform Features

1.  **Student-Tutor Scheduler**: Certified tutors (role `teacher`) define weekly availability slots. Students in matching study groups book one-on-one sessions on a first-come, first-served basis.
2.  **Registration & Activation Tokens**: Admin-generated tokens activate course access (`ZYX-{unique_8_chars}-{capacity}-{courses}`). Handles group capacity (1 to 5 members).
3.  **Admin File Drive**: Visual Google Drive-style explorer with folder tree navigation. Upload/rename/delete files and folders via UploadThing.
4.  **Learning Assessment Engine**: Supports short answer, multiple choice (single + multiple correct), and essay question types. Essay questions transition to `pending_review` for manual tutor evaluation. Quizzes have configurable time limits and max attempts.
5.  **Multi-Format Material Viewer**: Supports PDFs (inline reader), articles (Markdown), images, videos (YouTube embed + raw video), and external links. Materials are categorized as `materi`, `soal`, `solusi`, or `diktat`.
6.  **AI-Powered Assessment Ecosystem**:
    *   **Daily Quiz**: Progress-linked, 5-question automated set drawn directly from Postgres via random index sorting. Bypasses Gemini API for cost efficiency.
    *   **Weekly / Chapter Quiz**: Tutor-triggered dynamic generation. Retrieval-first RAG searches relevant chunks via Pinecone, queries Gemini to compile a question pool, and allows the tutor to select and approve questions.
    *   **Quiz Template System**: Configurable quiz templates with selection rules (difficulty proportions, tag filtering), visibility controls (free/paid), and attempt limits.
7.  **Gamified Leaderboards**: Calculates dynamic averages over quiz attempts and tryouts. Score formula: `quiz_avg + (tryout_avg × 2)`.
8.  **Knowledge Object System**: AI-powered extraction of atomic knowledge units from Master Teaching Documents (MTDs). Each KO is typed (definition, formula, example, misconception, exercise, summary, objective, concept_overview), tagged with Bloom's Taxonomy level, difficulty, and importance.
9.  **AI Flashcard System (SM-2 Spaced Repetition)**: Flashcard sets generated from Knowledge Objects, with a full SM-2 scheduler implementation including ease factor adjustment, safety floor recovery, overdue handling, and exam mode with typed-answer validation.
10. **Diktat PDF Compilation**: Automated study guide generation from selected chapters → structured JSON → HTML rendering → Puppeteer PDF compilation → UploadThing CDN upload. Supports tutor overrides for specific formula/concept blocks.
11. **Website Material Generation**: Gemini compiles KOs into canonical Markdown with custom `:::block` containers (concept, formula, formula_reference, engineering_insight, example, misconception, warning, summary, learning_objective). These are compiled to structured ASTs and rendered through a custom React-based Markdown renderer.
12. **AI Tutor Drawer**: Side-drawer AI chat powered by Gemini for concept explanation and mistake analysis, with per-user daily usage budgeting (30 requests/day cap).
13. **Dashboard Weak Concept Analysis**: Analytics service identifies KO-linked weak concepts from quiz attempt patterns, surfacing them on the student dashboard for targeted review.
14. **Command Palette (Cmd+K)**: Global site-wide fuzzy search using Fuse.js, indexing all pages, courses, materials, and exam questions with weighted scoring.
15. **Dynamic Pricing Engine**: Power-law scaling formulas for group pricing: platform cost = `base × courses^0.55 × persons^0.85`, tutorial cost = `sessions × base × persons^0.44`. Five tiers: Free, Minimal, Essential (highlighted), Premium, Custom. WhatsApp CTA deep links with pre-filled messages.
16. **Interactive Math Lab**: Landing page embeds featuring Desmos graphing calculator and Three.js 3D volume-of-revolution visualization.
17. **Background Job Processing**: Inngest-powered event-driven and cron workers for vector sync (batch embedding via Gemini → Pinecone upsert), running every 5 minutes with retry logic and configurable batch sizes.
18. **Testimonial System**: Dedicated testimonial page with Schema.org structured data markup, accent color cycling, and masonry-style layout.
19. **Subscription Plans**: Five-tier plan system (Free → Custom) with per-person, per-course dynamic pricing, displayed in IDR with WhatsApp enrollment CTAs.

---

## 6. User Workflows

```mermaid
flowchart TD
    %% Roles
    Student([Student User])
    Tutor([Tutor / Teacher])
    Admin([Administrator])

    %% Student Workflow
    Student --> S_Token[1. Redeem Enrollment Token]
    S_Token --> S_Group[2. Joins Group & Enrolls in Courses]
    S_Group --> S_Dashboard[3. Dashboard: Active Classes & Weak Concepts]
    S_Dashboard --> S_Study[4. Read Materials & Track Progress]
    S_Dashboard --> S_AIQuiz[5. Daily Quiz & Weekly Templates]
    S_Dashboard --> S_Flashcards[6. SM-2 Flashcard Review]
    S_Dashboard --> S_Book[7. Book Tutor Availability Slot]
    S_Dashboard --> S_Tutor[8. AI Tutor Chat for Concept Help]
    S_AIQuiz --> S_Leaderboard[9. View Rankings & Results]
    S_Study --> S_CmdK[Search: Cmd+K Command Palette]

    %% Tutor Workflow
    Tutor --> T_Slots[1. Define Availability Slots]
    Tutor --> T_AIQuiz[2. Generate & Curate Weekly Quiz Templates]
    Tutor --> T_Diktat[3. Compile & Publish Diktat PDFs]
    Tutor --> T_Override[4. Apply Manual Overrides to Diktats]
    Tutor --> T_Explain[5. Provide Video Explanations & Grade Essays]

    %% Admin Workflow
    Admin --> A_Token[1. Generate Multi-User Group Tokens]
    Admin --> A_Drive[2. Manage File Drive (Upload/Organize)]
    Admin --> A_MTD[3. Upload Master Teaching Documents]
    Admin --> A_KO[4. Extract Knowledge Objects from MTDs]
    Admin --> A_Ingest[5. Ingest AI Material Instances & Chunks]
    Admin --> A_Curation[6. Moderate Question Bank Curation Grid]
    Admin --> A_Quizzes[7. Manage Quiz Templates & Selection Rules]
    Admin --> A_Monitor[8. Monitor Jobs, Usage Budgets & Analytics]
```

### 👨‍🎓 Student Lifecycle
1.  **Enrollment**: Redeems activation token on the dashboard, unlocking courses and joining study groups.
2.  **Dashboard**: Views active classes with progress bars, in-progress materials, available quizzes/tryouts, and AI-detected weak concepts requiring review.
3.  **Study**: Accesses multi-format materials through the universal viewer:
    *   **PDFs**: Inline embedded reader with completion tracking.
    *   **Articles**: Rendered Markdown with LaTeX math and custom knowledge blocks.
    *   **Videos**: YouTube embed player with inline display.
    *   **Images**: Inline image viewer with captions.
    *   **External Links**: Open in new tab with metadata display.
4.  **AI Assessments**:
    *   **Daily Quizzes**: Progress-linked, appears on dashboard — 5 questions matching completed material topics, drawn from Postgres (no API cost).
    *   **Weekly/Chapter Evaluations**: Published by tutors, with randomized question snapshots locked per attempt. Supports timed sessions with configurable max attempts.
5.  **Flashcard Review**: SM-2 spaced repetition system with adaptive scheduling (Again/Hard/Good/Easy grades), exam mode with typed-answer validation, and full review history logging.
6.  **AI Tutor**: Side-drawer Gemini-powered chat for on-demand concept explanations, mistake analysis, and learning guidance (rate-limited to 30 requests/day).
7.  **Scheduler**: Books available tutor slots for personalized one-on-one consultations.
8.  **Reviewing Outcomes**: Navigates to My Results tab to view grading percentages, per-question explanations (text, images, YouTube/R2 video), teacher notes, and course leaderboard standings.
9.  **Site Search**: Cmd+K command palette for quick navigation across pages, courses, materials, and exams.

### 👩‍🏫 Tutor Lifecycle
1.  **Setting Availability**: Schedules weekly slots for student consultations.
2.  **AI Curation**: Triggers weekly quiz templates. Selects questions generated by background RAG queues, reviews accuracy, and publishes them.
3.  **Diktat Compilation**: Selects chapters to compile into structured study guides → applies formula/concept overrides → publishes PDF (rendered via Puppeteer, uploaded to UploadThing CDN).
4.  **Essay Grading & Remediation**: Evaluates essay submissions, provides teacher notes, and uploads walkthrough review media.

### 👨‍💼 Administrator Lifecycle
1.  **Token Administration**: Creates enrollment tokens specifying group capacity (1–5) and course assignments with expiration dates.
2.  **File Drive Management**: Organizes course files in a Google Drive-style interface with folder hierarchy, upload, rename, and delete operations via UploadThing.
3.  **Knowledge Pipeline**:
    *   Uploads Master Teaching Documents (MTDs) — Markdown source-of-truth documents.
    *   Triggers Knowledge Object (KO) extraction via Gemini AI.
    *   Optionally ingests AI Material Instances for legacy chunk-based RAG.
4.  **Question Bank Curation**: Reviews AI-generated questions in curation grid, managing the five-state lifecycle (`generated` → `reviewed` → `published` → `flagged` → `retired`).
5.  **Quiz Template Management**: Creates and edits quiz templates with custom selection rules (difficulty propo                                 │ Materials     │   │ Sets (SM-2)    │   │ Compilation  │
                                 │ (Markdown +   │   │                │   │              │
                                 │  AST render)  │   │                │   │              │
                                 └───────────────┘   └────────────────┘   └──────────────┘
```

### A. Master Teaching Document → Knowledge Object Pipeline
1.  **Upload MTD**: Admin uploads a Markdown source-of-truth document, linked to a course and optionally to a Drive file.
2.  **KO Extraction**: Gemini Flash (`gemini-2.5-flash` or fallback models) analyzes the chapter content and decomposes it into atomic Knowledge Objects (KOs).
3.  **JSON Contract & Zod Validation**: Gemini generates a JSON payload mapping to the strict Zod schema:
    ```typescript
    export const KnowledgeObjectSchema = z.object({
      conceptName: z.string().min(2), // e.g. "Newton's Second Law"
      title: z.string().min(2),       // e.g. "Force, Mass, and Acceleration"
      content: z.string().min(10),     // Markdown with LaTeX math delimited by $ (inline) or $$ (block)
      type: z.enum(["definition", "formula", "example", "misconception", "exercise", "summary", "objective", "concept_overview"]),
      difficulty: z.enum(["easy", "medium", "hard"]),
      bloomLevel: z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]),
      tags: z.array(z.string()).min(1),
      importance: z.enum(["high", "medium", "low"]).default("medium"),
      metadata: z.record(z.string(), z.any()).optional().default({}),
    });
    ```
4.  **Database Transaction & Outbox Enqueue**: KOs are saved to PostgreSQL under a single transaction. Simultaneously, a synchronization payload is written to `vector_sync_queue` for every KO created:
    - **Payload Structure**: `{ text: "Title: [KO Title]\nConcept: [Concept Name]\nContent: [Content]", metadata: { chapterId, type, bloomLevel, difficulty, tags } }`
    - **Cascade and Retention Rules**:
      - `vector_sync_queue` items with status `pending` or `failed` are **cascade-deleted** when their parent KO is removed.
      - `vector_sync_queue` items with status `completed` are **retained** in the database with their `koId` reference set to `null` to preserve background synchronization history logs.
5.  **Background Sync**: Inngest cron worker (every 5 minutes) or event-driven worker picks up pending outbox records, batch-embeds text via `text-embedding-004`, and upserts to Pinecone course namespaces.

### B. Website Material Generation Pipeline
1.  **Input**: Chapter's ordered Knowledge Objects from PostgreSQL.
2.  **Gemini Compilation**: Gemini compiles KOs into canonical Markdown with custom `:::block` containers that embed KO IDs for traceability.
3.  **AST Translation Specifications**: A custom Markdown compiler (`lib/markdown-compiler.ts`) parses the output into a validated structured AST. Custom block syntax is mapped as follows:
    - **`:::learning_objective {bloomLevel="remember"}`**: Compiles objectives list.
    - **`:::concept {koId="...", title="..."}`**: Compiles conceptual text blocks.
    - **`:::formula {koId="...", title="..."}`**: Parses mathematical LaTeX formulas inside `$$ ... $$` block and extracts parameter tables into symbol/unit/name lists.
    - **`:::formula_reference {linkedFormulaBlockId="..."}`**: References formulas across blocks.
    - **`:::engineering_insight {discipline="..."}`**: Highlights practical applications.
    - **`:::example {koId="..."}`**: Segregates content into explicit `**Problem**:` and step-by-step `**Solution**:` blocks.
    - **`:::misconception {koId="..."}`**: Extracts explicit **`**Misconception**:`** and **`**Correction**:`** paragraphs.
    - **`:::exercise {questionId="..."}`**: Standardized practice question blocks.
    - **`:::summary`**: Renders summary bullet points.
    - **`:::warning` / `:::note {collapsible="true"}`**: Context notices.
    - **`:::glossary_term {term="..."}`**: glossary mappings.
4.  **Glossary & Metadata Auto-Inject**:
    - **Glossary Resolution**: The compiler scans body markdown for double-bracket links `[[concept]]`. If a matching `:::glossary_term` block is missing, it dynamically appends a stubbed glossary term block to prevent validation schema failures.
    - **Estimated Reading Time**: Calculated deterministically via AST weights:
      $$\text{Reading Time (min)} = \lceil \frac{\text{Word Count}}{200} + (\text{Formula Count} \times 2) + (\text{Example Step Count} \times 5) \rceil$$
5.  **Storage & Rendering**: Website materials are saved with version history, supporting tutor edits and AI regeneration. A React renderer converts the AST into responsive, interactive UI layouts.

### C. Dynamic Question Generation Pipeline
1.  **Tutor Inbound**: Tutor requests a custom topic quiz template.
2.  **Bypass Verification**: If the existing database holds enough questions matching the topic and tags, the template is created instantly, bypassing Gemini to minimize API costs.
3.  **Vector Retrieval**: If question count is low, the topic is converted into a vector query. Pinecone returns Top-K matching chunk IDs.
4.  **Gemini Execution**: Relational chunks are hydrated from PostgreSQL, injected into the system prompt, and passed to Gemini Flash with JSON Schema validation settings to output a pool of 2N questions.
5.  **Curation**: Questions are saved to the bank under a five-state lifecycle progression (`generated` → `reviewed` → `published` → `flagged` → `retired`).

### D. Flashcard Generation & Review Pipeline
1.  **Generation**: AI generates flashcard sets from Knowledge Objects, producing front/back/explanation cards linked to source KOs.
2.  **SM-2 Scheduling Formula**: Review spacing is calculated using a customized SM-2 Spaced Repetition engine:
    - **Quality Grades**: `1: Again`, `2: Hard`, `3: Good`, `4: Easy`.
    - **Ease Factor (EF) Adjustment**:
      - Grade 1 (Again): $EF_{new} = \max(1.3, EF_{old} - 0.2)$
      - Grade 2 (Hard): $EF_{new} = \max(1.3, EF_{old} - 0.15)$
      - Grade 3 (Good): $EF_{new} = EF_{old}$
      - Grade 4 (Easy): $EF_{new} = \min(2.8, EF_{old} + 0.15)$
    - **Interval Scheduling ($I$)**:
      - For $Box = 1$ (1st consecutive correct recall): $I_{new} = \text{Grade 4 ? 2 days : 1 day}$
      - For $Box = 2$ (2nd consecutive correct recall): $I_{new} = \text{Grade 4 ? 8 days : (Grade 3 ? 6 days : 3 days)}$
      - For $Box \ge 3$: $I_{new} = \text{Base Days} \times \text{Multiplier}$
        - **Multiplier**: Mapped to $EF_{new}$ (Grade 3), $1.2$ (Grade 2), or $EF_{new} \times 1.3$ (Grade 4).
        - **Base Days**: Overdue scaling is applied if the student was late: $\text{Base Days} = \text{Actual Elapsed Days} > I_{old} \text{ \& } \text{Grade} > 2 \text{ ? Actual Elapsed Days : } I_{old}$.
    - **Safety Floor Reset**: If a highly stable card (interval $I \ge 60$ days) fails (Grade 1), it triggers the safety floor flag. Upon the next correct recall, the first recovery interval is capped to a maximum of $14$ days to prevent excessive regression lag.
3.  **Exam Mode Grader**: Norms user typed input against answer keys by stripping special characters, spaces, and converting to lowercase, running substring matches:
    $$\text{isCorrect} = \text{NormalizedCorrectAnswer}.includes(\text{NormalizedUserAnswer}) \text{ || } \text{NormalizedUserAnswer}.includes(\text{NormalizedCorrectAnswer})$$
4.  **Progress Tracking**: Full review history logging per student per flashcard (grade, ease factor changes, interval changes, box progression).

### E. Diktat PDF Compilation Pipeline
1.  **Chapter Selection**: Tutor selects chapters to include in the diktat.
2.  **Structure Generation**: System compiles KOs from selected chapters into a structured JSON layout.
3.  **Tutor Overrides**: Tutor can manually adjust specific formula/concept blocks (overrides persist across regenerations).
4.  **Quality Validation**: Diktat structure passes through quality gate checks before PDF generation.
5.  **HTML Rendering**: Structured content is rendered to styled HTML with LaTeX, tables, and formatted blocks.
6.  **PDF Generation**: Puppeteer compiles HTML to A4 PDF (or mock buffer in dev).
7.  **CDN Upload**: PDF is uploaded to UploadThing, old files are cleaned up, and the download URL is stored in the database.
8.  **Status Lifecycle**: `draft` → `generating` → `ready` (or `failed`).

### F. Attempt & Attempt Snapshots
To prevent attempts from breaking if questions are edited in the future, the moment a student starts a quiz:
*   The selection rules choose questions matching tags and difficulty proportions (e.g. 3 Easy, 5 Medium, 2 Hard) with low usage counts.
*   The system creates an attempt record and stores a **deep snapshot** containing the complete, raw question content (prompt, options, correct indices, explanation) inside the attempt row, protecting student records against database updates.

---

## 8. Background Job Architecture

### Inngest Event-Driven Workers
| Worker | Trigger | Purpose |
|--------|---------|---------|
| `vector-sync-worker` | `vector.sync.dispatch` event | Processes a batch of pending vector sync queue items for a specific course |
| `vector-sync-cron-worker` | `*/5 * * * *` (every 5 minutes) | Polls all pending/failed outbox records, batch embeds, and syncs to Pinecone |

### Processing Pipeline
1. Fetch pending/failed rows from `vector_sync_queue` (configurable batch size, default 50).
2. Mark records as `processing` to lock them.
3. Group by course namespace for efficient batch operations.
4. Batch embed text chunks via Gemini `text-embedding-004`.
5. Upsert vectors to Pinecone course namespaces with metadata (chapterId, conceptId, type, bloomLevel, difficulty, importance, tags).
6. Finalize: mark queue rows as `completed`, update KO `pineconeVectorId`.
7. On failure: increment `attempts` counter, store `lastError`, mark as `failed` for retry (max 10 attempts).

---

## 9. Pricing & Subscription System

### Plan Tiers
| Plan | Base | Features |
|------|------|----------|
| **Free** | Rp 0 | Bank Materi dan Soal |
| **Minimal** | Dynamic | + Solusi Soal, Diktat Lengkap, Kuis Harian & Mingguan + Pembahasan, Tryout + Pembahasan |
| **Essential** ⭐ | Dynamic | + Akses pembahasan Video, 15x Tutorial Tatap Muka per Semester |
| **Premium** | Dynamic | + Konsultasi Tugas On-Demand, 30x Tutorial per Semester |
| **Custom** | Contact | Custom groups, tutors, and curriculum |

### Pricing Formula
- **Platform Cost**: `1000 × round5(base × courses^0.55 × persons^0.85)`
- **Tutorial Cost**: `sessions × 1000 × round5(base × persons^0.44)`
- **Group size**: 1–5 persons | **Course count**: 1–10 courses

### Core Subjects
Kalkulus IA/IB, Fisika Dasar IA/IB, Kimia Dasar IA/IB, Pengenalan Komputasi, Aljabar Linear Elementer, Struktur Diskrit, Persamaan Diferensial Biasa, Matriks & Ruang Vektor, Pengantar Analisis Data, Fisika Matematika.

