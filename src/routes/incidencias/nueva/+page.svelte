<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { trips, STATE_LABELS } from '$lib/data/trips';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	const activeTrips = trips.filter(t => t.estado !== 'en-retorno');
	const preselectedId = $page.url.searchParams.get('viaje') ?? '';

	type IncidentTipo = 'accidente' | 'falla-mecanica' | 'bloqueo' | 'problema-documental' | 'demora-frontera' | 'saturacion-descarga' | 'observado-por-calidad';

	interface TipoOption {
		value: IncidentTipo;
		label: string;
		descripcion: string;
		icon: string;
		/** ¿Aplica a un incidente global? Las averías y los documentos son
		 *  propios de una unidad o un despacho, no de la red. */
		global: boolean;
	}

	const TIPOS: TipoOption[] = [
		{ value: 'accidente',           label: 'Accidente',              icon: 'report',            global: true,  descripcion: 'Colisión, volcamiento u otro evento que afecte la seguridad del vehículo o la carga' },
		{ value: 'falla-mecanica',      label: 'Falla mecánica',         icon: 'build',             global: false, descripcion: 'Avería del vehículo que impide o limita su operación normal' },
		{ value: 'bloqueo',             label: 'Bloqueo',                icon: 'block',             global: true,  descripcion: 'Carretera bloqueada por manifestaciones, derrumbes u otros obstáculos' },
		{ value: 'problema-documental', label: 'Problema documental',    icon: 'news',              global: false, descripcion: 'Documentos incompletos, vencidos o retenidos en aduana o control' },
		{ value: 'observado-por-calidad', label: 'Observado por calidad', icon: 'thumb_down',       global: false, descripcion: 'Carga observada por personal aduanero' },
		{ value: 'demora-frontera',     label: 'Demora en frontera',     icon: 'schedule',          global: true,  descripcion: 'Tiempo excesivo en trámites aduaneros o filas en paso fronterizo' },
		{ value: 'saturacion-descarga', label: 'Saturación de descarga', icon: 'hand_gesture_off',  global: true,  descripcion: 'Cola o espera prolongada en el punto de descarga por saturación' },
	];

	const preselectedTrip = preselectedId ? activeTrips.find(t => t.id === preselectedId) ?? null : null;

	/** Fecha-hora local (evita el desfase de un día que introduce UTC). */
	function localDatetimeStr() {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	}

	let form = $state({
		global:        false,
		tripId:        preselectedId,
		tipo:          '' as IncidentTipo | '',
		descripcion:   '',
		ubicacion:     preselectedTrip?.ultimaUbicacion ?? '',
		fechaHora:     localDatetimeStr(),
	});

	let submitted = $state(false);
	let saving = $state(false);
	let registrada = $state(false);

	const selectedTrip = $derived(
		!form.global && form.tripId ? activeTrips.find(t => t.id === form.tripId) ?? null : null
	);

	const selectedTipo = $derived(
		form.tipo ? TIPOS.find(t => t.value === form.tipo) ?? null : null
	);

	// Un incidente global afecta a la red, no a una unidad: sólo se ofrecen los
	// tipos que tienen sentido sin un despacho detrás.
	const tiposDisponibles = $derived(form.global ? TIPOS.filter(t => t.global) : TIPOS);

	// Al activar "global" se descarta lo que ya no aplica: el viaje elegido y un
	// tipo que sólo existe a nivel de unidad.
	$effect(() => {
		if (!form.global) return;
		if (form.tipo && !TIPOS.find(t => t.value === form.tipo)?.global) form.tipo = '';
	});

	type FormField = 'tripId' | 'tipo' | 'descripcion' | 'ubicacion' | 'fechaHora';

	const errors = $derived<Partial<Record<FormField, string>>>({
		...(submitted && !form.global && !form.tripId ? { tripId:      'Selecciona el viaje afectado' } : {}),
		...(submitted && !form.tipo                   ? { tipo:        'Selecciona el tipo de incidencia' } : {}),
		...(submitted && !form.descripcion.trim()     ? { descripcion: 'Describe la incidencia con detalle' } : {}),
		...(submitted && !form.ubicacion.trim()       ? { ubicacion:   'Indica la ubicación donde ocurrió' } : {}),
		...(submitted && !form.fechaHora              ? { fechaHora:   'Indica la fecha y hora de la incidencia' } : {}),
	});

	// Enfoca el primer campo inválido tras un envío fallido.
	$effect(() => {
		if (submitted && !registrada && Object.keys(errors).length > 0) {
			document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(errors).length > 0) return;
		saving = true;
		await new Promise(r => setTimeout(r, 700));
		saving = false;
		registrada = true;
	}

	// Al salir se vuelve al origen: al viaje si el formulario se abrió desde su
	// ficha (?viaje=id), o al dashboard si se abrió desde la sección Incidencias.
	const origenHref = preselectedId ? `/viajes/${preselectedId}` : '/';
	function handleCancel() { goto(origenHref); }
	function closeConfirmacion() { goto(origenHref); }

	function onTipoSelect(value: IncidentTipo) {
		form.tipo = value;
		if (selectedTrip && !form.ubicacion) form.ubicacion = selectedTrip.ultimaUbicacion;
	}

	function onTripSelect() {
		if (selectedTrip && !form.ubicacion) form.ubicacion = selectedTrip.ultimaUbicacion;
	}

	const fechaLegible = $derived(
		form.fechaHora
			? new Date(form.fechaHora).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })
			: '—'
	);
