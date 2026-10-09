import { Settings } from "lucide-react"

export default function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="admin-placeholder">
      <Settings />
      <p className="eyebrow">Admin</p>
      <h1>{title}</h1>
      <p>This workspace is ready for your {title.toLowerCase()} tools.</p>
    </div>
  )
}
