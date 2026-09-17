import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/http-client';
import { AuthPanel } from './AuthPanel';

const {
  loginMock,
  googleLoginMock,
  registerMock,
  navigateMock,
} = vi.hoisted(() => ({
  loginMock: vi.fn(),
  googleLoginMock: vi.fn(),
  registerMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    googleLogin: googleLoginMock,
    register: registerMock,
  }),
}));


vi.mock('./GoogleAuthButton', () => ({
  GoogleAuthButton: ({
    label,
    onCredential,
    onError,
    disabled,
  }: {
    label: string;
    onCredential: (credential: string) => void;
    onError?: (error: Error) => void;
    disabled?: boolean;
  }) => (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onCredential(
            'google-id-token-test',
          )
        }
      >
        {label}
      </button>

      <button
        type="button"
        onClick={() =>
          onError?.(
            new Error(
              'GIS failed',
            ),
          )
        }
      >
        Simular error Google
      </button>
    </div>
  ),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function reachAccountStep() {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Carlos' } });
  fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Benítez' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
}

function reachConfirmationStep() {
  reachAccountStep();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carlos@example.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Segura123!CodeGym' } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Segura123!CodeGym' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
}

describe('AuthPanel', () => {
  beforeEach(() => {
    loginMock.mockReset();
    googleLoginMock.mockReset();
    registerMock.mockReset();
    navigateMock.mockReset();

    loginMock.mockResolvedValue(undefined);
    googleLoginMock.mockResolvedValue(undefined);
    registerMock.mockResolvedValue(undefined);
  });

  it('muestra login sin pedir datos ajenos al acceso', () => {
    render(<AuthPanel />);

    expect(screen.getByRole('tab', { name: 'Iniciar sesión' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'Bienvenido' })).toBeInTheDocument();
    expect(screen.queryByLabelText('CodeGym')).not.toBeInTheDocument();
    expect(screen.getByText('Tu espacio para practicar,')).toBeInTheDocument();
    expect(screen.getByText('aprender y mejorar.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
  });


  it('envía remember=false cuando Recordarme está desmarcado', async () => {
    render(<AuthPanel />);

    const email =
      screen.getByLabelText('Email');

    const password =
      screen.getByLabelText('Contraseña');

    fireEvent.change(
      email,
      {
        target: {
          value:
            'carlos@example.com',
        },
      },
    );

    fireEvent.change(
      password,
      {
        target: {
          value:
            'Segura123!CodeGym',
        },
      },
    );

    const form =
      email.closest('form');

    if (form === null) {
      throw new Error(
        'Login form not found',
      );
    }

    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        loginMock,
      ).toHaveBeenCalledWith({
        email:
          'carlos@example.com',
        password:
          'Segura123!CodeGym',
        remember:
          false,
      });
    });

    expect(
      navigateMock,
    ).toHaveBeenCalledWith(
      '/',
      {
        replace: true,
        state: {
          postLoginIntro: true,
        },
      },
    );
  });

  it('envía remember=true cuando Recordarme está marcado', async () => {
    render(<AuthPanel />);

    const email =
      screen.getByLabelText('Email');

    const password =
      screen.getByLabelText('Contraseña');

    const remember =
      screen.getByRole(
        'checkbox',
        {
          name:
            /Recordarme/i,
        },
      );

    fireEvent.change(
      email,
      {
        target: {
          value:
            'carlos@example.com',
        },
      },
    );

    fireEvent.change(
      password,
      {
        target: {
          value:
            'Segura123!CodeGym',
        },
      },
    );

    fireEvent.click(
      remember,
    );

    expect(
      remember,
    ).toBeChecked();

    const form =
      email.closest('form');

    if (form === null) {
      throw new Error(
        'Login form not found',
      );
    }

    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        loginMock,
      ).toHaveBeenCalledWith({
        email:
          'carlos@example.com',
        password:
          'Segura123!CodeGym',
        remember:
          true,
      });
    });

    expect(
      navigateMock,
    ).toHaveBeenCalledWith(
      '/',
      {
        replace: true,
        state: {
          postLoginIntro: true,
        },
      },
    );
  });

  it('cambia a registro progresivo y expone fortaleza real en el segundo paso', () => {
    render(<AuthPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();

    reachAccountStep();
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Segura123!CodeGym' } });
    expect(screen.getByRole('progressbar', { name: 'Fortaleza de la contraseña' })).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByText('Fuerte')).toBeInTheDocument();
  });

  it('permite navegar las tabs con flechas y conserva el foco', async () => {
    render(<AuthPanel />);
    const loginTab = screen.getByRole('tab', { name: 'Iniciar sesión' });
    loginTab.focus();
    fireEvent.keyDown(loginTab, { key: 'ArrowRight' });

    const registerTab = screen.getByRole('tab', { name: 'Crear cuenta' });
    await waitFor(() => expect(registerTab).toHaveFocus());
    expect(registerTab).toHaveAttribute('aria-selected', 'true');
  });

  it('permite mostrar la contraseña con un control accesible', () => {
    render(<AuthPanel />);
    const password = screen.getByLabelText('Contraseña');
    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('envía al backend solo el contrato final y navega al inicio', async () => {
    render(<AuthPanel initialMode="register" />);
    fireEvent.change(screen.getByLabelText(/Cómo te gustaría/), { target: { value: 'Charlie' } });
    reachConfirmationStep();
    fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los términos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(registerMock).toHaveBeenCalledWith({
      email: 'carlos@example.com',
      password: 'Segura123!CodeGym',
      displayName: 'Charlie',
    }));
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('envía la credencial Google al AuthContext y navega tras autenticar', async () => {
    render(<AuthPanel />);

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            'Continuar con Google',
        },
      ),
    );

    await waitFor(() => {
      expect(
        googleLoginMock,
      ).toHaveBeenCalledWith({
        idToken:
          'google-id-token-test',
      });
    });

    expect(
      navigateMock,
    ).toHaveBeenCalledWith(
      '/',
      {
        replace: true,
        state: {
          postLoginIntro: true,
        },
      },
    );
  });

  it('rechaza auto-link cuando el email ya pertenece a una cuenta local', async () => {
    googleLoginMock.mockRejectedValue(
      new ApiError(
        409,
        'GOOGLE_EMAIL_ALREADY_REGISTERED',
        'conflict',
      ),
    );

    render(<AuthPanel />);

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            'Continuar con Google',
        },
      ),
    );

    expect(
      await screen.findByText(
        'Ya existe una cuenta asociada a este correo. Inicia sesión o recupera tu contraseña.',
      ),
    ).toBeInTheDocument();

    expect(
      navigateMock,
    ).not.toHaveBeenCalled();
  });

  it('informa si Google Identity Services no puede inicializarse', async () => {
    render(<AuthPanel />);

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            'Simular error Google',
        },
      ),
    );

    expect(
      await screen.findByText(
        'No se pudo iniciar Google. Inténtalo de nuevo.',
      ),
    ).toBeInTheDocument();
  });

  it('abre la recuperación de contraseña desde el login', () => {
    render(<AuthPanel />);

    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));

    expect(navigateMock).toHaveBeenCalledWith('/forgot-password');
    expect(screen.queryByText(/recuperación de contraseña todavía no está disponible/i)).not.toBeInTheDocument();
  });

  it('bloquea visualmente el login tras recibir rate limit', async () => {
    loginMock.mockRejectedValue(
      new ApiError(
        429,
        'RATE_LIMITED',
        'Too many requests',
      ),
    );

    render(<AuthPanel />);

    fireEvent.change(
      screen.getByLabelText('Email'),
      {
        target: {
          value:
            'carlos@example.com',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText('Contraseña'),
      {
        target: {
          value:
            'incorrecta-123',
        },
      },
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            /Iniciar sesión/,
        },
      ),
    );

    expect(
      await screen.findByRole(
        'alert',
      ),
    ).toHaveTextContent(
      'Demasiados intentos fallidos. Inténtalo de nuevo en 15 minutos.',
    );

    expect(
      screen.getByRole(
        'button',
        {
          name:
            /Iniciar sesión/,
        },
      ),
    ).toBeDisabled();

    fireEvent.change(
      screen.getByLabelText('Email'),
      {
        target: {
          value:
            'otro@example.com',
        },
      },
    );

    expect(
      screen.getByRole(
        'button',
        {
          name:
            /Iniciar sesión/,
        },
      ),
    ).toBeEnabled();

    expect(
      screen.queryByText(
        'Demasiados intentos fallidos. Inténtalo de nuevo en 15 minutos.',
      ),
    ).not.toBeInTheDocument();
  });


  it('abre el aviso de cuenta bloqueada cuando backend responde ACCOUNT_LOCKED', async () => {
    loginMock.mockRejectedValue(
      new ApiError(
        423,
        'ACCOUNT_LOCKED',
        'Account access is locked',
      ),
    );

    render(<AuthPanel />);

    fireEvent.change(
      screen.getByLabelText('Email'),
      {
        target: {
          value:
            'carlos@example.com',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText('Contraseña'),
      {
        target: {
          value:
            'Segura123!CodeGym',
        },
      },
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            /Iniciar sesión/,
        },
      ),
    );

    const dialog =
      await screen.findByRole(
        'dialog',
      );

    expect(
      dialog,
    ).toHaveAttribute(
      'aria-modal',
      'true',
    );

    expect(
      screen.getByRole(
        'heading',
        {
          name:
            'Tu cuenta ha sido bloqueada',
        },
      ),
    ).toBeInTheDocument();

    expect(
      navigateMock,
    ).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            'Recuperar acceso',
        },
      ),
    );

    expect(
      navigateMock,
    ).toHaveBeenCalledWith(
      '/forgot-password',
    );
  });


  it('también respeta ACCOUNT_LOCKED cuando la autenticación es Google', async () => {
    googleLoginMock.mockRejectedValue(
      new ApiError(
        423,
        'ACCOUNT_LOCKED',
        'Account access is locked',
      ),
    );

    render(<AuthPanel />);

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            'Continuar con Google',
        },
      ),
    );

    expect(
      await screen.findByRole(
        'dialog',
      ),
    ).toBeInTheDocument();

    expect(
      navigateMock,
    ).not.toHaveBeenCalledWith(
      '/',
      expect.anything(),
    );
  });


  it('muestra ACCOUNT_COOLDOWN como pausa temporal y no como bloqueo permanente', async () => {
    vi.useFakeTimers({
      shouldAdvanceTime:
        true,
    });

    try {
      loginMock.mockRejectedValue(
        new ApiError(
          429,
          'ACCOUNT_COOLDOWN',
          'Account login is temporarily unavailable',
        ),
      );

      render(<AuthPanel />);

      fireEvent.change(
        screen.getByLabelText('Email'),
        {
          target: {
            value:
              'carlos@example.com',
          },
        },
      );

      fireEvent.change(
        screen.getByLabelText('Contraseña'),
        {
          target: {
            value:
              'incorrecta-123',
          },
        },
      );

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name:
              /Iniciar sesión/,
          },
        ),
      );

      expect(
        await screen.findByRole(
          'alert',
        ),
      ).toHaveTextContent(
        'Tiempo restante:',
      );

      expect(
        screen.queryByRole(
          'dialog',
        ),
      ).not.toBeInTheDocument();

      expect(
        screen.getByRole(
          'button',
          {
            name:
              /Iniciar sesión/,
          },
        ),
      ).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });


  it('permite cerrar el modal con Escape sin conceder acceso', async () => {
    loginMock.mockRejectedValue(
      new ApiError(
        423,
        'ACCOUNT_LOCKED',
        'Account access is locked',
      ),
    );

    render(<AuthPanel />);

    fireEvent.change(
      screen.getByLabelText('Email'),
      {
        target: {
          value:
            'carlos@example.com',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText('Contraseña'),
      {
        target: {
          value:
            'Segura123!CodeGym',
        },
      },
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            /Iniciar sesión/,
        },
      ),
    );

    await screen.findByRole(
      'dialog',
    );

    fireEvent.keyDown(
      document,
      {
        key:
          'Escape',
      },
    );

    await waitFor(
      () => {
        expect(
          screen.queryByRole(
            'dialog',
          ),
        ).not.toBeInTheDocument();
      },
    );

    expect(
      navigateMock,
    ).not.toHaveBeenCalled();
  });

});
