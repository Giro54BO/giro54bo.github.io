<script lang="ts">
  import { onMount } from 'svelte';
  import { filtros, rangoDePeriodo, PERIODOS, PERIODO_POR_DEFECTO, type PeriodoKey } from '$lib/data/dash-filters.svelte';
  import { trips, STATE_LABELS, type TripState } from '$lib/data/trips';

  // El filtro de Estado (multi-selección) sólo se muestra donde no hay chips de
  // estado (el dashboard). En Viajes se sigue usando StatusChips.
  let { includeStatus = false }: { includeStatus?: boolean } = $props();
  const ESTADOS: TripState[] = ['en-carga', 'en-transito', 'en-frontera', 'en-descarga', 'incidencia', 'en-retorno'];

  // Derived option lists from the dataset
  const productos      = [...new Set(trips.map(t => t.carga))].sort();
  const clientes       = [...new Set(trips.map(t => t.sap.cliCodigo))].sort();
  const transportistas = [...new Set(trips.map(t => t.transportista))].sort();
  const origenes       = [...new Set(trips.map(t => t.origen))].sort();
  const destinos       = [...new Set(trips.map(t => t.destino))].sort();
  const clienteLabel = (code: string) => `Cliente ${code}`;

  // Local UI state
  let productoOpen = $state(false);
  let clienteOpen = $state(false);
  let transportistaOpen = $state(false);
  let origenOpen = $state(false);
  let destinoOpen = $state(false);
  let estadoOpen = $state(false);
  let fechaOpen = $state(false);
  let productoQuery = $state('');
  let clienteQuery = $state('');
  let transportistaQuery = $state('');
  let origenSearch = $state('');
  let destinoSearch = $state('');
  let productoContainerRef: HTMLElement;
  let clienteContainerRef: HTMLElement;
  let transportistaContainerRef: HTMLElement;
  let origenContainerRef: HTMLElement;
  let destinoContainerRef: HTMLElement;
  let estadoContainerRef: HTMLElement;
  let fechaContainerRef: HTMLElement;

  function getProductosFiltered() { return productos.filter(p => p.toLowerCase().includes(productoQuery.toLowerCase())); }
  function getClientesFiltered() { return clientes.filter(c => c.toLowerCase().includes(clienteQuery.toLowerCase())); }
  function getTransportistasFiltered() { return transportistas.filter(t => t.toLowerCase().includes(transportistaQuery.toLowerCase())); }
  function getOrigenesFiltered() { return origenes.filter(o => o.toLowerCase().includes(origenSearch.toLowerCase())); }
  function getDestinosFiltered() { return destinos.filter(d => d.toLowerCase().includes(destinoSearch.toLowerCase())); }

  function productoSelectedLabel() { return filtros.producto ? filtros.producto : 'Todos los productos'; }
  function clienteSelectedLabel() { return filtros.cliente ? clienteLabel(filtros.cliente) : 'Todos los clientes'; }
  function transportistaSelectedLabel() { return filtros.transportista ? filtros.transportista : 'Todas las transportadoras'; }
  function fechaSelectedLabel() { return PERIODOS.find((periodo) => periodo.value === filtros.fecha)?.label ?? 'Seleccionar periodo'; }

  function selectProducto(value: string) { filtros.producto = value; productoOpen = false; productoQuery = ''; }
  function selectCliente(value: string) { filtros.cliente = value; clienteOpen = false; clienteQuery = ''; }
  function selectTransportista(value: string) { filtros.transportista = value; transportistaOpen = false; transportistaQuery = ''; }

  function selectPeriodo(value: PeriodoKey) {
    filtros.fecha = value;
    fechaOpen = false;
    const periodo = rangoDePeriodo(value);
    if (periodo) {
      filtros.rangoDesde = periodo.desde;
      filtros.rangoHasta = periodo.hasta;
    }
  }

  function origenLabel() {
    return filtros.origen.length
      ? filtros.origen.length === 1 ? filtros.origen[0] : `${filtros.origen.length} orígenes seleccionados`
      : 'Todos los orígenes';
  }
  function destinoLabel() {
    return filtros.destino.length
      ? filtros.destino.length === 1 ? filtros.destino[0] : `${filtros.destino.length} destinos seleccionados`
      : 'Todos los destinos';
  }

  function toggleOrigen(value: string) {
    if (filtros.origen.includes(value)) filtros.origen = filtros.origen.filter(item => item !== value);
    else filtros.origen = [...filtros.origen, value];
  }
  function toggleDestino(value: string) {
    if (filtros.destino.includes(value)) filtros.destino = filtros.destino.filter(item => item !== value);
    else filtros.destino = [...filtros.destino, value];
  }

  function setAllOrigen() { filtros.origen = filtros.origen.length === origenes.length ? [] : [...origenes]; }
  function setAllDestino() { filtros.destino = filtros.destino.length === destinos.length ? [] : [...destinos]; }

  function estadoLabel() {
    return filtros.estado.length
      ? filtros.estado.length === 1 ? STATE_LABELS[filtros.estado[0]] : `${filtros.estado.length} estados seleccionados`
      : 'Todos los estados';
  }
  function toggleEstado(value: TripState) {
    if (filtros.estado.includes(value)) filtros.estado = filtros.estado.filter(item => item !== value);
    else filtros.estado = [...filtros.estado, value];
  }
  function setAllEstado() { filtros.estado = filtros.estado.length === ESTADOS.length ? [] : [...ESTADOS]; }

  onMount(() => {
    const handleClick = (event: MouseEvent) => {
      if (productoOpen && productoContainerRef && !productoContainerRef.contains(event.target as Node)) productoOpen = false;
      if (clienteOpen && clienteContainerRef && !clienteContainerRef.contains(event.target as Node)) clienteOpen = false;
      if (transportistaOpen && transportistaContainerRef && !transportistaContainerRef.contains(event.target as Node)) transportistaOpen = false;
      if (origenOpen && origenContainerRef && !origenContainerRef.contains(event.target as Node)) origenOpen = false;
      if (destinoOpen && destinoContainerRef && !destinoContainerRef.contains(event.target as Node)) destinoOpen = false;
      if (estadoOpen && estadoContainerRef && !estadoContainerRef.contains(event.target as Node)) estadoOpen = false;
      if (fechaOpen && fechaContainerRef && !fechaContainerRef.contains(event.target as Node)) fechaOpen = false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { productoOpen = clienteOpen = transportistaOpen = origenOpen = destinoOpen = estadoOpen = fechaOpen = false; }
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('click', handleClick); window.removeEventListener('keydown', handleKeyDown); };
  });

