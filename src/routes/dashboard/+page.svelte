<script lang="ts">
  import TransitMap from '$lib/components/TransitMap.svelte';
  import PredictionCards from '$lib/components/PredictionCards.svelte';
  import SearchEmptyState from '$lib/components/SearchEmptyState.svelte';
  import DashFilters from '$lib/components/DashFilters.svelte';
  import TripSearch from '$lib/components/TripSearch.svelte';
  import { filtros, filtrarViajes, limpiarFiltros, PERIODO_POR_DEFECTO } from '$lib/data/dash-filters.svelte';
  import { trips } from '$lib/data/trips';

  const filteredTrips = $derived(filtrarViajes(trips, { includeSearch: true }));
  const mapKey = $derived(filteredTrips.map((trip) => trip.id).join(','));

  // "Limpiar filtros" sólo cuando hay alguna selección activa.
  const hasFilters = $derived(
    !!(filtros.producto || filtros.cliente || filtros.transportista || filtros.origen.length || filtros.destino.length || filtros.estado.length)
    || filtros.fecha !== PERIODO_POR_DEFECTO
  );
</script>

<a href="#main-content" class="skip-link">Ir al contenido principal</a>

<div class="dashboard" id="main-content">
  <!-- Sin título de página: la barra de navegación ya indica la sección. -->
  <!-- Mapa (con buscador superpuesto) + panel de filtros permanente a la derecha. -->
  <div class="dash-layout">
    <div class="dash-layout__map" class:dash-layout__map--empty={filteredTrips.length === 0}>
      <div class="dash-layout__search">
        <div class="viajes-search-row">
          <TripSearch />
        </div>
      </div>

      {#if filteredTrips.length === 0}
        <SearchEmptyState onClearAll={limpiarFiltros} />
      {:else}
        {#key mapKey}
          <TransitMap trips={filteredTrips} collapsible={false} />
        {/key}
      {/if}
    </div>

    <aside class="dash-filters-panel" aria-label="Filtros del dashboard">
      <h2 class="dash-filters-panel__title">FILTROS</h2>
      <div class="dash-filters-panel__body">
        <DashFilters includeStatus />
      </div>
      {#if hasFilters}
        <div class="dash-filters-panel__foot">
          <button class="filter-section__clear" type="button" onclick={limpiarFiltros}>
            LIMPIAR FILTROS
            <span class="icon" aria-hidden="true">close</span>
          </button>
        </div>
      {/if}
    </aside>
  </div>

  {#if filteredTrips.length > 0}
    <PredictionCards trips={filteredTrips} />
  {/if}
</div>

<style>
  /* page-level minimal overrides can go here */
</style>
