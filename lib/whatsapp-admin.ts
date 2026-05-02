import { env } from "@/lib/env";

/** Returns `wa.me` URL or `null` if admin number unset or invalid after normalization. */
export function getWhatsAppAdminChatHref(): string | null {
  const raw =
    env.WHATSAPP_ADMIN_NUMBER?.trim() || env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const text =
    encodeURIComponent(
      "Halo, saya ingin bertanya lebih lanjut tentang pembelajaran di Zyx Edu.",
    );
  return `https://wa.me/${digits}?text=${text}`;
}
