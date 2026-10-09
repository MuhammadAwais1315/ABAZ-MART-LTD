import { ArrowRight, Search } from "lucide-react"
import { Link } from "react-router"

export default function NotFound() {
  return (
    <div className="page shell not-found-page">
      <div className="not-found-illustration" aria-hidden="true">
        <span>4</span>
        <i>
          <Search />
        </i>
        <span>4</span>
      </div>
      <p className="eyebrow">Page not found</p>
      <h1>Beauty took a little detour.</h1>
      <p>
        The page you’re looking for may have moved, but your next favorite
        beauty find is still waiting.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to Home <ArrowRight />
      </Link>
    </div>
  )
}
