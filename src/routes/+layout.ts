// Sitio estático (GitHub Pages), sin servidor: se renderiza en el navegador.
// Necesario porque /viajes/[id] es una ruta dinámica que no se puede
// prerenderizar sin una lista de entradas; con SSR desactivado el enrutador
// del cliente resuelve cualquier despacho.
export const ssr = false;
export const prerender = false;
