import { expect } from '@playwright/test';

// Valor único por test y por corrida: los tests corren en paralelo y la BD
// de pruebas acumula datos entre corridas, así que nada puede depender de
// nombres fijos ni de lo que ya estaba guardado.
export const unico = (prefijo) =>
  `${prefijo} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Crea un cliente por API (no por la UI: no es lo que prueban estos tests).
export async function crearCliente(api, nombre = unico('Cliente E2E')) {
  const respuesta = await api.post('clientes', { data: { nombre } });
  expect(respuesta.status(), 'crear el cliente de prueba por API').toBe(201);
  return respuesta.json();
}

// Pedidos de un cliente, leídos directo del API (lo que quedó en la BD).
export async function pedidosDelCliente(api, id_cliente) {
  const respuesta = await api.get('pedidos');
  expect(respuesta.ok()).toBeTruthy();
  return (await respuesta.json()).filter((p) => p.id_cliente === id_cliente);
}
