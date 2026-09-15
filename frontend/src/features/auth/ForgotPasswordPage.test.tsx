import {
  act, fireEvent, render, screen, within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/http-client';
import ForgotPasswordPage from './ForgotPasswordPage';

const { requestMock, verifyMock, confirmMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  verifyMock: vi.fn(),
  confirmMock: vi.fn(),
}));

vi.mock('./auth-api', () => ({
  requestPasswordReset: requestMock,
  verifyPasswordReset: verifyMock,
  confirmPasswordReset: confirmMock,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<h1>Login de prueba</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function reachCodeStep(email = 'Carlos@Example.Test') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Correo electrónico' }), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
  await screen.findByRole('heading', { name: 'Comprueba tu correo' });
}

function enterCode(code = '004821') {
  const group = screen.getByRole('group', { name: 'Código de seguridad de 6 dígitos' });
  const inputs = within(group).getAllByRole('textbox');
  code.split('').forEach((digit, index) => {
    fireEvent.change(inputs[index] as HTMLInputElement, { target: { value: digit } });
  });
}

async function reachPasswordStep() {
  await reachCodeStep();
  enterCode();
  fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));
  await screen.findByRole('heading', { name: 'Crea una nueva contraseña' });
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    requestMock.mockReset().mockResolvedValue({ message: 'generic' });
    verifyMock.mockReset().mockResolvedValue({ resetToken: 'A'.repeat(43) });
    confirmMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders an accessible public email step and validates locally', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Restablecer contraseña' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Paso 1: Correo' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('textbox', { name: 'Correo electrónico' })).toHaveAttribute('autocomplete', 'email');

    fireEvent.change(screen.getByRole('textbox', { name: 'Correo electrónico' }), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Introduce un correo electrónico válido.');
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('normalizes the email, blocks duplicate submission, and advances with a generic message', async () => {
    let resolveRequest: ((value: { message: string }) => void) | undefined;
    requestMock.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    renderPage();
    const email = screen.getByRole('textbox', { name: 'Correo electrónico' });
    fireEvent.change(email, { target: { value: ' Person@Example.Test ' } });
    const submit = screen.getByRole('button', { name: 'Enviar código' });
    fireEvent.click(submit);
    fireEvent.submit(email.closest('form') as HTMLFormElement);

    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      { email: 'person@example.test' },
      expect.any(AbortSignal),
    );
    await act(async () => { resolveRequest?.({ message: 'generic' }); });
    expect(await screen.findByRole('heading', { name: 'Comprueba tu correo' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Si existe una cuenta asociada');
    expect(screen.getByText(/p•••••@example\.test/)).toBeInTheDocument();
  });

  it('keeps the existing safe fallback when rate limiting has no Retry-After', async () => {
    requestMock.mockRejectedValue(new ApiError(429, 'RATE_LIMITED', 'internal detail'));
    renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: 'Correo electrónico' }), {
      target: { value: 'person@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('demasiadas solicitudes');
    expect(screen.getByRole('textbox', { name: 'Correo electrónico' })).toHaveValue('person@example.test');
    expect(screen.queryByRole('heading', { name: 'Recupera tu acceso' })).not.toBeInTheDocument();
    expect(screen.queryByText('internal detail')).not.toBeInTheDocument();
  });

  it('renders the dedicated rate-limit state using the real Retry-After countdown', async () => {
    vi.useFakeTimers();
    requestMock.mockRejectedValue(new ApiError(429, 'RATE_LIMITED', 'internal detail', 754));
    renderPage();
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Correo electrónico' }), {
        target: { value: 'person@example.test' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'Recupera tu acceso' })).toHaveFocus();
    expect(screen.getByRole('listitem', { name: 'Paso 1: Email' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByLabelText('CodeGym')).toBeInTheDocument();
    expect(screen.getByText('Practica. Aprende. Mejora.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Has alcanzado el límite de solicitudes');
    expect(screen.getByRole('alert')).toHaveTextContent('Por favor, espera antes de volver a intentar enviar el código.');
    expect(screen.getByRole('button', { name: /temporalmente bloqueada/i })).toBeDisabled();
    expect(screen.getByText('Reintentar en 12:34')).toBeInTheDocument();
    expect(screen.getByText('Te avisaremos cuando puedas solicitar un nuevo código.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('textbox', { name: 'Correo electrónico' })).not.toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(1_000); });
    expect(screen.getByText('Reintentar en 12:33')).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(753_000); });
    expect(screen.getByRole('heading', { name: 'Restablecer contraseña' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Correo electrónico' })).toHaveValue('person@example.test');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('keeps one six-digit string, preserves leading zeroes, supports paste, and rejects letters', async () => {
    renderPage();
    await reachCodeStep();
    const group = screen.getByRole('group', { name: 'Código de seguridad de 6 dígitos' });
    const inputs = within(group).getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs).toHaveLength(6);
    expect(screen.getByText('05:00')).toBeInTheDocument();

    enterCode('004821');
    expect(inputs.map(({ value }) => value).join('')).toBe('004821');
    fireEvent.change(inputs[2], { target: { value: 'x' } });
    expect(inputs.map(({ value }) => value).join('')).not.toContain('x');
    fireEvent.paste(inputs[0], { clipboardData: { getData: () => '009876' } });
    expect(inputs.map(({ value }) => value).join('')).toBe('009876');
    fireEvent.keyDown(inputs[5], { key: 'Backspace' });
    expect(inputs[5]).toHaveValue('');
  });

  it('verifies with the exact string and keeps the returned token out of browser storage and URL', async () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage();
    await reachCodeStep();
    enterCode('004821');
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));

    await screen.findByRole('heading', { name: 'Crea una nueva contraseña' });
    expect(verifyMock).toHaveBeenCalledWith(
      { email: 'carlos@example.test', code: '004821' },
      expect.any(AbortSignal),
    );
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(window.sessionStorage.length).toBe(0);
    expect(window.location.href).not.toContain('A'.repeat(43));
    localStorageSpy.mockRestore();
  });

  it.each([
    [new ApiError(400, 'INVALID_RESET_CODE', 'internal'), 'El código introducido no es correcto.'],
    [new ApiError(410, 'RESET_CODE_EXPIRED', 'internal'), 'Este código ha caducado. Solicita uno nuevo.'],
    [new ApiError(410, 'RESET_CODE_ATTEMPTS_EXCEEDED', 'internal'), 'Has alcanzado el máximo de intentos. Solicita un nuevo código.'],
    [new ApiError(429, 'RATE_LIMITED', 'internal'), 'demasiados intentos'],
  ])('maps verify errors without exposing backend details', async (failure, message) => {
    verifyMock.mockRejectedValue(failure);
    renderPage();
    await reachCodeStep();
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByText('internal')).not.toBeInTheDocument();
  });

  it('clears an incorrect-code error when the user edits any digit', async () => {
    verifyMock.mockRejectedValue(new ApiError(400, 'INVALID_RESET_CODE', 'internal'));
    renderPage();
    await reachCodeStep();
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El código introducido no es correcto.');

    const inputs = within(screen.getByRole('group')).getAllByRole('textbox');
    fireEvent.change(inputs[2] as HTMLInputElement, { target: { value: '7' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verificar código' })).toBeEnabled();
  });

  it.each([
    ['RESET_CODE_EXPIRED', 'Este código ha caducado. Solicita uno nuevo.'],
    ['RESET_CODE_ATTEMPTS_EXCEEDED', 'Has alcanzado el máximo de intentos. Solicita un nuevo código.'],
  ])('keeps verification unavailable after the backend reports %s until resend', async (errorCode, message) => {
    verifyMock.mockRejectedValue(new ApiError(410, errorCode, 'internal'));
    renderPage();
    await reachCodeStep();
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Verificar código' })).toBeDisabled();
    for (const input of within(screen.getByRole('group')).getAllByRole('textbox')) {
      expect(input).toBeDisabled();
    }
    expect(screen.getByRole('button', { name: 'Enviar un nuevo código' })).toBeEnabled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar un nuevo código' }));
      await Promise.resolve();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    for (const input of within(screen.getByRole('group')).getAllByRole('textbox')) {
      expect(input).toBeEnabled();
    }
  });

  it('keeps 00:00 informational and still submits a complete code to the backend', async () => {
    vi.useFakeTimers();
    renderPage();
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Correo electrónico' }), { target: { value: 'person@example.test' } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
      await Promise.resolve();
    });
    enterCode('123456');
    await act(async () => { vi.advanceTimersByTime(300_000); });
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verificar código' })).toBeEnabled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));
      await Promise.resolve();
    });
    expect(verifyMock).toHaveBeenCalledWith(
      { email: 'person@example.test', code: '123456' },
      expect.any(AbortSignal),
    );
    expect(screen.getByRole('heading', { name: 'Crea una nueva contraseña' })).toBeInTheDocument();
  });

  it('resend clears the previous code and restarts the visual timer', async () => {
    renderPage();
    await reachCodeStep('person@example.test');
    enterCode('123456');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));
      await Promise.resolve();
    });
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('05:00')).toBeInTheDocument();
    const inputs = within(screen.getByRole('group')).getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.map(({ value }) => value).join('')).toBe('');
  });

  it('changing email clears the code flow and returns to the editable first step', async () => {
    renderPage();
    await reachCodeStep();
    enterCode();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }));
    expect(screen.getByRole('heading', { name: 'Restablecer contraseña' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Correo electrónico' })).toHaveValue('carlos@example.test');
  });

  it('reuses strength, enforces 15–128 characters and matching, but recommendations do not block', async () => {
    renderPage();
    await reachPasswordStep();
    const password = screen.getByLabelText('Nueva contraseña');
    const confirmation = screen.getByLabelText('Confirmar nueva contraseña');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByRole('button', { name: 'Restablecer contraseña' })).toBeDisabled();

    fireEvent.change(password, { target: { value: 'abcdefghijklmno' } });
    fireEvent.change(confirmation, { target: { value: 'abcdefghijklmno' } });
    expect(screen.getByRole('button', { name: 'Restablecer contraseña' })).toBeEnabled();
    expect(screen.getByRole('progressbar', { name: 'Fortaleza de la nueva contraseña' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nueva contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
  });

  it('confirms without confirmPassword, clears secrets, reports session revocation, and does not autologin', async () => {
    renderPage();
    await reachPasswordStep();
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'A secure password 123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'A secure password 123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));

    expect(await screen.findByRole('heading', { name: 'Contraseña actualizada' })).toBeInTheDocument();
    expect(confirmMock).toHaveBeenCalledWith({
      resetToken: 'A'.repeat(43),
      newPassword: 'A secure password 123!',
    }, expect.any(AbortSignal));
    expect(screen.getByText(/sesiones anteriores.*se han cerrado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
  });

  it('blocks duplicate confirmation while the first request is pending', async () => {
    let resolveConfirm: (() => void) | undefined;
    confirmMock.mockReturnValue(new Promise<void>((resolve) => { resolveConfirm = resolve; }));
    renderPage();
    await reachPasswordStep();
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'A secure password 123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'A secure password 123!' } });
    const form = screen.getByRole('button', { name: 'Restablecer contraseña' }).closest('form') as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Restableciendo…' })).toBeDisabled();
    await act(async () => { resolveConfirm?.(); });
  });

  it('discards an expired reset authorization and offers a clean restart', async () => {
    confirmMock.mockRejectedValue(new ApiError(410, 'RESET_TOKEN_EXPIRED', 'internal'));
    renderPage();
    await reachPasswordStep();
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'A secure password 123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'A secure password 123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('sesión de recuperación ha caducado');
    fireEvent.click(screen.getByRole('button', { name: 'Volver a empezar' }));
    expect(screen.getByRole('heading', { name: 'Restablecer contraseña' })).toBeInTheDocument();
  });

  it('aborts in-flight work on unmount', () => {
    requestMock.mockReturnValue(new Promise(() => undefined));
    const { unmount } = renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: 'Correo electrónico' }), { target: { value: 'person@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    const signal = requestMock.mock.calls[0]?.[1] as AbortSignal;
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('cleans the visual timer on unmount', async () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = renderPage();
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Correo electrónico' }), { target: { value: 'person@example.test' } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
