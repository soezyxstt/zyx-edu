"use server";

import { db } from "@/db";
import { flashcards, aiQuestionBank } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getFlashcardsForKOAction(koId: string) {
  try {
    const list = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.koId, koId));
    
    if (list.length > 0) return list;

    // Fallback Mock Cards for Demo / Testing Physics/Calc Concepts
    return [
      {
        id: `f-mock-1-${koId}`,
        front: "Bagaimana kaitan arah antara normal force dengan permukaan bidang sentuh?",
        back: "Normal force (gaya normal) selalu tegak lurus (90 derajat) menjauhi permukaan bidang sentuh fisis.",
        box: 1,
      },
      {
        id: `f-mock-2-${koId}`,
        front: "Tuliskan perumusan matematis Gaya Gesek Statis Maksimum!",
        back: "$$f_{s, maks} = \\mu_s \\cdot N$$ dengan $\\mu_s$ koefisien gesek statis dan $N$ gaya normal.",
        box: 1,
      },
    ];
  } catch (e) {
    console.error("Error fetching flashcards:", e);
    return [];
  }
}

export async function getQuestionsForKOAction(koId: string) {
  try {
    const list = await db
      .select()
      .from(aiQuestionBank)
      .where(
        and(
          eq(aiQuestionBank.knowledgeObjectId, koId),
          eq(aiQuestionBank.status, "active")
        )
      );

    if (list.length > 0) return list;

    // Fallback Mock Questions
    return [
      {
        id: `q-mock-1-${koId}`,
        prompt: "Sebuah balok diam di atas bidang miring dengan sudut kemiringan $\\theta$. Gaya gesek statis yang bekerja pada balok adalah...",
        options: [
          "$f_s = m \\cdot g \\cdot \\sin(\\theta)$",
          "$f_s = m \\cdot g \\cdot \\cos(\\theta)$",
          "$f_s = \\mu_s \\cdot m \\cdot g$",
          "$f_s = 0$"
        ],
        correctIndices: [0],
        explanation: "Karena balok diam, gaya gesek statis penyeimbang gaya berat sejajar bidang miring: $f_s = w_x = m \\cdot g \\cdot \\sin(\\theta)$."
      },
      {
        id: `q-mock-2-${koId}`,
        prompt: "Besar gaya normal pada sebuah balok bermassa $m$ yang terletak pada bidang miring licin dengan kemiringan $\\theta$ adalah...",
        options: [
          "$N = m \\cdot g \\cdot \\cos(\\theta)$",
          "$N = m \\cdot g \\cdot \\sin(\\theta)$",
          "$N = m \\cdot g$",
          "$N = m \\cdot g / \\cos(\\theta)$"
        ],
        correctIndices: [0],
        explanation: "Gaya normal menyeimbangkan komponen gaya berat tegak lurus bidang miring: $N = w_y = m \\cdot g \\cdot \\cos(\\theta)$."
      }
    ];
  } catch (e) {
    console.error("Error fetching bank questions:", e);
    return [];
  }
}
