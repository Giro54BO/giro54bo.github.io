<script lang="ts">
  import TransitMap from '$lib/components/TransitMap.svelte';
  import PredictionCards from '$lib/components/PredictionCards.svelte';
  import DashFilters from '$lib/components/DashFilters.svelte';
  import StatusChips from '$lib/components/StatusChips.svelte';
  import FilterSectionHeader from '$lib/components/FilterSectionHeader.svelte';
  import TripSearch from '$lib/components/TripSearch.svelte';
  import { filtros, filtrarViajes } from '$lib/data/dash-filters.svelte';
  import { trips } from '$lib/data/trips';

  let filtersOpen = $state(false);
  const filteredTrips = $derived(filtrarViajes(trips, { includeSearch: true }));
  const mapKey = $derived(filteredTrips.map((trip) => trip.id).join(','));
</script>

<a href="#main-content" class="skip-link">Ir al contenido principal</a>

<div class="dashboard" id="main-content">
  <div class="page-header filter-page-header">
    <h1 class="section-heading section-heading--h1">
      <span class="icon section-heading__icon" aria-hidden="true">grid_view</span>
      Dashboard
    </h1>
    <div class="filter-page-header__controls">
      <div class="viajes-search-row dashboard-search-row">
        <TripSearch />
        <button class="btn-buscar" type="button">BUSCAR</button>
      </div>
      <button class="filters-toggle" type="button" aria-expanded={filtersOpen} aria-controls="dashboard-filters" onclick={() => filtersOpen = !filtersOpen}>
        <span>FILTROS</span>
        <span class="icon" aria-hidden="true">{filtersOpen ? 'expand_less' : 'tune'}</span>
      </button>
    </div>
  </div>

  {#if filtersOpen}
    <div class="filters-divider" aria-hidden="true"></div>
    <section class="filter-section" id="dashboard-filters" aria-label="Filtros del Dashboard">
      <FilterSectionHeader />
      <DashFilters />
      <StatusChips />
    </section>
  {/if}

  <!-- Map and prediction -->
  {#key mapKey}
    <TransitMap trips={filteredTrips} />
  {/key}

  <PredictionCards trips={filteredTrips} />

</div>

<style>
  /* page-level minimal overrides can go here */
</style>
