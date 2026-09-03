import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * CAPA 3 de la jerarquía de tokens (D008):
 *   primitivas (index.css) → semánticas (index.css) → ESTE ARCHIVO → componentes
 *
 * Cada color se resuelve como hsl(var(--token-semantico)). Los tokens se
 * declaran como canales HSL para que Tailwind pueda inyectar el modificador
 * de opacidad: bg-primary/20 compila a hsl(var(--primary) / .2).
 *
 * Los componentes deben consumir estas utilidades y no var(--primitiva).
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    fontFamily: {
      sans: ['var(--font-sans)'],
      mono: ['var(--font-mono)'],
    },
    extend: {
      colors: {
        /* --- Contrato shadcn/ui --- */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        /* En shadcn «accent» es la superficie sutil de hover/activo. El color
           de marca de CodeGym es `brand`, no este. */
        accent: {
          DEFAULT: 'hsl(var(--surface-hover))',
          foreground: 'hsl(var(--surface-hover-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        /* --- Slots propios de CodeGym --- */
        /* Marca. Solo usos NO textuales: bordes, iconos, glows, focus (D007).
           Para texto de acento accesible usa `text-primary`. */
        brand: 'hsl(var(--accent))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        /* Tercer nivel de texto (§12 --text-muted). Solo contenido decorativo
           o de baja prioridad: 3.13:1 sobre background, no cumple AA como
           texto normal. */
        subtle: 'hsl(var(--text-muted))',
        code: {
          DEFAULT: 'hsl(var(--code-bg))',
          border: 'hsl(var(--code-border))',
        },
      },
      /* Escala de radios del Master Plan §12, consumida desde las primitivas
         en lugar de derivarla de un --radius propio (ver D008). */
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      /* Tokens de movimiento T071. Los componentes podrán usar duration-* y
         ease-* sin introducir literales ni dependencias de animación. */
      transitionDuration: {
        fast: 'var(--motion-duration-fast)',
        normal: 'var(--motion-duration-normal)',
        slow: 'var(--motion-duration-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--motion-ease-standard)',
        emphasized: 'var(--motion-ease-emphasized)',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        correctPulse: {
          '0%': { boxShadow: '0 0 0 0 var(--success-glow)' },
          '70%': { boxShadow: '0 0 0 8px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'fade-in-up':
          'fadeInUp var(--motion-duration-normal) var(--motion-ease-standard) both',
        'correct-pulse':
          'correctPulse var(--motion-duration-slow) var(--motion-ease-emphasized) both',
        shake: 'shake var(--motion-duration-normal) var(--motion-ease-standard) both',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
