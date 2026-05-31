import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ✅ Fix 2: Use a wider type that accepts FiltersState
// FiltersState has no index signature so Record<string, CleanParamValue> won't accept it
// Using Record<string, unknown> and filtering inside is the correct approach
export const cleanParams = (
  params: Record<string, unknown>
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
    )
  );
};

export const formatPriceValue = (
  value: number | null | undefined, // ✅ Fix 3: accept undefined too
  isMin: boolean
): string => {
  if (value === null || value === undefined) {
    return isMin ? "Any" : "Any";
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value}`;
};