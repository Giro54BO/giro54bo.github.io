<script lang="ts">
	import { tick } from 'svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import TripMap from '$lib/components/TripMap.svelte';
	import { alertas, ALERTA_TYPE_ICONS, ALERTA_TYPE_LABELS, STATE_LABELS, type TripState } from '$lib/data/trips';
	import { incidenciasCreadas } from '$lib/data/incidencias-creadas.svelte';
	import type { TripEvent } from '$lib/data/trips';
	import { GEOCERCAS, GEOCERCA_ICONS, GEOCERCA_TIPO_LABELS, type Geocerca } from '$lib/data/geo';
	import { parseKg, fmtTon, kgToTon } from '$lib/data/units';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const trip = $derived(data.trip);

	// Iconografía de la línea de tiempo, alineada con la del resto del sistema
	// (mismos glifos que las geocercas y los estados).
	const EVENT_ICON: Record<TripEvent['tipo'], string> = {
		carga:      'forklift',
		inicio:     'factory',   // salida de planta
		parada:     'pause',
		frontera:   'flag',
		incidencia: 'report',
		descarga:   'download',
		retorno:    'undo',
		sistema:    'notifications',
	};
	function eventIcon(e: TripEvent): string {
		if (e.tipo === 'sistema') {
			if (/recepci/i.test(e.titulo)) return 'check';
			if (/espera/i.test(e.titulo)) return 'pending';
			return 'notifications';
		}
		return EVENT_ICON[e.tipo];
	}

	const EVENT_COLOR: Record<TripEvent['tipo'], string> = {
		carga:      'amber',
		inicio:     'gray',
		parada:     'amber',
		frontera:   'blue',
		incidencia: 'red',
		descarga:   'teal',
		retorno:    'purple',
		sistema:    'gray',
	};
	function eventColor(e: TripEvent): string {
		if (e.tipo === 'sistema' && /recepci/i.test(e.titulo)) return 'green';
		return EVENT_COLOR[e.tipo];
	}

	// ── Tiempo en cada estado de la línea de tiempo ──
	// Estados de detención (carga, descanso, frontera, descarga). El estado
	// ACTUAL del despacho usa el `tiempoEnEstado` real (coincide con las
	// tarjetas); los pasados usan la duración precalculada del evento. No aplica
	// a hitos de paso (Salida, Control en ruta, Recepción, Alerta) ni al Destino.
	const ESTADO_A_TIPO: Partial<Record<TripState, TripEvent['tipo']>> = {
		'en-carga': 'carga', 'en-descarga': 'descarga', 'en-frontera': 'frontera',
	};
	function duracionEnEstado(eventos: TripEvent[], i: number): string | null {
		const ev = eventos[i];
		const esUltimoDeTipo = !eventos.slice(i + 1).some((e) => e.tipo === ev.tipo);
		if (ESTADO_A_TIPO[trip.estado] === ev.tipo && esUltimoDeTipo) {
			return trip.tiempoEnEstado || null;
		}
		return ev.duracion ?? null;
	}

	// Icono de la geocerca de destino (último checkpoint): almacén, puerto, etc.
	const destinoIcon = $derived(
		GEOCERCA_ICONS[GEOCERCAS[trip.geocercasRuta[trip.geocercasRuta.length - 1]]?.tipo] ?? 'flag'
	);

	/** Avance estimado del viaje según su estado (barra de progreso). */
	const PROGRESS: Record<TripState, number> = {
		'en-carga':        20,
		'en-transito':     55,
		'incidencia':      60,
		'en-frontera':     70,
		'en-descarga':     90,
		'en-retorno':      95,
	};

	const desglose = $derived(trip.rutaNombre.split(' - ').map(s => s.trim()));

	// ── Recepción: comparar lo despachado (neto) con lo recibido ──
	const recepcion = $derived.by(() => {
		if (!trip.recepcion) return null;
		const despachado = parseKg(trip.pesoNeto);
		const recibido   = parseKg(trip.recepcion.pesoRecibido);
		const dif = recibido - despachado;
		const pct = despachado ? Math.abs(dif / despachado) * 100 : 0;
		return { despachado, recibido, dif, pct, fecha: trip.recepcion.fecha };
	});

	// ── Geocercas ──
	const geocercaProxima = $derived(trip.geocerca.proxima ? GEOCERCAS[trip.geocerca.proxima] : undefined);

	// ── Ruta de geocercas: la ruta expresada como secuencia de checkpoints ──
	// No es un GPS en vivo: es una predicción. Sólo se marca como "alcanzada"
	// (sólido) la geocerca por la que la unidad ya pasó o dentro de la que está;
	// las siguientes son sugeridas y se muestran punteadas.
	type CheckpointEstado = 'done' | 'current' | 'upcoming';
	type Checkpoint =
		| { type: 'geocerca'; zona: Geocerca; rol: string; orden: number; estado: CheckpointEstado; reached: boolean; nextReached: boolean }
		| { type: 'entre'; proxima: string; eta?: string; estado: 'current'; reached: boolean; nextReached: boolean };

	const checkpoints = $derived.by<Checkpoint[]>(() => {
		const zonas = trip.geocercasRuta.map(id => GEOCERCAS[id]).filter(Boolean);
		const enRuta = trip.geocerca.estado === 'en-ruta';
		// Índice del checkpoint "en foco": la geocerca actual (si está dentro)
		// o la próxima (si va en ruta).
		const focoId = trip.geocerca.actual ?? trip.geocerca.proxima;
		const focoIdx = focoId ? zonas.findIndex(z => z.id === focoId) : -1;

		const geoSteps: Checkpoint[] = zonas.map((z, i) => {
			const rol = i === 0 ? 'Origen' : i === zonas.length - 1 ? 'Destino' : GEOCERCA_TIPO_LABELS[z.tipo];
			let estado: CheckpointEstado = 'upcoming';
			if (focoIdx >= 0) {
				// En ruta, la posición actual la marca el nodo "Entre geocercas";
				// la geocerca próxima queda como pendiente.
				estado = i < focoIdx ? 'done' : i === focoIdx ? (enRuta ? 'upcoming' : 'current') : 'upcoming';
			}
			// Dentro de la geocerca en foco = alcanzada.
			if (i === focoIdx && trip.geocerca.estado === 'dentro') estado = 'done';
			return { type: 'geocerca', zona: z, rol, orden: i + 1, estado, reached: estado === 'done', nextReached: false };
		});

		const result: Checkpoint[] = [...geoSteps];
		// Nodo "Entre geocercas": la posición actual de la unidad cuando va en ruta.
		if (enRuta && focoIdx >= 0) {
			result.splice(focoIdx, 0, {
				type: 'entre',
				proxima: geocercaProxima?.nombre ?? '',
				eta: trip.geocerca.etaProxima,
				estado: 'current',
				reached: true, // la unidad ya llegó a este punto → línea sólida antes
				nextReached: false,
			});
		}
		// El tramo hacia el siguiente es sólido sólo si ése ya se alcanzó.
		for (let i = 0; i < result.length - 1; i += 1) result[i].nextReached = result[i + 1].reached;
		return result;
	});

	// ── Incidencias del despacho ──
	let dismissed  = $state<string[]>([]);   // eliminadas de la lista
	let resolved   = $state<string[]>([]);   // resueltas — permanecen con su etiqueta
	let resolveAlertId = $state<string | null>(null);
	let resolutionComment = $state('');
	let resolutionError = $state('');
	let resolutionCompleted = $state(false);
	let resolutionDialog = $state<HTMLDivElement>();
	let resolutionTrigger: HTMLButtonElement | null = null;

	/** "hace 30 min" / "hace 3 h" / "hace 2 días" → minutos transcurridos. */
	function minutosDesde(tiempo: string): number {
		// Las incidencias recién creadas ("hace un momento") son las más recientes.
		if (/momento|ahora|reci[eé]n/i.test(tiempo)) return -1;
		const m = tiempo.match(/(\d+)\s*(min|h|d)/i);
		if (!m) return Number.MAX_SAFE_INTEGER;
		const n = +m[1];
		const u = m[2].toLowerCase();
		return u.startsWith('d') ? n * 1440 : u === 'h' ? n * 60 : n;
	}

	// Todas las incidencias del despacho en una sola lista, más reciente primero.
	// Las resueltas permanecen (con su etiqueta); sólo salen las eliminadas.
	const tripAlertas = $derived(
		[...incidenciasCreadas.items, ...alertas]
			.filter(a => a.tripId === trip.id && !dismissed.includes(a.id))
			.slice()
			.sort((a, b) => minutosDesde(a.tiempo) - minutosDesde(b.tiempo))
	);

	// Sólo se puede registrar una incidencia en despachos activos. Los que ya
	// llegaron a destino (unidad entregada, en retorno) no son reportables — es
	// el mismo criterio que usa el formulario para su lista de viajes.
	const puedeReportar = $derived(trip.estado !== 'en-retorno');

	async function openResolution(alertId: string, trigger: HTMLButtonElement) {
		resolveAlertId = alertId;
		resolutionComment = '';
		resolutionError = '';
		resolutionCompleted = false;
		resolutionTrigger = trigger;
		await tick();
		resolutionDialog?.querySelector<HTMLElement>('textarea, button')?.focus();
	}

	function closeResolution() {
		resolveAlertId = null;
		resolutionComment = '';
		resolutionError = '';
		resolutionCompleted = false;
		resolutionTrigger?.focus();
		resolutionTrigger = null;
	}

	function submitResolution() {
		const comment = resolutionComment.trim();
		if (!comment) {
			resolutionError = 'Agrega una breve descripción de la solución antes de continuar.';
			return;
		}
		if (!resolveAlertId) return;

		// La incidencia no se retira: se marca como resuelta y permanece en la lista.
		if (!resolved.includes(resolveAlertId)) resolved = [...resolved, resolveAlertId];
		resolutionCompleted = true;
	}

	function handleResolutionKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && resolveAlertId) closeResolution();
		if (event.key !== 'Tab' || !resolutionDialog) return;
		const focusable = [...resolutionDialog.querySelectorAll<HTMLElement>('button, textarea, input, select, a[href]')]
			.filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	// Duración aproximada del viaje: la parte de tiempo de `distancia` ("… | 22 h 16 min").
	function leadTimeInDays(distancia: string): string {
		const duration = distancia.split('|')[1] ?? '';
		const hours = Number(duration.match(/(\d+)\s*h/)?.[1] ?? 0);
		const minutes = Number(duration.match(/(\d+)\s*min/)?.[1] ?? 0);
		const totalMinutes = hours * 60 + minutes;
		if (!totalMinutes) return '—';

		const days = Math.floor(totalMinutes / (24 * 60));
		const remainingMinutes = totalMinutes % (24 * 60);
		const remainingHours = Math.floor(remainingMinutes / 60);
		const leftoverMinutes = remainingMinutes % 60;
		const parts: string[] = [];

		if (days) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
		if (remainingHours) parts.push(`${remainingHours} h`);
		if (leftoverMinutes) parts.push(`${leftoverMinutes} min`);
		return parts.join(' ');
	}

	const SEGMENT_LEAD_TIMES: Record<string, { origenFrontera?: string; fronteraDestino?: string }> = {
		'BO - PDF - AREQUIPA': { origenFrontera: '18 h 00 min', fronteraDestino: '11 h 00 min' },
		'BO - PDF - LA PAZ':    {},
		'BO - EL ALTO - ILO':   { origenFrontera: '8 h 00 min', fronteraDestino: '5 h 00 min' },
		'BO - ORURO - ARICA':   { origenFrontera: '7 h 00 min', fronteraDestino: '4 h 00 min' },
	};

	function formatSegmentLeadTime(duration?: string): string {
		return duration ? leadTimeInDays(`0 km | ${duration}`) : 'No aplica';
	}

	const duracion = $derived(leadTimeInDays(trip.distancia));
	const segmentLeadTimes = $derived(SEGMENT_LEAD_TIMES[trip.rutaNombre] ?? {});
