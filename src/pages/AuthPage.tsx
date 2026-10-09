import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router"
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react"
import { Button, Checkbox, Input } from "../components/ui"
import { useStore } from "../context/StoreContext"

export default function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "register" | "forgot"
}) {
  const navigate = useNavigate()
  const { notify } = useStore()
  const isRegister = mode === "register"
  const isForgot = mode === "forgot"
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [terms, setTerms] = useState(false)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const setAuthField = (name: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (isRegister && form.fullName.trim().length < 2)
      next.fullName = "Please enter your full name."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email address."
    if (!isForgot && form.password.length < (isRegister ? 8 : 6))
      next.password = isRegister
        ? "Password must be at least 8 characters."
        : "Password must be at least 6 characters."
    if (isRegister && form.confirmPassword !== form.password)
      next.confirmPassword = "Passwords do not match."
    if (isRegister && !terms)
      next.terms = "You must accept the terms to create an account."
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    if (isForgot) {
      setSent(true)
      notify("Password reset instructions sent")
      return
    }
    notify(
      isRegister ? "Account created successfully" : "Signed in successfully",
    )
    navigate("/account")
  }

  const authInput = (
    name: keyof typeof form,
    label: string,
    options: {
      type?: string
      placeholder?: string
      passwordToggle?: boolean
      confirmToggle?: boolean
    } = {},
  ) => {
    const visible = options.confirmToggle ? showConfirmPassword : showPassword
    const toggle = options.confirmToggle
      ? () => setShowConfirmPassword(!showConfirmPassword)
      : () => setShowPassword(!showPassword)
    return (
      <div className="auth-field">
        <div className={options.passwordToggle ? "password-field" : ""}>
          <Input
            className={errors[name] ? "has-error" : ""}
            label={label}
            type={
              options.passwordToggle
                ? visible
                  ? "text"
                  : "password"
                : options.type
            }
            placeholder={options.placeholder}
            value={form[name]}
            onChange={(event) => setAuthField(name, event.target.value)}
            aria-invalid={Boolean(errors[name])}
          />
          {options.passwordToggle && (
            <Button
              type="button"
              variant="ghost"
              className="password-toggle"
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={toggle}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          )}
        </div>
        {errors[name] && <span className="field-error">{errors[name]}</span>}
      </div>
    )
  }

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <img
          src="https://images.unsplash.com/photo-1694742971702-3887ed069538?auto=format&fit=crop&w=1200&q=88"
          alt="Premium skincare products arranged in a serene beauty setting"
        />
        <div>
          <Link to="/" className="logo">
            Abaz <i>Mart</i>
          </Link>
          <h2>Your beauty journey starts here</h2>
          <p>
            Thoughtfully selected skincare, makeup, and rituals for your most
            radiant self.
          </p>
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-card">
          <Link to="/" className="logo">
            Abaz <i>Mart</i>
          </Link>
          {sent ? (
            <div className="auth-success">
              <span>
                <Check />
              </span>
              <p className="eyebrow">Check your inbox</p>
              <h1>Reset link sent</h1>
              <p>
                We sent password reset instructions to{" "}
                <strong>{form.email}</strong>. The link will be valid for 30
                minutes.
              </p>
              <Link to="/login" className="btn btn-primary">
                Return to Sign In
              </Link>
            </div>
          ) : (
            <>
              <p className="eyebrow">
                {isRegister
                  ? "Join our community"
                  : isForgot
                    ? "Reset your password"
                    : "Welcome back"}
              </p>
              <h1>
                {isRegister
                  ? "Create your account"
                  : isForgot
                    ? "Forgot password?"
                    : "Hello, beautiful."}
              </h1>
              <p>
                {isRegister
                  ? "Save favorites, track orders, and enjoy a more personal beauty edit."
                  : isForgot
                    ? "Enter your email and we’ll send you a secure link to choose a new password."
                    : "Sign in to revisit your favorites and continue your ritual."}
              </p>
              <form onSubmit={submit} noValidate>
                {isRegister &&
                  authInput("fullName", "Full name", {
                    placeholder: "Your full name",
                  })}
                {authInput("email", "Email address", {
                  type: "email",
                  placeholder: "you@example.com",
                })}
                {!isForgot &&
                  authInput("password", "Password", {
                    placeholder: "••••••••",
                    passwordToggle: true,
                  })}
                {isRegister &&
                  authInput("confirmPassword", "Confirm password", {
                    placeholder: "••••••••",
                    passwordToggle: true,
                    confirmToggle: true,
                  })}
                {mode === "login" && (
                  <div className="auth-options">
                    <Checkbox
                      label="Remember me"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                    />
                    <Link to="/forgot-password">Forgot password?</Link>
                  </div>
                )}
                {isRegister && (
                  <div className="terms-field">
                    <Checkbox
                      label="I agree to the Terms of Service and Privacy Policy"
                      checked={terms}
                      onChange={(event) => {
                        setTerms(event.target.checked)
                        setErrors((current) => {
                          const next = { ...current }
                          delete next.terms
                          return next
                        })
                      }}
                    />
                    {errors.terms && (
                      <span className="field-error">{errors.terms}</span>
                    )}
                  </div>
                )}
                <Button type="submit" className="auth-submit">
                  {isRegister
                    ? "Create Account"
                    : isForgot
                      ? "Send Reset Link"
                      : "Sign In"}
                  <ArrowRight />
                </Button>
              </form>
              {!isForgot && (
                <>
                  <div className="auth-divider">
                    <span>or</span>
                  </div>
                  <Button variant="outline" className="google-button">
                    <b>G</b> Continue with Google
                  </Button>
                </>
              )}
              <div className="auth-switch">
                {isRegister ? (
                  <>
                    Already have an account? <Link to="/login">Sign in</Link>
                  </>
                ) : isForgot ? (
                  <>
                    Remembered your password?{" "}
                    <Link to="/login">Return to sign in</Link>
                  </>
                ) : (
                  <>
                    New to Abaz Mart?{" "}
                    <Link to="/register">Create an account</Link>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
