import {
  useEffect,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';

interface PasswordResetCodeInputProps {
  readonly value: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly focusVersion: number;
  readonly describedBy?: string;
  readonly onChange: (value: string) => void;
}

const CODE_LENGTH = 6;

export function PasswordResetCodeInput({
  value,
  disabled = false,
  invalid = false,
  focusVersion,
  describedBy,
  onChange,
}: PasswordResetCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [focusVersion]);

  function focus(index: number) {
    inputRefs.current[Math.max(0, Math.min(CODE_LENGTH - 1, index))]?.focus();
  }

  function updateAt(index: number, rawValue: string) {
    const digits = rawValue.replace(/\D/g, '');
    if (digits.length === 0) {
      onChange(replaceDigit(value, index, ''));
      return;
    }

    const next = fillDigits(value, index, digits);
    onChange(next);
    focus(Math.min(index + digits.length, CODE_LENGTH - 1));
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if ((value[index] ?? '') !== '') {
        onChange(replaceDigit(value, index, ''));
      } else if (index > 0) {
        onChange(replaceDigit(value, index - 1, ''));
        focus(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (digits.length === 0) return;
    event.preventDefault();
    onChange(digits);
    focus(Math.min(digits.length, CODE_LENGTH - 1));
  }

  return (
    <div
      className="password-reset-code-input"
      role="group"
      aria-label="Código de seguridad de 6 dígitos"
      aria-describedby={describedBy}
    >
      {Array.from({ length: CODE_LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(element) => { inputRefs.current[index] = element; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={value[index] ?? ''}
          disabled={disabled}
          aria-label={`Dígito ${index + 1} del código`}
          aria-invalid={invalid || undefined}
          className="password-reset-code-digit"
          autoFocus={index === 0}
          onChange={(event: ChangeEvent<HTMLInputElement>) => updateAt(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}

function replaceDigit(value: string, index: number, digit: string): string {
  const digits = value.split('');
  digits[index] = digit;
  return digits.join('').slice(0, CODE_LENGTH);
}

function fillDigits(value: string, startIndex: number, inserted: string): string {
  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? '');
  for (let offset = 0; offset < inserted.length && startIndex + offset < CODE_LENGTH; offset += 1) {
    digits[startIndex + offset] = inserted[offset] ?? '';
  }
  return digits.join('');
}
