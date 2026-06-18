import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { eq } from "drizzle-orm";

const email = process.argv[2]; // pass the email on the CLI
let role: "admin" | "student" | "teacher" = "admin";

if (!email) {
  console.error("Usage: npx tsx scripts/promote-user.ts user@example.com");
  process.exit(1);
}

if (process.argv[3]) {
  role = process.argv[3] as "admin" | "student" | "teacher";
}

(async () => {
  const { db } = await import("@/lib/db");
  const { user } = await import("@/db/schema");

  await db
    .update(user)
    .set({ role: role })
    .where(eq(user.email, email));

  console.log(`✅ ${email} is now a ${role}.`);
})();