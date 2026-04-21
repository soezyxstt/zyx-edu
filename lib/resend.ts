import { Resend } from "resend";

// You will need to add RESEND_API_KEY to your .env file
export const resend = new Resend(process.env.RESEND_API_KEY!);