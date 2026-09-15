import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import OnboardingPage from './OnboardingPage';

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <main>
        <OnboardingPage />
        <Location />
      </main>
    </MemoryRouter>,
  );
}

function Location() {
  const { pathname } = useLocation();

  return <output data-testid="location">{pathname}</output>;
}

describe('OnboardingPage (T062)', () => {
  it('explica CodeGym con pasos ordenados y un CTA para empezar a practicar', () => {
    renderOnboarding();

    expect(screen.getByRole('heading', { level: 1, name: 'CodeGym' })).toBeInTheDocument();
    expect(
      screen.getByText('Practica JavaScript entendiendo el código, no memorizándolo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Cómo funciona' })).toBeInTheDocument();

    const steps = screen.getByRole('list');
    expect(within(steps).getAllByRole('listitem')).toHaveLength(4);
    expect(within(steps).getByText('Elige una tecnología y un tema.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Empezar a practicar' }),
    ).toHaveAttribute('href', '/#technologies');
  });

  it('mantiene el landmark principal en AppLayout y no añade skip ni capacidades ficticias', () => {
    renderOnboarding();

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /omitir|saltar|ahora no/i })).toBeNull();
    expect(screen.queryByText(/IA adaptativa|sincronización cloud|rankings|streaks/i)).toBeNull();
    expect(screen.getByTestId('location')).toHaveTextContent('/onboarding');
  });
});
