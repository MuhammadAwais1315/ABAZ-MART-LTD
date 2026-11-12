import React from "react"
import { Sparkles, CheckCircle2, Feather, Droplets, Info } from "lucide-react"

interface Section {
  title?: string
  bullets: Array<{ key?: string; value: string }>
  paragraphs: string[]
}

/**
 * Extracts a clean introductory excerpt for the product hero above the fold.
 */
export function getProductIntroExcerpt(text?: string | null): string {
  if (!text) return ""
  // If there are markdown sections, return text before the first section
  const firstHeaderIndex = text.indexOf("###")
  if (firstHeaderIndex !== -1) {
    const intro = text.slice(0, firstHeaderIndex).trim()
    if (intro.length > 0) return intro
  }
  // Otherwise if multi-paragraph, return the first 1-2 paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paragraphs.length > 0) {
    return paragraphs[0]
  }
  return text.trim()
}

/**
 * Parses markdown-style description text into structured sections.
 */
function parseDescription(text?: string | null): Section[] {
  if (!text) return []

  const sections: Section[] = []
  const lines = text.split("\n")

  let currentSection: Section = {
    bullets: [],
    paragraphs: [],
  }

  let paragraphBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const p = paragraphBuffer.join(" ").trim()
      if (p) currentSection.paragraphs.push(p)
      paragraphBuffer = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      continue
    }

    // Header like "### Fragrance Notes" or "## Fragrance Notes"
    if (line.startsWith("###") || line.startsWith("##")) {
      flushParagraph()
      if (
        currentSection.title ||
        currentSection.paragraphs.length > 0 ||
        currentSection.bullets.length > 0
      ) {
        sections.push(currentSection)
      }
      const title = line.replace(/^#+\s*/, "").trim()
      currentSection = {
        title,
        bullets: [],
        paragraphs: [],
      }
      continue
    }

    // Bullet point like "- **Top Notes:** Coconut, Vanilla" or "* Item"
    if (/^[-*•]\s+/.test(line)) {
      flushParagraph()
      const content = line.replace(/^[-*•]\s+/, "").trim()
      const kvMatch = content.match(/^\*\*([^*:]+):?\*\*:?\s*(.*)$/)
      if (kvMatch) {
        currentSection.bullets.push({
          key: kvMatch[1].trim(),
          value: kvMatch[2].trim(),
        })
      } else {
        currentSection.bullets.push({
          value: content,
        })
      }
      continue
    }

    // Regular line -> accumulate into paragraph
    paragraphBuffer.push(line)
  }

  flushParagraph()
  if (
    currentSection.title ||
    currentSection.paragraphs.length > 0 ||
    currentSection.bullets.length > 0
  ) {
    sections.push(currentSection)
  }

  return sections
}

interface ProductDescriptionProps {
  description: string
  productName?: string
  brand?: string
  category?: string
}

export default function ProductDescription({
  description,
  productName,
  category,
}: ProductDescriptionProps) {
  const sections = parseDescription(description)

  if (!description || description.trim().length === 0) {
    return (
      <p className="text-muted text-sm italic">
        No product description available.
      </p>
    )
  }

  // If text does not contain any structured markdown sections
  if (sections.length === 1 && !sections[0].title && sections[0].bullets.length === 0) {
    return (
      <div className="space-y-4 text-left leading-relaxed text-stone-700 text-sm md:text-base">
        {description.split(/\n\s*\n/).map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {para.trim()}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="product-structured-description space-y-8 text-left max-w-4xl mx-auto">
      {sections.map((section, idx) => {
        const isFragranceNotes =
          section.title &&
          /fragrance notes|scent notes|olfactory notes|key notes/i.test(
            section.title,
          )

        const isProductDetails =
          section.title &&
          /product details|specifications|features|details/i.test(section.title)

        return (
          <div
            key={idx}
            className="description-section border-b border-border/40 pb-6 last:border-b-0 last:pb-0"
          >
            {section.title && (
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-5 rounded-full bg-[#b83b5e]" />
                <h3 className="font-serif text-lg md:text-xl font-semibold text-ink m-0 tracking-tight">
                  {section.title}
                </h3>
              </div>
            )}

            {/* Paragraphs in section */}
            {section.paragraphs.length > 0 && (
              <div className="space-y-3 mb-4 text-stone-700 text-sm md:text-base leading-relaxed">
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="m-0">
                    {p}
                  </p>
                ))}
              </div>
            )}

            {/* Special layout for Fragrance Notes */}
            {isFragranceNotes && section.bullets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-5">
                {section.bullets.map((b, bIdx) => {
                  const isTop = /top/i.test(b.key || "")
                  const isHeart = /heart|middle/i.test(b.key || "")
                  const isBase = /base/i.test(b.key || "")

                  const bgTint = isTop
                    ? "bg-amber-50/70 border-amber-200/80 text-amber-900"
                    : isHeart
                      ? "bg-rose-50/70 border-rose-200/80 text-rose-900"
                      : isBase
                        ? "bg-stone-100/80 border-stone-200 text-stone-900"
                        : "bg-muted/30 border-border text-ink"

                  const Icon = isTop ? Feather : isHeart ? Droplets : Sparkles

                  return (
                    <div
                      key={bIdx}
                      className={`p-4 rounded-xl border ${bgTint} shadow-xs flex flex-col justify-between transition-all hover:shadow-sm`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          {b.key || `Note ${bIdx + 1}`}
                        </span>
                        <Icon className="w-4 h-4 text-[#b83b5e] opacity-75" />
                      </div>
                      <p className="font-medium text-sm text-ink m-0 leading-snug">
                        {b.value}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Special layout for Product Details (Specs grid) */}
            {isProductDetails && section.bullets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                {section.bullets.map((b, bIdx) => (
                  <div
                    key={bIdx}
                    className="flex items-baseline justify-between gap-3 py-1.5 px-2 rounded-md hover:bg-white/60 transition text-xs sm:text-sm"
                  >
                    <span className="font-medium text-muted shrink-0">
                      {b.key || "Feature"}:
                    </span>
                    <span className="font-semibold text-ink text-right">
                      {b.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* General bullets (if not notes or specs) */}
            {!isFragranceNotes && !isProductDetails && section.bullets.length > 0 && (
              <ul className="space-y-2.5 my-3 pl-0 list-none">
                {section.bullets.map((b, bIdx) => (
                  <li
                    key={bIdx}
                    className="flex items-start gap-2.5 text-sm md:text-base text-stone-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b83b5e] shrink-0 mt-2" />
                    <span>
                      {b.key && (
                        <strong className="font-semibold text-ink mr-1.5">
                          {b.key}:
                        </strong>
                      )}
                      {b.value}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
