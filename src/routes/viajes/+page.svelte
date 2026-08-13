<script lang="ts">
  import DashFilters from '$lib/components/DashFilters.svelte';
  import StatusChips from '$lib/components/StatusChips.svelte';
  import TripSearch from '$lib/components/TripSearch.svelte';
  import SearchEmptyState from '$lib/components/SearchEmptyState.svelte';
  import { filtros, filtrarViajes, limpiarFiltros, PERIODO_POR_DEFECTO } from '$lib/data/dash-filters.svelte';
  import { trips, STATE_ICONS, STATE_LABELS, type TripState } from '$lib/data/trips';

  let filtersOpen = $state(false);
  const dashTrips = $derived(filtrarViajes(trips, { includeSearch: true }));

  // "Limpiar filtros" (al pie de la sección) sólo cuando hay una selección activa.
  const hasFilters = $derived(
    !!(filtros.producto || filtros.cliente || filtros.transportista || filtros.origen.length || filtros.destino.length || filtros.estado.length)
    || filtros.fecha !== PERIODO_POR_DEFECTO
  );

  const STATUS_COLORS: Partial<Record<TripState, { bg: string; ink: string }>> = {
    'en-transito':     { bg: 'var(--status-en-transito-bg)',      ink: 'var(--status-en-transito-ink)'      },
    'en-frontera':     { bg: 'var(--status-en-frontera-bg)',      ink: 'var(--status-en-frontera-ink)'      },
    'incidencia':      { bg: 'var(--status-incidencia-bg)',       ink: 'var(--status-incidencia-ink)'       },
    'en-carga':        { bg: 'var(--status-en-carga-bg)',         ink: 'var(--status-en-carga-ink)'         },
    'en-descarga':     { bg: 'var(--status-en-descarga-bg)',      ink: 'var(--status-en-descarga-ink)'      },
    'en-retorno':      { bg: 'var(--status-en-retorno-bg)',       ink: 'var(--status-en-retorno-ink)'       },
  };

  function etaLine(trip: { distancia: string; gps: boolean }) {
    const [km, dur] = trip.distancia.split('|').map(s => s.trim());
    if (!dur) return trip.distancia;
    return `${trip.gps ? 'ETA' : 'Lead time total'} ${dur} | ${km}`;
  }

  function estaDentroDeBolivia(trip: { ultimaUbicacion: string; geocerca: { actual?: string } }) {
    const ubicacion = `${trip.ultimaUbicacion} ${trip.geocerca.actual ?? ''}`.toLowerCase();
    if (trip.geocerca.actual?.startsWith('frontera-')) return false;
    if (/(perú|peru|chile|arica|ilo|arequipa|putre|puerto-|cd-)/.test(ubicacion)) return false;
    return /(bolivia|cochabamba|patacamaya|caracollo|oruro|turco|warnes|el alto|la paz)/.test(ubicacion);
  }

  const filteredTrips = $derived(
    dashTrips.slice().sort((a, b) => {
      const priority: Record<TripState, number> = { 'en-carga': 0, 'en-transito': 1, 'en-frontera': 2, 'en-descarga': 3, incidencia: 4, 'en-retorno': 5 };
      return priority[a.estado] - priority[b.estado];
    })
  );

  const leyenda = $derived.by(() => {
    const vistas = new Set<string>();
    const orden: TripState[] = [];
    for (const t of filteredTrips) {
      const label = STATE_LABELS[t.estado];
      if (!vistas.has(label)) { vistas.add(label); orden.push(t.estado); }
    }
    return orden;
  });

  function desglose(rutaNombre: string): string[] { return rutaNombre.split(' - ').map(s => s.trim()); }
</script>

