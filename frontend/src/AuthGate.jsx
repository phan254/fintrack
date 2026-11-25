import { useEffect, useState } from 'react'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import App from './App'
import { authAPI } from './api'

const initialForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
}

export default function AuthGate() {
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(
    () => Boolean(localStorage.getItem('fintrack_token'))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')

  // The API client fires this event when the saved token is rejected.
  useEffect(() => {
    const handleExpired = () => {
      setUser(null)
      setForm(initialForm)
      setMode('login')
      setLoading(false)
      setNotice('Your session has expired. Please sign in again.')
    }

    window.addEventListener('fintrack:session-expired', handleExpired)

    return () => {
      window.removeEventListener('fintrack:session-expired', handleExpired)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('fintrack_token')

    if (!token) {
      return
    }

    let active = true

    authAPI.me()
      .then((response) => {
        if (active) {
          setUser(response.data.user ?? response.data)
        }
      })
      .catch(() => {
        localStorage.removeItem('fintrack_token')

        if (active) {
          setUser(null)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (mode === 'register' && form.password !== form.password_confirmation) {
      setError('Your passwords do not match.')
      return
    }

    if (form.password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }

    setSubmitting(true)

    try {
      const response = mode === 'login'
        ? await authAPI.login({
            email: form.email,
            password: form.password,
          })
        : await authAPI.register({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            password_confirmation: form.password_confirmation,
          })

      const data = response.data

      if (!data.token) {
        throw new Error(
          'Authentication succeeded, but no API token was returned.'
        )
      }

      localStorage.setItem('fintrack_token', data.token)
      setUser(data.user ?? {
        name: form.name,
        email: form.email,
      })
      setForm(initialForm)
    } catch (err) {
      const responseData = err.response?.data

      if (responseData?.errors) {
        const firstError = Object.values(responseData.errors).flat()[0]
        setError(firstError || 'Please check your details and try again.')
      } else {
        setError(
          responseData?.message ||
          err.message ||
          'Unable to connect. Please try again.'
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {
      // Clear the local session even if the API request fails.
    }

    localStorage.removeItem('fintrack_token')
    setUser(null)
    setForm(initialForm)
    setMode('login')
    setNotice('')
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <img
          src="/finnet-logo.png"
          alt="Finnet logo"
          style={styles.logoImage}
        />
        <h2 style={{ margin: '14px 0 5px', color: 'var(--color-text)' }}>
          FinTrack
        </h2>
        <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
          Checking your session...
        </p>
      </div>
    )
  }

  if (user) {
    return (
      <App onLogout={handleLogout} />
    )
  }

  const isRegister = mode === 'register'

  return (
    <div style={styles.page}>
      <div style={styles.authCard}>
        <div style={styles.logoArea}>
          <img
            src="/finnet-logo.png"
            alt="Finnet logo"
            style={styles.logoImage}
          />
          <h1 style={styles.brandName}>FinTrack</h1>
          <p style={styles.brandSubtitle}>by Finnet Technologies</p>
        </div>

        <div style={styles.headingArea}>
          <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          <p>
            {isRegister
              ? 'Get started with smarter financial tracking.'
              : 'Sign in to manage your portfolios and transactions.'}
          </p>
        </div>

        {notice && (
          <div role="status" style={styles.notice}>
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={styles.field}>
              <label style={styles.label} htmlFor="auth-name">
                Full name
              </label>
              <div style={styles.inputWrapper}>
                <UserRound size={18} style={styles.inputIcon} />
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  style={styles.input}
                />
              </div>
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label} htmlFor="auth-email">
              Email address
            </label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="auth-password">
              Password
            </label>
            <div style={styles.inputWrapper}>
              <LockKeyhole size={18} style={styles.inputIcon} />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                style={styles.eyeButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div style={styles.field}>
              <label
                style={styles.label}
                htmlFor="auth-confirm-password"
              >
                Confirm password
              </label>
              <div style={styles.inputWrapper}>
                <LockKeyhole size={18} style={styles.inputIcon} />
                <input
                  id="auth-confirm-password"
                  name="password_confirmation"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>
            </div>
          )}

          {error && (
            <div role="alert" style={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitButton,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting
              ? 'Please wait...'
              : isRegister
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <div style={styles.switchArea}>
          {isRegister
            ? 'Already have an account?'
            : "Don't have an account?"}
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register')
              setForm(initialForm)
              setError('')
              setShowPassword(false)
            }}
            style={styles.switchButton}
          >
            {isRegister ? 'Sign in' : 'Create account'}
          </button>
        </div>

        <div style={styles.footer}>
          © 2026 FinTrack by Finnet Technologies
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '30px 16px',
    background: 'var(--color-background)',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  authCard: {
    width: '100%',
    maxWidth: 440,
    padding: '38px 34px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 18,
    boxShadow: '0 15px 50px rgba(25,36,58,0.07)',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logoImage: {
    display: 'block',
    height: 56,
    width: 'auto',
    maxWidth: '100%',
    margin: '0 auto',
  },
  brandName: {
    margin: '13px 0 2px',
    color: 'var(--color-text)',
    fontSize: 26,
    fontWeight: 800,
  },
  brandSubtitle: {
    margin: 0,
    color: 'var(--color-muted)',
    fontSize: 12,
  },
  headingArea: {
    marginBottom: 25,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--color-border)',
    borderRadius: 9,
    minHeight: 47,
    padding: '0 12px',
    background: 'var(--color-surface)',
  },
  inputIcon: {
    color: 'var(--color-muted)',
    flexShrink: 0,
  },
  input: {
    width: '100%',
    minWidth: 0,
    border: 'none',
    outline: 'none',
    padding: '12px 10px',
    fontSize: 14,
    color: 'var(--color-text)',
    background: 'transparent',
  },
  eyeButton: {
    border: 'none',
    background: 'transparent',
    color: 'var(--color-muted)',
    cursor: 'pointer',
    display: 'flex',
    padding: 5,
  },
  submitButton: {
    width: '100%',
    minHeight: 48,
    border: 'none',
    borderRadius: 9,
    background: 'var(--color-accent)',
    color: 'var(--color-on-accent)',
    fontSize: 14,
    fontWeight: 700,
    marginTop: 8,
  },
  notice: {
    padding: '11px 13px',
    marginBottom: 18,
    borderRadius: 8,
    background: 'var(--color-accent-soft)',
    color: 'var(--color-primary)',
    fontSize: 13,
  },
  error: {
    padding: '11px 13px',
    marginBottom: 14,
    borderRadius: 8,
    background: '#fdecea',
    color: 'var(--color-negative)',
    fontSize: 13,
  },
  switchArea: {
    textAlign: 'center',
    marginTop: 25,
    color: 'var(--color-muted)',
    fontSize: 13,
  },
  switchButton: {
    marginLeft: 5,
    border: 'none',
    background: 'transparent',
    color: 'var(--color-primary)',
    fontWeight: 700,
    cursor: 'pointer',
  },
  footer: {
    borderTop: '1px solid var(--color-border)',
    marginTop: 28,
    paddingTop: 19,
    textAlign: 'center',
    color: 'var(--color-muted)',
    fontSize: 11,
  },
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'var(--color-background)',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
}