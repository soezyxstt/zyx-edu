import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import { OpsClient } from "./ops-client";

export const metadata: Metadata = {
  title: pageTitle("Ops"),
  description: "Monitoring operasional AI dan infrastruktur.",
};

export default function OpsPage() {
  return <OpsClient />;
}
