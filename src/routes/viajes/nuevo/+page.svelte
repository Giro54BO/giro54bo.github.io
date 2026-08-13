<script lang="ts">
	import { goto } from '$app/navigation';

	// Form state
	let form = $state({
		// Ruta
		origen: '',
		destino: '',
		// Vehículo
		unidad: '',
		// Conductor
		conductor: '',
		conductorTel: '',
		// Transportista
		transportista: '',
		transportistaTel: '',
		// Carga
		carga: '',
		pesoCarga: '',
		// Tiempos
		fechaSalida: '',
		horaEstimadaLlegada: '',
		// Notas
		notas: '',
	});

	let submitted = $state(false);
	let saving = $state(false);

	const CIUDADES = [
		'Guayaquil', 'Quito', 'Cuenca', 'Manta', 'Ibarra', 'Ambato',
		'Esmeraldas', 'Quevedo', 'Riobamba', 'Loja', 'Santo Domingo',
		'Tulcán', 'Huaquillas', 'Lago Agrio',
		'Bogotá', 'Cali', 'Medellín',
		'Lima', 'Piura', 'Chiclayo',
		'Santiago', 'Buenos Aires',
	];

	const TRANSPORTISTAS = [
		'Transnacional S.A.',
		'Flota Imbabura',
		'Cargaexpress Cía.',
		'LogiSur S.A.',
	];

	type FieldKey = keyof typeof form;

	const errors = $derived<Partial<Record<FieldKey, string>>>({
		...(submitted && !form.origen       ? { origen: 'Selecciona la ciudad de origen' } : {}),
		...(submitted && !form.destino      ? { destino: 'Selecciona la ciudad de destino' } : {}),
		...(submitted && form.origen && form.destino && form.origen === form.destino
			? { destino: 'El destino debe ser diferente al origen' } : {}),
		...(submitted && !form.unidad       ? { unidad: 'Ingresa la placa del vehículo' } : {}),
		...(submitted && !form.conductor    ? { conductor: 'Ingresa el nombre del conductor' } : {}),
		...(submitted && !form.transportista ? { transportista: 'Selecciona la transportista' } : {}),
		...(submitted && !form.carga        ? { carga: 'Describe la carga' } : {}),
		...(submitted && !form.fechaSalida  ? { fechaSalida: 'Indica la fecha de salida' } : {}),
	});

	const isValid = $derived(Object.keys(errors).length === 0 && submitted);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (Object.keys(errors).length > 0) return;

		saving = true;
		// Simulate save delay
		await new Promise(r => setTimeout(r, 800));
		saving = false;
		goto('/');
	}

	function handleCancel() {
		goto('/');
	}

	// Local date (avoids UTC off-by-one at end of day in Ecuador UTC-5)
	function localDateStr() {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
	}
	const today = localDateStr();

	// Focus first invalid field after failed submission
	$effect(() => {
		if (submitted && Object.keys(errors).length > 0) {
			const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
			el?.focus();
		}
	});
</script>

