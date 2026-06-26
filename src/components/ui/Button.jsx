import { clsx } from 'clsx'

const BASE = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'

const VARIANTS = {
  primary: 'bg-primary hover:bg-primary-dark text-text-primary focus:ring-primary shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary: 'border-2 border-primary bg-transparent text-text-primary hover:bg-primary/20 focus:ring-primary',
  danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm hover:shadow-md',
  ghost: 'bg-transparent hover:bg-black/5 text-text-secondary focus:ring-gray-300',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5 h-7',
  md: 'text-sm px-4 py-2 h-9',
  lg: 'text-base px-6 py-2.5 h-11',
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
