<script lang="ts">
	import DateRangeBar from '$lib/components/DateRangeBar.svelte';
	import { filtros, PERIODOS } from '$lib/data/dash-filters.svelte';

	let {
		onOpenFilters,
		onClearSearch,
	}: {
		onOpenFilters: () => void;
		onClearSearch: () => void;
	} = $props();

	const periodLabel = $derived(
		filtros.fecha === 'rango'
			? 'el rango de fechas seleccionado'
			: `el periodo «${PERIODOS.find((periodo) => periodo.value === filtros.fecha)?.label.toLowerCase() ?? 'seleccionado'}»`,
	);
	const query = $derived(filtros.busqueda.trim());
</script>

<section class="search-empty-state" role="status" aria-live="polite">
	<span class="icon search-empty-state__icon" aria-hidden="true">manage_search</span>
	<h2 class="search-empty-state__title">No se encontraron resultados</h2>
	<p class="search-empty-state__message">
		{#if query}
			No se encontraron despachos para «{query}» en {periodLabel}.
		{:else}
			No se encontraron despachos en {periodLabel}.
		{/if}
	</p>

	<div class="search-empty-state__date">
		<DateRangeBar />
	</div>

	<div class="search-empty-state__actions">
		<button class="btn-outline" type="button" onclick={onOpenFilters}>
			<span class="icon icon--sm" aria-hidden="true">calendar_month</span>
			Cambiar rango de fecha
		</button>
		<button class="btn-outline btn-outline--muted" type="button" onclick={onClearSearch}>
			<span class="icon icon--sm" aria-hidden="true">close</span>
			Limpiar búsqueda
		</button>
	</div>
</section>
