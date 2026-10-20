/**
 * UK Postal Code Verification System
 * Official British Standard BS 7666 / Royal Mail PAF pattern validation & live postcode lookup.
 * ABAZ MART LTD operates exclusively within the United Kingdom.
 */

// Official UK Cabinet Office / British Standards regular expression for UK Postcodes
export const UK_POSTCODE_REGEX =
  /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/

/**
 * Standardize and format a UK postal code with proper capitalization and spacing.
 * Example: "sw1a1aa" -> "SW1A 1AA", "m11ae" -> "M1 1AE"
 */
export function formatUKPostcode(raw: string): string {
  if (!raw || typeof raw !== "string") return ""
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "")
  if (cleaned.length <= 4) return cleaned
  const outward = cleaned.slice(0, -3)
  const inward = cleaned.slice(-3)
  return `${outward} ${inward}`
}

/**
 * Fast synchronous syntax verification using the official UK Government Postcode format.
 */
export function isValidUKPostcode(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false
  const formatted = formatUKPostcode(raw)
  return UK_POSTCODE_REGEX.test(formatted)
}

export interface UKPostcodeVerificationResult {
  valid: boolean
  formatted: string
  district?: string
  region?: string
  city?: string
  error?: string
}

/**
 * Live UK Postcode Verification against the Royal Mail / ONS database.
 * Uses the free, high-availability postcodes.io public API with automatic local fallback.
 */
export async function verifyUKPostcodeLive(
  raw: string,
): Promise<UKPostcodeVerificationResult> {
  const formatted = formatUKPostcode(raw)

  if (!formatted) {
    return {
      valid: false,
      formatted: "",
      error: "Postal code is required for UK delivery.",
    }
  }

  // 1. Initial pattern check
  if (!isValidUKPostcode(formatted)) {
    return {
      valid: false,
      formatted,
      error: "Invalid UK postal code format (e.g. SW1A 1AA, M1 1AE, B33 8TH).",
    }
  }

  // 2. Query live UK Royal Mail / ONS database
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)
    const encoded = encodeURIComponent(formatted.replace(/\s+/g, ""))
    const response = await fetch(`https://api.postcodes.io/postcodes/${encoded}`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      if (data.status === 200 && data.result) {
        const result = data.result
        const cityCandidate =
          result.parish && !result.parish.includes("unparished")
            ? result.parish
            : result.admin_district || result.region || ""

        return {
          valid: true,
          formatted: result.postcode || formatted,
          district: result.admin_district || undefined,
          region: result.region || undefined,
          city: cityCandidate || undefined,
        }
      }
    } else if (response.status === 404) {
      return {
        valid: false,
        formatted,
        error: "This UK postal code was not found. Please check for any typos.",
      }
    }
  } catch {
    // If the live network lookup is slow or unavailable, pattern validation serves as safe fallback
  }

  return {
    valid: true,
    formatted,
  }
}
