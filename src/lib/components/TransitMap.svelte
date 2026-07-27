<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { trips as allTrips, type Trip } from '$lib/data/trips';
	import { CITY_INFO, esNacional } from '$lib/data/geo';
	import { COLOR_NACIONAL, COLOR_INTERNACIONAL, MAP_STYLE, routePath, cityMarkerEl, truckMarkerEl } from '$lib/map-utils';

	// El mapa refleja los mismos despachos que la tabla (filtrables desde el dashboard).
	let { trips = allTrips }: { trips?: Trip[] } = $props();
	const mapTrips = trips;
	const nacionales = mapTrips.filter(t => esNacional(t.origen, t.destino));
	const internacionales = mapTrips.filter(t => !esNacional(t.origen, t.destino));

	let container: HTMLDivElement;
	let collapsed = $state(false);

	// El mapa depende de WebGL y de un CDN de teselas externo. En equipos con
	// aceleración por hardware desactivada o redes que bloquean el CDN, no puede
	// dibujarse. En ese caso se muestra un resumen de rutas en vez de un vacío.
	let mapFailed = $state(false);

	function webglDisponible(): boolean {
		try {
			const c = document.createElement('canvas');
			return !!(
				window.WebGLRenderingContext &&
				(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))
			);
		} catch {
			return false;
		}
	}

	// Corredores únicos (para el resumen de respaldo si el mapa no carga).
	const corridorList = (() => {
		const m = new Map<string, { origen: string; destino: string; nacional: boolean; unidades: string[] }>();
		for (const t of mapTrips) {
			const key = t.rutaCodigo || `${t.origen}|${t.destino}`;
			if (!m.has(key)) m.set(key, { origen: t.origen, destino: t.destino, nacional: esNacional(t.origen, t.destino), unidades: [] });
			m.get(key)!.unidades.push(t.unidad);
		}
		return [...m.values()];
	})();

	onMount(() => {
		if (!webglDisponible()) {
			mapFailed = true;
			return;
		}

		const routes = mapTrips
			.map(t => ({
				trip: t,
				from: CITY_INFO[t.origen]?.coords,
				to: CITY_INFO[t.destino]?.coords,
				color: esNacional(t.origen, t.destino) ? COLOR_NACIONAL : COLOR_INTERNACIONAL,
			}))
			.filter(r => r.from && r.to);

		let map: maplibregl.Map;
		try {
			map = new maplibregl.Map({
				container,
				style: MAP_STYLE,
				interactive: false,
				renderWorldCopies: false,
				attributionControl: { compact: true },
			});
		} catch {
			mapFailed = true;
			return;
		}

		// Si el estilo (CDN) no carga en unos segundos, se asume bloqueado y se
		// muestra el resumen de respaldo en vez de un mapa en blanco.
		let loaded = false;
		map.on('load', () => { loaded = true; });
		const failTimer = setTimeout(() => { if (!loaded) mapFailed = true; }, 7000);

		// Encuadre sobre todas las rutas y posiciones actuales
		const bounds = new maplibregl.LngLatBounds();
		for (const r of routes) {
			bounds.extend(r.from!);
			bounds.extend(r.to!);
			if (r.trip.gps) bounds.extend([r.trip.coordenadas.lng, r.trip.coordenadas.lat]);
		}
		if (!bounds.isEmpty()) {
			map.fitBounds(bounds, { padding: { top: 90, bottom: 60, left: 110, right: 110 }, animate: false });
		}

		// Un trazado por corredor único (varios despachos comparten la misma ruta)
		const seenRoutes = new Set<string>();
		const arcRoutes = routes.filter(r => {
			const key = r.trip.rutaCodigo || `${r.trip.origen}|${r.trip.destino}`;
			if (seenRoutes.has(key)) return false;
			seenRoutes.add(key);
			return true;
		});

		map.on('load', () => {
			map.addSource('transit-arcs', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: arcRoutes.map(r => ({
						type: 'Feature',
						properties: { id: r.trip.id, color: r.color },
						geometry: { type: 'LineString', coordinates: routePath(r.trip.rutaCodigo, r.from!, r.to!) },
					})),
				},
			});
			map.addLayer({
				id: 'transit-arcs',
				type: 'line',
				source: 'transit-arcs',
				layout: { 'line-join': 'round', 'line-cap': 'round' },
				paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.9 },
			});
		});

		// Marcadores de ciudades (origen/destino, sin duplicados)
		const cities = new Set<string>();
		for (const r of routes) {
			cities.add(r.trip.origen);
			cities.add(r.trip.destino);
		}
		const markers: maplibregl.Marker[] = [];
		for (const city of cities) {
			markers.push(
				new maplibregl.Marker({ element: cityMarkerEl(city) })
					.setLngLat(CITY_INFO[city].coords)
					.addTo(map)
			);
		}

		// Posición actual de cada unidad; las que comparten coordenadas
		// (p. ej. dos unidades en la misma frontera) se apilan con un offset.
		// Las unidades sin GPS no se ubican: su posición no se mide.
		const coordCount = new Map<string, number>();
		for (const r of routes) {
			if (!r.trip.gps) continue;
			const key = `${r.trip.coordenadas.lng},${r.trip.coordenadas.lat}`;
			const stacked = coordCount.get(key) ?? 0;
			coordCount.set(key, stacked + 1);
			markers.push(
				new maplibregl.Marker({ element: truckMarkerEl(r.trip.unidad, r.color), offset: [0, stacked * 30] })
					.setLngLat([r.trip.coordenadas.lng, r.trip.coordenadas.lat])
					.addTo(map)
			);
		}

		return () => {
			clearTimeout(failTimer);
			markers.forEach(m => m.remove());
			map.remove();
		};
	});
