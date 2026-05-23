import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSemesterEndDate(now = new Date()): Date {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 6 = July, 11 = Dec
  
  if (month >= 1 && month <= 6) {
    // Feb (1) to July (6) -> July 31
    return new Date(year, 6, 31, 23, 59, 59, 999);
  } else {
    // Aug (7) to Jan (0) -> January 31
    if (month === 0) {
      return new Date(year, 0, 31, 23, 59, 59, 999);
    } else {
      return new Date(year + 1, 0, 31, 23, 59, 59, 999);
    }
  }
}
