// shadcn zinc theme for the Tailwind v4 browser runtime. Injected as a
// `text/tailwindcss` style block so @tailwindcss/browser compiles the
// @theme/@custom-variant directives; plain CSS rules pass through untouched.

export const SHADCN_THEME_STYLE_ID = 'htmdx-shadcn-theme';

export const shadcnThemeCss = `
@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;

  @keyframes accordion-down {
    from {
      height: 0;
    }
    to {
      height: var(--radix-accordion-content-height);
    }
  }
  @keyframes accordion-up {
    from {
      height: var(--radix-accordion-content-height);
    }
    to {
      height: 0;
    }
  }
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.92 0.004 286.32);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.552 0.016 285.938);
}

@layer base {
  * {
    border-color: var(--color-border);
    outline-color: color-mix(in oklab, var(--color-ring) 50%, transparent);
  }
}

/* Minimal typography for markdown blocks rendered by the React path. */
htmdx-code {
  display: block;
  max-width: 44rem;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
  background: var(--background);
  color: var(--foreground);
  font-family: ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
htmdx-code h1 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin: 1.5rem 0 0.75rem;
}
htmdx-code h2 {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  margin: 1.25rem 0 0.5rem;
}
htmdx-code h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}
htmdx-code p {
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0 0 0.75rem;
}
htmdx-code ul,
htmdx-code ol {
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0 0 0.75rem;
  padding-left: 1.25rem;
}
htmdx-code a {
  color: var(--primary);
  text-underline-offset: 2px;
}
htmdx-code code {
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  background: var(--muted);
  border-radius: 4px;
  padding: 0.125rem 0.375rem;
}
`;

export function injectShadcnTheme() {
  if (!globalThis.document || document.getElementById(SHADCN_THEME_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = SHADCN_THEME_STYLE_ID;
  style.type = 'text/tailwindcss';
  style.textContent = shadcnThemeCss;
  document.head.append(style);
}
