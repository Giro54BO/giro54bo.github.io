<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Trip } from '$lib/data/trips';
	import { CITY_INFO, GEOCERCAS, GEOCERCA_ICONS, esNacional } from '$lib/data/geo';
	import { COLOR_NACIONAL, COLOR_INTERNACIONAL, MAP_STYLE, routePath, endpointMarkerEl, truckMarkerEl, geocercaMarkerEl } from '$lib/map-utils';

	let { trip }: { trip: Trip } = $props();

	let container: HTMLDivElement;

	onMount(() => {
		const from = CITY_INFO[trip.origen]?.coords;
		const to = CITY_INFO[trip.destino]?.coords;
		const color = esNacional(trip.origen, trip.destino) ? COLOR_NACIONAL : COLOR_INTERNACIONAL;

		const map = new maplibregl.Map({
			container,
			style: MAP_STYLE,
			interactive: false,
			renderWorldCopies: false,
			attributionControl: { compact: true },
		});

		const zonas = trip.geocercasRuta.map(id => GEOCERCAS[id]).filter(Boolean);
		const coordKey = (c: [number, number]) => `${c[0].toFixed(3)},${c[1].toFixed(3)}`;

		// Nombre + icono para un extremo de la ruta. Reusa el directorio de lugares
		// (por coordenada) para dar un rótulo reconocible; si no, usa la ciudad.
		function endpointInfo(city: string, coords: [number, number]) {
			const lugar = Object.values(GEOCERCAS).find(g => coordKey(g.centro) === coordKey(coords));
			return lugar
				? { name: lugar.nombre, icon: GEOCERCA_ICONS[lugar.tipo] }
				: { name: city, icon: 'place' };
		}

		const bounds = new maplibregl.LngLatBounds();
		if (from) bounds.extend(from);
		if (to) bounds.extend(to);
		// Sin GPS no hay posición conocida: no se encuadra ni se dibuja la unidad.
		if (trip.gps) bounds.extend([trip.coordenadas.lng, trip.coordenadas.lat]);
		for (const z of zonas) bounds.extend(z.centro);
		if (!bounds.isEmpty()) {
			map.fitBounds(bounds, { padding: { top: 70, bottom: 60, left: 90, right: 90 }, animate: false });
		}

		map.on('load', () => {
			if (from && to) {
				const path = routePath(trip.rutaCodigo, from, to);
				map.addSource('trip-arc', {
					type: 'geojson',
					data: {
						type: 'Feature',
						properties: {},
						geometry: { type: 'LineString', coordinates: path },
					},
				});
				map.addLayer({
					id: 'trip-arc',
					type: 'line',
					source: 'trip-arc',
					layout: { 'line-join': 'round', 'line-cap': 'round' },
					paint: { 'line-color': color, 'line-width': 2.5, 'line-opacity': 0.9 },
				});

				// Punto sólido en cada extremo de la línea: delimita dónde empieza
				// y termina el recorrido de la unidad.
				const ends = [path[0], path[path.length - 1]];
				map.addSource('trip-ends', {
					type: 'geojson',
					data: {
						type: 'FeatureCollection',
						features: ends.map(c => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: c } })),
					},
				});
				map.addLayer({
					id: 'trip-ends',
					type: 'circle',
					source: 'trip-ends',
					paint: {
						'circle-radius': 5,
						'circle-color': color,
						// En trips con GPS los extremos caen dentro del anillo de la
						// geocerca; el borde blanco sobra. Sin GPS el punto va solo,
						// así que conserva el borde para despegarlo del mapa.
						'circle-stroke-width': trip.gps ? 0 : 2,
						'circle-stroke-color': '#ffffff',
					},
				});
			}
		});

		const markers: maplibregl.Marker[] = [];

		// Geocercas primero: el camión y las ciudades quedan por encima del anillo.
		const zonaCoords = new Set<string>();
		for (const z of zonas) {
			zonaCoords.add(coordKey(z.centro));
			markers.push(
				new maplibregl.Marker({
					element: geocercaMarkerEl(z.nombre, GEOCERCA_ICONS[z.tipo], z.id === trip.geocerca.actual),
				})
					.setLngLat(z.centro)
					.addTo(map)
			);
		}

		// Extremos sin geocerca (si ya hay una, su etiqueta nombra el punto).
		// Rótulo con icono para señalar origen y destino aunque la unidad no
		// tenga GPS y su ruta no lleve geocercas.
		for (const [ciudad, coords] of [[trip.origen, from], [trip.destino, to]] as const) {
			if (!coords || zonaCoords.has(coordKey(coords))) continue;
			const { name, icon } = endpointInfo(ciudad, coords);
			markers.push(new maplibregl.Marker({ element: endpointMarkerEl(name, icon) }).setLngLat(coords).addTo(map));
		}

		// La unidad sólo se ubica si el GPS Tag reporta posición; marcarla sin GPS
		// mostraría una ubicación que nadie está midiendo.
		if (trip.gps) {
			markers.push(
				new maplibregl.Marker({ element: truckMarkerEl(trip.unidad, color) })
					.setLngLat([trip.coordenadas.lng, trip.coordenadas.lat])
					.addTo(map)
			);
		}

		return () => {
			markers.forEach(m => m.remove());
			map.remove();
		};
	});
</script>

<div class="trip-map">
	<div class="trip-map__el" bind:this={container} role="img" aria-label="Mapa ilustrativo del despacho {trip.id}: {trip.origen} a {trip.destino}, última posición {trip.ultimaUbicacion}"></div>
	<div class="trip-map__badge" aria-hidden="true">
		<span class="icon icon--sm" aria-hidden="true">local_shipping</span>
		{trip.distancia}
	</div>

	{#if trip.geocercasRuta.length}
		<div class="trip-map__legend" aria-hidden="true">
			<span class="trip-map__legend-swatch"></span>
			Geocercas
		</div>
	{/if}
</div>

<style>
	.trip-map {
		position: relative;
		border-radius: 14px;
		background: var(--surface-2);
		overflow: hidden;
		height: 446px;
	}
	.trip-map__el {
		height: 100%;
		width: 100%;
	}
	.trip-map__badge {
		position: absolute;
		top: 16px;
		left: 16px;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		height: 36px;
		padding: 0 var(--space-3);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--ink-1);
		z-index: 5;
	}
	.trip-map__badge .icon { color: var(--blue-dark); }

	.trip-map__legend {
		position: absolute;
		bottom: 16px;
		left: 16px;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		height: 30px;
		padding: 0 var(--space-3);
		background: color-mix(in oklch, var(--surface) 88%, transparent);
		backdrop-filter: blur(4px);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink-2);
		z-index: 5;
	}
	.trip-map__legend-swatch {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1.5px dashed var(--blue-normal);
		background: color-mix(in oklch, var(--blue-normal) 12%, transparent);
	}
</style>
