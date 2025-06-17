import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Cleans a Netflix viewing history title for OMDB queries.
 * - Takes the part before the first colon (:) as the base title.
 * - Trims whitespace and removes quotes.
 */
export function cleanTitleForOMDB(title: string): string {
  // Remove leading/trailing whitespace and quotes
  let cleaned = title.trim().replace(/^"|"$/g, '')
  // Take part before first colon, if present
  if (cleaned.includes(':')) {
    cleaned = cleaned.split(':')[0]
  }
  return cleaned.trim()
}
