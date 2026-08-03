<script lang="ts">
	import { filtros } from '$lib/data/dash-filters.svelte';
	import { trips, STATE_LABELS } from '$lib/data/trips';

	type Suggestion = { value: string; label: string; category: string };

	let focused = $state(false);
	let activeSuggestionIndex = $state(-1);

	const query = $derived(filtros.busqueda.trim().toLowerCase());
	const suggestions = $derived.by(() => {
		if (!query) return [] as Suggestion[];

		const matches: Suggestion[] = [];
		const seen = new Set<string>();
		const fields = (trip: typeof trips[number]): Suggestion[] => [
			{ value: trip.id, label: trip.id, category: 'Despacho' },
			{ value: trip.unidad, label: trip.unidad, category: 'Unidad' },
			{ value: trip.conductor, label: trip.conductor, category: 'Conductor' },
			{ value: trip.transportista, label: trip.transportista, category: 'Transportadora' },
			{ value: trip.carga, label: trip.carga, category: 'Producto' },
			{ value: trip.rutaNombre, label: trip.rutaNombre, category: 'Ruta' },
			{ value: trip.origen, label: trip.origen, category: 'Origen' },
			{ value: trip.destino, label: trip.destino, category: 'Destino' },
			{ value: STATE_LABELS[trip.estado], label: STATE_LABELS[trip.estado], category: 'Estado' },
			{ value: trip.fechaDocumentada, label: trip.fechaDocumentada, category: 'Fecha' },
			{ value: trip.sap.cliCodigo, label: trip.sap.cliCodigo, category: 'Cliente' },
		];

		for (const trip of trips) {
			for (const suggestion of fields(trip)) {
				const key = suggestion.value.toLowerCase();
				if (key.includes(query) && !seen.has(key)) {
					seen.add(key);
					matches.push(suggestion);
				}
				if (matches.length === 8) return matches;
			}
		}
		return matches;
	});

	function selectSuggestion(value: string) {
		filtros.busqueda = value;
		focused = false;
		activeSuggestionIndex = -1;
	}

	function clearSearch() {
		filtros.busqueda = '';
		focused = true;
		activeSuggestionIndex = -1;
	}
</script>

<div class="trip-search">
	<div class="search-pill" class:search-pill--filled={!!filtros.busqueda.trim()}>
		<span class="icon icon--sm search-pill__icon" aria-hidden="true">search</span>
		<input
			class="search-pill__input"
			type="search"
			role="combobox"
			placeholder="Buscar viaje por unidad, ruta, conductor"
			bind:value={filtros.busqueda}
			aria-label="Buscar viajes"
			aria-controls="trip-search-results"
			aria-expanded={focused && !!query}
			aria-autocomplete="list"
			aria-activedescendant={activeSuggestionIndex >= 0 ? `trip-search-suggestion-${activeSuggestionIndex}` : undefined}
			onfocus={() => { focused = true; activeSuggestionIndex = -1; }}
			onblur={() => { setTimeout(() => { focused = false; }, 120); }}
			oninput={() => { focused = true; activeSuggestionIndex = -1; }}
			onkeydown={(event) => {
				if (event.key === 'Escape') focused = false;
				if (event.key === 'ArrowDown' && suggestions.length) {
					event.preventDefault();
					activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
				}
				if (event.key === 'ArrowUp' && suggestions.length) {
					event.preventDefault();
					activeSuggestionIndex = activeSuggestionIndex <= 0 ? suggestions.length - 1 : activeSuggestionIndex - 1;
				}
				if (event.key === 'Enter') {
					event.preventDefault();
					const suggestion = suggestions[activeSuggestionIndex] ?? suggestions[0];
					if (suggestion) selectSuggestion(suggestion.value);
				}
			}}
		/>
		{#if filtros.busqueda}
			<button
				class="search-pill__clear"
				type="button"
				aria-label="Limpiar búsqueda"
				onmousedown={(event) => event.preventDefault()}
				onclick={clearSearch}
			>
				<span class="icon" aria-hidden="true">close</span>
			</button>
		{/if}
	</div>

	{#if focused && query}
		<div class="trip-search__menu" id="trip-search-results" role="listbox" aria-label="Sugerencias de búsqueda">
			{#if suggestions.length}
				{#each suggestions as suggestion, index (suggestion.category + suggestion.value)}
					<button
						id={`trip-search-suggestion-${index}`}
						type="button"
						class="trip-search__suggestion"
						class:trip-search__suggestion--active={activeSuggestionIndex === index}
						role="option"
						aria-selected={activeSuggestionIndex === index}
						onclick={() => selectSuggestion(suggestion.value)}
					>
						<span class="trip-search__suggestion-value">{suggestion.label}</span>
						<span class="trip-search__suggestion-category">{suggestion.category}</span>
					</button>
				{/each}
			{:else}
				<div class="trip-search__empty" role="status">
					<span>No se encontraron resultados para tu búsqueda.</span>
					<button type="button" onclick={clearSearch}>Limpiar búsqueda</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