</script>

<div class="inc-page">
	<!-- ── Encabezado ── -->
	<header class="subheader">
		<a href={origenHref} class="subheader__back">
			<span class="icon icon--sm" aria-hidden="true">arrow_back</span>
			Volver
		</a>
		<div class="subheader__center">
			<h1 class="subheader__title">Registrar incidencia</h1>
			<p class="subheader__subtitle">Documenta y notifica una incidencia para el seguimiento operativo.</p>
		</div>
		<button type="button" class="subheader__close" onclick={handleCancel}>
			Cerrar
			<span class="icon icon--sm" aria-hidden="true">close</span>
		</button>
	</header>

	<form class="inc-form" onsubmit={handleSubmit} novalidate aria-label="Formulario de incidencia">
		<div class="inc-layout">
			<div class="inc-main">

				<!-- ── Viaje afectado ── -->
				<fieldset class="card" class:card--error={submitted && errors.tripId}>
					<legend class="card__legend">
						<span class="icon icon--sm card__legend-icon" aria-hidden="true">route</span>
						Viaje afectado
					</legend>

					<!-- Incidente global: afecta a la red (una frontera, una ruta, una
					     planta), no a un despacho concreto. -->
					<label class="toggle-row">
						<input type="checkbox" class="sr-only toggle__input" bind:checked={form.global} />
						<span class="toggle" aria-hidden="true"><span class="toggle__thumb"></span></span>
						<span class="icon icon--sm toggle-row__icon" aria-hidden="true">south_america</span>
						<span class="toggle-row__label">Registrar un incidente global</span>
					</label>

					{#if !form.global}
						<div class="field" class:field--error={errors.tripId}>
							<label class="field__label" for="tripId">
								Selecciona el viaje (despacho correlativo) <span class="field__req" aria-hidden="true">*</span>
							</label>
							<div class="select-wrap">
								<span class="icon icon--sm select-wrap__lead" aria-hidden="true">search</span>
								<select
									id="tripId"
									class="select-wrap__select"
									bind:value={form.tripId}
									onchange={onTripSelect}
									aria-required="true"
									aria-invalid={!!errors.tripId}
								>
									<option value="">Seleccionar viaje activo…</option>
									{#each activeTrips as trip}
										<option value={trip.id}>
											{trip.id} · {trip.placa} - {trip.origen} → {trip.destino} ({STATE_LABELS[trip.estado]})
										</option>
									{/each}
								</select>
								<span class="icon icon--sm select-wrap__caret" aria-hidden="true">keyboard_arrow_down</span>
							</div>
							{#if errors.tripId}
								<p class="field__error" role="alert">{errors.tripId}</p>
							{/if}
						</div>

						{#if selectedTrip}
							<div class="trip-detail" aria-label="Detalle del viaje seleccionado">
								<div class="trip-detail__row">
									<span class="trip-chip">
										<span class="icon icon--sm" aria-hidden="true">route</span>
										{selectedTrip.id}
									</span>
									<span class="trip-chip">
										<span class="icon icon--sm" aria-hidden="true">local_shipping</span>
										{selectedTrip.placa}
									</span>
									<span class="trip-detail__badge">
										<StatusBadge estado={selectedTrip.estado} size="sm" />
									</span>
								</div>
								<p class="trip-detail__route">
									{selectedTrip.origen}
									<span class="trip-detail__arrow" aria-hidden="true">→</span>
									{selectedTrip.destino}
								</p>
								<div class="trip-detail__meta">
									<span>
										<span class="icon icon--sm" aria-hidden="true">schedule</span>
										Última actualización {selectedTrip.ultimaActualizacion}
									</span>
									<span>
										<span class="icon icon--sm" aria-hidden="true">location_on</span>
										{selectedTrip.ultimaUbicacion}
									</span>
								</div>
							</div>
						{/if}
					{/if}
				</fieldset>

				<!-- ── Tipo de incidencia ── -->
				<fieldset class="card" class:card--error={submitted && errors.tipo}>
					<legend class="card__legend">
						<span class="icon icon--sm card__legend-icon" aria-hidden="true">warning</span>
						Tipo de incidencia <span class="field__req" aria-hidden="true">*</span>
					</legend>

					<div class="type-list" role="radiogroup" aria-label="Tipo de incidencia">
						{#each tiposDisponibles as t (t.value)}
							<label class="type-card" class:type-card--selected={form.tipo === t.value}>
								<input
									type="radio"
									name="tipo"
									value={t.value}
									bind:group={form.tipo}
									onchange={() => onTipoSelect(t.value)}
									class="sr-only type-card__input"
									aria-label={t.label}
								/>
								<span class="type-card__icon" aria-hidden="true">
									<span class="icon icon--sm">{t.icon}</span>
								</span>
								<span class="type-card__body">
									<span class="type-card__title">{t.label}</span>
									<span class="type-card__desc">{t.descripcion}</span>
								</span>
								<span class="type-card__radio" aria-hidden="true"></span>
							</label>
						{/each}
					</div>

					{#if errors.tipo}
						<p class="field__error" role="alert">{errors.tipo}</p>
					{/if}
				</fieldset>

				<!-- ── Detalle ── -->
				<fieldset class="card">
					<legend class="card__legend">
						<span class="icon icon--sm card__legend-icon" aria-hidden="true">info</span>
						Detalle
					</legend>

					<!-- El título lo define el tipo elegido: un campo libre acabaría
					     produciendo nombres distintos para la misma incidencia. -->
					<div class="field">
						<span class="field__label">Título</span>
						{#if selectedTipo}
							<p class="field__readonly">
								<span class="icon icon--sm" aria-hidden="true">{selectedTipo.icon}</span>
								{selectedTipo.label}
							</p>
						{:else}
							<p class="field__readonly field__readonly--empty">Seleccionar en el tipo de incidencia</p>
						{/if}
					</div>

					<div class="field" class:field--error={errors.descripcion}>
						<label class="field__label" for="descripcion">
							Descripción detallada <span class="field__req" aria-hidden="true">*</span>
						</label>
						<textarea
							id="descripcion"
							class="field__textarea"
							placeholder="Describa qué ocurrió, circunstancias, personas involucradas, daños o retrasos observados…"
							bind:value={form.descripcion}
							rows="4"
							aria-required="true"
							aria-invalid={!!errors.descripcion}
						></textarea>
						{#if errors.descripcion}
							<p class="field__error" role="alert">{errors.descripcion}</p>
						{/if}
					</div>

					<div class="field-row">
						<div class="field" class:field--error={errors.ubicacion}>
							<label class="field__label" for="ubicacion">
								Ubicación de la incidencia <span class="field__req" aria-hidden="true">*</span>
							</label>
							<input
								id="ubicacion"
								type="text"
								class="field__input"
								placeholder="Ingresar ubicación de la incidencia"
								bind:value={form.ubicacion}
								aria-required="true"
								aria-invalid={!!errors.ubicacion}
							/>
							{#if errors.ubicacion}
								<p class="field__error" role="alert">{errors.ubicacion}</p>
							{/if}
						</div>

						<div class="field" class:field--error={errors.fechaHora}>
							<label class="field__label" for="fechaHora">
								Fecha y hora <span class="field__req" aria-hidden="true">*</span>
							</label>
							<input
								id="fechaHora"
								type="datetime-local"
								class="field__input"
								bind:value={form.fechaHora}
								aria-required="true"
								aria-invalid={!!errors.fechaHora}
							/>
							{#if errors.fechaHora}
								<p class="field__error" role="alert">{errors.fechaHora}</p>
							{/if}
						</div>
					</div>
				</fieldset>

			</div>

			<!-- ── Resumen ── -->
			<aside class="inc-side" aria-label="Resumen de la incidencia">
				<div class="summary">
					<h2 class="summary__title">Resumen</h2>

					<dl class="summary__list">
						<div class="summary__row">
							<dt>Viaje</dt>
							<dd>
								{#if form.global}
									<span class="summary__pill">
										<span class="icon icon--sm" aria-hidden="true">south_america</span>
										Incidente global
									</span>
								{:else if selectedTrip}
									<span class="trip-chip">
										<span class="icon icon--sm" aria-hidden="true">route</span>
										{selectedTrip.id}
									</span>
									<span class="summary__route">
										{selectedTrip.origen}
										<span aria-hidden="true">→</span>
										{selectedTrip.destino}
									</span>
								{:else}
									<span class="summary__empty">Sin seleccionar</span>
								{/if}
							</dd>
						</div>

						<div class="summary__row">
							<dt>Tipo</dt>
							<dd>
								{#if selectedTipo}
									<span class="summary__pill">
										<span class="icon icon--sm" aria-hidden="true">{selectedTipo.icon}</span>
										{selectedTipo.label}
									</span>
								{:else}
									<span class="summary__empty">Sin seleccionar</span>
								{/if}
							</dd>
						</div>

						<div class="summary__row">
							<dt>Ubicación</dt>
							<dd>
								{#if form.ubicacion}
									<span class="summary__pill">
										<span class="icon icon--sm" aria-hidden="true">location_on</span>
										{form.ubicacion}
									</span>
								{:else}
									<span class="summary__empty">Sin indicar</span>
								{/if}
							</dd>
						</div>

						<div class="summary__row">
							<dt>Fecha</dt>
							<dd><span class="summary__value">{fechaLegible}</span></dd>
						</div>
					</dl>

					{#if submitted && Object.keys(errors).length > 0}
						<div class="summary__validation" role="alert">
							<span class="icon icon--sm" aria-hidden="true">warning</span>
							{Object.keys(errors).length} campo{Object.keys(errors).length > 1 ? 's' : ''} requerido{Object.keys(errors).length > 1 ? 's' : ''} sin completar.
						</div>
					{/if}
				</div>

				<p class="required-note">Campos obligatorios marcados con <span aria-hidden="true">*</span></p>
			</aside>
		</div>

		<!-- ── Pie de acciones ── -->
		<footer class="inc-footer">
			<button type="button" class="btn-ghost" onclick={handleCancel}>Cancelar</button>
			<button type="submit" class="btn-primary" disabled={saving} aria-busy={saving}>
				{#if saving}
					<span class="spinner" aria-hidden="true"></span>
					Registrando…
				{:else}
					Registrar incidencia
				{/if}
			</button>
		</footer>
	</form>
</div>

<!-- ── Confirmación ── -->
{#if registrada}
	<div class="modal-backdrop" role="presentation">
		<div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
			<div class="confirm-success" aria-live="polite">
				<div class="confirm-success__icon" aria-hidden="true">
					<span class="icon">check</span>
				</div>
				<h2 id="confirm-title">La incidencia se registró</h2>
				<p>
					{#if form.global}
						Se registró un incidente global de tipo «{selectedTipo?.label}» en {form.ubicacion}.
					{:else}
						Se registró la incidencia «{selectedTipo?.label}» en el despacho {selectedTrip?.id}.
					{/if}
					Se notificó al coordinador de turno.
				</p>
				<button class="btn-primary" type="button" onclick={closeConfirmacion}>Cerrar</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.inc-page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		padding-bottom: var(--space-12);
	}

	/* ── Encabezado (mismo patrón que la página de detalle) ── */
	.subheader {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-4) 0;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
	}
	.subheader__back,
	.subheader__close {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-dark);
		cursor: pointer;
	}
	.subheader__back:hover,
	.subheader__close:hover { color: var(--blue-dark); }
	.subheader__back:focus-visible,
	.subheader__close:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; border-radius: 3px; }

	.subheader__center { text-align: center; min-width: 0; }
	.subheader__title {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--grey-darker);
	}
	.subheader__subtitle {
		margin-top: 2px;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
	}

	/* ── Layout ── */
	.inc-form { flex: 1; display: flex; flex-direction: column; }
	.inc-layout {
		display: grid;
		grid-template-columns: 1fr 360px;
		gap: var(--space-6);
		align-items: start;
		padding-top: var(--space-6);
	}
	.inc-main {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.inc-side {
		position: sticky;
		top: 104px;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	/* ── Tarjetas de sección ── */
	.card {
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: var(--surface);
		padding: var(--space-5) var(--space-6) var(--space-6);
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		box-shadow: var(--shadow-elev);
	}
	.card--error { border-color: var(--error-ink); }
	.card__legend {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		float: left;
		width: 100%;
		padding: 0;
		margin-bottom: var(--space-2);
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--grey-darker);
	}
	.card__legend-icon { color: var(--blue-dark); }

	/* ── Interruptor de incidente global ── */
	.toggle-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		cursor: pointer;
		width: fit-content;
	}
	.toggle {
		position: relative;
		width: 45px;
		height: 29px;
		flex-shrink: 0;
		border-radius: var(--radius-full);
		background: var(--grey-light);
		transition: background var(--duration-fast) var(--ease-out-quart);
	}
	.toggle__thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 23px;
		height: 23px;
		border-radius: 50%;
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		transition: transform var(--duration-fast) var(--ease-out-quart);
	}
	.toggle__input:checked + .toggle { background: var(--success-ink, #2f9e6b); }
	.toggle__input:checked + .toggle .toggle__thumb { transform: translateX(16px); }
	.toggle__input:focus-visible + .toggle { outline: 2px solid var(--blue-dark); outline-offset: 2px; }
	.toggle-row__icon { color: var(--grey-darker); }
	.toggle-row__label { font-size: var(--text-sm); font-weight: 500; color: var(--grey-dark); }

	/* ── Campos ── */
	.field { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
	.field__label { font-size: var(--text-sm); font-weight: 700; color: var(--grey-dark); }
	.field__req { color: var(--error-ink); }

	.field-row { display: flex; gap: var(--space-4); }
	.field-row > * { flex: 1; min-width: 0; }

	.field__input,
	.field__textarea {
		width: 100%;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--grey-light);
		border-radius: var(--radius-md);
		background: var(--surface);
		font: inherit;
		font-size: var(--text-sm);
		color: var(--grey-darker);
	}
	.field__textarea { resize: vertical; min-height: 120px; line-height: 1.5; }
	.field__input::placeholder,
	.field__textarea::placeholder { color: var(--grey-muted); }
	.field__input:focus,
	.field__textarea:focus { outline: 2px solid var(--blue-dark); outline-offset: 1px; border-color: var(--blue-dark); }
	.field--error .field__input,
	.field--error .field__textarea { border-color: var(--error-ink); }

	/* Título derivado del tipo: se muestra, no se escribe. */
	.field__readonly {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 40px;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--grey-darker);
	}
	.field__readonly .icon { color: var(--blue-dark); }
	.field__readonly--empty { font-weight: 500; color: var(--grey-muted); }

	.field__error {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--error-ink);
	}

	/* ── Selector de viaje ── */
	.select-wrap { position: relative; display: flex; align-items: center; }
	.select-wrap__lead {
		position: absolute;
		left: var(--space-4);
		color: var(--grey-muted);
		pointer-events: none;
	}
	.select-wrap__caret {
		position: absolute;
		right: var(--space-3);
		color: var(--grey-normal);
		pointer-events: none;
	}
	.select-wrap__select {
		width: 100%;
		height: 48px;
		padding: 0 44px 0 44px;
		border: 1px solid var(--grey-light);
		border-radius: var(--radius-md);
		background: var(--surface);
		font: inherit;
		font-size: var(--text-sm);
		color: var(--grey-darker);
		appearance: none;
		cursor: pointer;
	}
	.select-wrap__select:focus { outline: 2px solid var(--blue-dark); outline-offset: 1px; border-color: var(--blue-dark); }
	.field--error .select-wrap__select { border-color: var(--error-ink); }

	/* ── Tarjeta del viaje seleccionado ── */
	.trip-detail {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.trip-detail__row { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
	.trip-detail__badge { margin-left: auto; }
	.trip-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: var(--radius-md);
		background: var(--grey-lighter, var(--surface-2));
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--grey-darker);
	}
	.trip-chip .icon { color: var(--grey-normal); }
	.trip-detail__route {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 500;
		color: var(--grey-dark);
		letter-spacing: -0.01em;
	}
	.trip-detail__arrow { color: var(--grey-muted); margin: 0 4px; }
	.trip-detail__meta { display: flex; flex-wrap: wrap; gap: var(--space-4); }
	.trip-detail__meta span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--grey-muted);
	}

	/* ── Tipos de incidencia ── */
	.type-list { display: flex; flex-direction: column; gap: var(--space-3); }
	.type-card {
		display: grid;
		grid-template-columns: 36px 1fr 24px;
		align-items: center;
		column-gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--grey-light);
		border-radius: var(--radius-lg);
		background: var(--surface);
		cursor: pointer;
		transition:
			border-color var(--duration-fast) var(--ease-out-quart),
			background var(--duration-fast) var(--ease-out-quart);
	}
	.type-card:hover { border-color: var(--blue-normal); }
	.type-card:has(.type-card__input:focus-visible) { outline: 2px solid var(--blue-dark); outline-offset: 2px; }
	.type-card--selected { border-color: var(--blue-dark); background: var(--blue-lighter, var(--teal-50)); }

	.type-card__icon {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		background: var(--surface-2);
		color: var(--grey-normal);
	}
	.type-card--selected .type-card__icon { background: var(--surface); color: var(--blue-dark); }

	.type-card__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
	.type-card__title { font-size: var(--text-sm); font-weight: 700; color: var(--grey-darker); }
	.type-card__desc { font-size: var(--text-sm); font-weight: 500; color: var(--grey-muted); line-height: 1.45; }

	.type-card__radio {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid var(--grey-light);
		background: var(--surface);
	}
	.type-card--selected .type-card__radio {
		border-color: var(--blue-dark);
		background:
			radial-gradient(circle, var(--blue-dark) 0 45%, transparent 46%);
	}

	/* ── Resumen ── */
	.summary {
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: var(--surface);
		padding: var(--space-5) var(--space-6);
		box-shadow: var(--shadow-elev);
	}
	.summary__title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 500;
		color: var(--grey-darker);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--border);
	}
	.summary__list { display: flex; flex-direction: column; gap: var(--space-4); padding-top: var(--space-4); }
	.summary__row { display: flex; flex-direction: column; gap: 6px; }
	.summary__row dt { font-size: var(--text-sm); font-weight: 500; color: var(--grey-muted); }
	.summary__row dd { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
	.summary__pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--grey-darker);
	}
	.summary__pill .icon { color: var(--blue-dark); }
	.summary__value { font-size: var(--text-sm); font-weight: 700; color: var(--grey-darker); }
	.summary__route { font-size: var(--text-sm); font-weight: 500; color: var(--grey-dark); }
	.summary__empty { font-size: var(--text-sm); font-weight: 700; color: var(--grey-muted); }

	.summary__validation {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-4);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		background: var(--error-bg);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--error-ink);
	}

	.required-note { font-size: var(--text-sm); font-weight: 500; color: var(--grey-muted); text-align: center; }

	/* ── Pie: las acciones quedan siempre a la vista, sin importar el
	   desplazamiento dentro del formulario. ── */
	.inc-footer {
		position: sticky;
		bottom: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		margin-top: var(--space-6);
		padding: var(--space-4) 0;
		border-top: 1px solid var(--border);
		background: var(--bg);
	}
	.btn-ghost,
	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: 40px;
		padding: 0 var(--space-6);
		border-radius: var(--radius-lg);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 700;
		letter-spacing: 0.01em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.btn-ghost { border: 1px solid var(--grey-light); background: var(--surface); color: var(--grey-dark); }
	.btn-ghost:hover { background: var(--grey-lighter, var(--surface-2)); }
	.btn-primary { border: 0; background: var(--color-primary); color: var(--color-on-primary); }
	.btn-primary:hover { background: var(--color-primary-hover); }
	.btn-primary:disabled { opacity: 0.7; cursor: progress; }
	.btn-ghost:focus-visible,
	.btn-primary:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid color-mix(in oklch, var(--color-on-primary) 30%, transparent);
		border-top-color: var(--color-on-primary);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }

	/* ── Confirmación ── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--z-modal);
		display: grid;
		place-items: center;
		padding: var(--space-4);
		background: var(--backdrop);
	}
	.confirm-modal {
		width: min(100%, 520px);
		background: var(--surface);
		border-radius: var(--radius-xl);
		padding: var(--space-6);
		box-shadow: var(--shadow-overlay);
	}
	.confirm-success { text-align: center; }
	.confirm-success__icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		margin: 0 auto var(--space-4);
		border-radius: var(--radius-full);
		background: var(--teal-50);
		color: var(--teal-700);
	}
	.confirm-success h2 {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 500;
		color: var(--grey-darker);
		letter-spacing: -0.02em;
	}
	.confirm-success p {
		margin-top: var(--space-2);
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--grey-muted);
	}
	.confirm-success .btn-primary { margin-top: var(--space-5); }

	/* ── Responsive ── */
	@media (max-width: 1100px) {
		.inc-layout { grid-template-columns: 1fr; }
		.inc-side { position: static; }
	}
	@media (max-width: 700px) {
		.subheader { flex-wrap: wrap; }
		.subheader__center { order: 3; width: 100%; text-align: left; }
		.field-row { flex-direction: column; }
		.inc-footer { flex-direction: column-reverse; align-items: stretch; }
	}
</style>
