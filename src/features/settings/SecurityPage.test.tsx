import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import SecurityPage from './SecurityPage';
import { ApiError } from '@/lib/api/http-client';

const { changePasswordMock } = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
}));

vi.mock('@/features/auth/auth-api', () => ({
  changePassword: changePasswordMock,
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'carlos@codegym.dev',
      displayName: 'Carlos Benítez',
    },
    accessToken: 'access-token-security',
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/security']}>
      <Routes>
        <Route
          path="/settings/security"
          element={<SecurityPage />}
        />
        <Route
          path="/forgot-password"
          element={<h1>Recuperación pública</h1>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), {
    target: { value: 'CurrentPassword1!' },
  });
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
    target: { value: 'NewSecurePassword1!' },
  });
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
    target: { value: 'NewSecurePassword1!' },
  });
}

describe('SecurityPage', () => {
  beforeEach(() => {
    changePasswordMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el formulario protegido con política y autocompletado correctos', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Seguridad' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Cambiar contraseña' })).toBeInTheDocument();

    const current = screen.getByLabelText('Contraseña actual');
    const password = screen.getByLabelText('Nueva contraseña');
    const confirmation = screen.getByLabelText('Confirmar nueva contraseña');

    expect(current).toHaveAttribute('type', 'password');
    expect(current).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(password).not.toHaveAttribute('minlength');
    expect(password).not.toHaveAttribute('maxlength');
    expect(confirmation).toHaveAttribute('type', 'password');
    expect(confirmation).toHaveAttribute('autocomplete', 'new-password');

    expect(screen.getByText('Al menos 15 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Máximo 128 caracteres')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Requisitos obligatorios' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Recomendado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled();
  });

  it('muestra y oculta cada contraseña de forma independiente', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña actual' }));
    expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña actual' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nueva contraseña' }));
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar confirmar nueva contraseña' }));
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toHaveAttribute('type', 'text');
  });

  it('actualiza requisitos, coincidencia y fortaleza sin confundirlos con validez', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Contraseña actual'), {
      target: { value: 'CurrentPassword1!' },
    });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'NewSecurePassword1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
      target: { value: 'NoCoincidePassword1!' },
    });

    expect(screen.getByText('Al menos 15 caracteres').closest('li')).toHaveAttribute('data-state', 'satisfied');
    expect(screen.getByText('Máximo 128 caracteres').closest('li')).toHaveAttribute('data-state', 'satisfied');
    expect(screen.getByText('Las contraseñas coinciden').closest('li')).toHaveAttribute('data-state', 'pending');
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
      target: { value: 'NewSecurePassword1!' },
    });

    expect(screen.getByText('Las contraseñas coinciden').closest('li')).toHaveAttribute('data-state', 'satisfied');
    expect(screen.getByRole('progressbar', { name: 'Fortaleza de la nueva contraseña' })).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeEnabled();
  });

  it('aplica los límites en code points y bytes, no en unidades UTF-16 del input', () => {
    renderPage();
    const unicodePassword = '😀'.repeat(15);

    fireEvent.change(screen.getByLabelText('Contraseña actual'), {
      target: { value: 'CurrentPassword1!' },
    });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: unicodePassword },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
      target: { value: unicodePassword },
    });

    expect(screen.getByText('Al menos 15 caracteres').closest('li')).toHaveAttribute('data-state', 'satisfied');
    expect(screen.getByText('Máximo 128 caracteres').closest('li')).toHaveAttribute('data-state', 'satisfied');
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeEnabled();
  });

  it('envía solo las contraseñas requeridas y muestra éxito únicamente tras la respuesta real', async () => {
    let resolveRequest: (() => void) | undefined;
    changePasswordMock.mockReturnValue(new Promise<void>((resolve) => {
      resolveRequest = resolve;
    }));
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: 'CurrentPassword1!',
      newPassword: 'NewSecurePassword1!',
    }, 'access-token-security', expect.any(AbortSignal));
    expect(screen.getByRole('button', { name: 'Cambiando contraseña…' })).toBeDisabled();
    expect(screen.queryByText('Contraseña actualizada')).not.toBeInTheDocument();
    expect(storageSpy).not.toHaveBeenCalled();

    await act(async () => { resolveRequest?.(); });
    expect(screen.getByRole('status')).toHaveTextContent('Contraseña actualizada');
    expect(screen.getByRole('status')).toHaveTextContent('Tu contraseña se ha cambiado correctamente.');
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('bloquea los envíos duplicados mientras la petición está pendiente', async () => {
    let resolveRequest: (() => void) | undefined;
    changePasswordMock.mockReturnValue(new Promise<void>((resolve) => {
      resolveRequest = resolve;
    }));
    renderPage();
    fillValidForm();
    const form = screen.getByRole('button', { name: 'Cambiar contraseña' })
      .closest('form') as HTMLFormElement;

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(changePasswordMock).toHaveBeenCalledTimes(1);

    await act(async () => { resolveRequest?.(); });
  });

  it.each([
    [new ApiError(400, 'INVALID_CURRENT_PASSWORD', 'internal'), 'La contraseña actual no es correcta.'],
    [new ApiError(400, 'NEW_PASSWORD_SAME_AS_CURRENT', 'internal'), 'La nueva contraseña debe ser diferente de la actual.'],
    [new ApiError(429, 'RATE_LIMITED', 'internal'), 'Has realizado demasiados intentos.'],
    [new ApiError(500, 'INTERNAL_ERROR', 'internal'), 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'],
  ])('mapea errores seguros sin mostrar detalles internos', async (failure, expectedMessage) => {
    changePasswordMock.mockRejectedValue(failure);
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(expectedMessage);
    expect(screen.queryByText('internal')).not.toBeInTheDocument();
    expect(screen.queryByText('Contraseña actualizada')).not.toBeInTheDocument();
  });

  it('limpia un error al editar y aborta la petición al desmontarse', async () => {
    changePasswordMock.mockRejectedValueOnce(
      new ApiError(400, 'INVALID_CURRENT_PASSWORD', 'internal'),
    );
    const { unmount } = renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Contraseña actual'), {
      target: { value: 'CorrectedPassword1!' },
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    changePasswordMock.mockReturnValueOnce(new Promise(() => undefined));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    const signal = changePasswordMock.mock.calls[1]?.[2] as AbortSignal;
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('mantiene la recuperación por email como un flujo independiente', () => {
    renderPage();

    fireEvent.click(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }));

    expect(screen.getByRole('heading', { name: 'Recuperación pública' })).toBeInTheDocument();
  });
});
