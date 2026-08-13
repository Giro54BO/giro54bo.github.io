<script lang="ts">
	import { trips as allTrips, type Trip } from '$lib/data/trips';
	import { GEOCERCAS } from '$lib/data/geo';
	import { parseKg, fmtTon } from '$lib/data/units';
	import { downloadCardExcel } from '$lib/excel';
	import DateRangeBar from '$lib/components/DateRangeBar.svelte';

	let {
		trips = allTrips,
	}: { trips?: Trip[] } = $props();

	let expandedCard = $state<string | null>(null);
	// Acordeones anidados (grupo → despachos). Clave: `${cardId}::${groupKey}`.
	let openGroups = $state<Record<string, boolean>>({});

	type TripGroup = { key: string; label: string; sub?: string; metric: string; trips: Trip[] };
	interface PredCard {
		id: string;
		title: string;
		icon: string;
		explanation: string;
		comparison: string;
		linkedTrips: Trip[];
		value?: string;
		delta?: string;
		positive?: boolean;
		unit?: string;
		groups?: TripGroup[];
		/** true → los grupos se muestran dentro de la tarjeta (sin chevron de tarjeta). */
		groupsInline?: boolean;
	}

	function toggleGroup(key: string) {
		openGroups[key] = !openGroups[key];
	}

	function parseHours(time: string): number {
		const h = time.match(/(\d+)h/);
		const m = time.match(/(\d+)min/);
		return (h ? +h[1] : 0) + (m ? +m[1] / 60 : 0);
	}

	/** '1.150 km | 22 h 16 min' → 22.27 (horas de lead time planificado). */
	function leadHours(distancia: string): number {
		const dur = distancia.split('|')[1] ?? '';
		const h = dur.match(/(\d+)\s*h/);
		const m = dur.match(/(\d+)\s*min/);
		return (h ? +h[1] : 0) + (m ? +m[1] / 60 : 0);
	}

	/** 22.27 → '22 h 16 min' */
	function fmtHoras(hrs: number): string {
		if (!hrs) return '—';
		const h = Math.floor(hrs);
		const m = Math.round((hrs % 1) * 60);
		return m ? `${h} h ${m} min` : `${h} h`;
	}
	/** 2.5 → '2h 30min' (formato compacto, como los tiempos de frontera). */
	function fmtHorasCompact(hrs: number): string {
		if (!hrs) return '—';
		return `${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}min`;
	}

	function plural(n: number, s: string, p: string) {
		return `${n} ${n === 1 ? s : p}`;
	}

	// Producto en ruta: despachos que ya salieron y aún no se entregan.
	const EN_RUTA = new Set(['en-transito', 'en-frontera', 'incidencia']);
	// Orden preferido de rutas (el resto va al final, alfabético).
	const ROUTE_ORDER = ['BOARIC', 'BEILO', 'BPLPZ', 'BPAREQ'];

	function groupBy(list: Trip[], key: (t: Trip) => string): Map<string, Trip[]> {
		const m = new Map<string, Trip[]>();
		for (const t of list) {
			const k = key(t);
			const arr = m.get(k);
			if (arr) arr.push(t);
			else m.set(k, [t]);
		}
		return m;
	}

	/** Agrupa despachos por transportadora (empresa), de mayor a menor. */
	function companyGroups(list: Trip[]): TripGroup[] {
		return [...groupBy(list, (t) => t.transportista).entries()]
			.map(([company, ts]) => ({ key: company, label: company, metric: plural(ts.length, 'viaje', 'viajes'), trips: ts }))
			.sort((a, b) => b.trips.length - a.trips.length);
	}

	/** Agrupa despachos por ruta (código), de mayor a menor cantidad. */
	function routeGroups(list: Trip[]): TripGroup[] {
		return [...groupBy(list, (t) => t.rutaCodigo).entries()]
			.map(([codigo, ts]) => ({ key: codigo, label: codigo, sub: ts[0]?.rutaNombre, metric: plural(ts.length, 'unidad', 'unidades'), trips: ts }))
			.sort((a, b) => b.trips.length - a.trips.length || a.key.localeCompare(b.key));
	}

	const cards = $derived.by((): PredCard[] => {
		// Unidades detenidas en zona de carga y en zona de descarga — métricas
		// separadas para no confundir las dos operaciones.
		const cargaTrips = trips.filter(t => t.estado === 'en-carga');
		const descargaTrips = trips.filter(t => t.estado === 'en-descarga');
		const urgentTrips = trips.filter(t => t.urgente);
		const borderTrips = trips.filter(t => t.estado === 'en-frontera');

		const avgBorderH = borderTrips.length
			? borderTrips.reduce((s, t) => s + parseHours(t.tiempoEnEstado), 0) / borderTrips.length
			: 0;

		// Volumen de producto en tránsito (toneladas)
		const enRuta = trips.filter(t => EN_RUTA.has(t.estado));
		const volumenKg = enRuta.reduce((s, t) => s + parseKg(t.pesoNeto), 0);

		// Volumen por producto (grupo → toneladas → despachos).
		const volumenGroups: TripGroup[] = [...groupBy(enRuta, t => t.carga).entries()]
			.map(([carga, ts]) => {
				const kg = ts.reduce((s, t) => s + parseKg(t.pesoNeto), 0);
				return { key: carga, label: carga, sub: plural(ts.length, 'despacho', 'despachos'), metric: fmtTon(kg), trips: ts, kg };
			})
			.sort((a, b) => b.kg - a.kg)
			.map(({ kg, ...g }) => g);

		// Tiempos de frontera por frontera (grupo → promedio → despachos).
		const fronteraGroups: TripGroup[] = [...groupBy(borderTrips, (t) => {
			const z = t.geocerca.actual && t.geocerca.actual.startsWith('frontera-')
				? t.geocerca.actual
				: t.geocerca.proxima && t.geocerca.proxima.startsWith('frontera-')
					? t.geocerca.proxima
					: 'otras';
			return z;
		}).entries()]
			.map(([zona, ts]) => {
				const avg = ts.reduce((s, t) => s + parseHours(t.tiempoEnEstado), 0) / ts.length;
				return { key: zona, label: GEOCERCAS[zona]?.nombre ?? 'Otras fronteras', sub: plural(ts.length, 'en frontera', 'en frontera'), metric: fmtHorasCompact(avg), trips: ts };
			})
			.sort((a, b) => b.trips.length - a.trips.length);

		// Cumplimiento de ETA ideal (%) — sólo evaluable en unidades con GPS.
		const conGps = trips.filter(t => t.gps);
		const sinGps = trips.filter(t => !t.gps);
		const cumplen = conGps.filter(t => t.cumpleEtaIdeal).length;
		const cumplenTrips = conGps.filter(t => t.cumpleEtaIdeal);
		const cumplimiento = conGps.length ? Math.round((cumplen / conGps.length) * 100) : 0;

		// Lead time por ruta (planificado): cada ruta con su promedio y despachos.
		const leadGroups: TripGroup[] = [...groupBy(trips, t => t.rutaCodigo).entries()]
			.map(([codigo, ts]) => {
				const ls = ts.map(t => leadHours(t.distancia)).filter(h => h > 0);
				const avg = ls.length ? ls.reduce((s, h) => s + h, 0) / ls.length : 0;
				return { key: codigo, label: codigo, sub: ts[0]?.rutaNombre, metric: fmtHoras(avg), trips: ts };
			})
			.sort((a, b) => {
				const ia = ROUTE_ORDER.indexOf(a.key); const ib = ROUTE_ORDER.indexOf(b.key);
				return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.key.localeCompare(b.key);
			});

		// Cobertura de GPS en la flota despachada.
		const pctGps = trips.length ? Math.round((conGps.length / trips.length) * 100) : 0;
		// Desglose por cobertura: con GPS (posición/ETA) vs sin GPS.
		const gpsGroups: TripGroup[] = [
			{ key: 'con-gps', label: 'Con GPS', sub: 'posición y ETA disponibles', metric: plural(conGps.length, 'unidad', 'unidades'), trips: conGps },
			{ key: 'sin-gps', label: 'Sin GPS', sub: 'sin posición ni ETA', metric: plural(sinGps.length, 'unidad', 'unidades'), trips: sinGps },
		].filter((g) => g.trips.length > 0);

		// Orden de la retícula 3×3 (Figma): la tarjeta "Lead time" ocupa la columna 1
		// abarcando dos filas, a la misma altura que las dos tarjetas apiladas a su
		// lado. El resto fluye por columnas:
		//   col 1: Lead time (filas 1-2) · Tiempos de frontera (fila 3)
		//   col 2: Volumen · En carga · Cobertura GPS
		//   col 3: Cumplimiento · En descarga · Retrasos
		return [
			{
				id: 'lead-time',
				title: 'Lead time promedio', icon: 'timer',
				comparison: 'Duración planificada origen → destino, por ruta.', explanation: 'Duración promedio planificada por ruta. Abre cada ruta para ver sus despachos.',
				linkedTrips: trips, groups: leadGroups, groupsInline: true,
			},
			{
				id: 'volumen-en-transito',
				title: 'Volumen en tránsito', value: fmtTon(volumenKg),
				unit: `${plural(enRuta.length, 'despacho', 'despachos')} en ruta · por producto`,
				icon: 'inventory_2', delta: 'en ruta', positive: true,
				comparison: 'Peso neto de producto en movimiento, por producto.', explanation: 'Peso neto de producto de los despachos que siguen en ruta, desglosado por producto.',
				linkedTrips: enRuta, groups: volumenGroups,
			},
			{
				id: 'cumplimiento-eta',
				title: 'Cumplimiento ETA', value: `${cumplimiento}%`,
				unit: `${cumplen} de ${conGps.length} en su ETA ideal`,
				icon: 'schedule', delta: cumplimiento >= 70 ? 'en meta' : 'bajo meta', positive: cumplimiento >= 70,
				comparison: sinGps.length
					? `Sólo unidades con GPS — ${sinGps.length} sin medir`
					: 'vs objetivo: 85% de cumplimiento', explanation: 'Unidades con GPS que cumplen su ETA ideal, por transportadora.', linkedTrips: cumplenTrips,
				groups: companyGroups(cumplenTrips),
			},
			{
				id: 'en-carga',
				title: 'En carga', value: `${cargaTrips.length}`,
				unit: 'unidades en carga · por ruta', icon: 'forklift',
				delta: '+1', positive: false, comparison: 'Despachos detenidos en una zona de carga, por ruta.', explanation: 'Despachos detenidos en una zona de carga, desglosados por ruta.', linkedTrips: cargaTrips,
				groups: routeGroups(cargaTrips),
			},
			{
				id: 'en-descarga',
				title: 'En descarga', value: `${descargaTrips.length}`,
				unit: 'unidades en descarga · por ruta', icon: 'download',
				delta: '+1', positive: false, comparison: 'Despachos detenidos en una zona de descarga, por ruta.', explanation: 'Despachos detenidos en una zona de descarga, desglosados por ruta.', linkedTrips: descargaTrips,
				groups: routeGroups(descargaTrips),
			},
			{
				id: 'tiempos-frontera',
				title: 'Tiempos de frontera', value: fmtHorasCompact(avgBorderH),
				unit: `${plural(borderTrips.length, 'viaje activo', 'viajes activos')} · por frontera`, icon: 'flag',
				delta: '+1h 34min', positive: false, comparison: 'Tiempo promedio en frontera, por paso.', explanation: 'Tiempo promedio que los despachos activos llevan en frontera, por paso fronterizo.',
				linkedTrips: borderTrips, groups: fronteraGroups,
			},
			{
				id: 'cobertura-gps',
				title: 'Cobertura GPS', value: `${pctGps}%`,
				unit: `${conGps.length} con GPS · ${sinGps.length} sin GPS`,
				icon: 'gps_fixed',
				delta: sinGps.length ? `${sinGps.length} sin GPS` : 'flota completa',
				positive: sinGps.length === 0,
				comparison: 'Sin GPS no hay posición, geocercas ni ETA.', explanation: 'Despachos con y sin posición GPS. Sin GPS no hay posición, geocercas ni ETA.', linkedTrips: trips,
				groups: gpsGroups,
			},
			{
				id: 'retrasos',
				title: 'Retrasos', value: `${urgentTrips.length}`,
				unit: 'viajes con demora · por transportadora', icon: 'report',
				delta: '+1', positive: false, comparison: 'Despachos urgentes o con demora, por transportadora.', explanation: 'Despachos marcados como urgentes o con demora, por transportadora.', linkedTrips: urgentTrips,
				groups: companyGroups(urgentTrips),
			},
		];
	});