</script>

<div class="detalle">

	<!-- ── Sub-header (reemplaza a la barra de navegación en el detalle) ── -->
	<div class="subheader">
		<a href="/" class="back-link">
			<span class="icon icon--sm" aria-hidden="true">arrow_back</span>
			Volver dashboard
		</a>
		<div class="subheader__center">
			<h1 class="subheader__id">{trip.id}</h1>
			<span class="subheader__sep" aria-hidden="true">·</span>
			<span class="subheader__ruta">
				{#each desglose as segmento, si}
					{#if si > 0}
						<span class="icon icon--sm subheader__arrow" aria-hidden="true">arrow_forward</span>
					{/if}
					<span class="subheader__seg" class:subheader__seg--dest={si === desglose.length - 1}>{segmento}</span>
				{/each}
			</span>
			<span class="subheader__sep" aria-hidden="true">·</span>
			<StatusBadge estado={trip.estado} />
		</div>
		<a href="/" class="subheader__close" aria-label="Cerrar y volver al dashboard">
			Cerrar
			<span class="icon icon--sm" aria-hidden="true">close</span>
		</a>
	</div>

	<!-- ── Resumen del viaje ── -->
	<div class="trip-summary">
		<span class="trip-summary__metric">
			<button class="trip-summary__help" type="button" aria-label="Qué significa Lead time total">
				<span class="icon" aria-hidden="true">help_outline</span>
				<span class="trip-summary__tooltip" role="tooltip">Tiempo total promedio estimado desde el origen hasta el destino, considerando conducción, descansos y paradas.</span>
			</button>
			<span class="trip-summary__label">Lead time total</span>
			<strong>{duracion}</strong>
		</span>
		{#if segmentLeadTimes.origenFrontera || segmentLeadTimes.fronteraDestino}
			<span class="trip-summary__sep" aria-hidden="true">|</span>
			<span class="trip-summary__metric">
				<button class="trip-summary__help" type="button" aria-label="Qué significa Lead time Origen a Frontera">
					<span class="icon" aria-hidden="true">help_outline</span>
					<span class="trip-summary__tooltip" role="tooltip">Tiempo promedio estimado que tarda la unidad en llegar desde el origen hasta la frontera.</span>
				</button>
				<span class="trip-summary__label">Lead time Origen → Frontera</span>
				<strong>{formatSegmentLeadTime(segmentLeadTimes.origenFrontera)}</strong>
			</span>
			<span class="trip-summary__sep" aria-hidden="true">|</span>
			<span class="trip-summary__metric">
				<button class="trip-summary__help" type="button" aria-label="Qué significa Lead time Frontera a Destino">
					<span class="icon" aria-hidden="true">help_outline</span>
					<span class="trip-summary__tooltip" role="tooltip">Tiempo promedio estimado desde la frontera hasta el destino final, considerando conducción, descansos y paradas.</span>
				</button>
				<span class="trip-summary__label">Lead time Frontera → Destino</span>
				<strong>{formatSegmentLeadTime(segmentLeadTimes.fronteraDestino)}</strong>
			</span>
			<span class="trip-summary__sep" aria-hidden="true">|</span>
		{/if}
		{#if trip.gps}
			<span class="trip-summary__metric">
				<button class="trip-summary__help" type="button" aria-label="Qué significa ETA ideal de llegada">
					<span class="icon" aria-hidden="true">help_outline</span>
					<span class="trip-summary__tooltip" role="tooltip">Hora estimada de llegada ideal, según lo planificado al despachar.</span>
				</button>
				<span class="trip-summary__label">ETA ideal de llegada <span class="source">(GPS Tag)</span></span>
				<strong class="trip-summary__strike">{trip.etaOriginal}</strong>
			</span>
			<span class="trip-summary__sep" aria-hidden="true">|</span>
			<span class="trip-summary__metric">
				<button class="trip-summary__help" type="button" aria-label="Qué significa ETA actualizado">
					<span class="icon" aria-hidden="true">help_outline</span>
					<span class="trip-summary__tooltip" role="tooltip">Hora estimada de llegada según el progreso real del viaje.</span>
				</button>
				<span class="trip-summary__label">ETA actualizado <span class="source">(GPS Tag)</span></span>
				<strong class:trip-summary__delayed={trip.urgente}>{trip.etaActual}</strong>
			</span>
		{:else}
			<!-- Sin GPS Tag no hay ETA: se explica en el lugar que ésta ocuparía. -->
			<span class="trip-summary__metric trip-summary__nogps">
				<button class="trip-summary__help" type="button" aria-label="Por qué no hay ETA">
					<span class="icon" aria-hidden="true">help_outline</span>
					<span class="trip-summary__tooltip" role="tooltip">
						El ETA se calcula con la posición del GPS Tag. Esta unidad no lo lleva, así que
						sólo se dispone del lead time planificado de la ruta y de los hitos documentales
						registrados en SCL/SCP.
					</span>
				</button>
				<span class="icon icon--sm trip-summary__nogps-icon" aria-hidden="true">gps_off</span>
				<span class="trip-summary__label">Sin ETA —</span>
				<strong>vehículo sin GPS Tag</strong>
			</span>
		{/if}
	</div>

	<!-- ── Ruta de geocercas: la ruta como secuencia de checkpoints ── -->
	{#if checkpoints.length > 0}
	<div class="geo-route" aria-label="Ruta de geocercas del despacho">
		{#each checkpoints as cp, i (cp.type === 'entre' ? 'entre' : cp.zona.id)}
			<div class="geo-step geo-step--{cp.estado}" class:geo-step--entre={cp.type === 'entre'}>
				<div class="geo-step__track" aria-hidden="true">
					<span
						class="geo-step__line geo-step__line--before"
						class:geo-step__line--solid={cp.reached}
					></span>
					<span class="geo-step__marker">
						{#if cp.estado === 'current'}
							<span class="icon geo-step__marker-icon geo-step__spin">progress_activity</span>
						{:else if cp.estado === 'done'}
							<span class="icon geo-step__marker-icon">check</span>
						{/if}
					</span>
					<span
						class="geo-step__line geo-step__line--after"
						class:geo-step__line--solid={cp.nextReached}
					></span>
				</div>
				<div class="geo-step__body">
					{#if cp.type === 'entre'}
						<span class="geo-step__role">Entre geocercas</span>
						<span class="geo-step__zone">
							<span class="icon icon--sm geo-step__zone-icon" aria-hidden="true">my_location</span>
							<span class="geo-step__prox">Próx.</span> {cp.proxima}
						</span>
						{#if cp.eta}
							<span class="geo-step__source">ETA {cp.eta}</span>
						{/if}
					{:else}
						<span class="geo-step__role">{cp.rol} · {cp.orden}ª Geocerca</span>
						<span class="geo-step__zone">
							<span class="icon icon--sm geo-step__zone-icon" aria-hidden="true">{GEOCERCA_ICONS[cp.zona.tipo]}</span>
							{i === 0 ? trip.planta : cp.zona.nombre}
						</span>
						{#if i === 0}
							<span class="geo-step__source">Nombre de la planta donde cargó <span class="source">(PltNombre · SCL/SCP)</span></span>
						{/if}
					{/if}
				</div>
			</div>
		{/each}
	</div>
	{/if}

	<!-- ── Info: Transportadora / Conductor / Vehículo ── -->
	<div class="info-strip">
		<section class="info-group info-group--transportadora" aria-labelledby="ig-transportadora">
			<h2 class="info-group__title" id="ig-transportadora">
				<span class="icon" aria-hidden="true">business_center</span>
				Transportadora <span class="source">(SCL/SCP)</span>
			</h2>
			<div class="info-group__fields">
				<div class="field">
					<span class="field__label">Código de cliente <span class="source">(cliCodigo)</span></span>
					<span class="field__value">{trip.sap.cliCodigo}</span>
				</div>
				<div class="field">
					<span class="field__label">Empresa <span class="source">(TraNombre)</span></span>
					<span class="field__value">{trip.transportista}</span>
				</div>
				<div class="field">
					<span class="field__label">NIT <span class="source">(TraNit)</span></span>
					<span class="field__value">{trip.nit}</span>
				</div>
				<div class="field">
					<span class="field__label">Contacto</span>
					<span class="field__value">
						{#if trip.transportistaTel}
							<a href="tel:{trip.transportistaTel}" class="contact-link">{trip.transportistaTel}</a>
						{:else}
							—
						{/if}
					</span>
				</div>
			</div>
		</section>

		<section class="info-group" aria-labelledby="ig-conductor">
			<h2 class="info-group__title" id="ig-conductor">
				<span class="icon" aria-hidden="true">person</span>
				Conductor <span class="source">(SCL/SCP)</span>
			</h2>
			<div class="info-group__fields">
				<div class="field">
					<span class="field__label">Carnet chofer <span class="source">(choId)</span></span>
					<span class="field__value">{trip.conductor}</span>
				</div>
				<div class="field">
					<span class="field__label">Celular</span>
					<span class="field__value">
						{#if trip.conductorTel}
							<a href="tel:{trip.conductorTel}" class="contact-link">{trip.conductorTel}</a>
						{:else}
							—
						{/if}
					</span>
				</div>
			</div>
		</section>

		<section class="info-group" aria-labelledby="ig-vehiculo">
			<h2 class="info-group__title" id="ig-vehiculo">
				<span class="icon" aria-hidden="true">local_shipping</span>
				Vehículo <span class="source">(SCL/SCP)</span>
			</h2>
			<div class="info-group__fields">
				<div class="field">
					<span class="field__label">Placa <span class="source">(vehId)</span></span>
					<span class="field__value">{trip.unidad}</span>
				</div>
				<div class="field">
					<span class="field__label">Tipo</span>
					<span class="field__value">{trip.tipoVehiculo}</span>
				</div>
			</div>
		</section>
	</div>

	<!-- ── Body ── -->
	<div class="detalle-body">

		<!-- Col izquierda -->
		<div class="col-left">

			<!-- Línea de tiempo -->
			<section class="card" aria-labelledby="timeline-title">
				<h2 class="card__title" id="timeline-title">
					<span class="icon icon--sm" aria-hidden="true">route</span>
					Línea de tiempo
				</h2>

				<div class="timeline-status">
					<StatusBadge estado={trip.estado} />
				</div>

				<div class="progress" role="progressbar" aria-valuenow={PROGRESS[trip.estado]} aria-valuemin="0" aria-valuemax="100" aria-label="Avance estimado del viaje">
					<div class="progress__fill" style="width:{PROGRESS[trip.estado]}%"></div>
				</div>

				<ol class="timeline" aria-label="Historial de eventos del despacho">
					{#each trip.eventos as evento, i (evento.id)}
						{@const isLast = i === trip.eventos.length - 1}
						{@const duracion = duracionEnEstado(trip.eventos, i)}
						<li class="timeline__item">
							<div class="timeline__connector" aria-hidden="true">
								<div class="timeline__dot timeline__dot--{eventColor(evento)}" class:timeline__dot--pulse={isLast && (trip.estado === 'incidencia' || trip.estado === 'en-frontera')}>
									<span class="icon icon--sm" aria-hidden="true">{eventIcon(evento)}</span>
								</div>
								<div class="timeline__line" aria-hidden="true"></div>
							</div>
							<div class="timeline__content">
								<span class="timeline__time">{evento.timestamp}</span>
								<div class="timeline__row">
									<p class="timeline__title" class:timeline__title--red={evento.tipo === 'incidencia'}>
										{evento.titulo}
									</p>
								</div>
								{#if duracion}
										<span class="timeline__duracion">
											<span class="icon icon--sm" aria-hidden="true">timer</span>
											Tiempo en este estado: <strong>{duracion}</strong>
										</span>
									{/if}
									{#if evento.geocerca}
									{@const zona = GEOCERCAS[evento.geocerca]}
									<span class="tag-geocerca timeline__geocerca" title="Evento detectado automáticamente por la geocerca «{zona?.nombre}»">
										<span class="icon tag-geocerca__icon" aria-hidden="true">my_location</span>
										Geocerca
									</span>
								{/if}
								{#if evento.descripcion}
									<p class="timeline__desc">{evento.descripcion}</p>
								{/if}
								{#if evento.ubicacion}
									<span class="timeline__location">
										<span class="icon icon--sm" aria-hidden="true">location_on</span>
										{evento.ubicacion}
									</span>
								{/if}
							</div>
						</li>
					{/each}

					<!-- Destino -->
					<li class="timeline__item">
						<div class="timeline__connector" aria-hidden="true">
							<div class="timeline__dot timeline__dot--gray">
								<span class="icon icon--sm" aria-hidden="true">{destinoIcon}</span>
							</div>
						</div>
							<div class="timeline__content">
								<span class="timeline__time">{trip.gps ? trip.etaActual : 'Sin ETA — sin GPS'}</span>
								<div class="timeline__row">
									<p class="timeline__title">Destino</p>
								</div>
								<span class="timeline__location">
									<span class="icon icon--sm" aria-hidden="true">location_on</span>
									{trip.destino}
								</span>
							</div>
					</li>
				</ol>
			</section>

			<!-- Más información -->
			<section class="card" aria-labelledby="masinfo-title">
				<h2 class="card__title" id="masinfo-title">
					<span class="icon icon--sm" aria-hidden="true">format_list_bulleted</span>
					Más información
				</h2>

				<div class="subsection">
					<h3 class="subsection__title">
						<span class="icon icon--sm" aria-hidden="true">package_2</span>
						Carga <span class="source">(SCL/SCP)</span>
					</h3>
					<div class="field-grid">
						<div class="field">
							<span class="field__label">Fecha de despacho <span class="source">(desFechaDoc · SCL/SCP)</span></span>
							<span class="field__value">{trip.fechaDocumentada}</span>
						</div>
						<div class="field">
							<span class="field__label">Peso vacío <span class="source">(desPesoIngreso)</span></span>
							<span class="field__value">{kgToTon(trip.pesoIngreso)}</span>
						</div>
						<div class="field">
							<span class="field__label">Nombre del producto <span class="source">(MatNombre)</span></span>
							<span class="field__value">{trip.carga}</span>
						</div>
						<div class="field">
							<span class="field__label">Peso bruto <span class="source">(desPesoSalida)</span></span>
							<span class="field__value">{kgToTon(trip.pesoSalida)}</span>
						</div>
						<div class="field">
							<span class="field__label">Material cargado <span class="source">(matId)</span></span>
							<span class="field__value">{trip.materialId}</span>
						</div>
						<div class="field">
							<span class="field__label">Peso de producto <span class="source">(desPesoNeto)</span></span>
							<span class="field__value">{kgToTon(trip.pesoNeto)}</span>
						</div>
						{#if trip.lote}
							<div class="field">
								<span class="field__label">Lote <span class="source">(desLote)</span></span>
								<span class="field__value">{trip.lote}</span>
							</div>
						{/if}
						<div class="field">
							<span class="field__label">Nº de precintos <span class="source">(desPrecinto)</span></span>
							<span class="field__value">{trip.precinto}</span>
						</div>
						{#if trip.observaciones}
							<div class="field">
								<span class="field__label">Observaciones <span class="source">(desObservaciones)</span></span>
								<span class="field__value">{trip.observaciones}</span>
							</div>
						{/if}
					</div>
				</div>

				<div class="subsection">
					<h3 class="subsection__title">
						<span class="icon icon--sm" aria-hidden="true">assignment</span>
						SAP
					</h3>
					<div class="field-grid">
						<div class="field">
							<span class="field__label">Nº de pedido SAP <span class="source">(desPedidoSAP)</span></span>
							<span class="field__value">{trip.sap.pedido}</span>
						</div>
						<div class="field">
							<span class="field__label">Nº de entrega SAP <span class="source">(desSalidaMercanciaSAP)</span></span>
							<span class="field__value">{trip.sap.salidaMercancia}</span>
						</div>
						<div class="field">
							<span class="field__label">Nº de transporte SAP <span class="source">(desNumeroTransporteSAP)</span></span>
							<span class="field__value">{trip.sap.numeroTransporte}</span>
						</div>
						<div class="field">
							<span class="field__label">Código de cliente SAP <span class="source">(desCliCodigoSAP)</span></span>
							<span class="field__value">{trip.sap.cliCodigo}</span>
						</div>
						<div class="field">
							<span class="field__label">Centro de despacho SAP <span class="source">(desCenCodigoSAP)</span></span>
							<span class="field__value">{trip.sap.cenCodigo}</span>
						</div>
						<div class="field">
							<span class="field__label">Usuario IASA de cierre <span class="source">(desUsrIdCerrado)</span></span>
							<span class="field__value">{trip.cerradoPor}</span>
						</div>
					</div>
				</div>

				{#if trip.agencia}
					<div class="subsection">
						<h3 class="subsection__title">
							<span class="icon icon--sm" aria-hidden="true">flag</span>
							Frontera <span class="source">(Agencia Bolivia — SUMA)</span>
						</h3>
						<div class="field-grid">
							<div class="field">
								<span class="field__label">Estado de cruce</span>
								<span class="field__value">{trip.agencia.estadoCruce}</span>
							</div>
							{#if trip.agencia.fechaCruce}
								<div class="field">
									<span class="field__label">Fecha de cruce</span>
									<span class="field__value">{trip.agencia.fechaCruce}</span>
								</div>
							{/if}
							<div class="field">
								<span class="field__label">Paso agencia</span>
								<span class="field__value">{trip.agencia.pasoAgencia}</span>
							</div>
							{#if trip.agencia.fechaRetorno}
								<div class="field">
									<span class="field__label">Fecha de retorno</span>
									<span class="field__value">{trip.agencia.fechaRetorno}</span>
								</div>
							{/if}
							{#if trip.agencia.dex}
								<div class="field">
									<span class="field__label">Nº de DEX</span>
									<span class="field__value">{trip.agencia.dex}</span>
								</div>
							{/if}
							{#if trip.agencia.mic}
								<div class="field">
									<span class="field__label">Nº de MIC</span>
									<span class="field__value">{trip.agencia.mic}</span>
								</div>
							{/if}
							{#if trip.agencia.crt}
								<div class="field">
									<span class="field__label">Nº de CRT</span>
									<span class="field__value">{trip.agencia.crt}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				{#if trip.agenciaPeru}
					<div class="subsection">
						<h3 class="subsection__title">
							<span class="icon icon--sm" aria-hidden="true">gavel</span>
							Nacionalización <span class="source">(Agencia Perú)</span>
						</h3>
						<p class="subsection__note">Solo carga de consumo Perú</p>
						<div class="field-grid">
							<div class="field">
								<span class="field__label">Estado de nacionalización</span>
								<span class="field__value">{trip.agenciaPeru.estadoNacionalizacion}</span>
							</div>
							{#if trip.agenciaPeru.fechaNacionalizacion}
								<div class="field">
									<span class="field__label">Fecha de nacionalización</span>
									<span class="field__value">{trip.agenciaPeru.fechaNacionalizacion}</span>
								</div>
							{/if}
							<div class="field">
								<span class="field__label">Paso agencia</span>
								<span class="field__value">{trip.agenciaPeru.pasoAgencia}</span>
							</div>
							{#if trip.agenciaPeru.canal}
								<div class="field">
									<span class="field__label">Canal</span>
									<span class="field__value">{trip.agenciaPeru.canal}</span>
								</div>
							{/if}
							{#if trip.agenciaPeru.clienteDestino}
								<div class="field">
									<span class="field__label">Cliente destino</span>
									<span class="field__value">{trip.agenciaPeru.clienteDestino}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}

			</section>
		</div>

		<!-- Col derecha -->
		<div class="col-right">
			<div class="maphead">
				<h2 class="section-heading">
					<span class="icon section-heading__icon" aria-hidden="true">map</span>
					{trip.gps ? 'Ubicación aproximada en ruta' : 'Ruta planificada'}
				</h2>
				{#if trip.gps}
					<span class="maphead__update">
						Última actualización <span class="source">(GPS Tag)</span>
						<strong>{trip.ultimaActualizacion}</strong>
					</span>
				{:else}
					<span class="maphead__update maphead__update--nogps">
						<span class="icon icon--sm" aria-hidden="true">gps_off</span>
						<strong>Sin GPS Tag</strong> — no se registra posición
					</span>
				{/if}
			</div>

			<TripMap {trip} />

			{#if recepcion}
				<section class="recep-card" aria-label="Control de recepción">
					<div class="recep-card__head">
						<span class="icon icon--sm" aria-hidden="true">inventory_2</span>
						Control de recepción <span class="source">(SCP)</span>
						<span class="recep-card__date">Recibido {recepcion.fecha}</span>
					</div>
					<div class="recep-card__compare">
						<div class="recep-col">
							<span class="recep-col__label">Peso despachado (neto)</span>
							<span class="recep-col__value">{fmtTon(recepcion.despachado)}</span>
						</div>
						<span class="icon recep-card__arrow" aria-hidden="true">arrow_forward</span>
						<div class="recep-col">
							<span class="recep-col__label">Peso recibido</span>
							<span class="recep-col__value">{fmtTon(recepcion.recibido)}</span>
						</div>
						<div class="recep-diff recep-diff--{recepcion.dif < 0 ? 'neg' : 'ok'}">
							<span class="recep-diff__label">{recepcion.dif < 0 ? 'Merma' : 'Diferencia'}</span>
							<span class="recep-diff__value">
								<span class="icon icon--sm" aria-hidden="true">{recepcion.dif < 0 ? 'trending_down' : 'check'}</span>
								{recepcion.dif > 0 ? '+' : ''}{fmtTon(recepcion.dif)}
							</span>
							<span class="recep-diff__pct">{recepcion.pct.toFixed(2)}%</span>
						</div>
					</div>
				</section>
			{/if}

			<div class="stat-cards">
				<div class="stat-card">
					<span class="stat-card__title">ETA de recorrido</span>
					<span class="stat-card__value">{trip.etaRecorrido ?? '—'}</span>
					<span class="stat-card__unit">Tiempo de conducción</span>
				</div>
				<div class="stat-card">
					<span class="stat-card__title">Tiempos de retraso</span>
					<span class="stat-card__value stat-card__value--row">
						{trip.retraso ?? '—'}
						{#if trip.retraso}
							<span class="stat-card__alert-icon">
								<span class="icon icon--sm" aria-hidden="true">report</span>
							</span>
						{/if}
					</span>
					<span class="stat-card__unit">{trip.retraso ? 'Viaje con demora' : 'Sin demoras registradas'}</span>
				</div>
				<div class="stat-card">
					<span class="stat-card__title">
						Tiempos de frontera
						<span class="icon icon--sm" aria-hidden="true">flag</span>
					</span>
					<span class="stat-card__value stat-card__value--row">
						{trip.estado === 'en-frontera' ? trip.tiempoEnEstado : trip.agencia?.fechaCruce ? 'Cruzada' : '—'}
						{#if trip.estado === 'en-frontera' && trip.urgente}
							<span class="stat-card__delta">
								<span class="icon" style="font-size:12px" aria-hidden="true">arrow_upward</span>
								+1h 34min
							</span>
						{/if}
					</span>
					<span class="stat-card__unit">
						{trip.estado === 'en-frontera' ? 'En trámite aduanero' : trip.agencia?.fechaCruce ? trip.agencia.fechaCruce : 'Sin cruce en curso'}
					</span>
				</div>
			</div>

			<!-- Incidencias del despacho: una sola lista cronológica. Las resueltas
			     permanecen con su etiqueta "Resuelta". -->
			<div class="notif-section">
				<div class="notif-header">
					<h2 class="section-heading">
						<span class="icon section-heading__icon" aria-hidden="true">warning</span>
						Incidencias
					</h2>
					{#if puedeReportar}
						<a class="btn-nueva-inc" href="/incidencias/nueva?viaje={trip.id}">
							Registrar incidencia
							<span class="icon" aria-hidden="true">add</span>
						</a>
					{:else}
						<button
							class="btn-nueva-inc"
							type="button"
							disabled
							title="El despacho ya llegó a destino; no se pueden registrar incidencias."
						>
							Registrar incidencia
							<span class="icon" aria-hidden="true">add</span>
						</button>
					{/if}
				</div>

				{#if tripAlertas.length === 0}
					<div class="notif-empty">
						<span class="icon icon--xl" aria-hidden="true">check_circle</span>
						<p>Sin incidencias registradas para este despacho.</p>
					</div>
				{:else}
					<ul class="notif-list" role="list">
						{#each tripAlertas as alerta (alerta.id)}
							{@const estaResuelta = resolved.includes(alerta.id)}
							<li
								class="notif-card"
								class:notif-card--resuelta={estaResuelta}
								role="article"
								aria-label="Incidencia {ALERTA_TYPE_LABELS[alerta.tipo]}{estaResuelta ? ', resuelta' : ''}"
							>
								<div class="notif-card__header">
									<span class="alert-type alert-type--{alerta.tipo}">
										<span class="icon icon--sm" aria-hidden="true">
											{ALERTA_TYPE_ICONS[alerta.tipo]}
										</span>
										{ALERTA_TYPE_LABELS[alerta.tipo]}
									</span>
									{#if estaResuelta}
										<span class="alert-type alert-type--resuelta">
											<span class="icon icon--sm" aria-hidden="true">check_circle</span>
											Resuelta
										</span>
									{/if}
								</div>
								<p class="notif-card__message">{alerta.mensaje}</p>
								<span class="notif-card__time">{alerta.tiempo}</span>
								<div class="notif-card__actions">
									<button class="btn-eliminar" onclick={() => dismissed = [...dismissed, alerta.id]}>
										Eliminar
										<span class="icon" aria-hidden="true">delete</span>
									</button>
									{#if !estaResuelta}
						<button class="btn-resolver" type="button" onclick={(event) => openResolution(alerta.id, event.currentTarget as HTMLButtonElement)}>
											Resolver incidencia
											<span class="icon" aria-hidden="true">check</span>
										</button>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
</div>

<svelte:window onkeydown={handleResolutionKeydown} />
{#if resolveAlertId}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && closeResolution()}
	>
			<div class="resolution-modal" role="dialog" aria-modal="true" aria-labelledby="resolution-title" bind:this={resolutionDialog}>
			{#if resolutionCompleted}
				<div class="resolution-success" aria-live="polite">
					<div class="resolution-success__icon" aria-hidden="true">
						<span class="icon">check</span>
					</div>
					<h2 id="resolution-title">La incidencia se resolvió</h2>
					<p>El motivo de la resolución quedó registrado para este despacho.</p>
					<button class="resolution-modal__primary" type="button" onclick={closeResolution}>Cerrar</button>
				</div>
			{:else}
				<div class="resolution-modal__header">
					<div>
						<span class="resolution-modal__eyebrow">Cerrar incidencia</span>
						<h2 id="resolution-title">¿Cómo se resolvió?</h2>
					</div>
					<button class="resolution-modal__close" type="button" aria-label="Cerrar ventana" onclick={closeResolution}>
						<span class="icon" aria-hidden="true">close</span>
					</button>
				</div>
				<p class="resolution-modal__intro">Agrega una nota breve para dejar constancia de qué ocurrió y qué acción permitió resolver la incidencia.</p>
				<label class="resolution-modal__label" for="resolution-comment">Descripción de la resolución</label>
				<textarea
					id="resolution-comment"
					class="resolution-modal__textarea"
					bind:value={resolutionComment}
					maxlength="500"
					placeholder="Ej.: Se reemplazó la manguera dañada y el vehículo retomó la ruta."
					aria-invalid={resolutionError ? 'true' : 'false'}
					aria-describedby={resolutionError ? 'resolution-error' : 'resolution-hint'}
				></textarea>
				<div class="resolution-modal__meta">
					<span id="resolution-hint">Máximo 500 caracteres.</span>
					<span>{resolutionComment.length}/500</span>
				</div>
				{#if resolutionError}
					<p class="resolution-modal__error" id="resolution-error" role="alert">
						<span class="icon icon--sm" aria-hidden="true">error</span>
						{resolutionError}
					</p>
				{/if}
				<div class="resolution-modal__actions">
					<button class="resolution-modal__secondary" type="button" onclick={closeResolution}>Cancelar</button>
					<button class="resolution-modal__primary" type="button" onclick={submitResolution}>
						Marcar como resuelta
						<span class="icon" aria-hidden="true">check</span>
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.detalle {
		display: flex;
		flex-direction: column;
		padding: 0 0 var(--space-12);
	}

	/* ── Sub-header (pegado arriba; espacio simétrico arriba/abajo) ── */
	.subheader {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		height: 75px;
		padding: 0;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--blue-dark);
		white-space: nowrap;
		transition: color var(--duration-fast) var(--ease-out-quart);
	}
	.back-link:hover { color: var(--blue-normal); }
	.back-link:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; border-radius: 3px; }

	.subheader__center {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
		flex-wrap: wrap;
		justify-content: center;
	}
	.subheader__id {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		color: var(--grey-dark);
		letter-spacing: -0.01em;
	}
	.subheader__sep { color: var(--ink-4); }
	.subheader__ruta { display: inline-flex; align-items: center; gap: var(--space-1); }
	.subheader__seg {
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--grey-dark);
		white-space: nowrap;
	}
	.subheader__seg--dest { color: var(--blue-normal); }
	.subheader__arrow { color: #9a9fa1; }

	.subheader__close {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--blue-dark);
		white-space: nowrap;
		transition: color var(--duration-fast) var(--ease-out-quart);
	}
	.subheader__close:hover { color: var(--blue-normal); }
	.subheader__close:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; border-radius: 3px; }

	/* Origen del dato (diagrama de integraciones) */
	.source {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
		letter-spacing: 0;
		white-space: nowrap;
	}

	.subsection__note {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
		font-style: italic;
		margin: calc(-1 * var(--space-2)) 0 var(--space-3);
	}

	/* ── Resumen del viaje ── */
	.trip-summary {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		flex-wrap: wrap;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--border);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
	}
	.trip-summary .icon { color: var(--ink-3); }
	.trip-summary strong { font-weight: 700; color: var(--grey-dark); }
	/* ETA ideal: se muestra tachado porque ya no es alcanzable. */
	.trip-summary__strike { color: var(--grey-muted); text-decoration: line-through; font-weight: 500; }
	/* ETA actualizado con retraso: destacado en el color de alerta. */
	.trip-summary__delayed { color: var(--error-ink); }
	/* Sin GPS: ocupa el lugar del ETA y explica por qué no lo hay. */
	.trip-summary__nogps strong { color: var(--grey-dark); }
	.trip-summary__nogps-icon { color: var(--ink-3); }
	.trip-summary__sep { color: var(--ink-4); margin: 0 var(--space-1); }
	.trip-summary__metric {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		position: relative;
	}
	.trip-summary__label { font-weight: 500; color: var(--grey-muted); }
	.trip-summary__help {
		display: inline-grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--ink-3);
		cursor: help;
	}
	.trip-summary__help:hover,
	.trip-summary__help:focus-visible { color: var(--blue-dark); }
	.trip-summary__help:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; border-radius: var(--radius-full); }
	.trip-summary__help .icon { font-size: 17px; }
	.trip-summary__tooltip {
		position: absolute;
		left: 50%;
		bottom: calc(100% + 10px);
		z-index: var(--z-tooltip);
		width: min(280px, 75vw);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		background: var(--grey-darker);
		box-shadow: 0 4px 10px rgba(7, 20, 23, 0.16);
		color: white;
		font-size: var(--text-xs);
		font-weight: 500;
		line-height: 1.45;
		text-align: left;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
		transform: translate(-50%, 4px);
		transition: opacity var(--duration-fast), transform var(--duration-fast), visibility var(--duration-fast);
	}
	.trip-summary__tooltip::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -5px;
		width: 10px;
		height: 10px;
		background: var(--grey-darker);
		transform: translateX(-50%) rotate(45deg);
	}
	.trip-summary__help:hover .trip-summary__tooltip,
	.trip-summary__help:focus-visible .trip-summary__tooltip {
		opacity: 1;
		visibility: visible;
		transform: translate(-50%, 0);
	}

	/* ── Ruta de geocercas (stepper de checkpoints) ── */
	.geo-route {
		display: flex;
		align-items: flex-start;
		padding: var(--space-4) 0 var(--space-5);
		border-bottom: 1px solid var(--border);
	}
	.geo-step {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}

	/* Riel: marcador centrado con líneas a los lados */
	.geo-step__track {
		display: flex;
		align-items: center;
		height: 20px;
	}
	.geo-step__line {
		flex: 1;
		height: 2px;
		border-top: 2px dashed var(--blue-light-active);
	}
	.geo-step__marker {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		border-radius: 50%;
		border: 2px solid var(--blue-light-active);
		background: var(--surface);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}
	.geo-step__marker-icon { font-size: 13px; }

	/* Alcanzada: relleno sólido. Sólo cuando la unidad ya pasó o está dentro. */
	.geo-step--done .geo-step__marker {
		background: var(--blue-normal);
		border-color: var(--blue-normal);
	}
	/* Tramo recorrido: sólido sólo si la geocerca de destino ya se alcanzó. */
	.geo-step__line--solid {
		border-top-style: solid;
		border-top-color: var(--blue-normal);
	}
	/* En foco (predicción): anillo azul con spinner, sin relleno */
	.geo-step--current .geo-step__marker {
		border-color: var(--blue-normal);
		color: var(--blue-normal);
	}
	.geo-step__spin { animation: geo-spin 1.4s linear infinite; }
	@keyframes geo-spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) {
		.geo-step__spin { animation: none; }
	}

	/* El marcador se apoya en el borde exterior en los extremos: la línea
	   colapsa (no basta ocultarla, seguiría ocupando espacio y centraría el punto). */
	.geo-step:first-child .geo-step__line--before,
	.geo-step:last-child .geo-step__line--after { flex: 0 0 0; }

	/* La etiqueta se alinea bajo su punto: izquierda / centro / derecha */
	.geo-step__body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		align-items: center;
		text-align: center;
	}
	.geo-step:first-child .geo-step__body { align-items: flex-start; text-align: left; }
	.geo-step:last-child .geo-step__body { align-items: flex-end; text-align: right; }
	.geo-step__role {
		font-size: var(--text-sm);
		font-weight: 500;
		letter-spacing: 0;
		color: var(--grey-muted);
	}
	.geo-step__zone {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--grey-dark);
	}
	.geo-step__zone-icon { color: var(--ink-2); flex-shrink: 0; }
	.geo-step__source {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
	}
	.geo-step__source .source { font-size: var(--text-sm); }

	/* Nodo "Entre geocercas": posición actual estimada, no una zona real.
	   Se distingue con tono más tenue y prefijo "Próx." antes de la zona. */
	.geo-step--entre .geo-step__zone { color: var(--grey-muted); font-weight: 500; }
	.geo-step--entre .geo-step__zone-icon { color: var(--blue-normal); }
	.geo-step__prox { font-weight: 700; color: var(--grey-dark); }

	@media (max-width: 700px) {
		.geo-route { flex-direction: column; gap: var(--space-3); }
		.geo-step { flex-direction: row; align-items: center; gap: var(--space-3); }
		.geo-step__track { height: auto; }
		.geo-step__line { display: none; }
		/* Apilado: todo a la izquierda, sin alineación por extremos */
		.geo-step__body,
		.geo-step:first-child .geo-step__body,
		.geo-step:last-child .geo-step__body { align-items: flex-start; text-align: left; }
	}

	/* ── Info strip ── */
	.info-strip {
		display: grid;
		grid-template-columns: 1.4fr 1fr 1fr;
		border-bottom: 1px solid var(--border);
	}
	.info-group {
		padding: var(--space-4) var(--space-6) var(--space-5) 0;
	}
	.info-group + .info-group {
		border-left: 1px solid var(--border);
		padding-left: var(--space-6);
	}
	.info-group__title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 500;
		color: var(--grey-muted);
		margin-bottom: var(--space-3);
	}
	.info-group__title .icon { font-size: 20px; }
	.info-group__fields {
		display: flex;
		gap: var(--space-4);
	}
	.info-group--transportadora .info-group__fields {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-5);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}
	.field--wide { flex: 1.5; }
	.field__label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
		white-space: normal;
		overflow-wrap: anywhere;
	}
	.field__value {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--grey-dark);
		overflow-wrap: anywhere;
	}

	.contact-link { color: var(--blue-normal); }
	.contact-link:hover { color: var(--blue-dark); }
	.contact-link:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; border-radius: 2px; }

	/* Tag en eventos generados por geocerca */
	.tag-geocerca {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		margin-left: var(--space-2);
		padding: 0 6px;
		border-radius: var(--radius-full);
		background: var(--blue-lighter);
		color: var(--blue-dark);
		font-size: var(--text-sm);
		font-weight: 700;
		line-height: 1.6;
		vertical-align: middle;
		cursor: help;
	}
	.tag-geocerca__icon { font-size: 16px; }

	/* ── Body ── */
	.detalle-body {
		display: grid;
		grid-template-columns: minmax(360px, 0.85fr) minmax(0, 1.6fr);
		gap: var(--space-8);
		align-items: start;
		padding-top: var(--space-6);
	}

	.col-left {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}
	.col-right {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
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
	}
	.section-heading__icon {
		font-size: 16px;
		font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
	}

	/* Encabezado del mapa: título a la izquierda, última actualización a la derecha. */
	.maphead {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		flex-wrap: wrap;
	}
	.maphead__update {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
		white-space: nowrap;
	}
	.maphead__update strong { font-weight: 700; color: var(--grey-dark); }
	.maphead__update--nogps {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.maphead__update--nogps .icon { color: var(--ink-3); }

	/* ── Cards ── */
	.card {
		background: var(--surface-card);
		border-radius: var(--radius-xl);
		padding: var(--space-5);
		/* Mismo borde (anillo interior) y sombra que las tarjetas de métricas
		   del dashboard (.pred-card). */
		box-shadow: inset 0 0 0 1px var(--border-default), var(--shadow-card);
	}
	.card__title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 500;
		color: var(--grey-dark);
		letter-spacing: -0.01em;
		margin-bottom: var(--space-4);
	}

	.timeline-status { margin-bottom: var(--space-4); }

	/* Barra de progreso */
	.progress {
		height: 9px;
		border-radius: var(--radius-full);
		background: var(--blue-light-active);
		overflow: hidden;
		margin-bottom: var(--space-5);
	}
	.progress__fill {
		height: 100%;
		border-radius: var(--radius-full);
		background: var(--blue-dark);
		transition: width var(--duration-base) var(--ease-out-quart);
	}

	/* ── Timeline ── */
	.timeline {
		list-style: none;
		display: flex;
		flex-direction: column;
	}
	.timeline__item {
		display: flex;
		gap: var(--space-3);
	}
	.timeline__item:last-child .timeline__line { display: none; }

	.timeline__connector {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-shrink: 0;
		width: 28px;
	}
	.timeline__dot {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}
	.timeline__dot--teal   { background: var(--teal-100); color: var(--teal-700); }
	.timeline__dot--amber  { background: var(--status-en-carga-bg); color: var(--status-en-carga-ink); }
	.timeline__dot--blue   { background: var(--status-en-frontera-bg); color: var(--status-en-frontera-ink); }
	.timeline__dot--red    { background: var(--status-incidencia-bg); color: var(--status-incidencia-ink); }
	.timeline__dot--green  { background: var(--status-en-transito-bg); color: var(--status-en-transito-ink); }
	.timeline__dot--purple { background: var(--status-en-retorno-bg); color: var(--status-en-retorno-ink); }
	.timeline__dot--gray   { background: var(--surface-2); color: var(--ink-3); border: 1px solid var(--border); }

	.timeline__dot--pulse::after {
		content: '';
		position: absolute;
		inset: -4px;
		border-radius: var(--radius-full);
		border: 2px solid currentColor;
		opacity: 0.4;
		animation: pulse 2s ease-out infinite;
	}
	@keyframes pulse {
		0%   { transform: scale(1); opacity: 0.4; }
		70%  { transform: scale(1.4); opacity: 0; }
		100% { transform: scale(1.4); opacity: 0; }
	}
	@media (prefers-reduced-motion: reduce) {
		.timeline__dot--pulse::after { animation: none; }
	}

	.timeline__line {
		flex: 1;
		width: 1px;
		background: var(--border);
		margin: var(--space-1) 0;
		min-height: var(--space-4);
	}

	.timeline__content {
		flex: 1;
		min-width: 0;
		padding: 2px 0 var(--space-4);
	}
	.timeline__time {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink-3);
		font-variant-numeric: tabular-nums;
	}
	.timeline__row {
		display: block;
	}
	.timeline__title {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--grey-dark);
	}
	.timeline__title--red { color: var(--error-ink); }
	.timeline__geocerca {
		display: flex;
		width: fit-content;
		max-width: 100%;
		margin: var(--space-1) 0 0;
		white-space: normal;
		overflow-wrap: anywhere;
	}
	.timeline__location {
		display: flex;
		align-items: flex-start;
		gap: 3px;
		min-width: 0;
		max-width: 100%;
		margin-top: var(--space-1);
		font-size: var(--text-sm);
		color: var(--grey-muted);
		white-space: normal;
		overflow-wrap: anywhere;
	}
	.timeline__location .icon { flex-shrink: 0; }
	.timeline__duracion {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		width: fit-content;
		max-width: 100%;
		margin-top: var(--space-1);
		font-size: var(--text-sm);
		color: var(--grey-muted);
		white-space: nowrap;
	}
	.timeline__duracion .icon { flex-shrink: 0; font-size: 16px; color: var(--blue-dark); }
	.timeline__duracion strong { color: var(--grey-dark); font-weight: 700; }
	.timeline__desc {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--ink-2);
		line-height: 1.55;
		text-wrap: pretty;
		margin-top: 2px;
	}

	/* ── Más información ── */
	.subsection { margin-top: var(--space-4); }
	.subsection:first-of-type { margin-top: 0; }
	.subsection__title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--grey-dark);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
		margin-bottom: var(--space-3);
	}
	.subsection:first-of-type .subsection__title { border-top: none; padding-top: 0; }
	.subsection__title .icon { color: var(--ink-3); }

	.field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3) var(--space-4);
	}

	/* ── Stat cards ── */
	/* ── Control de recepción (comparación despacho vs recibido) ── */
	.recep-card {
		background: var(--surface-card);
		border-radius: var(--radius-xl);
		padding: var(--space-4) var(--space-5);
		box-shadow: inset 0 0 0 1px var(--border-default), var(--shadow-card);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.recep-card__head {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--grey-dark);
	}
	.recep-card__head .icon { color: var(--ink-3); }
	.recep-card__date {
		margin-left: auto;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
	}
	.recep-card__compare {
		display: flex;
		align-items: center;
		gap: var(--space-5);
		flex-wrap: wrap;
	}
	.recep-col { display: flex; flex-direction: column; gap: 2px; }
	.recep-col__label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
	}
	.recep-col__value {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--grey-darker);
	}
	.recep-card__arrow { color: var(--ink-4); }
	.recep-diff {
		margin-left: auto;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-lg);
	}
	.recep-diff--neg { background: var(--warn-bg); }
	.recep-diff--ok  { background: var(--success-bg); }
	.recep-diff__label {
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.recep-diff--neg .recep-diff__label { color: var(--warn-ink); }
	.recep-diff--ok  .recep-diff__label { color: var(--success-ink); }
	.recep-diff__value {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: var(--text-base);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.recep-diff--neg .recep-diff__value { color: var(--warn-ink); }
	.recep-diff--ok  .recep-diff__value { color: var(--success-ink); }
	.recep-diff__value .icon { font-size: 16px; }
	.recep-diff__pct {
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--grey-muted);
	}

	.stat-cards {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4);
	}
	.stat-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		background: var(--surface-card);
		border-radius: var(--radius-xl);
		padding: var(--space-4) var(--space-5);
		box-shadow: inset 0 0 0 1px var(--border-default), var(--shadow-card);
	}
	.stat-card__title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--text-base);
		font-weight: 500;
		color: var(--grey-muted);
	}
	.stat-card__title .icon { color: var(--grey-muted); }
	.stat-card__value {
		font-family: var(--font-display);
		font-size: var(--text-h3);
		font-weight: 500;
		letter-spacing: -0.03em;
		color: var(--grey-darker);
		line-height: 1.2;
	}
	.stat-card__value--row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.stat-card__alert-icon {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--error-bg);
		color: var(--error-ink);
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.stat-card__delta {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		height: 26px;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		background: var(--error-bg);
		color: var(--error-ink);
		font-family: var(--font-body);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0;
		white-space: nowrap;
	}
	.stat-card__unit {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--grey-dark);
	}

	/* ── Notificaciones ── */
	.notif-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-2);
	}

	/* Encabezado de la sección: título a la izquierda, acción a la derecha. */
	.notif-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		flex-wrap: wrap;
	}
	.btn-nueva-inc {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 40px;
		padding: 0 var(--space-4);
		border: 1.5px solid var(--blue-dark);
		border-radius: var(--radius-lg);
		background: transparent;
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 700;
		letter-spacing: 0.01em;
		text-transform: uppercase;
		color: var(--blue-dark);
		cursor: pointer;
		white-space: nowrap;
		transition: background var(--duration-fast) var(--ease-out-quart);
	}
	.btn-nueva-inc:hover { background: var(--blue-lighter); }
	.btn-nueva-inc:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }
	.btn-nueva-inc .icon { font-size: 18px; }
	/* Deshabilitado: despacho que ya llegó a destino. */
	.btn-nueva-inc:disabled {
		border-color: var(--grey-light);
		color: var(--grey-muted);
		background: transparent;
		cursor: not-allowed;
	}
	.btn-nueva-inc:disabled:hover { background: transparent; }


	.notif-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-8) var(--space-4);
		color: var(--ink-4);
		text-align: center;
		background: var(--surface);
		border-radius: var(--radius-xl);
	}
	.notif-empty p { font-size: var(--text-sm); }

	.notif-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.notif-card {
		background: var(--surface-card);
		border: 0;
		border-radius: var(--radius-xl);
		box-shadow: inset 0 0 0 1px var(--border-default), var(--shadow-card);
		padding: 17px;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.notif-card__header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.alert-type {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		font-weight: 700;
	}
	.alert-type--critico { background: var(--error-bg); color: var(--error-ink); }
	.alert-type--retraso { background: var(--warn-bg);  color: var(--warn-ink);  }
	.alert-type--parada  { background: var(--info-bg);  color: var(--info-ink);  }
	.alert-type--desvio  { background: var(--info-bg);  color: var(--info-ink);  }
	/* Etiqueta que acompaña al tipo cuando la incidencia ya se resolvió. */
	.alert-type--resuelta { background: var(--success-bg); color: var(--success-ink); }
	/* La incidencia resuelta permanece, atenuada, como registro. */
	.notif-card--resuelta { opacity: 0.75; }

	.notif-card__message {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-darker);
		line-height: 1.6;
	}
	.notif-card__time {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
	}
	.notif-card__actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-1);
	}

	.btn-eliminar,
	.btn-resolver {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-width: 220px;
		height: 43px;
		padding: 0 var(--space-4);
		border-radius: var(--radius-lg);
		font-family: inherit;
		font-size: var(--text-sm);
		font-weight: 700;
		letter-spacing: 0.01em;
		text-transform: uppercase;
		cursor: pointer;
		white-space: nowrap;
		transition: background var(--duration-fast) var(--ease-out-quart);
	}
	.btn-eliminar .icon,
	.btn-resolver .icon { font-size: 18px; }

	.btn-eliminar {
		background: var(--grey-lighter);
		color: var(--grey-normal);
		border: none;
	}
	.btn-eliminar:hover { background: var(--grey-light); }
	.btn-eliminar:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }

	.btn-resolver {
		background: transparent;
		color: var(--blue-dark);
		border: 1.5px solid var(--blue-dark);
	}
	.btn-resolver:hover { background: var(--blue-lighter); }
	.btn-resolver:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }

	/* ── Resolver incidencia ──────────────────────────────────────────── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--z-modal);
		display: grid;
		place-items: center;
		padding: var(--space-4);
		background: var(--backdrop);
	}
	.resolution-modal {
		width: min(100%, 520px);
		background: var(--surface);
		border-radius: var(--radius-xl);
		padding: var(--space-6);
		box-shadow: var(--shadow-overlay);
	}
	.resolution-modal__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
	}
	.resolution-modal__eyebrow {
		display: block;
		margin-bottom: var(--space-1);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--blue-dark);
	}
	.resolution-modal h2 {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 500;
		color: var(--grey-dark);
	}
	.resolution-modal__close {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		color: var(--grey-muted);
		cursor: pointer;
	}
	.resolution-modal__close:hover { background: var(--grey-lighter); color: var(--grey-dark); }
	.resolution-modal__close:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }
	.resolution-modal__intro {
		margin-top: var(--space-4);
		font-size: var(--text-sm);
		line-height: 1.55;
		color: var(--grey-muted);
	}
	.resolution-modal__label {
		display: block;
		margin-top: var(--space-5);
		margin-bottom: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--grey-dark);
	}
	.resolution-modal__textarea {
		display: block;
		width: 100%;
		min-height: 120px;
		resize: vertical;
		padding: var(--space-3);
		border: 1px solid var(--grey-light);
		border-radius: var(--radius-md);
		background: var(--surface);
		font: inherit;
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--grey-dark);
	}
	.resolution-modal__textarea::placeholder { color: var(--grey-muted); }
	.resolution-modal__textarea:focus { outline: 2px solid var(--blue-dark); outline-offset: 1px; border-color: var(--blue-dark); }
	.resolution-modal__textarea[aria-invalid='true'] { border-color: var(--error-ink); }
	.resolution-modal__meta {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
		margin-top: var(--space-1);
		font-size: var(--text-xs);
		color: var(--grey-muted);
	}
	.resolution-modal__error {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		margin-top: var(--space-2);
		font-size: var(--text-sm);
		color: var(--error-ink);
	}
	.resolution-modal__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-6);
	}
	.resolution-modal__primary,
	.resolution-modal__secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: 40px;
		padding: 0 var(--space-4);
		border-radius: var(--radius-md);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 700;
		cursor: pointer;
	}
	.resolution-modal__primary {
		border: 1px solid var(--blue-dark);
		background: var(--blue-dark);
		color: white;
	}
	.resolution-modal__primary:hover { background: var(--teal-700); }
	.resolution-modal__secondary {
		border: 1px solid var(--grey-light);
		background: var(--surface);
		color: var(--grey-dark);
	}
	.resolution-modal__secondary:hover { background: var(--grey-lighter); }
	.resolution-modal__primary:focus-visible,
	.resolution-modal__secondary:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }
	.resolution-success { text-align: center; }
	.resolution-success__icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		margin: 0 auto var(--space-4);
		border-radius: var(--radius-full);
		background: var(--teal-50);
		color: var(--teal-700);
	}
	.resolution-success p {
		margin-top: var(--space-2);
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--grey-muted);
	}
	.resolution-success .resolution-modal__primary { margin-top: var(--space-5); }

	/* ── Responsive ── */
	@media (max-width: 1100px) {
		.detalle-body { grid-template-columns: 1fr; }
		.info-strip { grid-template-columns: 1fr; }
		.info-group + .info-group { border-left: none; border-top: 1px solid var(--border); padding-left: 0; }
		.stat-cards { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
	}
	@media (max-width: 700px) {
		.subheader { height: auto; padding: var(--space-4) 0; flex-wrap: wrap; }
		.notif-card__actions { flex-direction: column; align-items: stretch; }
		.btn-eliminar, .btn-resolver { min-width: 0; }
		.resolution-modal__actions { flex-direction: column-reverse; }
		.resolution-modal__primary, .resolution-modal__secondary { width: 100%; }
	}
</style>
