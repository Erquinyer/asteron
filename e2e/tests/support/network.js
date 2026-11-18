// Simula una red lenta: la petición llega al servidor de inmediato, pero su
// respuesta se entrega al navegador "ms" milisegundos después. "cuales" decide
// qué peticiones de ese patrón se retrasan (por defecto, todas las del método).
export async function retrasarRespuestas(page, patron, { metodo = 'GET', ms, cuales = () => true }) {
  await page.route(patron, async (route) => {
    const peticion = route.request();
    if (peticion.method() !== metodo || !cuales(peticion)) return route.fallback();
    const respuesta = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.fulfill({ response: respuesta });
  });
}
