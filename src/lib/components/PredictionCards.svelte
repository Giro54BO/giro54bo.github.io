<script lang="ts">
	import { trips as allTrips, type Trip } from '$lib/data/trips';
	import { parseKg, fmtTon } from '$lib/data/units';
	import DateRangeBar from '$lib/components/DateRangeBar.svelte';

	let {
		trips = allTrips,
	}: { trips?: Trip[] } = $props();
	let expandedCard = $state<string | null>(null);

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
		return `${Math.floor(hrs)} h ${Math.round((hrs % 1) * 60)} min`;
	}

	// Producto en ruta: despachos que ya salieron y aún no se entregan.
	const EN_RUTA = new Set(['en-transito', 'en-frontera', 'incidencia']);

	const cards = $derived.by(() => {
		// Unidades detenidas en zonas de carga/descarga (en espera de operación).
		const waitingTrips = trips.filter(t => t.estado === 'en-carga' || t.estado === 'en-descarga');
		const urgentTrips  = trips.filter(t => t.urgente);
		const borderTrips  = trips.filter(t => t.estado === 'en-frontera');

		const avgBorderH = borderTrips.length
			? borderTrips.reduce((s, t) => s + parseHours(t.tiempoEnEstado), 0) / borderTrips.length
			: 0;
		const avgBorderFmt = avgBorderH
			? `${Math.floor(avgBorderH)}h ${Math.round((avgBorderH % 1) * 60)}min`
			: '—';

		// Volumen de producto en tránsito (toneladas)
		const enRuta = trips.filter(t => EN_RUTA.has(t.estado));
		const volumenKg = enRuta.reduce((s, t) => s + parseKg(t.pesoNeto), 0);

		// Cumplimiento de ETA ideal (%) — sólo evaluable en unidades con GPS.
		const conGps = trips.filter(t => t.gps);
		const sinGps = trips.filter(t => !t.gps);
		const cumplen = conGps.filter(t => t.cumpleEtaIdeal).length;
		const cumplenTrips = conGps.filter(t => t.cumpleEtaIdeal);
		const cumplimiento = conGps.length ? Math.round((cumplen / conGps.length) * 100) : 0;

		// Lead time promedio (planificado por ruta): disponible con o sin GPS.
		const leads = trips.map(t => leadHours(t.distancia)).filter(h => h > 0);
		const leadProm = leads.length ? leads.reduce((s, h) => s + h, 0) / leads.length : 0;

		// Cobertura de GPS en la flota despachada.
		const pctGps = trips.length ? Math.round((conGps.length / trips.length) * 100) : 0;

		return [
			{
				id: 'volumen-en-transito',
				title: 'Volumen en tránsito', value: fmtTon(volumenKg),
				unit: `${enRuta.length} despacho${enRuta.length !== 1 ? 's' : ''} en ruta`,
				icon: 'inventory_2', delta: 'en ruta', positive: true,
				comparison: 'Peso neto de producto en movimiento', explanation: 'Peso neto de producto de los despachos que siguen en ruta.', linkedTrips: enRuta,
			},
			{
				id: 'cumplimiento-eta',
				title: 'Cumplimiento ETA', value: `${cumplimiento}%`,
				unit: `${cumplen} de ${conGps.length} en su ETA ideal`,
				icon: 'schedule', delta: cumplimiento >= 70 ? 'en meta' : 'bajo meta', positive: cumplimiento >= 70,
				comparison: sinGps.length
					? `Sólo unidades con GPS — ${sinGps.length} sin medir`
					: 'vs objetivo: 85% de cumplimiento', explanation: 'Porcentaje de unidades con GPS que cumplen su ETA ideal.', linkedTrips: cumplenTrips,
			},
			{
				id: 'lead-time',
				title: 'Lead time promedio', value: fmtHoras(leadProm),
				unit: `${leads.length} despacho${leads.length !== 1 ? 's' : ''} en el periodo`,
				icon: 'timer', delta: 'promedio', positive: true,
				comparison: 'Duración planificada origen → destino', explanation: 'Duración promedio planificada desde el origen hasta el destino.', linkedTrips: trips,
			},
			{
				id: 'en-espera',
				title: 'En espera', value: `${waitingTrips.length}`,
				unit: 'unidades en espera', icon: 'warehouse',
				delta: '+1', positive: false, comparison: 'vs semana pasada: 1 unidad en espera', explanation: 'Despachos detenidos en una zona de carga o descarga.', linkedTrips: waitingTrips,
			},
			{
				id: 'retrasos',
				title: 'Retrasos', value: `${urgentTrips.length}`,
				unit: 'viajes con demora', icon: 'report',
				delta: '+1', positive: false, comparison: 'vs semana pasada: 1 viaje urgente', explanation: 'Despachos marcados como urgentes o con demora.', linkedTrips: urgentTrips,
			},
			{
				id: 'tiempos-frontera',
				title: 'Tiempos de frontera', value: avgBorderFmt,
				unit: `promedio — ${borderTrips.length} viajes activos`, icon: 'flag',
				delta: '+1h 34min', positive: false, comparison: 'vs semana pasada: 2h 30min promedio', explanation: 'Tiempo promedio que los despachos activos llevan en frontera.', linkedTrips: borderTrips,
			},
			{
				id: 'cobertura-gps',
				title: 'Cobertura GPS', value: `${pctGps}%`,
				unit: `${conGps.length} con GPS · ${sinGps.length} sin GPS`,
				icon: 'gps_fixed',
				delta: sinGps.length ? `${sinGps.length} sin GPS` : 'flota completa',
				positive: sinGps.length === 0,
				comparison: 'Sin GPS no hay posición, geocercas ni ETA', explanation: 'Porcentaje de despachos con posición GPS disponible.', linkedTrips: trips,
			},
		];
	});
