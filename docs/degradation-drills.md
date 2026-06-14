# Degradation Drills (P10)

Run these drills manually to verify each failure path degrades gracefully.
Record the observed result in the "Result" column after each drill.

| Done | # | Drill | Expected behavior | Result |
|---|---|---|---|---|
| [ ] | D1 | Set `GEMINI_API_KEY` to an invalid value, open tutor drawer, ask a question | Returns degraded notice (`budgetExhausted: true`), no 500 in browser | |
| [ ] | D2 | Set `PINECONE_API_KEY` to an invalid value, open tutor drawer, ask a question | Vector store returns `[]`, pipeline falls through to ungrounded answer, no 500 | |
| [ ] | D3 | Set `CF_KV_NAMESPACE_ID` to a bad value, open tutor drawer, ask a question | KV miss, generation proceeds normally (1.5 s timeout fires silently) | |
| [ ] | D4 | Set `GEMINI_API_KEY` invalid, submit a quiz attempt | Inngest feedback worker rethrows on quota error (shows "retry" in Inngest dashboard), no feedback written for that attempt, student submission is saved | |
| [ ] | D5 | Navigate to `/admin/ops` with all services healthy | All 6 sections render, status words show "healthy", auto-refresh every 60 s works | |
| [ ] | D6 | Navigate to `/admin/ops` with `CF_KV_NAMESPACE_ID` unset | KV writes shows 0, other 5 sections still render correctly | |

## Restoration

After each drill, restore the correct env var value and verify the affected flow works again before proceeding to the next drill.

## Log

Record drill date, environment, and any unexpected behavior here.

| Date | Drill # | Environment | Outcome | Notes |
|---|---|---|---|---|
| | | | | |
