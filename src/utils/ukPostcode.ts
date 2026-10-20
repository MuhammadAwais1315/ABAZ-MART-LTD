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
  country?: string
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

  // 1. Initial British Standard BS 7666 pattern check
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
    const timeoutId = setTimeout(() => controller.abort(), 4000)
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
          result.admin_district ||
          result.parish ||
          result.region ||
          ""

        return {
          valid: true,
          formatted: result.postcode || formatted,
          district: result.admin_district || undefined,
          region: result.region || undefined,
          city: cityCandidate || undefined,
          country: result.country || "United Kingdom",
        }
      }
    } else if (response.status === 404) {
      // Check if outcode is valid (e.g. newly built properties where outward district is valid)
      const outcode = formatted.split(" ")[0]
      if (outcode) {
        try {
          const outcodeRes = await fetch(
            `https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`,
          )
          if (outcodeRes.ok) {
            const outData = await outcodeRes.json()
            if (outData.status === 200 && outData.result) {
              return {
                valid: true,
                formatted,
                district: outData.result.admin_district?.[0] || undefined,
                region: "United Kingdom",
                city: outData.result.admin_district?.[0] || undefined,
                country: outData.result.country?.[0] || "United Kingdom",
              }
            }
          }
        } catch {}
      }

      return {
        valid: false,
        formatted,
        error: `"${formatted}" was not recognized in the UK Royal Mail database. Please check for typos.`,
      }
    }
  } catch {
    // If live lookup is slow or unavailable, pattern validation serves as safe fallback
  }

  return {
    valid: true,
    formatted,
    country: "United Kingdom",
  }
}
