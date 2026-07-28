// Utilidades compartidas por los mapas ilustrativos (TransitMap, TripMap).
import { ROUTE_PATHS } from '$lib/data/routes';

// Colores concretos para capas de MapLibre (no acepta variables CSS).
// Coinciden con los puntos de la leyenda del diseño (Figma 218:596).
export const COLOR_NACIONAL = '#a78bfa';
export const COLOR_INTERNACIONAL = '#34d399';

export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/**
 * Trazado de la ruta entre dos puntos. Si existe geometría vial real para el
 * corredor (`rutaCodigo`) se usa esa polilínea (sigue carreteras); si no,
 * se recurre al arco tipo vuelo. Estático — sin llamadas en vivo.
 */
export function routePath(
	rutaCodigo: string | undefined,
	from: [number, number],
	to: [number, number]
): [number, number][] {
	const road = rutaCodigo ? ROUTE_PATHS[rutaCodigo] : undefined;
	return road && road.length >= 2 ? road : buildArc(from, to);
}

/** Curva cuadrática de Bézier entre dos puntos (misma técnica que mapcn MapArc). */
export function buildArc(
	from: [number, number],
	to: [number, number],
	curvature = 0.2,
	samples = 64
): [number, number][] {
	const [x0, y0] = from;
	const [x2, y2] = to;
	const dx = x2 - x0;
	const dy = y2 - y0;
	const distance = Math.hypot(dx, dy);
	if (distance === 0 || curvature === 0) return [from, to];

	const cx = (x0 + x2) / 2 + (-dy / distance) * distance * curvature;
	const cy = (y0 + y2) / 2 + (dx / distance) * distance * curvature;

	const points: [number, number][] = [];
	for (let i = 0; i <= samples; i += 1) {
		const t = i / samples;
		const inv = 1 - t;
		points.push([
			inv * inv * x0 + 2 * inv * t * cx + t * t * x2,
			inv * inv * y0 + 2 * inv * t * cy + t * t * y2,
		]);
	}
	return points;
}

/**
 * Marcador de geocerca: anillo punteado + etiqueta con el nombre de la zona.
 * Es un símbolo, no un perímetro a escala — a la escala de estos corredores
 * (~1 km/px) un radio real de 4–5 km ocuparía ~4 px y sería ilegible.
 */
export function geocercaMarkerEl(nombre: string, icon: string, activa: boolean): HTMLElement {
	const el = document.createElement('div');
	el.className = activa ? 'tm-geo tm-geo--activa' : 'tm-geo';
	el.innerHTML =
		`<span class="tm-geo__ring"></span>` +
		`<span class="tm-geo__label"><span class="icon tm-geo__icon">${icon}</span>${nombre}</span>`;
	return el;
}

export function cityMarkerEl(name: string): HTMLElement {
	const el = document.createElement('div');
	el.className = 'tm-city';
	el.innerHTML = `<span class="tm-city__dot"></span><span class="tm-city__label">${name}</span>`;
	return el;
}

/**
 * Etiqueta de extremo de ruta: píldora con icono + nombre del punto (origen o
 * destino). Señala los extremos cuando no hay una geocerca que ya los nombre
 * — p. ej. en unidades sin GPS, cuya ruta no tiene geocercas.
 */
export function endpointMarkerEl(name: string, icon: string): HTMLElement {
	const el = document.createElement('div');
	el.className = 'tm-endpoint';
	el.innerHTML =
		`<span class="tm-endpoint__label"><span class="icon tm-endpoint__icon">${icon}</span>${name}</span>`;
	return el;
}

export function truckMarkerEl(unidad: string, color: string): HTMLElement {
	const el = document.createElement('div');
	el.className = 'tm-truck';
	el.style.setProperty('--tm-color', color);
	// El punto de posición usa el mismo icono que acompaña a la Placa (vehId),
	// relleno. Como el punto ya lleva ese icono, la etiqueta ya no lo repite.
	el.innerHTML =
		`<span class="tm-truck__pulse"></span>` +
		`<span class="icon tm-truck__pin">local_shipping</span>` +
		`<span class="tm-truck__label">${unidad}</span>`;
	return el;
}
