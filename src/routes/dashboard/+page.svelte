<script lang="ts">
  import TransitMap from '$lib/components/TransitMap.svelte';
  import PredictionCards from '$lib/components/PredictionCards.svelte';
  import DashFilters from '$lib/components/DashFilters.svelte';
  import StatusChips from '$lib/components/StatusChips.svelte';
  import FilterSectionHeader from '$lib/components/FilterSectionHeader.svelte';
  import TripSearch from '$lib/components/TripSearch.svelte';
  import { filtros, filtrarViajes } from '$lib/data/dash-filters.svelte';
  import { trips } from '$lib/data/trips';

  const filteredTrips = $derived(filtrarViajes(trips, { includeSearch: true }));
  const mapKey = $derived(filteredTrips.map((trip) => trip.id).join(','));
</script>

<a href="#main-content" class="skip-link">Ir al contenido principal</a>

<div class="dashboard" id="main-content">
  <div class="page-header">
    <h1 class="section-heading section-heading--h1">
      <span class="icon section-heading__icon" aria-hidden="true">grid_view</span>
      Dashboard
    </h1>
  </div>

  <div class="viajes-search-row dashboard-search-row">
    <TripSearch />
    <button class="btn-buscar" type="button">BUSCAR</button>
  </div>

  <div class="filters-divider" aria-hidden="true"></div>

  <section class="filter-section" aria-label="Filtros del Dashboard">
    <FilterSectionHeader />
    <DashFilters />
    <StatusChips />
  </section>

  <!-- Map and prediction -->
  {#key mapKey}
    <TransitMap trips={filteredTrips} />
  {/key}

  <PredictionCards trips={filteredTrips} />

</div>

<style>
  /* page-level minimal overrides can go here */
</style>
