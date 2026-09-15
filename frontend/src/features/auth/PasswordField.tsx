import { useState, type ChangeEventHandler } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

interface PasswordFieldProps {
  id: string;
  label: string;
  name: string;
  autoComplete: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  describedBy?: string;
  invalid?: boolean;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
  placeholder?: string;
}

export function PasswordField({
  id,
  label,
  name,
  autoComplete,
  value,
  onChange,
  describedBy,
  invalid,
  minLength,
  maxLength,
  disabled,
  placeholder,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="auth-field-label">{label}</label>
      <div className="auth-input-shell">
        <LockKeyhole className="auth-input-icon" aria-hidden="true" />
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className="auth-input pr-12"
        />
        <button
          type="button"
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-code-muted hover:bg-white/5 hover:text-code-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-code-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? <EyeOff className="size-[1.125rem]" aria-hidden="true" /> : <Eye className="size-[1.125rem]" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
