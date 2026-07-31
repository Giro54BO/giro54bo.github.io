<script lang="ts">
	import PredictionCards from '$lib/components/PredictionCards.svelte';
	import TransitMap from '$lib/components/TransitMap.svelte';
	import { trips, alertas, getStateCounts, STATE_LABELS, type TripState } from '$lib/data/trips';
	import { parseFechaDoc } from '$lib/data/units';
	import { filtros, limpiarFiltros, rangoDePeriodo, PERIODOS, PERIODO_POR_DEFECTO } from '$lib/data/dash-filters.svelte';

	// El estado de los filtros vive en un módulo compartido para que sobreviva a
	// abrir un despacho y volver: así el dashboard no aparece vacío al regresar.

	// Fechas que abarca el periodo elegido. Con "Rango" las pone el usuario; con
	// cualquier otro periodo se calculan (esta semana, este mes, año pasado…).
	const periodo = $derived(rangoDePeriodo(filtros.fecha));
	const dateFrom = $derived(periodo ? periodo.desde : filtros.rangoDesde);
	const dateTo = $derived(periodo ? periodo.hasta : filtros.rangoHasta);

	// En "Rango": nunca vacío ni invertido. (Las fechas ISO yyyy-mm-dd se comparan
	// como texto.)
	const SEMANA = rangoDePeriodo(PERIODO_POR_DEFECTO)!;
	$effect(() => {
		if (filtros.fecha !== 'rango') return;
		if (!filtros.rangoDesde) filtros.rangoDesde = SEMANA.desde;
		if (!filtros.rangoHasta) filtros.rangoHasta = SEMANA.hasta;
		if (filtros.rangoDesde && filtros.rangoHasta && filtros.rangoDesde > filtros.rangoHasta) {
			filtros.rangoHasta = filtros.rangoDesde;
		}
	});

	// Opciones distintas de los filtros del dashboard
	const productos      = [...new Set(trips.map(t => t.carga))].sort();
	const clientes       = [...new Set(trips.map(t => t.sap.cliCodigo))].sort();
	const transportistas = [...new Set(trips.map(t => t.transportista))].sort();
	const origenes       = [...new Set(trips.map(t => t.origen))].sort();
	const destinos       = [...new Set(trips.map(t => t.destino))].sort();
	const clienteLabel = (code: string) => `Cliente ${code}`;

	// Estados que existen en los datos, en el orden de las pestañas de estado.
	const ESTADO_ORDEN: TripState[] = [
		'en-transito', 'en-frontera', 'incidencia', 'en-carga', 'en-descarga', 'en-retorno',
	];
	const estadosDisponibles = ESTADO_ORDEN.filter(e => trips.some(t => t.estado === e));

	// "Limpiar" sólo aparece si algo se apartó del estado por defecto.
	const anyDashFilter = $derived(
		!!(filtros.producto || filtros.cliente || filtros.transportista || filtros.origen || filtros.destino || filtros.estado)
		|| filtros.fecha !== PERIODO_POR_DEFECTO
	);

	/**
	 * Todos los filtros del dashboard salvo el de estado. Sirve de base para los
	 * contadores de las pestañas de estado: si el propio estado entrara aquí, cada
	 * pestaña marcaría 0 salvo la seleccionada.
	 */
	const dashTripsBase = $derived(
		trips.filter(t => {
			if (filtros.producto && t.carga !== filtros.producto) return false;
			if (filtros.cliente && t.sap.cliCodigo !== filtros.cliente) return false;
			if (filtros.transportista && t.transportista !== filtros.transportista) return false;
			if (filtros.origen && t.origen !== filtros.origen) return false;
			if (filtros.destino && t.destino !== filtros.destino) return false;
			if (dateFrom || dateTo) {
				const d = parseFechaDoc(t.fechaDocumentada);
				if (!d) return false;
				if (dateFrom && d < new Date(dateFrom + 'T00:00:00')) return false;
				if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
			}
			return true;
		})
	);

	// Alcance del dashboard: mapa, métricas y tabla comparten el mismo conjunto.
	// El estado se aplica aquí para que filtrarlo también reencuadre el mapa y
	// recalcule las tarjetas, no sólo la tabla.
	const dashTrips = $derived(
		filtros.estado
			? dashTripsBase.filter(t => t.estado === filtros.estado)
			: dashTripsBase
	);

	// Clave estable para remontar el mapa cuando cambia el conjunto filtrado.
	const mapKey = $derived(dashTrips.map(t => t.id).join(','));

	// Contadores sobre la base sin filtrar por estado: cada pestaña sigue
	// mostrando cuántos despachos hay en ese estado dentro del resto de filtros.
	const counts = $derived(getStateCounts(dashTripsBase));

	const clearDashFilters = limpiarFiltros;

	const statusFilters = $derived([
		{ estado: 'en-transito'  as TripState, label: 'En tránsito',  count: counts.enTransito    },
		{ estado: 'en-frontera'  as TripState, label: 'En frontera',  count: counts.enFrontera    },
		{ estado: 'incidencia'   as TripState, label: 'Incidencias',  count: counts.conIncidencia },
		{ estado: 'en-carga'     as TripState, label: 'En carga',     count: counts.enCarga       },
		{ estado: 'en-descarga'  as TripState, label: 'En descarga',  count: counts.enDescarga    },
		{ estado: 'en-retorno'   as TripState, label: 'En retorno',   count: counts.enRetorno     },
	]);

	const STATUS_COLORS: Partial<Record<TripState, { bg: string; ink: string }>> = {
		'en-transito':     { bg: 'var(--status-en-transito-bg)',      ink: 'var(--status-en-transito-ink)'      },
		'en-frontera':     { bg: 'var(--status-en-frontera-bg)',      ink: 'var(--status-en-frontera-ink)'      },
		'incidencia':      { bg: 'var(--status-incidencia-bg)',       ink: 'var(--status-incidencia-ink)'       },
		'en-carga':        { bg: 'var(--status-en-carga-bg)',         ink: 'var(--status-en-carga-ink)'         },
		'en-descarga':     { bg: 'var(--status-en-descarga-bg)',      ink: 'var(--status-en-descarga-ink)'      },
		'en-retorno':      { bg: 'var(--status-en-retorno-bg)',       ink: 'var(--status-en-retorno-ink)'       },
	};

	/**
	 * 'ETA 22 h 16 min | 1.150 km' — el tiempo estimado de llegada primero,
	 * que es el dato que se consulta; la distancia queda como contexto.
	 * Sin GPS no hay ETA: se muestra el lead time planificado de la ruta.
	 */
	function etaLine(trip: { distancia: string; gps: boolean }) {
		const [km, dur] = trip.distancia.split('|').map(s => s.trim());
		if (!dur) return trip.distancia;
		return `${trip.gps ? 'ETA' : 'Lead time'} ${dur} | ${km}`;
	}

	const STATE_ICONS: Record<TripState, string> = {
		'en-transito':     'local_shipping',
		'en-frontera':     'flag',
		'incidencia':      'report',
		'en-carga':        'forklift',
		'en-descarga':     'download',
		'en-retorno':      'undo',
	};

	// El estado ya viene aplicado en dashTrips; aquí sólo queda la búsqueda.
	const filteredTrips = $derived(
		dashTrips.filter(t => {
			const q = filtros.busqueda.toLowerCase();
			// Los códigos SAP ahora son visibles en la tabla, así que también se buscan.
			return !q || [
				t.id, t.conductor, t.transportista, t.unidad, t.rutaCodigo, t.rutaNombre, t.origen, t.destino,
				t.sap.salidaMercancia, t.sap.cliCodigo, t.sap.pedido, t.sap.numeroTransporte,
			].some(f => f.toLowerCase().includes(q));
		})
		.sort((a, b) => {
			const priority: Record<TripState, number> = {
				incidencia: 0, 'en-frontera': 1, 'en-carga': 2,
				'en-transito': 3, 'en-descarga': 4, 'en-retorno': 5,
			};
			return priority[a.estado] - priority[b.estado];
		})
	);

	/** Estados presentes en las filas visibles, en orden de aparición
	   (deduplicados por etiqueta). */
	const leyenda = $derived.by(() => {
		const vistas = new Set<string>();
		const orden: TripState[] = [];
		for (const t of filteredTrips) {
			const label = STATE_LABELS[t.estado];
			if (!vistas.has(label)) { vistas.add(label); orden.push(t.estado); }
		}
		return orden;
	});

	function toggleFilter(estado: TripState) {
		filtros.estado = filtros.estado === estado ? null : estado;
	}

	/** 'BO - PDF - AREQUIPA' → ['BO', 'PDF', 'AREQUIPA'] */
	function desglose(rutaNombre: string): string[] {
		return rutaNombre.split(' - ').map(s => s.trim());
	}

	const alertaTypeLabels: Record<string, string> = {
		critico: 'Crítico', retraso: 'Retraso', parada: 'Parada obligatoria', desvio: 'Desvío de ruta',
	};
