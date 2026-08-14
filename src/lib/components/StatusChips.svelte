<script lang="ts">
	import { filtros, filtrarViajes } from '$lib/data/dash-filters.svelte';
	import { getStateCounts, trips, STATE_ICONS, STATE_LABELS, type TripState } from '$lib/data/trips';

	const counts = $derived(getStateCounts(filtrarViajes(trips, { includeStatus: false })));
	const states = $derived<{ estado: TripState; count: number }[]>([
		{ estado: 'en-carga', count: counts.enCarga },
		{ estado: 'en-transito', count: counts.enTransito },
		{ estado: 'en-frontera', count: counts.enFrontera },
		{ estado: 'en-descarga', count: counts.enDescarga },
		{ estado: 'incidencia', count: counts.conIncidencia },
		{ estado: 'en-retorno', count: counts.enRetorno },
	]);

	function toggle(estado: TripState | null) {
		if (estado === null) { filtros.estado = []; return; }
		filtros.estado = filtros.estado.includes(estado)
			? filtros.estado.filter((e) => e !== estado)
			: [...filtros.estado, estado];
	}
</script>

<div class="status-filter" role="group" aria-label="Filtros por estado">
	<div class="filter-bar">
		<button class="filter-chip" class:filter-chip--active={filtros.estado.length === 0} type="button" onclick={() => toggle(null)} aria-pressed={filtros.estado.length === 0}>
			<span class="icon filter-chip__icon" aria-hidden="true">grid_view</span>
			Todos los estados
			<span class="filter-chip__count">{filtrarViajes(trips, { includeStatus: false }).length}</span>
		</button>
		{#each states as item (item.estado)}
			<button class="filter-chip" class:filter-chip--active={filtros.estado.includes(item.estado)} type="button" onclick={() => toggle(item.estado)} aria-pressed={filtros.estado.includes(item.estado)}>
				<span class="filter-chip__icon-wrap filter-chip__icon-wrap--{item.estado}">
					<span class="icon filter-chip__icon" aria-hidden="true">{STATE_ICONS[item.estado]}</span>
				</span>
				{STATE_LABELS[item.estado]}
				<span class="filter-chip__count">{item.count}</span>
			</button>
		{/each}
	</div>
</div>
