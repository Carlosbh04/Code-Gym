import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RegisterForm } from './RegisterForm';

function renderForm(onSubmit = vi.fn(), isSubmitting = false) {
  render(
    <RegisterForm
      onSubmit={onSubmit}
      onGoogle={vi.fn()}
      onChangeMode={vi.fn()}
      isSubmitting={isSubmitting}
    />,
  );

  return onSubmit;
}

function completePersonalStep(preferredName = '') {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Carlos' } });
  fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Benítez' } });

  if (preferredName) {
    fireEvent.change(screen.getByLabelText(/Cómo te gustaría/), { target: { value: preferredName } });
  }

  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
}

function completeAccountStep() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carlos@example.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Segura123!CodeGym' } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Segura123!CodeGym' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
}

describe('RegisterForm', () => {
  it('starts with only the personal data step visible', () => {
    renderForm();

    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
    expect(
      screen.getByText('Cuéntanos un poco sobre ti.'),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText('Nombre'),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText('Apellido'),
    ).toBeInTheDocument();

    expect(
      screen.queryByLabelText('Email'),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Revisa tus datos y crea tu cuenta.'),
    ).not.toBeInTheDocument();
  });

  it('does not advance without required personal data', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Introduce tu nombre.')).toBeInTheDocument();
    expect(screen.getByText('Introduce tus apellidos.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('preserves entered values when navigating back', () => {
    renderForm();
    completePersonalStep('Charlie');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));

    expect(screen.getByLabelText('Nombre')).toHaveValue('Carlos');
    expect(screen.getByLabelText('Apellido')).toHaveValue('Benítez');
    expect(screen.getByLabelText(/Cómo te gustaría/)).toHaveValue('Charlie');
  });

  it('invalidates later steps when previously validated data changes', () => {
    renderForm();
    completePersonalStep();
    completeAccountStep();

    expect(
      screen.getByText('Revisa tus datos y crea tu cuenta.'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Atrás' }),
    );

    expect(
      screen.getByLabelText('Email'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Atrás' }),
    );

    fireEvent.change(
      screen.getByLabelText('Nombre'),
      { target: { value: '' } },
    );

    expect(
      screen.queryByLabelText('Email'),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Revisa tus datos y crea tu cuenta.'),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Siguiente' }),
    );

    expect(
      screen.getByText('Introduce tu nombre.'),
    ).toBeInTheDocument();
  });

  it('validates account fields before showing confirmation', () => {
    renderForm();
    completePersonalStep();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Introduce un email válido.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña debe tener al menos 15 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(screen.queryByRole('definition', { name: 'Carlos Benítez' })).not.toBeInTheDocument();
  });

  it('shows a password-free summary and requires terms', () => {
    renderForm();
    completePersonalStep('Charlie');
    completeAccountStep();

    const summary = screen.getByText('Nombre visible').closest('dl');
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText('Carlos Benítez')).toBeInTheDocument();
    expect(within(summary as HTMLElement).getByText('carlos@example.com')).toBeInTheDocument();
    expect(within(summary as HTMLElement).queryByText('Segura123!CodeGym')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Debes aceptar los términos para crear tu cuenta.')).toBeInTheDocument();
  });

  it('submits the backend contract once using the preferred name', () => {
    const onSubmit = renderForm();
    completePersonalStep('Charlie');
    completeAccountStep();
    fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los términos/ }));
    const submit = screen.getByRole('button', { name: 'Crear cuenta' });

    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'carlos@example.com',
      password: 'Segura123!CodeGym',
      displayName: 'Charlie',
    });
  });

  it('falls back to the full name and disables final actions while submitting', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <RegisterForm onSubmit={onSubmit} onGoogle={vi.fn()} onChangeMode={vi.fn()} />,
    );
    completePersonalStep();
    completeAccountStep();
    fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los términos/ }));

    rerender(
      <RegisterForm
        onSubmit={onSubmit}
        onGoogle={vi.fn()}
        onChangeMode={vi.fn()}
        isSubmitting
      />,
    );

    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Atrás' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cargando Google…' })).toBeDisabled();
  });
});
