import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const inputBaseStyle: React.CSSProperties = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text)',
  padding: '10px 12px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          style={{ ...inputBaseStyle, borderColor: error ? 'var(--danger)' : 'var(--border)', ...style }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--secondary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--border)'; }}
          {...props}
        />
        {error && (
          <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, { label?: string; error?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ label, error, style, children, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          style={{ ...inputBaseStyle, borderColor: error ? 'var(--danger)' : 'var(--border)', cursor: 'pointer', ...style }}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          style={{ ...inputBaseStyle, borderColor: error ? 'var(--danger)' : 'var(--border)', resize: 'vertical', minHeight: '80px', ...style }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--secondary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--border)'; }}
          {...props}
        />
        {error && (
          <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
