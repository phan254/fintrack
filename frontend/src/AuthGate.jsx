
import { useEffect, useState } from 'react'
import {
  CircleDollarSign,
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
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.brandIcon}>
          <CircleDollarSign size={30} />
        </div>
        <h2 style={{ margin: '14px 0 5px', color: '#19243a' }}>
          FinTrack
        </h2>
        <p style={{ color: '#8992a3', fontSize: 14 }}>
          Checking your session...
        </p>
      </div>
    )
  }

  if (user) {
    return (
      <>
        <App />
        <button
          onClick={handleLogout}
          title="Sign out of FinTrack"
          style={styles.logoutButton}
        >
          Sign out
        </button>
      </>
    )
  }

  const isRegister = mode === 'register'

  return (
    <div style={styles.page}>
      <div style={styles.authCard}>
        <div style={styles.logoArea}>
          <div style={styles.brandIcon}>
            <CircleDollarSign size={30} />
          </div>
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
    background: '#f5f7fb',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  authCard: {
    width: '100%',
    maxWidth: 440,
    padding: '38px 34px',
    background: '#fff',
    border: '1px solid #edf0f5',
    borderRadius: 18,
    boxShadow: '0 15px 50px rgba(25,36,58,0.07)',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: 32,
  },
  brandIcon: {
    width: 58,
    height: 58,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    background: '#19243a',
    color: '#fff',
  },
  brandName: {
    margin: '13px 0 2px',
    color: '#19243a',
    fontSize: 26,
    fontWeight: 800,
  },
  brandSubtitle: {
    margin: 0,
    color: '#8992a3',
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
    color: '#344054',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #dfe4ec',
    borderRadius: 9,
    minHeight: 47,
    padding: '0 12px',
    background: '#fff',
  },
  inputIcon: {
    color: '#9299a8',
    flexShrink: 0,
  },
  input: {
    width: '100%',
    minWidth: 0,
    border: 'none',
    outline: 'none',
    padding: '12px 10px',
    fontSize: 14,
    color: '#19243a',
    background: 'transparent',
  },
  eyeButton: {
    border: 'none',
    background: 'transparent',
    color: '#8992a3',
    cursor: 'pointer',
    display: 'flex',
    padding: 5,
  },
  submitButton: {
    width: '100%',
    minHeight: 48,
    border: 'none',
    borderRadius: 9,
    background: '#315eea',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    marginTop: 8,
  },
  error: {
    padding: '11px 13px',
    marginBottom: 14,
    borderRadius: 8,
    background: '#fff0f0',
    color: '#bd3030',
    fontSize: 13,
  },
  switchArea: {
    textAlign: 'center',
    marginTop: 25,
    color: '#737d90',
    fontSize: 13,
  },
  switchButton: {
    marginLeft: 5,
    border: 'none',
    background: 'transparent',
    color: '#315eea',
    fontWeight: 700,
    cursor: 'pointer',
  },
  footer: {
    borderTop: '1px solid #edf0f5',
    marginTop: 28,
    paddingTop: 19,
    textAlign: 'center',
    color: '#a0a7b4',
    fontSize: 11,
  },
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f5f7fb',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  logoutButton: {
    position: 'fixed',
    top: 18,
    right: 20,
    zIndex: 1000,
    padding: '9px 15px',
    border: '1px solid #dfe4ec',
    borderRadius: 8,
    background: '#fff',
    color: '#19243a',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 3px 12px rgba(25,36,58,0.08)',
  },
}