</script>

<div class="map-card" class:map-card--collapsed={collapsed}>
	<div class="map-el" class:map-el--hidden={mapFailed} bind:this={container} role="img" aria-label="Mapa ilustrativo de los {mapTrips.length} despachos activos"></div>

	{#if mapFailed}
		<!-- Respaldo cuando el mapa no puede dibujarse (sin WebGL o CDN bloqueado):
		     se conserva la información de rutas y unidades. -->
		<div class="map-fallback" role="img" aria-label="Resumen de rutas (mapa no disponible)">
			<div class="map-fallback__head">
				<span class="icon" aria-hidden="true">public_off</span>
				<div>
					<p class="map-fallback__title">Mapa interactivo no disponible</p>
					<p class="map-fallback__note">Este navegador o red no permite cargarlo. Los despachos y sus rutas se listan abajo.</p>
				</div>
			</div>
			<ul class="map-fallback__list">
				{#each corridorList as c}
					<li class="map-fallback__item">
						<span class="map-fallback__dot" style="background:{c.nacional ? COLOR_NACIONAL : COLOR_INTERNACIONAL}"></span>
						<span class="map-fallback__route">{c.origen} <span aria-hidden="true">→</span> {c.destino}</span>
						<span class="map-fallback__units">{c.unidades.join(', ')}</span>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<button
			class="map-collapse"
			onclick={() => collapsed = !collapsed}
			aria-expanded={!collapsed}
			aria-label={collapsed ? 'Expandir mapa' : 'Contraer mapa'}
		>
			<span class="icon" aria-hidden="true">{collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}</span>
		</button>
	{/if}

	<div class="map-legend" aria-label="Leyenda del mapa">
		<span class="map-legend__title">MAPA</span>
		<span class="map-legend__item">
			<span class="map-legend__dot" style="background:{COLOR_NACIONAL}"></span>
			Nacionales ({nacionales.length})
		</span>
		<span class="map-legend__item">
			<span class="map-legend__dot" style="background:{COLOR_INTERNACIONAL}"></span>
			Internacionales ({internacionales.length})
		</span>
	</div>
</div>

<style>
	.map-card {
		position: relative;
		border-radius: 14px;
		background: var(--surface-2);
		overflow: hidden;
		height: 580px;
		transition: height 0.3s var(--ease-out-quart);
	}
	.map-card--collapsed {
		height: 75px;
	}

	.map-el {
		height: 580px;
		width: 100%;
	}
	.map-el--hidden { visibility: hidden; }

	/* Respaldo cuando el mapa no puede dibujarse. */
	.map-fallback {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: 72px var(--space-6) var(--space-6);
		background: var(--surface-2);
		overflow-y: auto;
	}
	.map-fallback__head {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}
	.map-fallback__head .icon { font-size: 28px; color: var(--ink-3); flex-shrink: 0; }
	.map-fallback__title { font-size: var(--text-base); font-weight: 700; color: var(--grey-darker); }
	.map-fallback__note { margin-top: 2px; font-size: var(--text-sm); color: var(--grey-muted); max-width: 52ch; }
	.map-fallback__list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		list-style: none;
	}
	.map-fallback__item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}
	.map-fallback__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
	.map-fallback__route { font-size: var(--text-sm); font-weight: 700; color: var(--grey-dark); white-space: nowrap; }
	.map-fallback__units { font-size: var(--text-sm); color: var(--grey-muted); margin-left: auto; text-align: right; }

	/* ── Botón contraer (Figma 215:558) ── */
	.map-collapse {
		position: absolute;
		top: 16px;
		left: 16px;
		width: 43px;
		height: 43px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg);
		border: 1.5px solid var(--blue-dark);
		border-radius: var(--radius-lg);
		color: var(--blue-dark);
		cursor: pointer;
		z-index: 5;
	}
	.map-collapse:hover { background: var(--teal-50); }
	.map-collapse:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }

	/* ── Leyenda (Figma 218:596) ── */
	.map-legend {
		position: absolute;
		top: 16px;
		right: 16px;
		display: flex;
		align-items: center;
		gap: var(--space-8);
		height: 43px;
		padding: 0 17.5px;
		background: var(--bg);
		border: 1.5px solid var(--blue-light-active);
		border-radius: var(--radius-lg);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--blue-dark-active);
		z-index: 5;
	}
	.map-legend__title {
		font-weight: 700;
		color: var(--blue-dark);
	}
	.map-legend__item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}
	.map-legend__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	/* Estilos de los marcadores (.tm-city, .tm-truck): globales en app.css,
	   compartidos con TripMap — MapLibre los saca del árbol del componente. */
	@media (prefers-reduced-motion: reduce) {
		.map-card { transition: none; }
	}

	/* Móvil: la leyenda no cabe junto al botón de contraer, así que baja a una
	   franja propia que se desplaza en horizontal. */
	@media (max-width: 700px) {
		.map-card { height: 420px; }
		.map-el { height: 420px; }
		.map-legend {
			top: 71px;
			left: 16px;
			right: 16px;
			gap: var(--space-4);
			padding: 0 var(--space-4);
			scroll-padding-left: var(--space-4);
			overflow-x: auto;
			scrollbar-width: none;
		}
		.map-legend::-webkit-scrollbar { display: none; }
		.map-legend__title { flex: 0 0 auto; }
		.map-legend__item { flex: 0 0 auto; }
	}
</style>
