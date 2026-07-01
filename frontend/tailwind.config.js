/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Marca ───────────────────────────────────────────────────────
        primary:   { DEFAULT: '#4F46E5', hover: '#4138BC' },
        secondary: { DEFAULT: '#06B6D4' },
        success:   { DEFAULT: '#10B981' },
        warning:   { DEFAULT: '#F59E0B' },
        error:     { DEFAULT: '#F43F5E' },

        // ── Superficies via CSS vars (light/dark automático) ─────────────
        bg:             'var(--bg)',
        surface:        'var(--surface)',
        surface2:       'var(--surface-2)',
        sidebar:        'var(--sidebar)',
        border:         'var(--border)',
        'border-strong':'var(--border-strong)',
        ink:            'var(--text)',
        muted:          'var(--muted)',
        faint:          'var(--faint)',
        hover:          'var(--hover)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      borderRadius: {
        card:    '13px',
        control: '10px',
        badge:   '7px',
      },
      boxShadow: {
        card:      '0 1px 2px rgba(20,24,45,.04), 0 10px 26px -14px rgba(20,24,45,.16)',
        'card-dk': '0 1px 2px rgba(0,0,0,.4), 0 14px 34px -16px rgba(0,0,0,.7)',
        modal:     '0 32px 70px -20px rgba(0,0,0,.5)',
        btn:       '0 6px 16px -7px rgba(79,70,229,.7)',
      },
    },
  },
  plugins: [],
}
