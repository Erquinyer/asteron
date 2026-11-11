// Se carga antes de cada archivo de pruebas (setupFiles en vite.config.js).
// Agrega los matchers de jest-dom: toBeInTheDocument, toBeDisabled, toHaveAttribute…
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Desmonta lo renderizado y limpia la sesión guardada entre un test y otro
afterEach(() => {
  cleanup()
  localStorage.clear()
})
