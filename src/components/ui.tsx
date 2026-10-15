import {
  ReactNode,
  SelectHTMLAttributes,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
} from "react"
import { Star, X } from "lucide-react"

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost"
}) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />
}

export function Input({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={`field ${className}`}>
      {label && <span>{label}</span>}
      <input {...props} />
    </label>
  )
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  children: ReactNode
}) {
  return (
    <label className={`field ${className}`}>
      {label && <span>{label}</span>}
      <select {...props}>{children}</select>
    </label>
  )
}

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="checkbox">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  )
}

export function Badge({
  children,
  tone = "rose",
}: {
  children: ReactNode
  tone?: "rose" | "gold" | "green"
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function RatingStars({
  rating,
  count,
  compact = false,
}: {
  rating: number
  count?: number
  compact?: boolean
}) {
  return (
    <div className="rating" aria-label={`${rating} out of 5 stars`}>
      <Star size={compact ? 13 : 15} fill="currentColor" />{" "}
      <strong>{rating}</strong>
      {count !== undefined && <span>({count})</span>}
    </div>
  )
}

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[]
}) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={item.label}>
          {i > 0 && " / "}
          {item.href ? <a href={item.href}>{item.label}</a> : item.label}
        </span>
      ))}
    </nav>
  )
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: string[]
  active: string
  onChange: (item: string) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <Button
          key={item}
          variant="ghost"
          role="tab"
          aria-selected={active === item}
          onClick={() => onChange(item)}
        >
          {item}
        </Button>
      ))}
    </div>
  )
}

export function Pagination({ page = 1 }: { page?: number }) {
  return (
    <div className="pagination">
      <Button variant="outline">Previous</Button>
      {[1, 2, 3].map((n) => (
        <Button key={n} variant={n === page ? "primary" : "ghost"}>
          {n}
        </Button>
      ))}
      <Button variant="outline">Next</Button>
    </div>
  )
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="toast" role="status">
      {children}
    </div>
  )
}

export function Modal({
  open,
  title,
  children,
  onClose,
  size = "md",
  className = "",
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal modal-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="modal-close-icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}
