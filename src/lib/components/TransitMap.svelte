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

	onMount(() => {
		const routes = mapTrips
			.map(t => ({
				trip: t,
				from: CITY_INFO[t.origen]?.coords,
				to: CITY_INFO[t.destino]?.coords,
				color: esNacional(t.origen, t.destino) ? COLOR_NACIONAL : COLOR_INTERNACIONAL,
			}))
			.filter(r => r.from && r.to);

		const map = new maplibregl.Map({
			container,
			style: MAP_STYLE,
			interactive: false,
			renderWorldCopies: false,
			attributionControl: { compact: true },
		});

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
			markers.forEach(m => m.remove());
			map.remove();
		};
	});
</script>

<div class="map-card" class:map-card--collapsed={collapsed}>
	<div class="map-el" bind:this={container} role="img" aria-label="Mapa ilustrativo de los {mapTrips.length} despachos activos"></div>

	<button
		class="map-collapse"
		onclick={() => collapsed = !collapsed}
		aria-expanded={!collapsed}
		aria-label={collapsed ? 'Expandir mapa' : 'Contraer mapa'}
	>
		<span class="icon" aria-hidden="true">{collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}</span>
	</button>

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
