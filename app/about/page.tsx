import type { Metadata } from "next";
import { AboutClient } from "./about-client";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Tentang Kami"),
  description:
    "Kami membangun pengalaman belajar yang tenang dan terukur — dari TPB hingga awal jurusan.",
};

export default function AboutPage() {
  return <AboutClient />;
}