<div class="viajes" id="main-content">
  <!-- Sin título de página: la barra de navegación ya indica la sección; el
       buscador se alinea a la izquierda y ocupa el ancho disponible. -->
  <div class="viajes-header">
    <div class="viajes-search-row">
      <TripSearch />
    </div>
    <button class="filters-toggle" type="button" aria-expanded={filtersOpen} aria-controls="viajes-filters" onclick={() => filtersOpen = !filtersOpen}>
      <span class="icon" aria-hidden="true">filter_alt</span>
      <span>VER FILTROS</span>
      <span class="icon" aria-hidden="true">{filtersOpen ? 'expand_less' : 'expand_more'}</span>
    </button>
  </div>

  {#if filtersOpen}
    <div class="filters-divider" aria-hidden="true"></div>
    <section class="filter-section" id="viajes-filters" aria-label="Filtros de Viajes">
      <DashFilters />
      <StatusChips />
      {#if hasFilters}
        <button class="filter-section__clear filter-section__clear--full" type="button" onclick={limpiarFiltros}>
          LIMPIAR FILTROS
          <span class="icon" aria-hidden="true">close</span>
        </button>
      {/if}
    </section>
    <!-- Borde inferior a la misma distancia que la línea superior (el gap de
         `.viajes` es simétrico), cerrando la barra de estado. -->
    <div class="filters-divider" aria-hidden="true"></div>
  {/if}

  <div class="cards-container" role="region" aria-label="Tabla de despachos activos">
    <div class="cards-header" aria-hidden="true">
      <span>Correlativo único / Fecha de despacho</span>
      <span>Nº de entrega SAP / Código de cliente SAP</span>
      <span>Nº de pedido SAP / Nº de transporte SAP</span>
      <span>Código de ruta / Desglose de la ruta / Tiempo estimado de llegada</span>
      <span>Carnet chofer / Nombre del proveedor de transporte / Placa</span>
      <span></span>
    </div>

    <div class="cards-list">
      {#each filteredTrips as trip, i (trip.id)}
        {@const sc = STATUS_COLORS[trip.estado]}
        {@const ruta = desglose(trip.rutaNombre)}
        {@const dentroDeBolivia = estaDentroDeBolivia(trip)}
        <a class="trip-card" href={`/viajes/${trip.id}`} style="animation-delay:{i * 55}ms" aria-label={`Despacho ${trip.id}, vehículo ${trip.unidad}, ${STATE_LABELS[trip.estado]}. Ver detalle.`}>
          <div class="card-grid">
            <div class="card-cell">
              <span class="cell-label">Correlativo único / Fecha de despacho</span>
              <div class="status-circle tooltip-trigger" style="background:{sc?.bg}; color:{sc?.ink}" aria-label={STATE_LABELS[trip.estado]}>
                <span class="icon icon--sm" aria-hidden="true">{STATE_ICONS[trip.estado]}</span>
                <span class="tooltip-bubble">{STATE_LABELS[trip.estado]}</span>
              </div>
              <div class="cell-stack">
                <span class="cell-primary">
                  {trip.id}
                  {#if trip.urgente}
                    <span class="icon icon--sm urgent-icon" aria-label="Urgente">priority_high</span>
                  {/if}
                </span>
                <span class="cell-secondary">{trip.fechaDocumentada}</span>
              </div>
            </div>

            <div class="cell-stack">
              <span class="cell-label">Nº de entrega SAP / Código de cliente SAP</span>
              <span class="cell-secondary">{trip.sap.salidaMercancia}</span>
              <span class="cell-primary">{trip.sap.cliCodigo}</span>
            </div>

            <div class="cell-stack">
              <span class="cell-label">Nº de pedido SAP / Nº de transporte SAP</span>
              <span class="cell-secondary">{trip.sap.pedido}</span>
              <span class="cell-primary">{trip.sap.numeroTransporte}</span>
            </div>

            <div class="cell-stack">
              <span class="cell-label">Código de ruta / Desglose de la ruta / Tiempo estimado de llegada</span>
              <span class="cell-secondary">{trip.rutaCodigo}</span>
              <span class="route-line">
                {#each ruta as segmento, si}
                  {#if si > 0}<span class="icon icon--sm route-arrow" aria-hidden="true">arrow_forward</span>{/if}
                  <span class="route-seg" class:route-seg--dest={si === ruta.length - 1}>{segmento}</span>
                {/each}
              </span>
              <span class="cell-secondary">{etaLine(trip)}</span>
              <span class="route-location">
                <span class="route-location__help tooltip-trigger" role="img" aria-label={dentroDeBolivia ? 'Dentro de Bolivia' : 'Fuera de Bolivia'}>
                  <span class="icon" aria-hidden="true">help_outline</span>
                  <span class="tooltip-bubble">{dentroDeBolivia ? 'Dentro de Bolivia' : 'Fuera de Bolivia'}</span>
                </span>
                <span>Tránsito</span>
                <strong>{dentroDeBolivia ? 'Bolivia' : 'Internacional'}</strong>
              </span>
            </div>

            <div class="cell-stack">
              <span class="cell-label">Carnet chofer / Nombre del proveedor de transporte / Placa</span>
              <span class="cell-line">
                <span class="icon icon--sm cell-line__icon" aria-hidden="true">id_card</span>
                <span class="cell-primary">{trip.conductor}</span>
              </span>
              <span class="cell-secondary">{trip.transportista}</span>
              <span class="cell-line">
                <span class="icon icon--sm cell-line__icon" aria-hidden="true">local_shipping</span>
                <span class="cell-secondary cell-secondary--dark">{trip.unidad}</span>
                {#if !trip.gps}
                  <span class="nogps-tag" title="Vehículo sin GPS Tag: sin posición ni ETA"><span class="icon icon--sm" aria-hidden="true">gps_off</span>Sin GPS</span>
                {/if}
              </span>
            </div>

            <div class="card-action"><span class="card-action__text">Ver más</span><span class="icon icon--sm" aria-hidden="true">arrow_forward_ios</span></div>
          </div>
        </a>
      {:else}
        <SearchEmptyState onOpenFilters={() => { filtersOpen = true; }} onClearSearch={() => { filtros.busqueda = ''; }} />
      {/each}
    </div>

    {#if leyenda.length > 0}
      <ul class="cards-legend" aria-label="Leyenda de estados">
        {#each leyenda as estado (estado)}
          {@const lc = STATUS_COLORS[estado]}
          <li class="legend-item"><span class="status-circle status-circle--sm" style="background:{lc?.bg}; color:{lc?.ink}"><span class="icon icon--sm" aria-hidden="true">{STATE_ICONS[estado]}</span></span>{STATE_LABELS[estado]}</li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  /* small page overrides */
</style>
