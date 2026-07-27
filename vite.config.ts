import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Sitio 100% estático para GitHub Pages. Se publica en la raíz
			// (giro54bo.github.io), por lo que no hace falta `paths.base`.
			// `fallback: 404.html` lo convierte en SPA: cualquier ruta profunda
			// (p. ej. /viajes/PEWDSP206746) la resuelve el enrutador del cliente.
			// La portada se prerenderiza aparte para servir un 200 limpio.
			adapter: adapter({ fallback: '404.html' })
		})
	]
});
