import { useEffect } from "react"

export function useScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed")
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: "0px 0px -45px", threshold: 0.08 },
    )

    const reveal = () => {
      document
        .querySelectorAll(
          "main section, .product-card, .category-tile, .home-category-tile, .testimonial-card, .admin-panel",
        )
        .forEach((element) => {
          if (!element.classList.contains("reveal-target")) {
            element.classList.add("reveal-target")
            observer.observe(element)
          }
        })
    }

    reveal()
    const mutationObserver = new MutationObserver(reveal)
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [])
}