</script>

<a href="#main-content" class="skip-link">Ir al contenido principal</a>

<div class="dashboard" id="main-content">

	<!-- ── Page header ── -->
	<div class="page-header">
		<h1 class="section-heading section-heading--h1">
			<span class="icon section-heading__icon" aria-hidden="true">grid_view</span>
			Dashboard
		</h1>
	</div>

	<!-- ── Filtros del dashboard: acotan mapa, métricas y tabla a la vez ── -->
	<div class="dash-filters" role="group" aria-label="Filtros del dashboard">
		<label class="dash-filter">
			<span class="dash-filter__label">Producto</span>
			<div class="dash-select">
				<span class="icon icon--sm" aria-hidden="true">inventory_2</span>
				<select bind:value={filtros.producto} aria-label="Filtrar por producto">
					<option value="">Todos los productos</option>
					{#each productos as p}
						<option value={p}>{p}</option>
					{/each}
				</select>
				<span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
			</div>
		</label>

		<label class="dash-filter">
			<span class="dash-filter__label">Cliente</span>
			<div class="dash-select">
				<span class="icon icon--sm" aria-hidden="true">apartment</span>
				<select bind:value={filtros.cliente} aria-label="Filtrar por cliente">
					<option value="">Todos los clientes</option>
					{#each clientes as c}
						<option value={c}>{clienteLabel(c)}</option>
					{/each}
				</select>
				<span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
			</div>
		</label>

		<label class="dash-filter">
			<span class="dash-filter__label">Transportadora</span>
			<div class="dash-select">
				<span class="icon icon--sm" aria-hidden="true">business_center</span>
				<select bind:value={filtros.transportista} aria-label="Filtrar por transportadora">
					<option value="">Todas las transportadoras</option>
					{#each transportistas as tr}
						<option value={tr}>{tr}</option>
					{/each}
				</select>
				<span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
			</div>
		</label>

		<!-- Mismo estado que las pestañas de abajo: dos controles, un solo filtro. -->
		<label class="dash-filter">
			<span class="dash-filter__label">Estado</span>
			<div class="dash-select">
				<span class="icon icon--sm" aria-hidden="true">flag</span>
				<select bind:value={filtros.estado} aria-label="Filtrar por estado">
					<option value={null}>Todos los estados</option>
					{#each estadosDisponibles as e}
						<option value={e}>{STATE_LABELS[e]}</option>
					{/each}
				</select>
				<span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
			</div>
		</label>

		<label class="dash-filter">
			<span class="dash-filter__label">Origen</span>
			<div class="dash-select">
				<span class="icon icon--sm" aria-hidden="true">factory</span>
				<select bind:value={filtros.origen} aria-label="Filtrar por origen">
					<option value="">Todos los orígenes</option>
					{#each origenes as o}
						<option value={o}>{o}</option>
					{/each}
				</select>
				<span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
			</div>
		</label>

		<label class="dash-filter">
			<span class="dash-filter__label">Destino</span>
			<div class="dash-select">
				<span class="icon icon--sm" aria-hidden="true">place</span>
				<select bind:value={filtros.destino} aria-label="Filtrar por destino">
					<option value="">Todos los destinos</option>
					{#each destinos as d}
						<option value={d}>{d}</option>
					{/each}
				</select>
				<span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
			</div>
		</label>

		<!-- Periodo: atajos habituales; los campos de fecha sólo aparecen con "Rango". -->
		<label class="dash-filter">
			<span class="dash-filter__label">Fecha</span>
			<div class="dash-select">
				<span class="icon icon--sm" aria-hidden="true">calendar_month</span>
				<select bind:value={filtros.fecha} aria-label="Filtrar por periodo">
					{#each PERIODOS as p}
						<option value={p.value}>{p.label}</option>
					{/each}
				</select>
				<span class="icon icon--sm dash-select__caret" aria-hidden="true">expand_more</span>
			</div>
		</label>

		{#if filtros.fecha === 'rango'}
			<label class="dash-filter">
				<span class="dash-filter__label">Desde</span>
				<div class="dash-select">
					<span class="icon icon--sm" aria-hidden="true">calendar_today</span>
					<input type="date" bind:value={filtros.rangoDesde} aria-label="Fecha desde" />
				</div>
			</label>

			<label class="dash-filter">
				<span class="dash-filter__label">Hasta</span>
				<div class="dash-select">
					<span class="icon icon--sm" aria-hidden="true">event</span>
					<input type="date" bind:value={filtros.rangoHasta} aria-label="Fecha hasta" />
				</div>
			</label>
		{/if}

		{#if anyDashFilter}
			<button class="dash-clear" type="button" onclick={clearDashFilters}>
				<span class="icon icon--sm" aria-hidden="true">close</span>
				Limpiar
			</button>
		{/if}
	</div>

	<!-- ── Mapa ── -->
	{#key mapKey}
		<TransitMap trips={dashTrips} />
	{/key}

	<!-- ── Predicción ── -->
	<PredictionCards trips={dashTrips} desde={dateFrom} hasta={dateTo} />

	<hr class="section-divider" />

	<!-- ── Viajes ── -->
	<section class="viajes" id="viajes" aria-label="Lista de viajes">
		<div class="viajes-header">
			<div class="viajes-header__left">
				<h2 class="section-heading">
					<span class="icon section-heading__icon" aria-hidden="true">route</span>
					Viajes
				</h2>
				<div class="search-pill">
					<span class="icon icon--sm search-pill__icon" aria-hidden="true">search</span>
					<input
						class="search-pill__input"
						type="search"
						placeholder="Buscar despacho, chofer, vehículo o ruta"
						bind:value={filtros.busqueda}
						aria-label="Buscar despachos"
					/>
				</div>
				<button class="btn-buscar" type="button">BUSCAR</button>
			</div>
		</div>

		<div class="filter-bar" role="toolbar" aria-label="Filtros de estado">
			<button
				class="filter-chip"
				class:filter-chip--active={filtros.estado === null}
				onclick={() => { filtros.estado = null; }}
				aria-pressed={filtros.estado === null}
			>
				<span class="icon filter-chip__icon" aria-hidden="true">grid_view</span>
				Todos
				<span class="filter-chip__count">{dashTripsBase.length}</span>
			</button>
			{#each statusFilters as sf}
				<button
					class="filter-chip"
					class:filter-chip--active={filtros.estado === sf.estado}
					onclick={() => toggleFilter(sf.estado)}
					aria-pressed={filtros.estado === sf.estado}
				>
					<span class="icon filter-chip__icon" aria-hidden="true">{STATE_ICONS[sf.estado]}</span>
					{sf.label}
					<span class="filter-chip__count">{sf.count}</span>
				</button>
			{/each}
		</div>

		<!-- Card table -->
		<div class="cards-container" role="region" aria-label="Tabla de despachos activos">

			<!-- Column headers -->
			<div class="cards-header" aria-hidden="true">
				<span>Correlativo único / Fecha de despacho</span>
				<span>Nº de entrega SAP / Código de cliente SAP</span>
				<span>Nº de pedido SAP / Nº de transporte SAP</span>
				<span>Código de ruta / Desglose de la ruta / Tiempo estimado de llegada</span>
				<span>Carnet chofer / Nombre del proveedor de transporte / Placa</span>
				<span></span>
			</div>

			<!-- Trip rows -->
			<div class="cards-list">
				{#each filteredTrips as trip, i (trip.id)}
					{@const sc = STATUS_COLORS[trip.estado]}
					{@const ruta = desglose(trip.rutaNombre)}
					<a
						class="trip-card"
						href="/viajes/{trip.id}"
						style="animation-delay:{i * 55}ms"
						aria-label="Despacho {trip.id}, vehículo {trip.unidad}, {STATE_LABELS[trip.estado]}. Ver detalle."
					>
						<div class="card-grid">
							<!-- Correlativo único / Fecha de despacho.
							     El estado va solo en el icono; la leyenda al pie lo traduce. -->
							<div class="card-cell">
								<span class="cell-label">Correlativo único / Fecha de despacho</span>
								<div
									class="status-circle"
									style="background:{sc?.bg}; color:{sc?.ink}"
									title={STATE_LABELS[trip.estado]}
								>
									<span class="icon icon--sm" aria-hidden="true">{STATE_ICONS[trip.estado]}</span>
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

							<!-- Nº de entrega SAP / Código de cliente SAP -->
							<div class="cell-stack">
								<span class="cell-label">Nº de entrega SAP / Código de cliente SAP</span>
								<span class="cell-secondary">{trip.sap.salidaMercancia}</span>
								<span class="cell-primary">{trip.sap.cliCodigo}</span>
							</div>

							<!-- Nº de pedido SAP / Nº de transporte SAP -->
							<div class="cell-stack">
								<span class="cell-label">Nº de pedido SAP / Nº de transporte SAP</span>
								<span class="cell-secondary">{trip.sap.pedido}</span>
								<span class="cell-primary">{trip.sap.numeroTransporte}</span>
							</div>

							<!-- Código de ruta / Desglose de la ruta / Tiempo estimado de llegada -->
							<div class="cell-stack">
								<span class="cell-label">Código de ruta / Desglose de la ruta / Tiempo estimado de llegada</span>
								<span class="cell-secondary">{trip.rutaCodigo}</span>
								<span class="route-line">
									{#each ruta as segmento, si}
										{#if si > 0}
											<span class="icon icon--sm route-arrow" aria-hidden="true">arrow_forward</span>
										{/if}
										<span class="route-seg" class:route-seg--dest={si === ruta.length - 1}>{segmento}</span>
									{/each}
								</span>
								<span class="cell-secondary">{etaLine(trip)}</span>
							</div>

							<!-- Carnet chofer / Nombre del proveedor de transporte / Placa -->
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
										<span class="nogps-tag" title="Vehículo sin GPS Tag: sin posición ni ETA">
											<span class="icon icon--sm" aria-hidden="true">gps_off</span>
											Sin GPS
										</span>
									{/if}
								</span>
							</div>

							<!-- Acción: chevron en escritorio, botón de ancho completo en móvil -->
							<div class="card-action">
								<span class="card-action__text">Ver más</span>
								<span class="icon icon--sm" aria-hidden="true">arrow_forward_ios</span>
							</div>
						</div>
					</a>
				{:else}
					<div class="trip-empty">
						<div class="empty-state">
							<span class="icon icon--xl" aria-hidden="true">manage_search</span>
							<p>No se encontraron despachos con los filtros actuales.</p>
							<button class="btn-outline btn-outline--sm" onclick={() => { filtros.busqueda = ''; clearDashFilters(); }}>
								Limpiar filtros
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Leyenda: traduce los iconos de estado de las filas visibles. -->
			{#if leyenda.length > 0}
				<ul class="cards-legend" aria-label="Leyenda de estados">
					{#each leyenda as estado (estado)}
						{@const lc = STATUS_COLORS[estado]}
						<li class="legend-item">
							<span class="status-circle status-circle--sm" style="background:{lc?.bg}; color:{lc?.ink}">
								<span class="icon icon--sm" aria-hidden="true">{STATE_ICONS[estado]}</span>
							</span>
							{STATE_LABELS[estado]}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<!-- ── Incidencias ── -->
	<section class="incidencias" id="incidencias" aria-label="Incidencias activas">
		<div class="page-header">
			<h2 class="section-heading">
				<span class="icon section-heading__icon" aria-hidden="true">warning</span>
				Incidencias
			</h2>
			<a href="/incidencias/nueva" class="btn-outline">
				NUEVA INCIDENCIA
				<span class="icon" aria-hidden="true">add</span>
			</a>
		</div>

		{#if alertas.length === 0}
			<div class="alerts-empty">
				<span class="icon icon--xl" aria-hidden="true">check_circle</span>
				<p>Sin alertas activas</p>
			</div>
		{:else}
			<ul class="alerts-grid" role="list">
				{#each alertas as alerta (alerta.id)}
					<li class="alert-card" role="article" aria-label="Alerta {alertaTypeLabels[alerta.tipo]} para el despacho {alerta.tripId}">
						<div class="alert-card__header">
							<span class="alert-card__type alert-card__type--{alerta.tipo}">
								<span class="icon icon--sm" aria-hidden="true">
									{#if alerta.tipo === 'critico'}report{:else if alerta.tipo === 'retraso'}schedule{:else if alerta.tipo === 'parada'}pause_circle{:else}alt_route{/if}
								</span>
								{alertaTypeLabels[alerta.tipo]}
							</span>
							<span class="alert-card__unit">{alerta.tripId}</span>
						</div>
						<p class="alert-card__message">{alerta.mensaje}</p>
						<div class="alert-card__footer">
							<span class="alert-card__time">{alerta.tiempo}</span>
							<a href="/viajes/{alerta.tripId}" class="alert-card__link" aria-label="Ver viaje {alerta.tripId}">
								VER VIAJE
								<span class="icon icon--sm" aria-hidden="true">arrow_right_alt</span>
							</a>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	/* ── Skip link ─────────────────────────────────────────────────────── */
	.skip-link {
		position: absolute;
		top: -40px;
		left: var(--space-4);
		background: var(--teal-700);
		color: white;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
		z-index: var(--z-tooltip);
		text-decoration: none;
		transition: top var(--duration-fast);
	}
	.skip-link:focus { top: var(--space-2); }

	/* ── Shell ─────────────────────────────────────────────────────────── */
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		padding: var(--space-8) 0 var(--space-12);
	}

	/* ── Headings ──────────────────────────────────────────────────────── */
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.section-heading {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--grey-dark);
		white-space: nowrap;
	}
	.section-heading__icon {
		font-size: 16px;
		color: var(--grey-dark);
		font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
	}

	.section-divider {
		border: none;
		border-top: 1px solid var(--border);
		margin: 0;
	}

	/* ── Filtros del dashboard ──────────────────────────────────────────── */
	.dash-filters {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-4);
		margin-top: calc(-1 * var(--space-2));
	}
	.dash-filter {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.dash-filter__label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
		padding-left: 2px;
	}
	.dash-select {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		height: 43px;
		padding: 0 var(--space-3);
		background: var(--surface);
		border: 1px solid var(--border-2);
		border-radius: var(--radius-lg);
		color: var(--blue-dark);
		transition: border-color var(--duration-fast) var(--ease-out-quart), box-shadow var(--duration-fast) var(--ease-out-quart);
	}
	.dash-select:focus-within { border-color: var(--blue-normal); box-shadow: 0 0 0 3px oklch(0.47 0.07 215 / 0.12); }
	.dash-select > .icon:first-child { color: var(--grey-muted); flex-shrink: 0; }
	.dash-select select,
	.dash-select input {
		border: none;
		background: transparent;
		font-family: inherit;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--grey-dark);
		cursor: pointer;
		outline: none;
		min-width: 0;
		appearance: none;
		-webkit-appearance: none;
	}
	.dash-select select { padding-right: var(--space-2); max-width: 220px; text-overflow: ellipsis; }
	.dash-select__caret { color: var(--grey-muted); pointer-events: none; margin-left: auto; }

	.dash-clear {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		height: 43px;
		padding: 0 var(--space-4);
		border: none;
		background: transparent;
		border-radius: var(--radius-lg);
		font-family: inherit;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--grey-muted);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-out-quart), color var(--duration-fast) var(--ease-out-quart);
	}
	.dash-clear:hover { background: var(--surface); color: var(--blue-dark); }
	.dash-clear:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }

	/* Móvil: los filtros no se apilan (ocuparían media pantalla) sino que se
	   desplazan en horizontal, conservando el orden de prioridad. */
	@media (max-width: 700px) {
		.dash-filters {
			flex-wrap: nowrap;
			overflow-x: auto;
			scroll-snap-type: x proximity;
			-webkit-overflow-scrolling: touch;
			padding-bottom: var(--space-2);
			/* Se sangra a los bordes de la pantalla para que el carrusel pueda
			   desplazarse de lado a lado, pero el primer elemento arranca
			   alineado con el resto del contenido. */
			margin-inline: calc(var(--space-4) * -1);
			padding-left: var(--space-4);
			padding-right: 0;
			/* Sin esto el ajuste por scroll-snap se come la sangría inicial. */
			scroll-padding-left: var(--space-4);
			scrollbar-width: thin;
		}
		.dash-filter {
			flex: 0 0 auto;
			width: 200px;
			scroll-snap-align: start;
		}
		.dash-select select { max-width: none; width: 100%; }
		.dash-clear { flex: 0 0 auto; align-self: flex-end; }
	}

	/* ── Botones del diseño ─────────────────────────────────────────────── */
	.btn-outline {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-width: 260px;
		height: 43px;
		padding: 9.5px 17.5px;
		border: 1.5px solid var(--blue-dark);
		border-radius: var(--radius-lg);
		background: transparent;
		font-family: inherit;
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--blue-dark);
		white-space: nowrap;
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-out-quart);
	}
	.btn-outline:hover { background: var(--teal-50); }
	.btn-outline:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }
	.btn-outline .icon { font-size: 20px; }
	.btn-outline--sm { min-width: 0; height: 36px; }

	.btn-buscar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 134px;
		height: 43px;
		border-radius: var(--radius-lg);
		background: var(--green-normal);
		font-family: inherit;
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--blue-dark);
		cursor: pointer;
		flex-shrink: 0;
		transition: filter var(--duration-fast) var(--ease-out-quart);
	}
	.btn-buscar:hover { filter: brightness(1.05); }
	.btn-buscar:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }

	/* ── Viajes section ─────────────────────────────────────────────────── */
	.viajes {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		scroll-margin-top: 96px; /* despeja la barra sticky al desplazar por ancla */
	}

	.viajes-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}
	.viajes-header__left {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		flex: 1;
		min-width: 0;
	}

	/* Filter chips */
	.filter-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		overflow-x: auto;
		scrollbar-width: none;
	}
	.filter-bar::-webkit-scrollbar { display: none; }

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px var(--space-4);
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		font-weight: 500;
		font-family: inherit;
		border: none;
		background: transparent;
		color: var(--grey-normal);
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.04));
		transition:
			background var(--duration-fast) var(--ease-out-quart),
			color      var(--duration-fast) var(--ease-out-quart),
			box-shadow var(--duration-fast) var(--ease-out-quart);
	}
	.filter-chip:hover { background: var(--surface); }
	.filter-chip:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }
	.filter-chip--active {
		background: var(--blue-dark-active);
		color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	.filter-chip--active:hover { background: var(--blue-dark); }

	.filter-chip__icon {
		font-size: 16px;
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
		opacity: 0.85;
	}
	.filter-chip--active .filter-chip__icon { opacity: 1; }

	.filter-chip__count {
		font-size: var(--text-sm);
		font-weight: 700;
		background: oklch(0 0 0 / 0.09);
		color: var(--grey-dark);
		border-radius: var(--radius-full);
		min-width: 20px;
		height: 20px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
		line-height: 1;
	}
	.filter-chip--active .filter-chip__count {
		background: var(--blue-lighter);
		color: var(--blue-dark);
	}

	/* Search */
	.search-pill {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		flex: 1;
		max-width: 389px;
		height: 43px;
		padding: 0 var(--space-6);
		background: var(--surface);
		border-radius: var(--radius-full);
	}
	.search-pill:focus-within { box-shadow: 0 0 0 2px oklch(0.47 0.07 215 / 0.25); }
	.search-pill__icon { color: var(--blue-dark); }
	.search-pill__input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		font-family: inherit;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--ink-1);
	}
	.search-pill__input::placeholder { color: var(--grey-muted); }
	.search-pill__input:focus { outline: none; }

	/* ── Card table ─────────────────────────────────────────────────────── */
	.dashboard {
		--card-cols: minmax(180px, 1.35fr) minmax(150px, 1.2fr) minmax(150px, 1.2fr) minmax(200px, 1.5fr) minmax(180px, 1.35fr) 2.5rem;
	}

	.cards-container {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.cards-header {
		display: grid;
		grid-template-columns: var(--card-cols);
		gap: var(--space-4);
		padding: var(--space-1) var(--space-4);
		font-size: var(--text-2xs);
		font-weight: 600;
		letter-spacing: 0.07em;
		color: var(--ink-4);
		text-transform: uppercase;
	}

	.cards-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	@keyframes cardIn {
		from { opacity: 0; transform: translateX(-18px); filter: blur(3px); }
		to   { opacity: 1; transform: translateX(0);     filter: blur(0);   }
	}

	.trip-card {
		display: block;
		background: var(--surface);
		border: 1px solid var(--grey-light);
		border-radius: var(--radius-lg);
		cursor: pointer;
		width: 100%;
		animation: cardIn 0.38s var(--ease-out-quart) both;
		transition:
			transform  var(--duration-fast) var(--ease-out-quart),
			box-shadow var(--duration-fast) var(--ease-out-quart),
			border-color var(--duration-fast) var(--ease-out-quart);
	}
	.trip-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-sm);
		border-color: var(--border-2);
	}
	.trip-card:focus-visible {
		outline: 2px solid var(--blue-dark);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		.trip-card { animation: none; }
	}

	.card-grid {
		display: grid;
		grid-template-columns: var(--card-cols);
		gap: var(--space-4);
		align-items: center;
		padding: var(--space-4);
		min-height: 117px;
	}

	.card-cell {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
	}

	.status-circle {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.status-circle--sm { width: 30px; height: 30px; }

	/* Leyenda de estados: sustituye a la columna "Estado" de la tabla. */
	.cards-legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--space-3) var(--space-6);
		padding: var(--space-5) var(--space-4) var(--space-2);
		list-style: none;
	}
	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-normal);
	}

	.cell-stack {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	/* En escritorio la columna la nombra el encabezado de la tabla; en móvil
	   cada fila es una tarjeta y la etiqueta viaja dentro de ella. */
	.cell-label { display: none; }
	.cell-line {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}
	.cell-line__icon { color: var(--ink-3); flex-shrink: 0; }

	.cell-primary {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--grey-dark);
		display: flex;
		align-items: center;
		gap: var(--space-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cell-secondary {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cell-secondary--dark { color: var(--grey-normal); }

	/* Marca de unidad sin GPS: hace visible en la tabla qué filas no tienen ETA. */
	.nogps-tag {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		flex-shrink: 0;
		padding: 1px 7px 1px 5px;
		border-radius: var(--radius-full);
		background: var(--grey-lighter, oklch(0.95 0.005 240));
		color: var(--grey-normal);
		font-size: var(--text-2xs);
		font-weight: 600;
		white-space: nowrap;
	}
	.nogps-tag .icon { font-size: 13px; }

	.card-action {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--ink-4);
		transition: color var(--duration-fast) var(--ease-out-quart);
	}
	.card-action__text { display: none; }
	.trip-card:hover .card-action { color: var(--blue-dark); }

	.route-line { display: flex; align-items: center; gap: var(--space-1); overflow: hidden; }
	.route-arrow { color: #9a9fa1; flex-shrink: 0; }
	.route-seg {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--grey-dark);
		white-space: nowrap;
	}
	.route-seg--dest { color: var(--blue-normal); overflow: hidden; text-overflow: ellipsis; }

	.urgent-icon { color: #97000f; flex-shrink: 0; }

	/* ── Empty state ─────────────────────────────────────────────────────── */
	.trip-empty { padding: var(--space-12) var(--space-4); }
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		color: var(--ink-3);
		text-align: center;
	}
	.empty-state p { font-size: var(--text-sm); }

	/* ── Incidencias ─────────────────────────────────────────────────────── */
	.incidencias {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		scroll-margin-top: 96px; /* despeja la barra sticky al desplazar por ancla */
	}

	.alerts-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-8) var(--space-4);
		color: var(--ink-4);
		text-align: center;
	}
	.alerts-empty p { font-size: var(--text-sm); }

	.alerts-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(280px, 363px));
		gap: var(--space-8);
		list-style: none;
	}

	.alert-card {
		background: var(--surface);
		border: 1px solid var(--grey-light);
		border-radius: 20px;
		padding: 17px;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		transition: box-shadow var(--duration-base) var(--ease-out-quart);
	}
	.alert-card:hover { box-shadow: var(--shadow-sm); }

	.alert-card__header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); flex-wrap: wrap; }

	.alert-card__type {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		font-weight: 700;
		white-space: nowrap;
	}
	.alert-card__type--critico { background: var(--error-bg); color: var(--error-ink); }
	.alert-card__type--retraso { background: var(--warn-bg);  color: var(--warn-ink);  }
	.alert-card__type--parada  { background: var(--info-bg);  color: var(--info-ink);  }
	.alert-card__type--desvio  { background: var(--info-bg);  color: var(--info-ink);  }

	.alert-card__unit {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--blue-darker);
		background: var(--blue-lighter);
		height: 33px;
		display: inline-flex;
		align-items: center;
		padding: 0 var(--space-3);
		border-radius: var(--radius-full);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.alert-card__message {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-darker);
		line-height: 1.7;
	}

	.alert-card__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: var(--space-1);
	}
	.alert-card__time { font-size: var(--text-sm); font-weight: 500; color: var(--grey-muted); }
	.alert-card__link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--blue-normal);
		transition: color var(--duration-fast) var(--ease-out-quart);
	}
	.alert-card__link:hover { color: var(--blue-dark); }
	.alert-card__link:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; border-radius: 2px; }

	/* ── Responsive ──────────────────────────────────────────────────────────
	   Al angostarse se ceden primero los códigos SAP (consultables en el
	   detalle) y se conservan despacho, ruta y transporte. */
	/* ── Pantallas medianas y pequeñas ────────────────────────────────────
	   La tabla de 6 columnas sólo cabe cómoda en pantallas anchas (>1200px).
	   Por debajo, cada fila pasa a ser una tarjeta: la etiqueta de columna
	   entra en la tarjeta y los datos se apilan, en vez de esconder columnas
	   (que es como se perdía la mayor parte del despacho). */
	@media (max-width: 1200px) {
		.cards-header { display: none; }

		.card-grid {
			grid-template-columns: 1fr;
			gap: var(--space-4);
			padding: var(--space-5) var(--space-4);
			min-height: 0;
			align-items: stretch;
		}
		/* Ninguna columna se oculta ya en móvil. */
		.card-grid > :nth-child(2),
		.card-grid > :nth-child(3),
		.card-grid > :nth-child(4),
		.card-grid > :nth-child(5) { display: flex; }

		.cell-label {
			display: block;
			font-size: var(--text-2xs);
			font-weight: 600;
			letter-spacing: 0.07em;
			text-transform: uppercase;
			color: var(--ink-4);
			line-height: 1.4;
		}

		/* El identificador conserva el icono de estado a su izquierda; la
		   etiqueta ocupa el ancho completo por encima. */
		.card-cell {
			display: grid;
			grid-template-columns: auto 1fr;
			column-gap: var(--space-3);
			row-gap: var(--space-2);
			align-items: center;
		}
		.card-cell .cell-label { grid-column: 1 / -1; }

		.cell-primary,
		.cell-secondary { white-space: normal; overflow: visible; text-overflow: clip; }
		.route-line { flex-wrap: wrap; }

		/* La acción deja de ser un chevron y pasa a botón de ancho completo. */
		.card-action {
			justify-content: center;
			gap: var(--space-2);
			min-height: 44px;
			border-radius: var(--radius-md);
			background: var(--surface-2);
			color: var(--blue-dark);
			font-size: var(--text-sm);
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.04em;
		}
		.card-action__text { display: inline; }

		/* Pestañas de estado: carrusel horizontal en lugar de dos filas. */
		.filter-bar {
			flex-wrap: nowrap;
			overflow-x: auto;
			scroll-snap-type: x proximity;
			-webkit-overflow-scrolling: touch;
			padding-bottom: var(--space-2);
			margin-inline: calc(var(--space-4) * -1);
			padding-left: var(--space-4);
			padding-right: 0;
			scroll-padding-left: var(--space-4);
			scrollbar-width: thin;
		}
		.filter-chip { flex: 0 0 auto; scroll-snap-align: start; }

		/* Búsqueda y acciones ocupan el ancho de la pantalla. */
		.viajes-header__left {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-3);
		}
		/* En columna, `flex: 1` pasa a gobernar el alto y aplastaba la barra:
		   se fija el tamaño y se garantiza un objetivo táctil cómodo. */
		.search-pill {
			flex: 0 0 auto;
			width: 100%;
			max-width: none;
			height: auto;
			min-height: 44px;
			padding: 0 var(--space-4);
		}
		.btn-buscar { width: 100%; }

		.page-header { flex-wrap: wrap; gap: var(--space-4); }
		.btn-outline { width: 100%; min-width: 0; justify-content: center; }

		/* Leyenda: lista vertical, más legible que una fila que se parte. */
		.cards-legend {
			flex-direction: column;
			align-items: flex-start;
			justify-content: flex-start;
			gap: var(--space-3);
			padding: var(--space-5) var(--space-1) var(--space-2);
		}

		.alerts-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4); }
	}

	/* Sólo en móvil real: la barra de navegación pasa a dos líneas, así que el
	   ancla debe despejar más alto o el título de la sección queda tapado. */
	@media (max-width: 700px) {
		.viajes,
		.incidencias { scroll-margin-top: 148px; }
	}
</style>