</script>

<section class="prediction-block" aria-label="Predicción de demoras">
	<DateRangeBar />

	<div class="prediction">
	{#each cards as card}
		{@const isExpanded = expandedCard === card.id}
		<div class="pred-card" class:pred-card--expanded={isExpanded}>
			<div class="pred-card__top">
				<div class="pred-card__header tooltip-trigger" role="img" aria-label={card.explanation}>
					<span class="pred-card__title">{card.title}</span>
					<span class="icon pred-card__icon" aria-hidden="true">
						{card.icon}
					</span>
					<span class="tooltip-bubble">{card.explanation}</span>
				</div>
				<div class="pred-card__value-row">
					<span class="pred-card__value">{card.value}</span>
					<span class="pred-card__delta" class:pred-card__delta--positive={card.positive}>
						<span class="icon pred-card__delta-icon" aria-hidden="true">
							{card.positive ? 'arrow_downward' : 'arrow_upward'}
						</span>
						{card.delta}
					</span>
				</div>
				{#if card.linkedTrips.length}
					<button
						class="pred-card__unit-row"
						type="button"
						aria-expanded={isExpanded}
						aria-controls={`pred-card-trips-${card.id}`}
						aria-label={isExpanded ? `Ocultar despachos de ${card.title}` : `Ver despachos de ${card.title}`}
						onclick={() => { expandedCard = isExpanded ? null : card.id; }}
					>
						<span class="pred-card__unit">{card.unit}</span>
						<span class="pred-card__trips-toggle" aria-hidden="true">
							<span class="icon">{isExpanded ? 'expand_less' : 'expand_more'}</span>
						</span>
					</button>
				{:else}
					<div class="pred-card__unit-row">
						<span class="pred-card__unit">{card.unit}</span>
					</div>
				{/if}
			</div>
			{#if isExpanded}
				<div class="pred-card__trips" id={`pred-card-trips-${card.id}`} aria-label={`Despachos de ${card.title}`}>
					{#each card.linkedTrips as trip (trip.id)}
						<a class="pred-card__trip" href={`/viajes/${trip.id}`}>
							<span>{trip.id}</span>
							<span class="icon icon--sm" aria-hidden="true">arrow_forward</span>
						</a>
					{/each}
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
		gap: var(--space-6);
	}

	.pred-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		background: var(--surface);
		border-radius: 20px;
		padding: var(--space-4) var(--space-5);
		box-shadow: 0 1px 1.5px rgba(7, 20, 23, 0.08);
	}

	.pred-card__top {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.pred-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.pred-card__title {
		font-size: var(--text-sm);
		font-weight: 600;
		letter-spacing: .01em;
		color: var(--grey-muted);
	}

	.pred-card__icon {
		font-size: 16px;
		color: var(--grey-muted);
		font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
	}
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
	.pred-card__trips { display: flex; flex-direction: column; gap: 2px; padding: var(--space-2) 0; border-top: 1px solid var(--border); }
	.pred-card__trip { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 7px var(--space-2); border-radius: var(--radius-md); color: var(--blue-dark); font-size: var(--text-sm); font-weight: 700; }
	.pred-card__trip:hover { background: var(--blue-lighter); }
	.pred-card__trip:focus-visible { outline: 2px solid var(--blue-normal); outline-offset: -2px; }

	.pred-card__footer {
		border-top: 1px solid #d7e0e2;
		padding-top: var(--space-3);
		font-size: var(--text-sm);
		font-weight: 500;
		line-height: 1.4;
		color: var(--grey-muted);
	}

	@media (max-width: 1100px) {
		.prediction { grid-template-columns: repeat(2, 1fr); }
	}
	@media (max-width: 700px) {
		.prediction { grid-template-columns: 1fr; gap: var(--space-4); }
	}
</style>
