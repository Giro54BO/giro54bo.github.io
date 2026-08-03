<script lang="ts">
	import { filtros, filtrarViajes } from '$lib/data/dash-filters.svelte';
	import { getStateCounts, trips, STATE_LABELS, type TripState } from '$lib/data/trips';

	const counts = $derived(getStateCounts(filtrarViajes(trips, { includeStatus: false })));
	const states = $derived<{ estado: TripState; icon: string; count: number }[]>([
		{ estado: 'en-carga', icon: 'forklift', count: counts.enCarga },
		{ estado: 'en-transito', icon: 'local_shipping', count: counts.enTransito },
		{ estado: 'en-frontera', icon: 'flag', count: counts.enFrontera },
		{ estado: 'en-descarga', icon: 'download', count: counts.enDescarga },
		{ estado: 'incidencia', icon: 'report', count: counts.conIncidencia },
		{ estado: 'en-retorno', icon: 'undo', count: counts.enRetorno },
	]);

	function toggle(estado: TripState | null) {
		filtros.estado = filtros.estado === estado ? null : estado;
	}
</script>

<div class="status-filter" role="group" aria-label="Filtros por estado">
	<span class="status-filter__label">Estado</span>
	<div class="status-chips">
		<button class="filter-chip" class:filter-chip--active={filtros.estado === null} type="button" onclick={() => toggle(null)} aria-pressed={filtros.estado === null}>
			<span class="icon filter-chip__icon" aria-hidden="true">grid_view</span>
			Todos
			<span class="filter-chip__count">{filtrarViajes(trips, { includeStatus: false }).length}</span>
		</button>
		{#each states as item (item.estado)}
			<button class="filter-chip" class:filter-chip--active={filtros.estado === item.estado} type="button" onclick={() => toggle(item.estado)} aria-pressed={filtros.estado === item.estado}>
				<span class="icon filter-chip__icon" aria-hidden="true">{item.icon}</span>
				{STATE_LABELS[item.estado]}
				<span class="filter-chip__count">{item.count}</span>
			</button>
		{/each}
	</div>
</div>
