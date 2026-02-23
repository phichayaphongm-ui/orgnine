import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone: string | number | undefined | null) {
  if (!phone) return ""
  let clean = String(phone).replace(/\D/g, "")

  // Auto-prepend '0' if 9 digits and starts with 6, 8, 9 (Thai mobile pattern)
  if (clean.length === 9 && /^[689]/.test(clean)) {
    clean = "0" + clean
  }

  // Mobile (10 digits): 000-000-0000
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`
  }

  // Fixed line (9 digits starting with 0): 0X-XXX-XXXX or 02-XXX-XXXX
  if (clean.length === 9 && clean.startsWith("0")) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`
  }

  return String(phone)
}
