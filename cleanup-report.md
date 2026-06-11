# Cleanup Analysis Report — ZYX Academy Phase 2

**Date:** 2026-06-10  
**Scope:** Post-migration cleanup recommendations

---

## Summary

The Phase 2 migration is complete and verified. This report describes what can safely be cleaned up after a monitoring period, and what must be retained.

---

## 1. UploadThing Files (Cloudflare R2 Migration)

### What to do

> [!CAUTION]
> Do NOT delete UploadThing files until you have run the application in production with `STORAGE_PROVIDER_MODE=r2` for at least **2 weeks** with zero reported file-access errors.

**After the monitoring period:**

1. Log into [uploadthing.com/dashboard](https://uploadthing.com/dashboard) and delete the following keys:
   - `66nPsBvCMf37MOdARFLylNEfxFIKRg8PX0p76TotknUDe2aV`
   - `66nPsBvCMf37FCH5kyB2zTY8muXxAHU13dO9Btjf5c4bWhrQ`
   - `66nPsBvCMf37EAw8SnJ0BsNZAPt5C8jYfiehG2MrySJmR4V6`

2. Or use the UploadThing API: `DELETE /v6/files` with each key.

### What to keep

- `lib/storage/uploadthing-provider.ts` — keep until you decide to remove UploadThing dependency entirely
- `UPLOADTHING_TOKEN` env var — keep for existing signed URLs / legacy support

---

## 2. Database Fields

### `drive_item` table

| Column | Current State | Cleanup Action |
|--------|---------------|----------------|
| `uploadthingKey` | Now holds R2 key | Column is still useful as the canonical key — no action needed |
| `ufsUrl` | Now holds R2 key | Historically was a URL; now repurposed as key — consider renaming to `storageKey` in a future migration |

### `diktats` table

| Column | Current State | Cleanup Action |
|--------|---------------|----------------|
| `fileUrl` | Now holds R2 key | Same note — consider renaming to `storageKey` |

> [!NOTE]
> A column rename migration is optional and low-priority. The current naming works correctly with the `storage` abstraction layer.

---

## 3. UploadThing Integration Code

Once you're confident in R2 and have deleted UploadThing files, you may remove:

- `lib/storage/uploadthing-provider.ts`
- `UPLOADTHING_TOKEN` from `.env` and `lib/env.ts`
- `@uploadthing/react` and `uploadthing` npm packages

**Before removing:** Check for any remaining UploadThing references:
```bash
npx grep -r "uploadthing\|UploadThing\|utfs.io\|ufs.sh" --include="*.ts" --include="*.tsx"
```

---

## 4. Scripts

| Script | Keep? | Reason |
|--------|-------|--------|
| `scripts/migrate-files-to-r2.ts` | ✅ Keep | May be needed if new UT files are added before full cutover |
| `scripts/verify-r2.ts` | ✅ Keep | Useful for ongoing health checks |
| `scripts/rollback-to-uploadthing.ts` | ✅ Keep | Critical rollback capability |

---

## 5. Environment Variables to Add to Production

Add these to your Cloudflare Workers / Vercel / VPS environment:

```env
# Storage
STORAGE_PROVIDER_MODE=r2
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET=zyx
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
R2_ACCESS_KEY_ID=<your_key>
R2_SECRET_ACCESS_KEY=<your_secret>

# AI Gateway (optional — set when ready)
CF_AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/google-ai-studio
```

---

## 6. Monitoring Checklist (Post-Deployment)

- [ ] Check `/admin/ai/analytics` after 24h — confirm gateway is routing correctly
- [ ] Check `/admin/files` — confirm file previews load correctly from R2
- [ ] Check diktat PDF downloads work end-to-end
- [ ] Run `npm run verify:r2` on a weekly basis via cron
- [ ] After 2 weeks stable → delete UploadThing files
- [ ] After 1 month stable → evaluate removing UploadThing package dependencies
