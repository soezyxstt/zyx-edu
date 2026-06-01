import { env } from "@/lib/env";

// ==========================================
// 1. CONSTANTS
// ==========================================
export const DEFAULT_PERSONS = 3;
export const MIN_PERSONS = 1;
export const MAX_PERSONS = 5;

export const DEFAULT_COURSES = 3;
export const MIN_COURSES = 1;
export const MAX_COURSES = 10;

// List of core university courses represented
export const CORE_SUBJECTS = [
  "Kalkulus IA/IB",
  "Fisika Dasar IA/IB",
  "Kimia Dasar IA/IB",
  "Pengenalan Komputasi",
  "Aljabar Linear Elementer",
  "Struktur Diskrit",
  "Persamaan Diferensial Biasa",
  "Matriks & Ruang Vektor",
  "Pengantar Analisis Data",
  "Fisika Matematika"
];

// ==========================================
// 2. PRICING LOGIC & MATHEMATICAL FORMULATION
// ==========================================

export const roundToFive = (num: number) => Math.ceil(num / 5) * 5;

/**
 * Component 1: Platform & Resource Access Cost
 * Calibrated exponents: Nc = 0.55 (Course Scaling), Np = 0.85 (Person Scaling)
 */
export const getPlatformCost = (baseConstant: number, courseCount: number, persons: number) => {
  return 1000 * roundToFive(baseConstant * Math.pow(courseCount, 0.55) * Math.pow(persons, 0.85));
};

/**
 * Component 2: In-Person / Online Tutorial Session Cost
 * Exponent: Np = 0.44 (Group Sharing Discount for Tutor Fee)
 */
export const getTutorialCost = (meetCount: number, baseConstant: number, persons: number) => {
  const costPerSession = roundToFive(baseConstant * Math.pow(persons, 0.44));
  return meetCount * 1000 * costPerSession;
};

/**
 * Calculates the total price for a given plan reactively.
 */
export const calculatePlanPrice = (
  plan: 'free' | 'minimal' | 'essential' | 'premium' | 'custom',
  persons: number,
  courses: number
): number => {
  switch (plan) {
    case 'free':
      return 0;
    case 'minimal':
      return getPlatformCost(250, courses, persons);

    case 'essential': {
      const tutorialComponent = getTutorialCost(15, 155, persons);
      const platformComponent = getPlatformCost(250, courses, persons);
      return tutorialComponent + platformComponent;
    }

    case 'premium': {
      const tutorialComponent = getTutorialCost(30, 155, persons);
      // Premium platform uses base constant 285 due to On-Demand Assignment Consultation
      const platformComponent = getPlatformCost(285, courses, persons);
      return tutorialComponent + platformComponent;
    }

    case 'custom':
    default:
      return 0; // Handled as "Hubungi Kami" string in UI
  }
};

// ==========================================
// 3. WHATSAPP LINK GENERATOR
// ==========================================

/**
 * Constructs the WhatsApp URL for a plan with customized pre-filled message.
 */
export const getWhatsAppPlanUrl = (
  planKey: 'free' | 'minimal' | 'essential' | 'premium' | 'custom',
  planName: string,
  persons: number,
  courses: number
): string => {
  // Try reading the public whatsapp number from environment variables
  // Since client component needs to run, we check both public and admin env variables.
  // env.NEXT_PUBLIC_WHATSAPP_NUMBER is exposed in browser.
  const rawNumber = env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6281234567890";
  const digits = rawNumber.replace(/\D/g, "");
  
  let message = "";
  if (planKey === 'custom') {
    message = `Halo Admin, saya ingin mendaftar paket Custom untuk grup berisi ${persons} orang dengan total ${courses} mata kuliah. Saya ingin berkonsultasi mengenai kebutuhan khusus kami.`;
  } else {
    message = `Halo Admin, saya ingin mendaftar paket ${planName} untuk grup berisi ${persons} orang dengan total ${courses} mata kuliah.`;
  }
  
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};
