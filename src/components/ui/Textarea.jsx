import React from 'react'

const Textarea = React.forwardRef(({ label, error, rows = 3, className = '', required, ...props }, ref) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-semibold text-text-primary">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        required={required}
        rows={rows}
        className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-colors outline-none resize-vertical
          placeholder:text-text-muted
          ${error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
          }`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  )
})

Textarea.displayName = 'Textarea'
export { Textarea }
