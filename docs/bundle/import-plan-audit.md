# Implementation Plan Audit — Pre-Implementation Risks

Audit of 4 specific plan sections against the current codebase.

---

## 1. MTD Assumptions

### Plan summary

> One MTD per chapter, inserted BEFORE chapters. MTD has:
> - `title: "MTD - {chapter.title}"`
> - `markdownContent: stub text`
> - `status: "active"` (instead of DB default `"draft"`)
> - `createdById` resolved from bundle author

### Risk 1A — MTD.markdownContent is a stub; existing code reads it as real content

The `masterTeachingDocuments` table has `markdownContent` as its primary
content field. In the existing system, this is the source document — the PDF
or markdown from which KOs are extracted. Several code paths read it:

- **`lib/ko-extractor.ts`**: Reads `mtd.markdownContent` to extract KOs. In
  the import workflow, KOs come from the bundle, not from MTD content. If
  ko-extractor is ever re-run on an imported MTD, it will extract gibberish.

- **Admin UI**: The MTD detail view likely displays `markdownContent` as the
  teaching document. An operator browsing imported courses will see the stub
  text `# {title}\n\n(Imported from bundle...)` instead of meaningful content.

- **Version/diffing**: `sourceHash` and `derivedHash` are null. Any code that
  compares hashes to detect content changes will not work correctly for
  imported MTDs.

**Severity**: Medium. The stub is visible in the admin UI and would confuse
operators. The importer should set `markdownContent` to the same value as the
chapter's `websiteMaterials.canonicalMarkdown`, since that IS the teaching
content. Or at minimum, store a meaningful reference.

### Risk 1B — MTD insertion order vs. existing system data flow

| Aspect | Existing system | Import workflow |
|--------|----------------|-----------------|
| MTD created | By uploading a document | By importer (artificial) |
| KO extraction | From MTD markdownContent | From bundle data |
| MTD → KO relationship | MTD is source → KOs derived | KOs defined in bundle, MTD is FK target |
| websiteMaterial.mtdId | From first active KO's mtdId | Direct FK to artificial MTD |

The existing `saveWebsiteMaterial()` function in `lib/material-storage.ts`
fetches `mtdId` from the first active KO. During import, the website material
is created at the same time as the KOs, and both reference the same artificial
MTD. This is internally consistent but breaks the semantic chain: a developer
tracing `websiteMaterial → sourceMtdId → MTD → markdownContent` will find
stub content instead of the actual source.

**Severity**: Low. The import is internally consistent. The semantic break is
a documentation concern, not a runtime bug.

### Risk 1C — MTD status: "active" vs. default "draft"

The plan sets `status: "active"`. The DB default is `"draft"`. The existing
system transitions MTDs to `"active"` only after successful KO extraction
and review. An artificial MTD should arguably stay `"draft"` to signal that
it was never manually reviewed.

**Severity**: Low. Recommendation: use the DB default `"draft"` instead of
forcing `"active"`.

### Risk 1D — One MTD per chapter; existing code assumes one MTD per document

The plan creates one MTD per chapter. The existing system has no such
convention — MTDs are created per uploaded document, and a single document
can cover multiple chapters. The `title` convention `"MTD - {chapter.title}"`
creates an artificial naming pattern that operators won't recognize.

**Severity**: Low. The FK constraint is satisfied. The naming is cosmetic.
But consider using `"MTD (auto) — {course.title} — {chapter.title}"` for
clarity.

### Risk 1E — `markdownContent` must satisfy `.notNull()` with meaningful content

The plan sets `markdownContent` to a stub string. This satisfies the `NOT
NULL` constraint, but if `sourceHash` and `derivedHash` are both null, any
existing code that assumes these fields are populated (e.g., staleness
detection) may behave unexpectedly.