<div class="page">
	<!-- Header -->
	<header class="page-header">
		<div class="page-header__top">
			<a href="/" class="back-link" aria-label="Volver al dashboard">
				<span class="icon icon--sm" aria-hidden="true">arrow_back</span>
				Dashboard
			</a>
		</div>
		<div class="page-header__body">
			<div>
				<h1 class="page-header__title">Nuevo viaje</h1>
				<p class="page-header__subtitle">Completa los datos del viaje para registrarlo en el sistema</p>
			</div>
		</div>
	</header>

	<!-- Form -->
	<form class="form-body" onsubmit={handleSubmit} novalidate aria-label="Formulario de nuevo viaje">
		<div class="form-layout">

			<!-- Main column -->
			<div class="form-main">

				<!-- Ruta -->
				<fieldset class="form-section">
					<legend class="form-section__legend">
						<span class="form-section__icon" aria-hidden="true">
							<span class="icon icon--sm">route</span>
						</span>
						Ruta
					</legend>
					<div class="form-row form-row--2col">
						<div class="field" class:field--error={errors.origen}>
							<label class="field__label" for="origen">
								Ciudad de origen <span class="field__required" aria-hidden="true">*</span>
							</label>
							<div class="field__select-wrap">
								<select
									id="origen"
									class="field__select"
									bind:value={form.origen}
									aria-required="true"
									aria-describedby={errors.origen ? 'origen-error' : undefined}
									aria-invalid={!!errors.origen}
								>
									<option value="">Seleccionar ciudad…</option>
									{#each CIUDADES as ciudad}
										<option value={ciudad}>{ciudad}</option>
									{/each}
								</select>
								<span class="icon icon--sm field__select-arrow" aria-hidden="true">expand_more</span>
							</div>
							{#if errors.origen}
								<p class="field__error" id="origen-error" role="alert">{errors.origen}</p>
							{/if}
						</div>

						<div class="field" class:field--error={errors.destino}>
							<label class="field__label" for="destino">
								Ciudad de destino <span class="field__required" aria-hidden="true">*</span>
							</label>
							<div class="field__select-wrap">
								<select
									id="destino"
									class="field__select"
									bind:value={form.destino}
									aria-required="true"
									aria-describedby={errors.destino ? 'destino-error' : undefined}
									aria-invalid={!!errors.destino}
								>
									<option value="">Seleccionar ciudad…</option>
									{#each CIUDADES as ciudad}
										<option value={ciudad}>{ciudad}</option>
									{/each}
								</select>
								<span class="icon icon--sm field__select-arrow" aria-hidden="true">expand_more</span>
							</div>
							{#if errors.destino}
								<p class="field__error" id="destino-error" role="alert">{errors.destino}</p>
							{/if}
						</div>
					</div>

					{#if form.origen && form.destino && form.origen !== form.destino}
						<div class="route-preview" aria-live="polite">
							<span class="route-preview__city">{form.origen}</span>
							<span class="icon icon--sm" aria-hidden="true">arrow_forward</span>
							<span class="route-preview__city route-preview__city--dest">{form.destino}</span>
						</div>
					{/if}
				</fieldset>

				<!-- Vehículo -->
				<fieldset class="form-section">
					<legend class="form-section__legend">
						<span class="form-section__icon" aria-hidden="true">
							<span class="icon icon--sm">local_shipping</span>
						</span>
						Vehículo
					</legend>
					<div class="form-row form-row--2col">
						<div class="field" class:field--error={errors.unidad}>
							<label class="field__label" for="unidad">
								Placa del vehículo <span class="field__required" aria-hidden="true">*</span>
							</label>
							<input
								id="unidad"
								type="text"
								class="field__input"
								placeholder="Ej. GYQ-8821"
								bind:value={form.unidad}
								aria-required="true"
								aria-describedby={errors.unidad ? 'unidad-error' : undefined}
								aria-invalid={!!errors.unidad}
								autocomplete="off"
								style="text-transform: uppercase;"
							/>
							{#if errors.unidad}
								<p class="field__error" id="unidad-error" role="alert">{errors.unidad}</p>
							{/if}
						</div>
					</div>
				</fieldset>

				<!-- Conductor -->
				<fieldset class="form-section">
					<legend class="form-section__legend">
						<span class="form-section__icon" aria-hidden="true">
							<span class="icon icon--sm">person</span>
						</span>
						Conductor
					</legend>
					<div class="form-row form-row--2col">
						<div class="field" class:field--error={errors.conductor}>
							<label class="field__label" for="conductor">
								Nombre completo <span class="field__required" aria-hidden="true">*</span>
							</label>
							<input
								id="conductor"
								type="text"
								class="field__input"
								placeholder="Ej. Carlos Morales"
								bind:value={form.conductor}
								aria-required="true"
								aria-describedby={errors.conductor ? 'conductor-error' : undefined}
								aria-invalid={!!errors.conductor}
								autocomplete="name"
							/>
							{#if errors.conductor}
								<p class="field__error" id="conductor-error" role="alert">{errors.conductor}</p>
							{/if}
						</div>

						<div class="field">
							<label class="field__label" for="conductorTel">
								Teléfono
							</label>
							<input
								id="conductorTel"
								type="tel"
								class="field__input"
								placeholder="+593 99 000 0000"
								bind:value={form.conductorTel}
								autocomplete="tel"
							/>
						</div>
					</div>
				</fieldset>

				<!-- Transportista -->
				<fieldset class="form-section">
					<legend class="form-section__legend">
						<span class="form-section__icon" aria-hidden="true">
							<span class="icon icon--sm">business</span>
						</span>
						Transportista
					</legend>
					<div class="form-row form-row--2col">
						<div class="field" class:field--error={errors.transportista}>
							<label class="field__label" for="transportista">
								Empresa <span class="field__required" aria-hidden="true">*</span>
							</label>
							<div class="field__select-wrap">
								<select
									id="transportista"
									class="field__select"
									bind:value={form.transportista}
									aria-required="true"
									aria-describedby={errors.transportista ? 'transportista-error' : undefined}
									aria-invalid={!!errors.transportista}
								>
									<option value="">Seleccionar empresa…</option>
									{#each TRANSPORTISTAS as t}
										<option value={t}>{t}</option>
									{/each}
									<option value="otra">Otra empresa…</option>
								</select>
								<span class="icon icon--sm field__select-arrow" aria-hidden="true">expand_more</span>
							</div>
							{#if errors.transportista}
								<p class="field__error" id="transportista-error" role="alert">{errors.transportista}</p>
							{/if}
						</div>

						<div class="field">
							<label class="field__label" for="transportistaTel">
								Teléfono de contacto
							</label>
							<input
								id="transportistaTel"
								type="tel"
								class="field__input"
								placeholder="+593 2 000 0000"
								bind:value={form.transportistaTel}
								autocomplete="tel"
							/>
						</div>
					</div>
				</fieldset>

				<!-- Carga -->
				<fieldset class="form-section">
					<legend class="form-section__legend">
						<span class="form-section__icon" aria-hidden="true">
							<span class="icon icon--sm">inventory_2</span>
						</span>
						Carga
					</legend>
					<div class="form-row">
						<div class="field" class:field--error={errors.carga}>
							<label class="field__label" for="carga">
								Descripción de la carga <span class="field__required" aria-hidden="true">*</span>
							</label>
							<input
								id="carga"
								type="text"
								class="field__input"
								placeholder="Ej. Aceite de palma refinado, productos alimenticios…"
								bind:value={form.carga}
								aria-required="true"
								aria-describedby={errors.carga ? 'carga-error' : undefined}
								aria-invalid={!!errors.carga}
							/>
							{#if errors.carga}
								<p class="field__error" id="carga-error" role="alert">{errors.carga}</p>
							{/if}
						</div>
					</div>
					<div class="form-row form-row--2col">
						<div class="field">
							<label class="field__label" for="pesoCarga">
								Peso estimado (kg)
							</label>
							<input
								id="pesoCarga"
								type="number"
								class="field__input"
								placeholder="Ej. 28500"
								bind:value={form.pesoCarga}
								min="0"
								max="50000"
							/>
						</div>
					</div>
				</fieldset>

				<!-- Tiempos -->
				<fieldset class="form-section">
					<legend class="form-section__legend">
						<span class="form-section__icon" aria-hidden="true">
							<span class="icon icon--sm">schedule</span>
						</span>
						Tiempos
					</legend>
					<div class="form-row form-row--2col">
						<div class="field" class:field--error={errors.fechaSalida}>
							<label class="field__label" for="fechaSalida">
								Fecha y hora de salida <span class="field__required" aria-hidden="true">*</span>
							</label>
							<input
								id="fechaSalida"
								type="datetime-local"
								class="field__input"
								bind:value={form.fechaSalida}
								min={today}
								aria-required="true"
								aria-describedby={errors.fechaSalida ? 'fechaSalida-error' : undefined}
								aria-invalid={!!errors.fechaSalida}
							/>
							{#if errors.fechaSalida}
								<p class="field__error" id="fechaSalida-error" role="alert">{errors.fechaSalida}</p>
							{/if}
						</div>

						<div class="field">
							<label class="field__label" for="horaEstimadaLlegada">
								ETA estimado
							</label>
							<input
								id="horaEstimadaLlegada"
								type="datetime-local"
								class="field__input"
								bind:value={form.horaEstimadaLlegada}
								min={form.fechaSalida || today}
							/>
						</div>
					</div>
				</fieldset>

				<!-- Notas -->
				<fieldset class="form-section">
					<legend class="form-section__legend">
						<span class="form-section__icon" aria-hidden="true">
							<span class="icon icon--sm">description</span>
						</span>
						Notas adicionales
					</legend>
					<div class="form-row">
						<div class="field">
							<label class="field__label" for="notas">
								Instrucciones u observaciones
							</label>
							<textarea
								id="notas"
								class="field__textarea"
								placeholder="Instrucciones especiales de manejo, rutas específicas, contactos en destino…"
								bind:value={form.notas}
								rows="3"
							></textarea>
						</div>
					</div>
				</fieldset>

			</div>

			<!-- Sidebar: resumen -->
			<aside class="form-sidebar" aria-label="Resumen del viaje">
				<div class="summary-card">
					<h2 class="summary-card__title">Resumen</h2>

					<dl class="summary-list">
						<div class="summary-row">
							<dt class="summary-row__label">Ruta</dt>
							<dd class="summary-row__value">
								{#if form.origen && form.destino}
									<span class="summary-route">
										{form.origen}
										<span class="icon icon--sm" aria-hidden="true">arrow_forward</span>
										<span class="summary-route__dest">{form.destino}</span>
									</span>
								{:else}
									<span class="summary-empty">Sin definir</span>
								{/if}
							</dd>
						</div>

						<div class="summary-row">
							<dt class="summary-row__label">Vehículo</dt>
							<dd class="summary-row__value">
								{#if form.unidad}
									<span class="summary-mono">{form.unidad.toUpperCase()}</span>
								{:else}
									<span class="summary-empty">Sin definir</span>
								{/if}
							</dd>
						</div>

						<div class="summary-row">
							<dt class="summary-row__label">Conductor</dt>
							<dd class="summary-row__value">
								{#if form.conductor}
									{form.conductor}
								{:else}
									<span class="summary-empty">Sin definir</span>
								{/if}
							</dd>
						</div>

						<div class="summary-row">
							<dt class="summary-row__label">Transportista</dt>
							<dd class="summary-row__value">
								{#if form.transportista}
									{form.transportista}
								{:else}
									<span class="summary-empty">Sin definir</span>
								{/if}
							</dd>
						</div>

						<div class="summary-row">
							<dt class="summary-row__label">Carga</dt>
							<dd class="summary-row__value">
								{#if form.carga}
									{form.carga}{form.pesoCarga ? ` · ${Number(form.pesoCarga).toLocaleString('es-EC')} kg` : ''}
								{:else}
									<span class="summary-empty">Sin definir</span>
								{/if}
							</dd>
						</div>

						<div class="summary-row">
							<dt class="summary-row__label">Salida</dt>
							<dd class="summary-row__value">
								{#if form.fechaSalida}
									{new Date(form.fechaSalida).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
								{:else}
									<span class="summary-empty">Sin definir</span>
								{/if}
							</dd>
						</div>
					</dl>

					{#if submitted && Object.keys(errors).length > 0}
						<div class="validation-summary" role="alert" aria-live="assertive">
							<span class="icon icon--sm" aria-hidden="true">warning</span>
							<p>Hay {Object.keys(errors).length} campo{Object.keys(errors).length > 1 ? 's' : ''} requerido{Object.keys(errors).length > 1 ? 's' : ''} sin completar.</p>
						</div>
					{/if}
				</div>

				<!-- Required fields note -->
				<p class="required-note">
					<span aria-hidden="true">*</span> Campos obligatorios
				</p>
			</aside>
		</div>

		<!-- Form footer -->
		<footer class="form-footer">
			<button type="button" class="btn btn--ghost" onclick={handleCancel}>
				Cancelar
			</button>
			<button
				type="submit"
				class="btn btn--primary"
				disabled={saving}
				aria-busy={saving}
			>
				{#if saving}
					<span class="spinner" aria-hidden="true"></span>
					Guardando…
				{:else}
					<span class="icon icon--sm" aria-hidden="true">arrow_forward</span>
					Registrar viaje
				{/if}
			</button>
		</footer>
	</form>
</div>

<style>
	/* ── Page ── */
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	/* ── Header ── */
	.page-header {
		background: var(--teal-700);
		padding: var(--space-5) var(--space-8) var(--space-8);
	}

	.page-header__top {
		margin-bottom: var(--space-5);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 500;
		color: oklch(1 0 0 / 0.70);
		transition: color var(--duration-fast) var(--ease-out-quart);
	}
	.back-link:hover { color: white; }
	.back-link:focus-visible { outline: 2px solid oklch(1 0 0 / 0.5); outline-offset: 3px; border-radius: 3px; }

	.page-header__body {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
	}

	.page-header__title {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 300;
		color: white;
		letter-spacing: -0.03em;
	}

	.page-header__subtitle {
		font-size: var(--text-sm);
		color: oklch(1 0 0 / 0.65);
		margin-top: var(--space-1);
	}

	/* ── Form body ── */
	.form-body {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.form-layout {
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 0;
		flex: 1;
		align-items: start;
	}

	.form-main {
		padding: var(--space-8);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		border-right: 1px solid var(--border);
	}

	/* ── Form sections ── */
	.form-section {
		border: none;
		padding: 0;
		margin: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-5) var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-section__legend {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 600;
		font-family: var(--font-body);
		color: var(--ink-2);
		padding: 0;
		margin-bottom: var(--space-1);
		float: left;
		width: 100%;
	}

	.form-section__icon {
		color: var(--teal-700);
		display: flex;
		align-items: center;
	}

	/* ── Form rows ── */
	.form-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-row--2col {
		flex-direction: row;
		gap: var(--space-4);
	}

	.form-row--2col > * { flex: 1; min-width: 0; }

	/* ── Fields ── */
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.field__label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--ink-1);
	}

	.field__required {
		color: var(--status-incidencia-ink);
		margin-left: 2px;
	}

	.field__input,
	.field__select,
	.field__textarea {
		font-family: inherit;
		font-size: var(--text-sm);
		color: var(--ink-1);
		background: var(--surface);
		border: 1px solid var(--border-2);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-3);
		width: 100%;
		transition: border-color var(--duration-fast) var(--ease-out-quart),
		            box-shadow var(--duration-fast) var(--ease-out-quart);
		appearance: none;
	}

	.field__input::placeholder,
	.field__textarea::placeholder {
		color: var(--ink-4);
	}

	.field__input:focus,
	.field__select:focus,
	.field__textarea:focus {
		outline: none;
		border-color: var(--teal-700);
		box-shadow: 0 0 0 3px oklch(0.47 0.07 215 / 0.12);
	}

	.field__textarea {
		resize: vertical;
		line-height: 1.6;
	}

	/* Select custom */
	.field__select-wrap {
		position: relative;
	}

	.field__select {
		padding-right: var(--space-8);
		cursor: pointer;
	}

	.field__select-arrow {
		position: absolute;
		right: var(--space-3);
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--ink-3);
	}

	/* Error state */
	.field--error .field__input,
	.field--error .field__select {
		border-color: var(--status-incidencia-ink);
		box-shadow: 0 0 0 3px oklch(0.55 0.2 25 / 0.10);
	}

	.field__error {
		font-size: var(--text-xs);
		color: var(--status-incidencia-ink);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	/* Route preview */
	.route-preview {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink-1);
		background: var(--teal-50);
		border: 1px solid var(--teal-100);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-full);
	}

	.route-preview .icon { color: var(--teal-600); }
	.route-preview__city--dest { color: var(--teal-700); }

	/* ── Sidebar ── */
	.form-sidebar {
		padding: var(--space-8) var(--space-5);
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.summary-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
	}

	.summary-card__title {
		font-size: var(--text-sm);
		font-weight: 600;
		font-family: var(--font-body);
		color: var(--ink-1);
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border);
	}

	.summary-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.summary-row {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.summary-row__label {
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--ink-3);
	}

	.summary-row__value {
		font-size: var(--text-sm);
		color: var(--ink-1);
		font-weight: 500;
	}

	.summary-route {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
	}

	.summary-route .icon { color: var(--ink-4); }
	.summary-route__dest { color: var(--teal-700); }

	.summary-mono {
		font-family: 'Fira Code', 'Consolas', monospace;
		font-size: var(--text-xs);
		background: var(--surface-2);
		padding: 1px 5px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
	}

	.summary-empty {
		color: var(--ink-4);
		font-style: italic;
		font-weight: 400;
	}

	/* Validation summary */
	.validation-summary {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		background: var(--status-incidencia-bg);
		color: var(--status-incidencia-ink);
		border: 1px solid oklch(0.80 0.10 25);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
		margin-top: var(--space-4);
		font-size: var(--text-sm);
		font-weight: 500;
	}

	.validation-summary .icon { flex-shrink: 0; margin-top: 1px; }

	.required-note {
		font-size: var(--text-xs);
		color: var(--ink-4);
		text-align: center;
	}

	/* ── Footer ── */
	.form-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-8);
		background: var(--surface);
		border-top: 1px solid var(--border);
		position: sticky;
		bottom: 0;
		z-index: var(--z-sticky);
	}

	/* ── Buttons ── */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-5);
		border-radius: var(--radius-lg);
		font-size: var(--text-sm);
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		border: none;
		transition: background var(--duration-fast) var(--ease-out-quart),
		            color var(--duration-fast) var(--ease-out-quart),
		            opacity var(--duration-fast) var(--ease-out-quart);
		white-space: nowrap;
	}

	.btn--primary {
		background: var(--color-primary);
		color: var(--color-on-primary);
		font-weight: 700;
		letter-spacing: 0.01em;
		text-transform: uppercase;
		padding: var(--space-2) var(--space-6);
	}
	.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
	.btn--primary:focus-visible { outline: 3px solid color-mix(in oklch, var(--color-primary) 50%, transparent); outline-offset: 2px; }
	.btn--primary:disabled { opacity: 0.65; cursor: not-allowed; }

	.btn--ghost {
		background: transparent;
		color: var(--ink-2);
	}
	.btn--ghost:hover { background: var(--surface-2); color: var(--ink-1); }
	.btn--ghost:focus-visible { outline: 3px solid color-mix(in oklch, var(--blue-normal) 30%, transparent); outline-offset: 2px; }

	/* Spinner */
	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid color-mix(in oklch, var(--color-on-primary) 30%, transparent);
		border-top-color: var(--color-on-primary);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner { animation: none; opacity: 0.6; }
	}

	/* ── Responsive ── */
	@media (max-width: 900px) {
		.form-layout { grid-template-columns: 1fr; }
		.form-main { border-right: none; border-bottom: 1px solid var(--border); padding: var(--space-6); }
		.form-sidebar { position: static; padding: var(--space-6); }
		.form-row--2col { flex-direction: column; }
	}

	@media (max-width: 600px) {
		.page-header { padding: var(--space-4) var(--space-4) var(--space-6); }
		.form-main { padding: var(--space-4); }
		.form-footer { padding: var(--space-4); }
	}
</style>
