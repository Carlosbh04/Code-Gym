import { Link } from 'react-router-dom';

const PRIMARY_ACTION =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto';

const STEPS = [
  'Elige una tecnología y un tema.',
  'Completa sesiones cortas con distintos tipos de ejercicios.',
  'Revisa tus resultados y tus respuestas.',
  'Consulta tu progreso para decidir qué reforzar.',
];

function OnboardingPage() {
  return (
    <section
      aria-labelledby="onboarding-title"
      className="flex max-w-2xl flex-col items-start py-8 sm:py-12 lg:py-16"
    >
      <h1
        id="onboarding-title"
        className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        CodeGym
      </h1>
      <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-foreground sm:text-xl">
        Practica JavaScript entendiendo el código, no memorizándolo.
      </p>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
        Entrena con sesiones breves para detectar errores y mejorar tu razonamiento.
      </p>

      <section aria-labelledby="how-it-works-title" className="mt-10 w-full border-t border-border pt-8">
        <h2
          id="how-it-works-title"
          className="text-2xl font-bold tracking-tight text-foreground"
        >
          Cómo funciona
        </h2>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-base leading-relaxed text-muted-foreground marker:font-semibold marker:text-primary">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <Link to="/#technologies" className={`${PRIMARY_ACTION} mt-10`}>
        Empezar a practicar
      </Link>
    </section>
  );
}

export default OnboardingPage;
