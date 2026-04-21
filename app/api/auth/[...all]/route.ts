import { auth } from "@/lib/auth"; // Adjust the import path if needed
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);