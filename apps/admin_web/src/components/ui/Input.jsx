import React from 'react';

export function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  iconRight: IconRight,
  onIconRightClick,
  error,
  helperText,
  disabled = false,
  required = false,
  fullWidth = true,
  className = '',
  style = {},
  inputStyle = {},
  autoComplete,
  ...props
}) {
  const inputId = id || name || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: fullWidth ? '100%' : 'auto',
        ...style
      }}
      className={`input-group-ui ${className}`}
    >
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: error ? '#F43F5E' : 'var(--text-secondary, #94A3B8)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: '#F43F5E' }}>*</span>}
        </label>
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%'
        }}
      >
        {Icon && (
          <div
            style={{
              position: 'absolute',
              left: '12px',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: error ? '#F43F5E' : 'var(--text-muted, #64748B)'
            }}
          >
            <Icon size={16} />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            minHeight: '42px',
            padding: `8px ${IconRight ? '36px' : '12px'} 8px ${Icon ? '38px' : '12px'}`,
            background: 'var(--bg-input, #1E293B)',
            color: 'var(--text-primary, #F8FAFC)',
            border: `1px solid ${error ? '#F43F5E' : 'var(--border, #23314E)'}`,
            borderRadius: 'var(--radius-sm, 6px)',
            fontSize: '14px',
            fontFamily: 'var(--font-sans, inherit)',
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            ...inputStyle
          }}
          className="form-input-control"
          {...props}
        />

        {IconRight && (
          <button
            type="button"
            onClick={onIconRightClick}
            tabIndex={onIconRightClick ? 0 : -1}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'transparent',
              border: 'none',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              cursor: onIconRightClick ? 'pointer' : 'default',
              color: 'var(--text-muted, #64748B)'
            }}
          >
            <IconRight size={16} />
          </button>
        )}
      </div>

      {error && (
        <span
          style={{
            fontSize: '12px',
            color: '#F43F5E',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {error}
        </span>
      )}

      {!error && helperText && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #64748B)'
          }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
}
export default Input;
