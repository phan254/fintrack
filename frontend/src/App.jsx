import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, ArrowLeftRight, PieChart, Settings,
  Bell, Search, Plus, TrendingUp, TrendingDown, ArrowUpRight,
  ArrowDownLeft, Menu, X, MoreHorizontal, Download,
  BriefcaseBusiness, ShoppingCart,
  RefreshCw, Banknote, Trash2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  portfolioAPI,
  transactionAPI,
  holdingAPI,
} from './api'
import './App.css'

// Keep the chart reference date outside component rendering.
const chartNow = new Date()

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Portfolios', icon: Wallet },
  { label: 'Transactions', icon: ArrowLeftRight },
  { label: 'Holdings', icon: PieChart },
]

const instruments = [
  {
    symbol: 'SCOM',
    name: 'Safaricom PLC',
    category: 'Stock',
    assetType: 'stock',
  },
  {
    symbol: 'KCB',
    name: 'KCB Group',
    category: 'Stock',
    assetType: 'stock',
  },
  {
    symbol: 'EQTY',
    name: 'Equity Group',
    category: 'Stock',
    assetType: 'stock',
  },
  {
    symbol: 'T-BILL-91',
    name: '91-Day Treasury Bill',
    category: 'Treasury Bill',
    assetType: 'bond',
  },
]

const today = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset()

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10)
}

const money = (amount, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)

const numberFormat = (amount) =>
  new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: 4,
  }).format(Number(amount) || 0)