</script>

<!-- Markup copied from original +page.svelte filters section -->
<div class="dash-filters" role="group" aria-label="Filtros del dashboard">
  <!-- Productos -->
  <div class="dash-filter dash-filter--predictive" bind:this={productoContainerRef}>
    <span class="dash-filter__label">Producto</span>
    <button type="button" class="dash-select dash-select--clickable" class:dash-select--selected={!!filtros.producto} aria-haspopup="listbox" aria-expanded={productoOpen}
      onclick={() => { productoOpen = !productoOpen; clienteOpen = transportistaOpen = origenOpen = destinoOpen = false; }}>
      <span class="icon icon--sm" aria-hidden="true">inventory_2</span>
      <span class="dash-select__label">{productoSelectedLabel()}</span>
      <span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
    </button>
    <div class="multi-select-menu" class:multi-select-menu--open={productoOpen} role="listbox" aria-label="Lista de productos">
      <div class="multi-select-search">
        <input type="search" placeholder="Buscar producto" bind:value={productoQuery} aria-label="Buscar producto" oninput={() => { productoOpen = true; }} />
      </div>
      <div class="multi-select-list">
        {#if getProductosFiltered().length > 0}
          {#each getProductosFiltered() as p}
            <button type="button" class="multi-select-item" onclick={() => selectProducto(p)}><span>{p}</span></button>
          {/each}
        {:else}
          <div class="multi-select-empty">No se encontraron productos.</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Cliente -->
  <div class="dash-filter dash-filter--predictive" bind:this={clienteContainerRef}>
    <span class="dash-filter__label">Cliente</span>
    <button type="button" class="dash-select dash-select--clickable" class:dash-select--selected={!!filtros.cliente} aria-haspopup="listbox" aria-expanded={clienteOpen}
      onclick={() => { clienteOpen = !clienteOpen; productoOpen = transportistaOpen = origenOpen = destinoOpen = false; }}>
      <span class="icon icon--sm" aria-hidden="true">apartment</span>
      <span class="dash-select__label">{clienteSelectedLabel()}</span>
      <span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
    </button>
    <div class="multi-select-menu" class:multi-select-menu--open={clienteOpen} role="listbox" aria-label="Lista de clientes">
      <div class="multi-select-search">
        <input type="search" placeholder="Buscar cliente" bind:value={clienteQuery} aria-label="Buscar cliente" oninput={() => { clienteOpen = true; }} />
      </div>
      <div class="multi-select-list">
        {#if getClientesFiltered().length > 0}
          {#each getClientesFiltered() as c}
            <button type="button" class="multi-select-item" onclick={() => selectCliente(c)}><span>{clienteLabel(c)}</span></button>
          {/each}
        {:else}
          <div class="multi-select-empty">No se encontraron clientes.</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Transportista -->
  <div class="dash-filter dash-filter--predictive" bind:this={transportistaContainerRef}>
    <span class="dash-filter__label">Transportadora</span>
    <button type="button" class="dash-select dash-select--clickable" class:dash-select--selected={!!filtros.transportista} aria-haspopup="listbox" aria-expanded={transportistaOpen}
      onclick={() => { transportistaOpen = !transportistaOpen; productoOpen = clienteOpen = origenOpen = destinoOpen = false; }}>
      <span class="icon icon--sm" aria-hidden="true">business_center</span>
      <span class="dash-select__label">{transportistaSelectedLabel()}</span>
      <span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
    </button>
    <div class="multi-select-menu" class:multi-select-menu--open={transportistaOpen} role="listbox" aria-label="Lista de transportadoras">
      <div class="multi-select-search">
        <input type="search" placeholder="Buscar transportadora" bind:value={transportistaQuery} aria-label="Buscar transportadora" oninput={() => { transportistaOpen = true; }} />
      </div>
      <div class="multi-select-list">
        {#if getTransportistasFiltered().length > 0}
          {#each getTransportistasFiltered() as tr}
            <button type="button" class="multi-select-item" onclick={() => selectTransportista(tr)}><span>{tr}</span></button>
          {/each}
        {:else}
          <div class="multi-select-empty">No se encontraron transportadoras.</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Origen -->
  <div class="dash-filter dash-filter--multi" bind:this={origenContainerRef}>
    <span class="dash-filter__label">Origen</span>
    <button type="button" class="dash-select dash-select--multi dash-select--clickable" class:dash-select--selected={filtros.origen.length > 0} aria-haspopup="listbox" aria-expanded={origenOpen}
      onclick={() => { origenOpen = !origenOpen; destinoOpen = productoOpen = clienteOpen = transportistaOpen = false; }}>
      <span class="icon icon--sm" aria-hidden="true">factory</span>
      <span class="dash-select__label">{origenLabel()}</span>
      <span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
    </button>
    <div class="multi-select-menu" class:multi-select-menu--open={origenOpen} role="listbox" aria-multiselectable="true">
      <div class="multi-select-search"><input type="search" placeholder="Buscar origen" bind:value={origenSearch} aria-label="Buscar origen" /></div>
      <button type="button" class="multi-select-all" onclick={() => setAllOrigen()}>{filtros.origen.length === origenes.length ? 'Quitar todo' : 'Seleccionar todos'}</button>
      <div class="multi-select-list">
        {#each getOrigenesFiltered() as o}
          <label class="multi-select-item"><input type="checkbox" checked={filtros.origen.includes(o)} onchange={() => toggleOrigen(o)} /><span>{o}</span></label>
        {/each}
      </div>
    </div>
  </div>

  <!-- Destino -->
  <div class="dash-filter dash-filter--multi" bind:this={destinoContainerRef}>
    <span class="dash-filter__label">Destino</span>
    <button type="button" class="dash-select dash-select--multi dash-select--clickable" class:dash-select--selected={filtros.destino.length > 0} aria-haspopup="listbox" aria-expanded={destinoOpen}
      onclick={() => { destinoOpen = !destinoOpen; origenOpen = false; }}>
      <span class="icon icon--sm" aria-hidden="true">place</span>
      <span class="dash-select__label">{destinoLabel()}</span>
      <span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
    </button>
    <div class="multi-select-menu" class:multi-select-menu--open={destinoOpen} role="listbox" aria-multiselectable="true">
      <div class="multi-select-search"><input type="search" placeholder="Buscar destino" bind:value={destinoSearch} aria-label="Buscar destino" /></div>
      <button type="button" class="multi-select-all" onclick={() => setAllDestino()}>{filtros.destino.length === destinos.length ? 'Quitar todo' : 'Seleccionar todos'}</button>
      <div class="multi-select-list">
        {#each getDestinosFiltered() as d}
          <label class="multi-select-item"><input type="checkbox" checked={filtros.destino.includes(d)} onchange={() => toggleDestino(d)} /><span>{d}</span></label>
        {/each}
      </div>
    </div>
  </div>

  {#if includeStatus}
    <!-- Estado (multi-selección) — reemplaza a los chips donde no los hay (dashboard). -->
    <div class="dash-filter dash-filter--multi" bind:this={estadoContainerRef}>
      <span class="dash-filter__label">Estado</span>
      <button type="button" class="dash-select dash-select--multi dash-select--clickable" class:dash-select--selected={filtros.estado.length > 0} aria-haspopup="listbox" aria-expanded={estadoOpen}
        onclick={() => { estadoOpen = !estadoOpen; origenOpen = destinoOpen = productoOpen = clienteOpen = transportistaOpen = fechaOpen = false; }}>
        <span class="icon icon--sm" aria-hidden="true">label</span>
        <span class="dash-select__label">{estadoLabel()}</span>
        <span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
      </button>
      <div class="multi-select-menu" class:multi-select-menu--open={estadoOpen} role="listbox" aria-multiselectable="true">
        <button type="button" class="multi-select-all" onclick={() => setAllEstado()}>{filtros.estado.length === ESTADOS.length ? 'Quitar todo' : 'Seleccionar todos'}</button>
        <div class="multi-select-list">
          {#each ESTADOS as e}
            <label class="multi-select-item"><input type="checkbox" checked={filtros.estado.includes(e)} onchange={() => toggleEstado(e)} /><span>{STATE_LABELS[e]}</span></label>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Fecha -->
  <div class="dash-filter dash-filter--select" bind:this={fechaContainerRef}>
    <span class="dash-filter__label">Fecha</span>
    <button type="button" class="dash-select dash-select--clickable" class:dash-select--selected={filtros.fecha !== PERIODO_POR_DEFECTO} aria-haspopup="listbox" aria-expanded={fechaOpen}
      onclick={() => { fechaOpen = !fechaOpen; productoOpen = clienteOpen = transportistaOpen = origenOpen = destinoOpen = false; }}>
      <span class="icon icon--sm" aria-hidden="true">calendar_month</span>
      <span class="dash-select__label">{fechaSelectedLabel()}</span>
      <span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
    </button>
    <div class="multi-select-menu date-filter-menu" class:multi-select-menu--open={fechaOpen} role="listbox" aria-label="Lista de periodos">
      {#each PERIODOS as p}
        <button type="button" class="multi-select-item" class:multi-select-item--selected={filtros.fecha === p.value} role="option" aria-selected={filtros.fecha === p.value} onclick={() => selectPeriodo(p.value)}>
          <span>{p.label}</span>
        </button>
      {/each}
    </div>
  </div>

  {#if filtros.fecha === 'rango'}
    <label class="dash-filter dash-filter--select"><span class="dash-filter__label">Desde</span><div class="dash-select dash-select--clickable"><span class="icon icon--sm" aria-hidden="true">calendar_today</span><input type="date" bind:value={filtros.rangoDesde} aria-label="Fecha desde" /></div></label>
    <label class="dash-filter dash-filter--select"><span class="dash-filter__label">Hasta</span><div class="dash-select dash-select--clickable"><span class="icon icon--sm" aria-hidden="true">event</span><input type="date" bind:value={filtros.rangoHasta} aria-label="Fecha hasta" /></div></label>
  {/if}

</div>

<style>
  /* keep styles in global app.css; component-level overrides minimal */
</style>
