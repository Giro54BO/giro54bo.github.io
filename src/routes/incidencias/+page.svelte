<script lang="ts">
  import {
    alertas,
    ALERTA_TYPE_ICONS,
    ALERTA_TYPE_LABELS,
    trips,
    type Alerta,
    type AlertaTipo,
    type Trip,
  } from '$lib/data/trips';

  let query = $state('');
  let tipo = $state<AlertaTipo | null>(null);

  const tripsById = new Map<string, Trip>(trips.map((t) => [t.id, t]));
  const TIPOS: AlertaTipo[] = ['critico', 'retraso', 'parada', 'desvio'];
  const TIPO_COLORS: Record<AlertaTipo, { bg: string; ink: string }> = {
    critico: { bg: 'var(--error-bg)', ink: 'var(--error-ink)' },
    retraso: { bg: 'var(--warn-bg)', ink: 'var(--warn-ink)' },
    parada: { bg: 'var(--info-bg)', ink: 'var(--info-ink)' },
    desvio: { bg: 'var(--status-en-retorno-bg)', ink: 'var(--status-en-retorno-ink)' },
  };

  function tripOf(a: Alerta): Trip | undefined {
    return a.tripId ? tripsById.get(a.tripId) : undefined;
  }

  // Búsqueda: tolerante, sobre mensaje + datos del despacho vinculado.
  const searched = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return alertas;
    return alertas.filter((a) => {
      const t = tripOf(a);
      return [a.mensaje, a.unidad, a.tripId, ALERTA_TYPE_LABELS[a.tipo], t?.conductor, t?.transportista, t?.destino, t?.rutaCodigo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  });

  // Los conteos de los chips reflejan la búsqueda actual (como en el dashboard).
  const counts = $derived.by(() => {
    const c: Record<AlertaTipo, number> = { critico: 0, retraso: 0, parada: 0, desvio: 0 };
    for (const a of searched) c[a.tipo]++;
    return c;
  });

  const visible = $derived(tipo ? searched.filter((a) => a.tipo === tipo) : searched);

  function toggleTipo(t: AlertaTipo | null) {
    tipo = tipo === t ? null : t;
  }
</script>

<div class="incidencias" id="main-content">
  <!-- Sin título de página: la barra de navegación ya indica la sección; el
       buscador se alinea a la izquierda y ocupa el ancho disponible. -->
  <div class="page-header inc-page-header">
    <div class="inc-search-wrap">
      <div class="search-pill inc-search" class:search-pill--filled={!!query.trim()}>
        <span class="icon icon--sm search-pill__icon" aria-hidden="true">search</span>
        <div class="search-pill__field">
          <input
            class="search-pill__input"
            type="search"
            placeholder="Buscar por unidad, despacho, transportadora o mensaje…"
            bind:value={query}
            aria-label="Buscar incidencias"
          />
        </div>
        {#if query}
          <button class="search-pill__clear" type="button" aria-label="Limpiar búsqueda" onclick={() => (query = '')}>
            <span class="icon" aria-hidden="true">close</span>
          </button>
        {/if}
      </div>
    </div>
    <a href="/incidencias/nueva" class="btn-outline inc-cta">Registrar incidencia <span class="icon" aria-hidden="true">add</span></a>
  </div>

  <!-- La barra de tipos queda enmarcada por una línea inferior, misma
       distancia y color que el separador de Viajes. -->
  <div class="inc-controls">
    <div class="filter-bar inc-chips" role="group" aria-label="Filtrar por tipo de incidencia">
      <button class="filter-chip" class:filter-chip--active={tipo === null} type="button" onclick={() => toggleTipo(null)} aria-pressed={tipo === null}>
        <span class="icon filter-chip__icon" aria-hidden="true">grid_view</span>
        Todas las incidencias
        <span class="filter-chip__count">{searched.length}</span>
      </button>
      {#each TIPOS as t (t)}
        <button class="filter-chip" class:filter-chip--active={tipo === t} type="button" onclick={() => toggleTipo(t)} aria-pressed={tipo === t}>
          <span class="filter-chip__icon-wrap filter-chip__icon-wrap--{t}">
            <span class="icon filter-chip__icon" aria-hidden="true">{ALERTA_TYPE_ICONS[t]}</span>
          </span>
          {ALERTA_TYPE_LABELS[t]}
          <span class="filter-chip__count">{counts[t]}</span>
        </button>
      {/each}
    </div>
  </div>
  <div class="filters-divider" aria-hidden="true"></div>

  {#if visible.length === 0}
    <div class="search-empty-state" role="status">
      <span class="icon icon--xl search-empty-state__icon" aria-hidden="true">search_off</span>
      <p class="search-empty-state__title">Sin incidencias que coincidan</p>
      <p class="search-empty-state__message">Ajusta la búsqueda o el filtro por tipo para ver más resultados.</p>
      <div class="search-empty-state__actions">
        <button class="btn-outline btn-outline--muted" type="button" onclick={() => { query = ''; tipo = null; }}>
          <span class="icon" aria-hidden="true">close</span> Limpiar filtros
        </button>
      </div>
    </div>
  {:else}
    <!-- Vista de tabla (escritorio) -->
    <div class="inc-table" role="table" aria-label="Tabla de incidencias">
      <div class="inc-table__head" role="row" aria-hidden="true">
        <span>Tipo</span>
        <span>Despacho / Unidad</span>
        <span>Detalle</span>
        <span>Reportada</span>
        <span></span>
      </div>
      <div class="inc-table__body">
        {#each visible as a (a.id)}
          {@const t = tripOf(a)}
          {@const c = TIPO_COLORS[a.tipo]}
          {#snippet rowBody()}
            <span class="inc-cell inc-cell--tipo">
              <span class="status-circle status-circle--sm" style="background:{c.bg}; color:{c.ink}" aria-hidden="true">
                <span class="icon icon--sm">{ALERTA_TYPE_ICONS[a.tipo]}</span>
              </span>
              <span class="inc-tipo-label">{ALERTA_TYPE_LABELS[a.tipo]}</span>
            </span>
            <span class="inc-cell inc-cell--desp">
              {#if t}
                <strong>{t.id}</strong>
                <span class="inc-sub">{t.unidad}</span>
              {:else}
                <span class="inc-global"><span class="icon icon--sm" aria-hidden="true">public</span> Global</span>
              {/if}
            </span>
            <span class="inc-cell inc-cell--msg">{a.mensaje}</span>
            <span class="inc-cell inc-cell--time">{a.tiempo}</span>
            <span class="inc-cell inc-cell--action" aria-hidden="true">
              {#if t}<span class="icon icon--sm">arrow_forward_ios</span>{/if}
            </span>
          {/snippet}

          {#if t}
            <a class="inc-row" href={`/viajes/${t.id}`} role="row" aria-label={`Incidencia ${ALERTA_TYPE_LABELS[a.tipo]} en el despacho ${t.id}. Ver viaje.`}>
              {@render rowBody()}
            </a>
          {:else}
            <div class="inc-row inc-row--global" role="row">
              {@render rowBody()}
            </div>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Vista de tarjetas (dispositivos pequeños) — el diseño actual -->
    <ul class="inc-cards" role="list">
      {#each visible as a (a.id)}
        {@const t = tripOf(a)}
        {#snippet cardBody()}
          <div class="alert-card__header">
            <span class="alert-card__type alert-card__type--{a.tipo}">
              <span class="icon icon--sm" aria-hidden="true">{ALERTA_TYPE_ICONS[a.tipo]}</span>
              {ALERTA_TYPE_LABELS[a.tipo]}
            </span>
            {#if t}
              <span class="alert-card__unit">{t.id}</span>
            {:else}
              <span class="alert-card__unit alert-card__unit--global">
                <span class="icon icon--sm" aria-hidden="true">public</span>
                Global
              </span>
            {/if}
          </div>
          <p class="alert-card__message">{a.mensaje}</p>
          <div class="alert-card__footer">
            <span class="alert-card__time">{a.tiempo}</span>
            {#if t}
              <span class="alert-card__action">VER VIAJE <span class="icon" aria-hidden="true">arrow_forward</span></span>
            {/if}
          </div>
        {/snippet}

        <li>
          {#if t}
            <a class="alert-card alert-card--linked" href={`/viajes/${t.id}`} aria-label={`Incidencia ${ALERTA_TYPE_LABELS[a.tipo]} en el despacho ${t.id}. Ver viaje.`}>
              {@render cardBody()}
            </a>
          {:else}
            <div class="alert-card" role="article">
              {@render cardBody()}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
