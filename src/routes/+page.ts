import { redirect } from '@sveltejs/kit';

export function load() {
  throw redirect(307, '/dashboard');
}
// Sólo la portada se prerenderiza, para que la raíz sirva un index.html (200)
// limpio. El resto de rutas las cubre el fallback SPA (404.html).
export const prerender = true;