const formatDate = (date) => {
  if (!date) return '—'

  const parsed = new Date(`${String(date).slice(0, 10)}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return '—'

  return parsed.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getResponseData = (response) => {
  const payload = response?.data?.data ?? response?.data

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data

  return []
}

const getTransactionColor = (type) => {
  if (type === 'income') return 'green'
  if (type === 'buy') return 'blue'
  if (type === 'sell') return 'purple'
  return 'orange'
}

const getErrorMessage = (error) => {
  const validationErrors = error?.response?.data?.errors

  if (validationErrors) {
    return Object.values(validationErrors).flat().join(' ')
  }

  return error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
}

const emptyTransactionForm = () => ({
  type: 'income',
  name: '',
  category: 'Salary',
  amount: '',
  date: today(),
  description: '',
})

const emptyTradeForm = () => ({
  type: 'buy',
  instrument: 'SCOM',
  quantity: '',
  unit_price: '',
  trade_date: today(),
  description: '',
})

const emptyPortfolioForm = () => ({
  name: '',
  client_name: '',
  description: '',
  currency: 'KES',
  initial_balance: '0',
})

// URL for each page in the app.
const pageRoutes = {
  Dashboard: '/',
  Portfolios: '/portfolios',
  Transactions: '/transactions',
  Holdings: '/holdings',
  Settings: '/settings',
}

const pathToPage = Object.fromEntries(
  Object.entries(pageRoutes).map(([page, path]) => [path, page]),
)

function App({ onLogout }) {
  const routerLocation = useLocation()
  const navigate = useNavigate()

  const activePage =
    pathToPage[routerLocation.pathname.replace(/\/+$/, '') || '/'] ||
    'Dashboard'

  const setActivePage = (page) => navigate(pageRoutes[page] || '/')

  const [mobileMenu, setMobileMenu] = useState(false)

  const [period, setPeriod] = useState('This year')
  const [filter, setFilter] = useState('All')
  const [sortOrder, setSortOrder] = useState('newest')
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [showTradeModal, setShowTradeModal] = useState(false)

  const [editingPortfolio, setEditingPortfolio] = useState(null)

  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')

  const [transactions, setTransactions] = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [holdings, setHoldings] = useState([])
  const [summary, setSummary] = useState(null)

  const [activePortfolioId, setActivePortfolioId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [portfolioSaving, setPortfolioSaving] = useState(false)
  const [tradeSaving, setTradeSaving] = useState(false)

  const [form, setForm] = useState(emptyTransactionForm)
  const [tradeForm, setTradeForm] = useState(emptyTradeForm)
  const [portfolioForm, setPortfolioForm] = useState(emptyPortfolioForm)

  // LOAD DASHBOARD DATA

  const loadDashboard = useCallback(async (preferredPortfolioId = null) => {
    setLoading(true)
    setPageError('')

    try {
      const portfolioResponse = await portfolioAPI.getAll()
      const portfolioData = getResponseData(portfolioResponse)

      setPortfolios(portfolioData)

      if (portfolioData.length === 0) {
        setActivePortfolioId(null)
        setTransactions([])
        setHoldings([])
        setSummary(null)
        return
      }

      const selectedPortfolio =
        portfolioData.find(
          (portfolio) =>
            String(portfolio.id) === String(preferredPortfolioId),
        ) || portfolioData[0]

      setActivePortfolioId(selectedPortfolio.id)

      const [
        transactionResponse,
        holdingResponse,
        summaryResponse,
      ] = await Promise.all([
        transactionAPI.getAll({
          portfolio_id: selectedPortfolio.id,
          per_page: 100,
        }),
        holdingAPI.getAll({
          portfolio_id: selectedPortfolio.id,
          per_page: 100,
        }),
        portfolioAPI.getSummary(selectedPortfolio.id),
      ])

      const transactionData = getResponseData(transactionResponse)
      const holdingData = getResponseData(holdingResponse)

      const summaryData =
        summaryResponse?.data?.data ?? summaryResponse?.data

      const mappedTransactions = transactionData.map((item) => ({
        id: item.id,
        name: item.name || item.instrument || 'Transaction',
        instrument: item.instrument || '',
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        category: item.category || 'General',
        date: String(
          item.trade_date || item.transaction_date || item.date || '',
        ).slice(0, 10),
        amount: Number(item.amount) || 0,
        type: item.type || 'expense',
        description: item.description || '',
        status: item.status || 'completed',
        color: getTransactionColor(item.type),
      }))

      setTransactions(mappedTransactions)
      setHoldings(holdingData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Dashboard loading error:', error)
      setPageError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  // Defer the initial data request to avoid synchronous state updates
  // directly inside the effect.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboard()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  // CURRENT PORTFOLIO

  const activePortfolio = portfolios.find(
    (portfolio) => String(portfolio.id) === String(activePortfolioId),
  )

  const activeCurrency = activePortfolio?.currency || 'KES'

  const totalIncome = Number(summary?.income) || 0
  const totalExpenses = Number(summary?.expenses) || 0
  const portfolioValue = Number(summary?.total_portfolio_value) || 0
  const netProfit = totalIncome - totalExpenses

  // PORTFOLIO MANAGEMENT

  const openPortfolioModal = (portfolio = null) => {
    setEditingPortfolio(portfolio)

    setPortfolioForm({
      name: portfolio?.name || '',
      client_name: portfolio?.client_name || '',
      description: portfolio?.description || '',
      currency: portfolio?.currency || 'KES',
      initial_balance: portfolio?.initial_balance ?? '0',
    })

    setFormError('')
    setShowPortfolioModal(true)
  }

  const closePortfolioModal = () => {
    if (portfolioSaving) return

    setShowPortfolioModal(false)
    setEditingPortfolio(null)
    setFormError('')
  }

  const handlePortfolioChange = (event) => {
    const { name, value } = event.target

    setPortfolioForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const savePortfolio = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!portfolioForm.name.trim()) {
      setFormError('Portfolio name is required.')
      return
    }

    const openingBalance = Number(portfolioForm.initial_balance)

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setFormError('Enter a valid opening balance.')
      return
    }

    setPortfolioSaving(true)

    try {
      const payload = {
        name: portfolioForm.name.trim(),
        client_name: portfolioForm.client_name.trim() || null,
        description: portfolioForm.description.trim(),
        currency: portfolioForm.currency,
        initial_balance: openingBalance,
      }

      let selectedId = activePortfolioId

      if (editingPortfolio) {
        await portfolioAPI.update(editingPortfolio.id, payload)
        selectedId = editingPortfolio.id
      } else {
        const response = await portfolioAPI.create(payload)
        const created = response?.data?.data ?? response?.data

        if (created?.id) selectedId = created.id
      }

      setShowPortfolioModal(false)
      setEditingPortfolio(null)

      await loadDashboard(selectedId)
    } catch (error) {
      console.error('Portfolio save error:', error)
      setFormError(getErrorMessage(error))
    } finally {
      setPortfolioSaving(false)
    }
  }

  const deletePortfolio = async (portfolio) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${portfolio.name}"? Its associated financial records may also be deleted.`,
    )

    if (!confirmed) return

    try {
      await portfolioAPI.delete(portfolio.id)

      const nextPortfolio = portfolios.find(
        (item) => String(item.id) !== String(portfolio.id),
      )

      const nextId =
        String(activePortfolioId) === String(portfolio.id)
          ? nextPortfolio?.id ?? null
          : activePortfolioId

      await loadDashboard(nextId)
    } catch (error) {
      console.error('Portfolio deletion error:', error)
      setPageError(getErrorMessage(error))
    }
  }

  const switchPortfolio = async (id) => {
    setActivePortfolioId(id)
    await loadDashboard(id)
  }

  // TRANSACTION FILTERING AND SORTING

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter((transaction) => {
      const matchesType =
        filter === 'All' ||
        transaction.type === filter.toLowerCase()

      const search = searchTerm.trim().toLowerCase()

      const matchesSearch =
        !search ||
        transaction.name.toLowerCase().includes(search) ||
        transaction.category.toLowerCase().includes(search) ||
        transaction.description.toLowerCase().includes(search) ||
        transaction.instrument.toLowerCase().includes(search)

      return matchesType && matchesSearch
    })

    result = [...result].sort((a, b) => {
      if (sortOrder === 'newest') return String(b.date).localeCompare(String(a.date))
      if (sortOrder === 'oldest') return String(a.date).localeCompare(String(b.date))
      if (sortOrder === 'highest') return b.amount - a.amount
      return a.amount - b.amount
    })

    return result
  }, [transactions, filter, searchTerm, sortOrder])

  // PORTFOLIO ALLOCATION

  const allocation = useMemo(() => {
    const entries = summary?.allocation || []

    const total = entries.reduce(
      (sum, item) => sum + (Number(item.value) || 0),
      0,
    )

    const colors = {
      stock: 'blue',
      stocks: 'blue',
      bond: 'purple',
      bonds: 'purple',
      cash: 'green',
      crypto: 'orange',
      other: 'orange',
    }

    return entries.map((item) => ({
      name: String(item.asset_type || 'Other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value: Number(item.value) || 0,
      percentage: total > 0
        ? ((Number(item.value) || 0) / total) * 100
        : 0,
      color: colors[String(item.asset_type || 'other').toLowerCase()] || 'orange',
    }))
  }, [summary])

  // HOLDINGS DATA

  const displayedHoldings = useMemo(() => {
    if (Array.isArray(summary?.instruments) && summary.instruments.length) {
      return summary.instruments
    }

    return holdings.map((holding) => {
      const quantity = Number(holding.quantity) || 0
      const averageCost = Number(holding.purchase_price) || 0
      const currentPrice = Number(holding.current_price) || 0

      return {
        id: holding.id,
        instrument: holding.symbol || holding.asset_name,
        asset_name: holding.asset_name,
        asset_type: holding.asset_type,
        quantity,
        average_cost: averageCost,
        current_price: currentPrice,
        total_invested: quantity * averageCost,
        total_value: quantity * currentPrice,
        unrealized_gain_loss: quantity * (currentPrice - averageCost),
      }
    })
  }, [summary, holdings])

  // CHART DATA

  const chartData = useMemo(() => {
    const now = chartNow
    const months = period === 'Last 6 months' ? 6 : 12
    const startMonth = period === 'Last 6 months'
      ? now.getMonth() - 5
      : 0

    if (period === 'Last 30 days') {
      const recent = transactions.filter((item) => {
        if (!item.date) return false

        const transactionDate = new Date(`${item.date}T00:00:00`)
        const daysAgo = (now - transactionDate) / (1000 * 60 * 60 * 24)

        return daysAgo >= 0 && daysAgo <= 30
      })

      const total = recent.reduce((sum, item) => {
        return sum + (
          item.type === 'income' || item.type === 'sell'
            ? item.amount
            : -item.amount
        )
      }, 0)

      return [{ month: 'Last 30 days', value: total }]
    }

    const data = []

    for (let index = 0; index < months; index += 1) {
      const date = new Date(
        now.getFullYear(),
        startMonth + index,
        1,
      )

      const monthTransactions = transactions.filter((transaction) => {
        if (!transaction.date) return false

        const transactionDate = new Date(`${transaction.date}T00:00:00`)

        return transactionDate.getFullYear() === date.getFullYear() &&
          transactionDate.getMonth() === date.getMonth()
      })

      const income = monthTransactions
        .filter((item) => item.type === 'income' || item.type === 'sell')
        .reduce((sum, item) => sum + item.amount, 0)

      const expenses = monthTransactions
        .filter((item) => item.type === 'expense' || item.type === 'buy')
        .reduce((sum, item) => sum + item.amount, 0)

      data.push({
        month: date.toLocaleDateString('en-KE', { month: 'short' }),
        value: income - expenses,
      })
    }

    return data
  }, [transactions, period])

  // OPEN INCOME / EXPENSE MODAL

  const openModal = () => {
    if (!activePortfolioId) {
      setPageError('Create a portfolio before recording transactions.')
      setActivePage('Portfolios')
      return
    }

    setForm(emptyTransactionForm())
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return

    setShowModal(false)
    setFormError('')
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleAddTransaction = async (event) => {
    event.preventDefault()
    setFormError('')

    const amount = Number(form.amount)

    if (!form.name.trim()) {
      setFormError('Please enter a transaction name.')
      return
    }

    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a valid amount greater than zero.')
      return
    }

    if (!form.date || !activePortfolioId) {
      setFormError('Select a date and portfolio.')
      return
    }

    setSaving(true)

    try {
      await transactionAPI.create({
        portfolio_id: activePortfolioId,
        name: form.name.trim(),
        category: form.category,
        type: form.type,
        amount,
        transaction_date: form.date,
        description: form.description.trim(),
        status: 'completed',
      })

      setShowModal(false)
      setForm(emptyTransactionForm())
      setFilter('All')
      setSearchTerm('')

      await loadDashboard(activePortfolioId)
    } catch (error) {
      console.error('Transaction creation error:', error)
      setFormError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  // BUY / SELL INVESTMENT TRANSACTIONS

  const openTradeModal = (type = 'buy') => {
    if (!activePortfolioId) {
      setPageError('Create a portfolio before recording an investment.')
      setActivePage('Portfolios')
      return
    }

    setTradeForm({
      ...emptyTradeForm(),
      type,
    })

    setFormError('')
    setShowTradeModal(true)
  }

  const closeTradeModal = () => {
    if (tradeSaving) return

    setShowTradeModal(false)
    setFormError('')
  }

  const handleTradeChange = (event) => {
    const { name, value } = event.target

    setTradeForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const selectedInstrument = instruments.find(
    (item) => item.symbol === tradeForm.instrument,
  ) || instruments[0]

  const tradeTotal =
    (Number(tradeForm.quantity) || 0) *
    (Number(tradeForm.unit_price) || 0)

  const selectedHolding = displayedHoldings.find(
    (item) => item.instrument === tradeForm.instrument,
  )

  const availableQuantity = Number(selectedHolding?.quantity) || 0

  const handleAddTrade = async (event) => {
    event.preventDefault()
    setFormError('')

    const quantity = Number(tradeForm.quantity)
    const unitPrice = Number(tradeForm.unit_price)

    if (!activePortfolioId) {
      setFormError('No portfolio is selected.')
      return
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError('Quantity must be greater than zero.')
      return
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setFormError('Unit price must be greater than zero.')
      return
    }

    if (!tradeForm.trade_date) {
      setFormError('Please select the trade date.')
      return
    }

    if (
      tradeForm.type === 'sell' &&
      quantity > availableQuantity
    ) {
      setFormError(
        `You only hold ${numberFormat(availableQuantity)} units of ${tradeForm.instrument}. You cannot sell ${numberFormat(quantity)}.`,
      )
      return
    }

    setTradeSaving(true)

    try {
      const payload = {
        portfolio_id: activePortfolioId,
        name: `${tradeForm.type.toUpperCase()} ${selectedInstrument.name}`,
        category: selectedInstrument.category,
        type: tradeForm.type,
        instrument: selectedInstrument.symbol,
        quantity,
        unit_price: unitPrice,
        trade_date: tradeForm.trade_date,
        transaction_date: tradeForm.trade_date,
        amount: Number((quantity * unitPrice).toFixed(2)),
        description: tradeForm.description.trim(),
        status: 'completed',
      }

      await transactionAPI.create(payload)

      setShowTradeModal(false)
      setTradeForm(emptyTradeForm())
      setFilter('All')
      setSearchTerm('')
      setSortOrder('newest')

      await loadDashboard(activePortfolioId)
    } catch (error) {
      console.error('Investment transaction error:', error)
      setFormError(getErrorMessage(error))
    } finally {
      setTradeSaving(false)
    }
  }

  const allocationBarClasses = {
    blue: 'bar-stocks',
    purple: 'bar-bonds',
    green: 'bar-cash',
    orange: 'bar-other',
  }

  // TRANSACTION TABLE

  const transactionTable = (
    <div className="panel transactions-panel">
      <div className="panel-header transaction-heading">
        <div>
          <h3>{activePage === 'Transactions' ? 'All transactions' : 'Recent transactions'}</h3>
          <p>Monitor your latest financial activities.</p>
        </div>

        <div className="transaction-actions">
          <select
            className="period-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Income</option>
            <option>Expense</option>
            <option>Buy</option>
            <option>Sell</option>
          </select>

          <select
            className="period-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>

          <button
            className="export-button"
            onClick={() => window.print()}
          >
            <Download size={16} /> Print
          </button>
        </div>
      </div>

      <div className="transaction-search">
        <Search size={16} />
        <input
          type="search"
          placeholder="Search by name, category or instrument..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>TRANSACTION</th>
              <th>CATEGORY / INSTRUMENT</th>
              <th>DATE</th>
              <th>QUANTITY</th>
              <th>UNIT PRICE</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
            </tr>
          </thead>

          <tbody>
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>
                  <div className="transaction-name">
                    <div className={`transaction-avatar ${transaction.color}`}>
                      {transaction.name.charAt(0).toUpperCase()}
                    </div>
                    <strong>{transaction.name}</strong>
                  </div>
                </td>

                <td>
                  {transaction.instrument
                    ? `${transaction.category} · ${transaction.instrument}`
                    : transaction.category}
                </td>

                <td>{formatDate(transaction.date)}</td>

                <td>
                  {['buy', 'sell'].includes(transaction.type)
                    ? numberFormat(transaction.quantity)
                    : '—'}
                </td>

                <td>
                  {['buy', 'sell'].includes(transaction.type)
                    ? money(transaction.unit_price, activeCurrency)
                    : '—'}
                </td>

                <td className={
                  transaction.type === 'income' || transaction.type === 'sell'
                    ? 'income'
                    : 'expense'
                }>
                  {transaction.type === 'income' || transaction.type === 'sell'
                    ? '+'
                    : '-'} {money(transaction.amount, activeCurrency)}
                </td>

                <td>
                  <span className="status-completed">
                    {transaction.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTransactions.length === 0 && (
          <div className="empty-state">
            No transactions match your search.
          </div>
        )}
      </div>

      <div className="table-footer">
        Showing {filteredTransactions.length} of {transactions.length} loaded transactions
      </div>
    </div>
  )

  return (
    <div className="app-layout">

      {mobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <img
            src="/finnet-logo.png"
            alt="Finnet logo"
            style={{
              height: 40,
              width: 'auto',
              background: 'var(--color-surface)',
              borderRadius: 8,
              padding: 4,
            }}
          />

          <div>
            <h2>FinTrack</h2>
            <span>by Finnet Technologies</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={21} />
          </button>
        </div>

        <div className="nav-section">
          <p className="nav-heading">WORKSPACE</p>

          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.label}
                className={`nav-link ${activePage === item.label ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(item.label)
                  setMobileMenu(false)
                  setPageError('')
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="sidebar-bottom">
          <p className="nav-heading">PREFERENCES</p>

          <button
            className={`nav-link ${activePage === 'Settings' ? 'active' : ''}`}
            onClick={() => {
              setActivePage('Settings')
              setMobileMenu(false)
            }}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="upgrade-card">
            <div className="upgrade-icon">
              <TrendingUp size={20} />
            </div>

            <h4>Grow your wealth</h4>

            <p>
              Keep track of your investments and financial goals.
            </p>

            <button onClick={() => setActivePage('Portfolios')}>
              Explore portfolios <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="profile">
            <div className="avatar">FT</div>

            <div className="profile-info">
              <strong>FinTrack Demo</strong>
              <span>Personal account</span>
            </div>

            <MoreHorizontal size={20} />
          </div>
        </div>
      </aside>

      <main className="main-content">

        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              <Menu size={23} />
            </button>

            <div>
              <p className="breadcrumb">Workspace / {activePage}</p>
              <h1>{activePage}</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="search-button">
              <Search size={18} />
              <span>FinTrack workspace</span>
            </div>

            <button className="notification-button" aria-label="Notifications">
              <Bell size={20} />
              <i />
            </button>

            <div className="top-avatar">FT</div>

            {onLogout && (
              <button
                type="button"
                className="cancel-button"
                onClick={onLogout}
                title="Sign out of FinTrack"
              >
                Sign out
              </button>
            )}
          </div>
        </header>

        {pageError && (
          <div className="form-error" role="alert" style={{ margin: 20 }}>
            {pageError}
            <button onClick={() => loadDashboard(activePortfolioId)}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="dashboard">
            <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
              Loading your financial information...
            </div>
          </div>
        ) : portfolios.length === 0 && activePage !== 'Portfolios' ? (
          <div className="dashboard">
            <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
              <Wallet size={36} />
              <h3>No portfolio found</h3>
              <p>Create your first portfolio to start tracking your finances.</p>

              <button
                className="primary-button"
                onClick={() => setActivePage('Portfolios')}
              >
                Go to portfolios
              </button>
            </div>
          </div>
        ) : (

          <>
            {/* DASHBOARD */}

            {activePage === 'Dashboard' && (
              <div className="dashboard">

                <section className="welcome-row">
                  <div>
                    <h2>Welcome back!</h2>
                    <p>Here's what's happening with your finances today.</p>

                    {portfolios.length > 1 && (
                      <select
                        className="period-select"
                        style={{ marginTop: 12 }}
                        value={activePortfolioId || ''}
                        onChange={(e) => switchPortfolio(e.target.value)}
                      >
                        {portfolios.map((portfolio) => (
                          <option key={portfolio.id} value={portfolio.id}>
                            {portfolio.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="cancel-button"
                      onClick={() => openTradeModal('buy')}
                    >
                      <Plus size={17} /> Buy investment
                    </button>

                    <button className="primary-button" onClick={openModal}>
                      <Plus size={18} /> Add transaction
                    </button>
                  </div>
                </section>

                <section className="stats-grid">

                  <div className="stat-card balance-card">
                    <div className="stat-top">
                      <span>Total portfolio value</span>
                      <div className="stat-icon navy-icon">
                        <Wallet size={19} />
                      </div>
                    </div>

                    <h2>{money(portfolioValue, activeCurrency)}</h2>

                    <div className="stat-footer">
                      <span className="trend positive">
                        <TrendingUp size={15} /> Current value
                      </span>
                      <span>Based on recorded values</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Total income</span>
                      <div className="stat-icon green-icon">
                        <ArrowDownLeft size={19} />
                      </div>
                    </div>

                    <h2>{money(totalIncome, activeCurrency)}</h2>

                    <div className="stat-footer">
                      <span className="trend positive">
                        <TrendingUp size={15} /> Income
                      </span>
                      <span>Completed transactions</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Total expenses</span>
                      <div className="stat-icon orange-icon">
                        <ArrowUpRight size={19} />
                      </div>
                    </div>

                    <h2>{money(totalExpenses, activeCurrency)}</h2>

                    <div className="stat-footer">
                      <span className="trend negative">
                        <TrendingDown size={15} /> Expenses
                      </span>
                      <span>Completed transactions</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Net cash flow</span>
                      <div className="stat-icon purple-icon">
                        <BriefcaseBusiness size={19} />
                      </div>
                    </div>

                    <h2>{money(netProfit, activeCurrency)}</h2>

                    <div className="stat-footer">
                      <span className={`trend ${netProfit >= 0 ? 'positive' : 'negative'}`}>
                        {netProfit >= 0
                          ? <TrendingUp size={15} />
                          : <TrendingDown size={15} />}
                        {netProfit >= 0 ? 'Positive' : 'Negative'}
                      </span>
                      <span>Income minus expenses</span>
                    </div>
                  </div>

                </section>

                <section className="content-grid">

                  <div className="panel portfolio-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Transaction activity</h3>
                        <p>Net income, expenses and investment activity.</p>
                      </div>

                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="period-select"
                      >
                        <option>This year</option>
                        <option>Last 30 days</option>
                        <option>Last 6 months</option>
                      </select>
                    </div>

                    <div className="chart-summary">
                      <h2>{money(netProfit, activeCurrency)}</h2>
                      <span className="trend positive">
                        <TrendingUp size={15} /> Net cash flow
                      </span>
                      <span className="chart-caption">
                        Based on loaded transactions
                      </span>
                    </div>

                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 15, right: 10, left: -18, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="portfolioGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            strokeDasharray="4 4"
                            vertical={false}
                            stroke="var(--color-border)"
                          />

                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                            dy={10}
                          />

                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                            tickFormatter={(value) => (Math.abs(value) >= 1000 ? `${value / 1000}k` : String(value))}
                          />

                          <Tooltip
                            formatter={(value) => [
                              money(value, activeCurrency),
                              'Net activity',
                            ]}
                          />

                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--chart-1)"
                            strokeWidth={3}
                            fill="url(#portfolioGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="panel allocation-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Portfolio allocation</h3>
                        <p>Where your money is invested.</p>
                      </div>

                      <button className="more-button" aria-label="More options">
                        <MoreHorizontal size={21} />
                      </button>
                    </div>

                    <div className="allocation-total">
                      <span>Total invested</span>
                      <h2>{money(summary?.total_investment_cost || 0, activeCurrency)}</h2>
                    </div>

                    <div className="allocation-bar">
                      {allocation.map((item) => (
                        <div
                          key={item.name}
                          className={allocationBarClasses[item.color]}
                          style={{ width: `${item.percentage}%` }}
                          title={`${item.name}: ${item.percentage.toFixed(1)}%`}
                        />
                      ))}
                    </div>

                    <div className="allocation-list">
                      {allocation.length > 0 ? allocation.map((item) => (
                        <div key={item.name}>
                          <span>
                            <i className={`dot dot-${item.color}`} />
                            {item.name}
                          </span>
                          <strong>{item.percentage.toFixed(1)}%</strong>
                        </div>
                      )) : (
                        <div className="empty-state">
                          No investment holdings recorded yet.
                        </div>
                      )}
                    </div>

                    <button
                      className="view-portfolio"
                      onClick={() => setActivePage('Holdings')}
                    >
                      View holdings <ArrowUpRight size={16} />
                    </button>
                  </div>

                </section>

                {transactionTable}

                <footer className="footer">
                  <span>© 2026 FinTrack by Finnet Technologies</span>
                  <span>Built for smarter financial decisions.</span>
                </footer>
              </div>
            )}

            {/* PORTFOLIOS */}

            {activePage === 'Portfolios' && (
              <div className="dashboard">
                <section className="welcome-row">
                  <div>
                    <h2>Your portfolios</h2>
                    <p>Create and manage investment portfolios.</p>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() => openPortfolioModal()}
                  >
                    <Plus size={18} /> New portfolio
                  </button>
                </section>

                {portfolios.length === 0 ? (
                  <div className="panel empty-state" style={{ padding: 40 }}>
                    <Wallet size={35} />
                    <h3>No portfolios yet</h3>
                    <p>Create your first portfolio to begin tracking investments.</p>
                    <button
                      className="primary-button"
                      onClick={() => openPortfolioModal()}
                    >
                      <Plus size={18} /> Create portfolio
                    </button>
                  </div>
                ) : (
                  <section className="stats-grid">
                    {portfolios.map((portfolio) => (
                      <div
                        className="panel"
                        key={portfolio.id}
                        style={{ padding: 22, minWidth: 0 }}
                      >
                        <div className="panel-header">
                          <div>
                            <h3>{portfolio.name}</h3>
                            <p>{portfolio.client_name || 'No client assigned'}</p>
                          </div>
                          <Wallet size={22} />
                        </div>

                        <h2 style={{ margin: '20px 0 8px' }}>
                          {money(portfolio.initial_balance, portfolio.currency || 'KES')}
                        </h2>

                        <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
                          {portfolio.currency || 'KES'} · Opening balance
                        </p>

                        <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
                          {portfolio.transactions_count || 0} transactions ·{' '}
                          {portfolio.holdings_count || 0} holdings
                        </p>

                        {portfolio.description && (
                          <p style={{ marginTop: 12, fontSize: 13 }}>
                            {portfolio.description}
                          </p>
                        )}

                        <div style={{
                          display: 'flex',
                          gap: 10,
                          marginTop: 20,
                          flexWrap: 'wrap',
                        }}>
                          <button
                            className="primary-button"
                            onClick={async () => {
                              await switchPortfolio(portfolio.id)
                              setActivePage('Dashboard')
                            }}
                          >
                            Open portfolio
                          </button>

                          <button
                            className="cancel-button"
                            onClick={() => openPortfolioModal(portfolio)}
                          >
                            Edit
                          </button>

                          <button
                            className="cancel-button"
                            onClick={() => deletePortfolio(portfolio)}
                          >
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            )}

            {/* TRANSACTIONS */}

            {activePage === 'Transactions' && (
              <div className="dashboard">
                <section className="welcome-row">
                  <div>
                    <h2>Transaction history</h2>
                    <p>View income, expenses, purchases and sales.</p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="cancel-button"
                      onClick={() => openTradeModal('buy')}
                    >
                      <Plus size={17} /> Buy
                    </button>

                    <button
                      className="cancel-button"
                      onClick={() => openTradeModal('sell')}
                    >
                      <ArrowUpRight size={17} /> Sell
                    </button>

                    <button className="primary-button" onClick={openModal}>
                      <Plus size={18} /> Add transaction
                    </button>
                  </div>
                </section>

                {transactionTable}
              </div>
            )}

            {/* HOLDINGS */}

            {activePage === 'Holdings' && (
              <div className="dashboard">
                <section className="welcome-row">
                  <div>
                    <h2>Your investment holdings</h2>
                    <p>Track the investments currently held in this portfolio.</p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="cancel-button"
                      onClick={() => openTradeModal('sell')}
                    >
                      <ArrowUpRight size={17} /> Sell
                    </button>

                    <button
                      className="primary-button"
                      onClick={() => openTradeModal('buy')}
                    >
                      <Plus size={18} /> Buy investment
                    </button>
                  </div>
                </section>

                <section className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Holdings value</span>
                      <div className="stat-icon navy-icon">
                        <Wallet size={19} />
                      </div>
                    </div>
                    <h2>{money(summary?.holdings_value || 0, activeCurrency)}</h2>
                    <div className="stat-footer">
                      <span>Recorded investment values</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Total invested</span>
                      <div className="stat-icon blue-icon">
                        <Banknote size={19} />
                      </div>
                    </div>
                    <h2>{money(summary?.total_investment_cost || 0, activeCurrency)}</h2>
                    <div className="stat-footer">
                      <span>Recorded purchase costs</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Unrealized gain / loss</span>
                      <div className="stat-icon green-icon">
                        <TrendingUp size={19} />
                      </div>
                    </div>
                    <h2>{money(summary?.unrealized_gain || 0, activeCurrency)}</h2>
                    <div className="stat-footer">
                      <span>Based on recorded prices</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Number of holdings</span>
                      <div className="stat-icon purple-icon">
                        <PieChart size={19} />
                      </div>
                    </div>
                    <h2>{displayedHoldings.filter((item) => Number(item.quantity) > 0).length}</h2>
                    <div className="stat-footer">
                      <span>Investment instruments</span>
                    </div>
                  </div>
                </section>

                <div className="panel transactions-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Investment positions</h3>
                      <p>Shares, units, average costs and recorded values.</p>
                    </div>

                    <button
                      className="export-button"
                      onClick={() => loadDashboard(activePortfolioId)}
                    >
                      <RefreshCw size={16} /> Refresh
                    </button>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>INSTRUMENT</th>
                          <th>TYPE</th>
                          <th>QUANTITY</th>
                          <th>AVERAGE COST</th>
                          <th>RECORDED PRICE</th>
                          <th>TOTAL INVESTED</th>
                          <th>CURRENT VALUE</th>
                          <th>GAIN / LOSS</th>
                        </tr>
                      </thead>

                      <tbody>
                        {displayedHoldings
                          .filter((holding) => Number(holding.quantity) > 0)
                          .map((holding, index) => {
                            const symbol = holding.instrument ||
                              holding.symbol ||
                              holding.asset_name ||
                              'Investment'

                            const instrumentInfo = instruments.find(
                              (item) => item.symbol === symbol,
                            )

                            const gain = Number(
                              holding.unrealized_gain_loss ??
                              holding.gain_loss ??
                              0,
                            )

                            return (
                              <tr key={holding.id || symbol || index}>
                                <td>
                                  <div className="transaction-name">
                                    <div className="transaction-avatar blue">
                                      {String(symbol).charAt(0)}
                                    </div>
                                    <div>
                                      <strong>{symbol}</strong>
                                      <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                                        {instrumentInfo?.name || holding.asset_name || symbol}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  {instrumentInfo?.category ||
                                    holding.asset_type ||
                                    'Investment'}
                                </td>

                                <td>{numberFormat(holding.quantity)}</td>
                                <td>{money(holding.average_cost ?? holding.purchase_price, activeCurrency)}</td>
                                <td>{money(holding.current_price, activeCurrency)}</td>
                                <td>{money(holding.total_invested, activeCurrency)}</td>
                                <td>{money(holding.total_value, activeCurrency)}</td>

                                <td className={gain >= 0 ? 'income' : 'expense'}>
                                  {money(gain, activeCurrency)}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>

                    {displayedHoldings.filter(
                      (holding) => Number(holding.quantity) > 0,
                    ).length === 0 && (
                      <div className="empty-state" style={{ padding: 35 }}>
                        <PieChart size={32} />
                        <h3>No investment holdings yet</h3>
                        <p>Record your first BUY transaction to see your investments here.</p>
                        <button
                          className="primary-button"
                          onClick={() => openTradeModal('buy')}
                        >
                          <Plus size={17} /> Buy investment
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="panel" style={{ padding: 20, marginTop: 20 }}>
                  <h3>Important pricing information</h3>
                  <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 8 }}>
                    Recorded prices are based on the prices entered when
                    transactions are recorded. They are not live Nairobi
                    Securities Exchange or Treasury Bill market prices.
                    Update market prices through your investment records when
                    you have verified current prices.
                  </p>
                </div>
              </div>
            )}

            {/* SETTINGS */}

            {activePage === 'Settings' && (
              <div className="placeholder-page">
                <div className="placeholder-icon">
                  <Settings size={30} />
                </div>
                <h2>Settings</h2>
                <p>
                  FinTrack account and application settings will be managed here.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setActivePage('Dashboard')}
                >
                  Back to dashboard
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* PORTFOLIO CREATE / EDIT MODAL */}

      {showPortfolioModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePortfolioModal()
          }}
        >
          <div
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-modal-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="portfolio-modal-title">
                  {editingPortfolio ? 'Edit portfolio' : 'Create portfolio'}
                </h2>
                <p>Enter your portfolio information.</p>
              </div>

              <button
                className="modal-close"
                onClick={closePortfolioModal}
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={savePortfolio}>
              <label className="form-label" htmlFor="portfolio-name">
                Portfolio name *
              </label>

              <input
                id="portfolio-name"
                name="name"
                value={portfolioForm.name}
                onChange={handlePortfolioChange}
                placeholder="e.g. Growth Investment Portfolio"
                maxLength={255}
                required
              />

              <label className="form-label" htmlFor="portfolio-client">
                Client name
              </label>

              <input
                id="portfolio-client"
                name="client_name"
                value={portfolioForm.client_name}
                onChange={handlePortfolioChange}
                placeholder="Client name"
                maxLength={255}
              />

              <label className="form-label" htmlFor="portfolio-description">
                Description
              </label>

              <textarea
                id="portfolio-description"
                name="description"
                value={portfolioForm.description}
                onChange={handlePortfolioChange}
                placeholder="Portfolio description (optional)"
                rows="2"
              />

              <div className="form-row">
                <div>
                  <label className="form-label" htmlFor="portfolio-currency">
                    Base currency *
                  </label>

                  <select
                    id="portfolio-currency"
                    name="currency"
                    value={portfolioForm.currency}
                    onChange={handlePortfolioChange}
                  >
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="portfolio-balance">
                    Opening balance *
                  </label>

                  <input
                    id="portfolio-balance"
                    name="initial_balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={portfolioForm.initial_balance}
                    onChange={handlePortfolioChange}
                    required
                  />
                </div>
              </div>

              {formError && (
                <p className="form-error" role="alert">{formError}</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closePortfolioModal}
                  disabled={portfolioSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={portfolioSaving}
                >
                  {portfolioSaving
                    ? 'Saving...'
                    : editingPortfolio
                      ? 'Update portfolio'
                      : 'Create portfolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INCOME / EXPENSE MODAL */}

      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="transaction-modal-title">Add transaction</h2>
                <p>Record a new income or expense.</p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction}>
              <label className="form-label">Transaction type</label>

              <div className="type-toggle">
                <button
                  type="button"
                  className={
                    form.type === 'income'
                      ? 'type-option selected income-option'
                      : 'type-option'
                  }
                  onClick={() => setForm((previous) => ({
                    ...previous,
                    type: 'income',
                    category: 'Salary',
                  }))}
                >
                  <ArrowDownLeft size={17} /> Income
                </button>

                <button
                  type="button"
                  className={
                    form.type === 'expense'
                      ? 'type-option selected expense-option'
                      : 'type-option'
                  }
                  onClick={() => setForm((previous) => ({
                    ...previous,
                    type: 'expense',
                    category: 'Utilities',
                  }))}
                >
                  <ArrowUpRight size={17} /> Expense
                </button>
              </div>

              <label className="form-label" htmlFor="transaction-name">
                Transaction name *
              </label>

              <input
                id="transaction-name"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="e.g. Monthly salary"
                maxLength={100}
                required
              />

              <div className="form-row">
                <div>
                  <label className="form-label" htmlFor="transaction-amount">
                    Amount *
                  </label>

                  <input
                    id="transaction-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={handleFormChange}
                    placeholder="e.g. 15000"
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="transaction-date">
                    Date *
                  </label>

                  <input
                    id="transaction-date"
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <label className="form-label" htmlFor="transaction-category">
                Category *
              </label>

              <select
                id="transaction-category"
                name="category"
                value={form.category}
                onChange={handleFormChange}
                required
              >
                {(form.type === 'income'
                  ? ['Salary', 'Business', 'Investment', 'Freelance', 'Other']
                  : ['Food', 'Transport', 'Utilities', 'Shopping', 'Business', 'Healthcare', 'Other']
                ).map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>

              <label className="form-label" htmlFor="transaction-description">
                Description
              </label>

              <textarea
                id="transaction-description"
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder="Add extra details (optional)"
                rows="3"
                maxLength={500}
              />

              {formError && (
                <p className="form-error" role="alert">{formError}</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUY / SELL INVESTMENT MODAL */}

      {showTradeModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTradeModal()
          }}
        >
          <div
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-modal-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="trade-modal-title">
                  {tradeForm.type === 'buy' ? 'Buy investment' : 'Sell investment'}
                </h2>
                <p>Record an investment transaction in your portfolio.</p>
              </div>

              <button
                className="modal-close"
                onClick={closeTradeModal}
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleAddTrade}>
              <label className="form-label">Transaction type</label>

              <div className="type-toggle">
                <button
                  type="button"
                  className={
                    tradeForm.type === 'buy'
                      ? 'type-option selected income-option'
                      : 'type-option'
                  }
                  onClick={() => {
                    setTradeForm((previous) => ({
                      ...previous,
                      type: 'buy',
                    }))
                    setFormError('')
                  }}
                >
                  <ShoppingCart size={17} /> BUY
                </button>

                <button
                  type="button"
                  className={
                    tradeForm.type === 'sell'
                      ? 'type-option selected expense-option'
                      : 'type-option'
                  }
                  onClick={() => {
                    setTradeForm((previous) => ({
                      ...previous,
                      type: 'sell',
                    }))
                    setFormError('')
                  }}
                >
                  <ArrowUpRight size={17} /> SELL
                </button>
              </div>

              <label className="form-label" htmlFor="trade-instrument">
                Investment instrument *
              </label>

              <select
                id="trade-instrument"
                name="instrument"
                value={tradeForm.instrument}
                onChange={handleTradeChange}
                required
              >
                {instruments.map((instrument) => (
                  <option key={instrument.symbol} value={instrument.symbol}>
                    {instrument.symbol} — {instrument.name}
                  </option>
                ))}
              </select>

              {tradeForm.type === 'sell' && (
                <div className="panel" style={{ padding: 12, margin: '12px 0' }}>
                  <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>
                    Available quantity
                  </span>
                  <strong style={{ display: 'block', marginTop: 4 }}>
                    {numberFormat(availableQuantity)} units
                  </strong>
                </div>
              )}

              <div className="form-row">
                <div>
                  <label className="form-label" htmlFor="trade-quantity">
                    Quantity / Units *
                  </label>

                  <input
                    id="trade-quantity"
                    name="quantity"
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    value={tradeForm.quantity}
                    onChange={handleTradeChange}
                    placeholder="e.g. 100"
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="trade-unit-price">
                    Unit price *
                  </label>

                  <input
                    id="trade-unit-price"
                    name="unit_price"
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={tradeForm.unit_price}
                    onChange={handleTradeChange}
                    placeholder="e.g. 15.50"
                    required
                  />
                </div>
              </div>

              <label className="form-label" htmlFor="trade-date">
                Trade date *
              </label>

              <input
                id="trade-date"
                name="trade_date"
                type="date"
                value={tradeForm.trade_date}
                onChange={handleTradeChange}
                required
              />

              <div className="panel" style={{ padding: 16, marginTop: 16 }}>
                <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>
                  Total transaction value
                </span>
                <h2 style={{ marginTop: 6 }}>
                  {money(tradeTotal, activeCurrency)}
                </h2>
                <p style={{ color: 'var(--color-muted)', fontSize: 12, marginTop: 5 }}>
                  Quantity × Unit price
                </p>
              </div>

              <label className="form-label" htmlFor="trade-description">
                Description
              </label>

              <textarea
                id="trade-description"
                name="description"
                value={tradeForm.description}
                onChange={handleTradeChange}
                placeholder="Optional trade notes"
                rows="2"
                maxLength={500}
              />

              {formError && (
                <p className="form-error" role="alert">{formError}</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeTradeModal}
                  disabled={tradeSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={tradeSaving}
                >
                  {tradeSaving
                    ? 'Processing...'
                    : tradeForm.type === 'buy'
                      ? 'Record BUY'
                      : 'Record SELL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// The router wraps the app so each page gets its own URL.
function Root({ onLogout }) {
  return (
    <BrowserRouter>
      <App onLogout={onLogout} />
    </BrowserRouter>
  )
}

export default Root