**Mitigation**: The importer SHOULD compute `sourceHash` from the
`websiteMaterials.canonicalMarkdown` content and store it. This preserves the
ability to detect content changes. `derivedHash` can remain null (it applies
to KO-derived content, which doesn't come from the MTD in this workflow).

---

## 2. User Creation Strategy

### Plan summary

> Look up by `author.email`. If not found, create with `role: "admin"` and
> `emailVerified: true`. If no author block, use a hardcoded fallback.

### Risk 2A — Creating a user with `role: "admin"` may be unexpected

The plan creates users with `role: "admin"`. The DB default is `"student"`.
An admin user has broad system access. If the bundle author's email is
`intern@example.com` and they don't expect to have admin privileges, this
could be a security concern.

**Severity**: Medium. The importer operates as a CLI tool run by developers,
so this is a known operational choice. But the plan should at minimum log a
warning: `"Created user {email} with role 'admin' for bundle import"`.

### Risk 2B — No treatment for existing user with `role: "student"`

If `author.email` already exists in the database with `role: "student"`, the
plan silently reuses that user. All imported MTDs and assessment sources will
be attributed to a student account.

**Severity**: Low. The FK constraint is satisfied. The created-by audit trail
shows a student, which is misleading but not breaking. The plan should either
(a) upgrade the role, (b) warn, or (c) require an explicit admin email.

### Risk 2C — Hardcoded fallback user

If no `author` block exists, the plan creates a user with email
`"importer@zyx.internal"`. Multiple independent imports on the same database
will reuse this user (because `user.email` is unique). This is fine, but the
generated UUID will differ on first creation vs. subsequent runs if the user
already exists. This is cosmetic only — the importer finds the existing user
by email, so the UUID is stable after the first run.

**Severity**: Low. The email `"importer@zyx.internal"` is not a real email.
This user will show up in admin audit logs for every imported course. Make
sure this is documented.

### Risk 2D — Author.email is optional in the TypeScript type but required in practice

The Bundle V1.1.1 TypeScript definition has `author.email` as required only
when `author` is present. But if `author` is absent, the plan falls back to
a hardcoded user. This means every import shares the same fallback user,
losing attribution. Better to require `author` in CLI args if not in the
bundle.

**Recommendation**: If `author` is missing from the bundle, read `--author-email`
and `--author-name` from CLI flags. Only use the hardcoded fallback as a
last resort with a loud warning.

---

## 3. Markdown Reference Rewriting

### Plan summary

> Regex `/{ref="([^"]+)"}/g` replaced with `{koId="<uuid>"}`.
> Called `canonicalizeMarkdown()` before storing.

### Risk 3A — Regex does not handle additional attributes in the same block

The plan's proposed regex:

```
/\{ref="([^"]+)"\}/g
```

This matches `{ref="ko-def-limit"}` but **NOT**
`{ref="ko-def-limit", difficulty="easy"}`.

The latter is the standard block format used throughout the codebase (see
`lib/material-generator.ts` line 325):

```
:::concept {koId="${ko.id}", title="${ko.title}"}
```

And the bundle V1.1.1 examples:

```
:::example {ref="ko-contoh-1", difficulty="easy"}
```

The regex expects `}` immediately after the closing `"`, but the actual
markdown has `, difficulty="easy"}`.

**Severity**: HIGH. This is a bug. If the bundle author uses additional
attributes (which is the standard pattern), `{ref="..."}` will NOT be
replaced, the compiler will receive an empty `koId`, and the KO reference
will be lost. No compilation error will occur — the content will just silently
lack KO links.

### Fix required

Change from attribute-block matching to attribute-name-only matching:

```
/ref="([^"]+)"/g
```

This matches `ref="..."` anywhere in the text (including inside `{...}` with
other attributes) and replaces it with `koId="..."`.

**Verification against `parseAttributes()`**: The compiler's attribute parser
(lib/markdown-compiler.ts:19) uses:

```
/(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
```

This matches `key="value"` for any key name. After canonicalization, the
markdown will have `koId="uuid"` which `parseAttributes` will correctly
extract as `attrs.koId`. The compiler then reads `attrs.koId` at line 146. ✓

### Risk 3B — Overly broad replacement matches non-block ref attributes

Changing the regex to `ref="([^"]+)"` (without `{` and `}` context) means
that `ref="something"` appearing OUTSIDE block attributes will also be
replaced. In theory, a bundle author could write:

```markdown
See the reference ref="documentation" for details.
```

This would be incorrectly rewritten to `koId="<uuid>"` where the UUID lookup
would likely fail (since "documentation" is not a bundle `$id`).

**Severity**: Low. In practice, educational markdown content does not use
`ref="..."` syntax outside of block attributes. HTML uses `ref=""` in some
contexts, but the markdown format here is custom with `:::` blocks. An error
message like `Unresolvable markdown ref: "documentation"` would quickly alert
the author to the mistake.

**Recommended guard**: Only replace `ref="..."` when it appears inside `{...}`
block attributes. Use a regex with non-greedy `{` context:

```
/\{\s*[^}]*\bref="([^"]+)"[^}]*\}/g
```

But this is more complex and fragile. The simpler approach (replace all
`ref="..."` occurrences) is acceptable for the stated content domain. Add a
documentation note that `ref=` is a reserved attribute pattern in bundle
markdown.

### Risk 3C — Replacement order within a block with multiple attribute pairs

Consider a block with both `ref` and `koId`:

```
:::concept {ref="ko-def-limit", koId="some-old-uuid"}
```

After canonicalization: `{koId="<resolved-uuid>", koId="some-old-uuid"}`.

The compiler's `parseAttributes` uses `key="value"` matching and overwrites:
```typescript
attrs[key] = value;
```

If `koId` appears twice, the LAST value wins. So the old UUID would
overwrite the resolved one.

**Severity**: Low. Bundle authors should not mix `ref` and `koId` in the
same block. Validation rule V14 (from the V1.1 proposal) should be updated
to flag this as a warning: "Block contains both `ref` and `koId`".

---

## 4. Upsert Identity Strategy

### Plan summary

> Tables with unique constraints → `.onConflictDoUpdate()`
> Tables without → SELECT-then-INSERT/UPDATE by natural key
> Match keys: see section 8 of the implementation plan

### Risk 4A — SELECT-then-INSERT/UPDATE is not concurrency-safe

The upsert pattern for tables without unique constraints:

```typescript
const [existing] = await tx.select().from(table).where(match).limit(1);
if (existing) {
  await tx.update(table).set(row).where(eq(table.id, existing.id));
} else {
  await tx.insert(table).values(row);
}
```

This is safe within a single process because the transaction serializes all
operations. But if two `import-bundle` processes run simultaneously against
the same database:

```
Process A: SELECT → not found
Process B: SELECT → not found
Process A: INSERT → succeeds
Process B: INSERT → succeeds (duplicate!)
```

For a CLI seeding tool that runs sequentially, this is acceptable. But if
the import logic is ever reused inside an API endpoint (concurrent requests),
this pattern will produce duplicates.

**Severity**: Low (CLI tool). Document as a known limitation.

### Risk 4B — No delete handling for removed content

When upserting, the plan updates existing rows and inserts new ones. It does
NOT delete rows that exist in the database but are no longer in the bundle.
For example:

- Import 1: KO "Definisi Limit", KO "Teorema Limit"
- Import 2 (upsert): KO "Definisi Limit" only (second KO removed from bundle)

Result: KO "Teorema Limit" remains in the database with no matching bundle
entry. It's orphaned — the chapter still claims to have content that the
bundle no longer defines.

**Severity**: Medium. For a full-course replacement workflow, `create` mode
with fresh import is safer. Upsert mode is best for incremental updates where
content is only added, never removed. The plan should document this: "Upsert
mode does not delete content removed from the bundle. Use `create` mode for
full replacement."

### Risk 4C — KO match key `(chapterId, title)` may not be stable

The plan matches KOs by `(chapterId, title)`. If the bundle author renames
a KO between imports:

- Before: KO "Definisi Limit" (old title)
- After: KO "Pengertian Limit" (new title)

The importer inserts a new KO (no match found) and leaves the old KO in
place. Now the chapter has two KOs, one of which is orphaned.

**Alternative match keys considered**:

| Key | Risk |
|-----|------|
| `(chapterId, learningOrder)` | Reordering changes positions; creates duplicates |
| `(chapterId, title)` | Renaming creates duplicates (current approach) |
| `(chapterId, $id)` | Requires stable `$id` in bundle across imports; best option if authors maintain `$id` stability |

**Recommendation**: Document that stable `$id` values across imports are
required for reliable upsert behavior. If `$id` is stable, use it as the
match key. If `$id` changes between imports, the author should expect
duplicates and use `create` mode instead.

### Risk 4D — assessmentSource match key `(courseId, title, year)` may collide

A course can have two assessment sources with the same title and year but
different categories (e.g., "UTS 2026" and another exam also called "UTS
2026" from a different semester). The category is already part of the source
data but not in the match key.

**Recommendation**: Add `category` to the assessment source match key:
`(courseId, category, year, title)`.

### Risk 4E — Drizzle `.onConflictDoUpdate()` limitations in SQLite

The `assessmentSources` and `assessmentObjects` tables use SQLite via
Drizzle. SQLite supports `ON CONFLICT ... DO UPDATE` but only if there is a
unique constraint or index on the conflict target. The plan uses
`.onConflictDoUpdate()` for `concepts` (which has `canonicalSlug` UNIQUE ✓).

For other tables, the plan falls back to SELECT-then-INSERT/UPDATE (Risk 4A).
This is the correct approach for SQLite — you cannot use `ON CONFLICT` on
columns without a unique constraint.

**Severity**: None (plan correctly identifies this).

---

## Risk Summary

| # | Risk | Severity | Section |
|---|------|----------|---------|
| 3A | Regex `{ref="..."}` does not match `{ref="...", key="val"}` | **HIGH** | Markdown rewriting |
| 1A | MTD `markdownContent` is stub content visible in admin UI | Medium | MTD |
| 2A | Created author user gets `role: "admin"` unexpectedly | Medium | User creation |
| 4B | Upsert does not delete content removed from bundle | Medium | Upsert |
| 4C | KO upsert by title creates duplicates on rename | Medium | Upsert |
| 4D | Assessment source match key too narrow | Medium | Upsert |
| 1C | MTD forced `"active"` instead of `"draft"` | Low | MTD |
| 1B | MTD semantic chain broken (stub vs. real content) | Low | MTD |
| 2B | Student user used as bundle author | Low | User creation |
| 2C | Hardcoded fallback user obscures attribution | Low | User creation |
| 3B | Overly broad regex replaces non-block `ref="..."` | Low | Markdown rewriting |
| 3C | `ref` + `koId` in same block produces duplicate attribute | Low | Markdown rewriting |
| 4A | SELECT-then-INSERT not concurrency-safe | Low | Upsert |

## Required Fixes Before Implementation

```
P0 (will produce incorrect data):

  [3A] Fix regex:  /ref="([^"]+)"/g  (remove { } context)
       The plan's regex /\{ref="([^"]+)"\}/g does NOT match blocks
       with additional attributes like {ref="ko-def-limit", difficulty="easy"}.
       Every bundle example includes such attributes. This must be fixed.

P1 (will confuse operators or produce misleading state):

  [1A] Set MTD.markdownContent to the chapter's canonicalMarkdown
       instead of a stub; or at minimum compute and store sourceHash.

  [1C] Use DB default "draft" for MTD.status instead of forcing "active".

  [2A] Log a warning when creating a user with role "admin".

  [4D] Add category to assessment source match key: (courseId, category, year, title).

P2 (documentation/edge cases — fix before first non-trivial use):

  [4B] Document that upsert does not delete removed content.
  [4C] Document that stable $id values are required for reliable upsert.
  [3C] Add validation rule: block must not contain both ref and koId.
  [2B] Warn when author email resolves to a student-role user.
  [2D] Accept --author-email / --author-name CLI flags as fallback.
```
