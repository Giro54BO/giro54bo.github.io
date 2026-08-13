<script lang="ts">
	import { filtros, limpiarFiltros, PERIODO_POR_DEFECTO } from '$lib/data/dash-filters.svelte';

	const hasFilters = $derived(
		!!(
			filtros.producto || filtros.cliente || filtros.transportista ||
			filtros.origen.length || filtros.destino.length || filtros.estado.length
		) || filtros.fecha !== PERIODO_POR_DEFECTO
	);
</script>

<div class="filter-section__header">
	<h3 class="filter-section__title">Filtros</h3>
	{#if hasFilters}
		<button class="filter-section__clear" type="button" onclick={limpiarFiltros}>
			LIMPIAR FILTROS
			<span class="icon" aria-hidden="true">close</span>
		</button>
	{/if}
</div>