</script>

{#snippet groupAccordion(cardId: string, g: TripGroup)}
	{@const gk = `${cardId}::${g.key}`}
	{@const gOpen = !!openGroups[gk]}
	<div class="pred-group" class:pred-group--open={gOpen}>
		<button class="pred-group__head" type="button" aria-expanded={gOpen} onclick={() => toggleGroup(gk)}>
			<span class="pred-group__label">
				<strong>{g.label}</strong>
				{#if g.sub}<span class="pred-group__sub">{g.sub}</span>{/if}
			</span>
			<span class="pred-group__metric">{g.metric}</span>
			<span class="pred-group__chevron" aria-hidden="true">
				<span class="icon icon--sm">{gOpen ? 'expand_less' : 'expand_more'}</span>
			</span>
		</button>
		{#if gOpen}
			<div class="pred-group__trips">
				{#each g.trips as trip (trip.id)}
					<a class="pred-card__trip" href={`/viajes/${trip.id}`}>
						<span>{trip.id}</span>
						<span class="icon icon--sm" aria-hidden="true">arrow_forward</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<section class="prediction-block" aria-label="Predicción de demoras">
	<DateRangeBar />

	<div class="prediction">
	{#each cards as card}
		{@const isExpanded = expandedCard === card.id}
		{@const hasToggle = !card.groupsInline && ((card.groups?.length ?? 0) > 0 || card.linkedTrips.length > 0)}
		<div class="pred-card" class:pred-card--expanded={isExpanded || card.groupsInline} class:pred-card--tall={card.groupsInline}>
			<div class="pred-card__top">
				<div class="pred-card__header">
					<div class="pred-card__id tooltip-trigger" role="img" aria-label={card.explanation}>
						<span class="icon pred-card__icon" aria-hidden="true">{card.icon}</span>
						<span class="pred-card__title">{card.title}</span>
						<span class="tooltip-bubble">{card.explanation}</span>
					</div>
					<button class="pred-card__excel" type="button" onclick={() => downloadCardExcel(card.title)} aria-label={`Descargar ${card.title} en Excel`}>
						<span class="icon icon--sm" aria-hidden="true">table_view</span>
						Excel
					</button>
				</div>

				{#if !card.groupsInline}
					<div class="pred-card__value-row">
						<span class="pred-card__value">{card.value}</span>
						{#if card.delta}
							<span class="pred-card__delta" class:pred-card__delta--positive={card.positive}>
								<span class="icon pred-card__delta-icon" aria-hidden="true">
									{card.positive ? 'arrow_downward' : 'arrow_upward'}
								</span>
								{card.delta}
							</span>
						{/if}
					</div>
				{/if}

				{#if hasToggle}
					<button
						class="pred-card__unit-row"
						type="button"
						aria-expanded={isExpanded}
						aria-controls={`pred-card-body-${card.id}`}
						aria-label={isExpanded ? `Ocultar detalle de ${card.title}` : `Ver detalle de ${card.title}`}
						onclick={() => { expandedCard = isExpanded ? null : card.id; }}
					>
						<span class="pred-card__unit">{card.unit}</span>
						<span class="pred-card__trips-toggle" aria-hidden="true">
							<span class="icon">{isExpanded ? 'expand_less' : 'expand_more'}</span>
						</span>
					</button>
				{:else if !card.groupsInline}
					<div class="pred-card__unit-row">
						<span class="pred-card__unit">{card.unit}</span>
					</div>
				{/if}
			</div>

			{#if card.groupsInline && card.groups}
				<!-- Lead time: rutas siempre visibles, cada una un acordeón. -->
				<div class="pred-card__groups pred-card__groups--inline" id={`pred-card-body-${card.id}`}>
					{#each card.groups as g (g.key)}
						{@render groupAccordion(card.id, g)}
					{/each}
				</div>
			{:else if isExpanded}
				<div class="pred-card__body" id={`pred-card-body-${card.id}`}>
					{#if card.groups}
						<div class="pred-card__groups">
							{#each card.groups as g (g.key)}
								{@render groupAccordion(card.id, g)}
							{/each}
						</div>
					{:else}
						<div class="pred-card__trips">
							{#each card.linkedTrips as trip (trip.id)}
								<a class="pred-card__trip" href={`/viajes/${trip.id}`}>
									<span>{trip.id}</span>
									<span class="icon icon--sm" aria-hidden="true">arrow_forward</span>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<div class="pred-card__footer">
				{card.comparison}
			</div>
		</div>
	{/each}
	</div>
</section>

<style>
	.prediction-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.prediction {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		/* Cada tarjeta crece con su contenido (acordeones) sin estirar a sus
		   vecinas de la misma fila. */
		align-items: start;
		gap: var(--space-6);
	}

	.pred-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		background: var(--surface-card);
		border: 0;
		border-radius: var(--radius-xl);
		padding: var(--space-4) var(--space-5);
		box-shadow: inset 0 0 0 1px var(--border-default), var(--shadow-card);
	}

	/* "Lead time": ocupa dos filas en la columna 1 y se estira a la altura de las
	   dos tarjetas apiladas a su lado (igual que el mapa iguala a los filtros). */
	.pred-card--tall {
		grid-row: span 2;
		align-self: stretch;
	}
	/* Con la tarjeta estirada, el pie queda anclado abajo. */
	.pred-card--tall .pred-card__footer { margin-top: auto; }

	.pred-card__top {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.pred-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}
	/* Icono + nombre juntos a la izquierda (conservan el tooltip al pasar). */
	.pred-card__id {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		cursor: help;
	}

	.pred-card__title {
		font-size: var(--text-sm);
		font-weight: 600;
		letter-spacing: .01em;
		color: var(--grey-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pred-card__icon {
		flex: 0 0 auto;
		font-size: 16px;
		color: var(--grey-muted);
		font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
	}

	/* Botón "Excel": exporta los datos de la tarjeta (prototipo → .xlsx vacío). */
	.pred-card__excel {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		flex: 0 0 auto;
		margin: -4px -6px -4px 0;
		padding: 4px 8px;
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--grey-muted);
		font: 600 var(--text-sm) var(--font-body);
		white-space: nowrap;
		cursor: pointer;
		transition: background var(--duration-fast), color var(--duration-fast);
	}
	.pred-card__excel:hover { background: var(--blue-lighter); color: var(--blue-dark); }
	.pred-card__excel:focus-visible { outline: 2px solid var(--blue-normal); outline-offset: 2px; }
	.pred-card__excel .icon { font-size: 18px; }
	.pred-card__header .tooltip-bubble {
		font-family: var(--font-body);
		font-size: var(--text-xs);
		font-weight: 700;
		font-variation-settings: normal;
		line-height: 1.3;
		text-transform: none;
		font-variant: normal;
		letter-spacing: normal;
	}

	.pred-card__value-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.pred-card__value {
		font-size: var(--text-h2);
		font-weight: 500;
		letter-spacing: -0.04em;
		line-height: 1;
		font-variant-numeric: lining-nums tabular-nums;
		font-feature-settings: 'lnum' 1, 'tnum' 1;
		color: var(--grey-darker);
	}

	.pred-card__delta {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		height: 30px;
		padding: 2px 7px 2px 5px;
		border-radius: var(--radius-full);
		background: var(--error-bg);
		color: var(--error-ink);
		font-size: var(--text-sm);
		font-weight: 500;
		white-space: nowrap;
	}
	.pred-card__delta--positive {
		background: var(--success-bg);
		color: var(--success-ink);
	}
	.pred-card__delta-icon { font-size: 12px; }

	.pred-card__unit {
		font-size: var(--text-base);
		font-weight: 600;
		line-height: 1.35;
		color: var(--grey-dark);
	}
	.pred-card__unit-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); width: 100%; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
	.pred-card__unit-row:focus-visible { outline: 2px solid var(--blue-normal); outline-offset: 3px; border-radius: var(--radius-md); }
	.pred-card__trips-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 32px;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		color: var(--blue-dark);
	}
	.pred-card__trips-toggle:hover { background: var(--blue-lighter); }
	.pred-card__trips-toggle:focus-visible { outline: 2px solid var(--blue-normal); outline-offset: 2px; }

	.pred-card__body { display: flex; flex-direction: column; }
	.pred-card__trips { display: flex; flex-direction: column; gap: 2px; padding: var(--space-2) 0; border-top: 1px solid var(--border); }
	.pred-card__trip { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 7px var(--space-2); border-radius: var(--radius-md); color: var(--blue-dark); font-size: var(--text-sm); font-weight: 700; }
	.pred-card__trip:hover { background: var(--blue-lighter); }
	.pred-card__trip:focus-visible { outline: 2px solid var(--blue-normal); outline-offset: -2px; }

	/* ── Grupos (ruta / producto / frontera) ── */
	.pred-card__groups { display: flex; flex-direction: column; gap: 2px; }
	.pred-card__groups--inline { border-top: 1px solid var(--border); padding-top: var(--space-2); }
	.pred-group { display: flex; flex-direction: column; border-radius: var(--radius-md); }
	.pred-group--open { background: var(--blue-lighter); }
	.pred-group__head {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: 8px var(--space-2);
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.pred-group__head:hover { background: var(--blue-lighter); }
	.pred-group__head:focus-visible { outline: 2px solid var(--blue-normal); outline-offset: -2px; }
	.pred-group__label { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
	.pred-group__label strong { color: var(--grey-dark); font-size: var(--text-sm); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.pred-group__sub { color: var(--grey-muted); font-size: var(--text-xs); font-weight: 500; }
	.pred-group__metric { color: var(--blue-dark); font-size: var(--text-base); font-weight: 700; white-space: nowrap; font-variant-numeric: lining-nums tabular-nums; font-feature-settings: 'lnum' 1, 'tnum' 1; }
	.pred-group__chevron { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 24px; width: 24px; height: 24px; color: var(--blue-dark); }
	.pred-group__trips { display: flex; flex-direction: column; gap: 2px; max-height: 264px; overflow-y: auto; padding: 2px var(--space-1) var(--space-2); }

	.pred-card__footer {
		border-top: 1px solid var(--blue-light-active);
		padding-top: var(--space-3);
		font-size: var(--text-sm);
		font-weight: 500;
		line-height: 1.4;
		color: var(--grey-muted);
	}

	@media (max-width: 1100px) {
		.prediction { grid-template-columns: repeat(2, 1fr); }
		/* Sin la retícula 3×3 no hay dos filas que igualar: cada tarjeta vuelve a
		   su altura natural. */
		.pred-card--tall { grid-row: auto; align-self: start; }
		.pred-card--tall .pred-card__footer { margin-top: 0; }
	}
	@media (max-width: 700px) {
		.prediction { grid-template-columns: 1fr; gap: var(--space-4); }
	}
</style>
