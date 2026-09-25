import { clsx, type ClassValue } from "clsx"
import { type Size } from "@/lib/design/sizes"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
