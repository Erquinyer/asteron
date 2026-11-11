import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

// Configura un servidor de mock para Node.js (usado por Vitest)
export const server = setupServer(...handlers);