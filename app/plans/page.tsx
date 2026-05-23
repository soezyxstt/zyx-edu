import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import PlansClient from "./plans-client";

export const metadata: Metadata = {
  title: pageTitle("Plans"),
  description:
    "Paket bimbingan Zyx Edu — kombinasi course, jadwal pertemuan, dan akses materi. Real-time pricing calculator.",
};

export default function PlansPage() {
  return <PlansClient />;
}
