<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import TopNav from '$lib/components/TopNav.svelte';

	let { children } = $props();

	// Detalle del despacho y registro de incidencia traen su propio encabezado
	// (sub-header con Volver / título / Cerrar) y no usan la barra global.
	const SIN_NAV = ['/viajes/[id]', '/incidencias/nueva'];
	const showNav = $derived(!SIN_NAV.includes($page.route.id ?? ''));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>IASA — Monitoreo Logístico</title>
</svelte:head>

<div class="shell" class:shell--no-nav={!showNav}>
	{#if showNav}
		<TopNav />
	{/if}
	<main class="shell__main">
		{@render children()}
	</main>
	<footer class="shell__footer">
		© IASA | Todos los derechos reservados | Diseñado por Giro54
	</footer>
</div>

<style>
	.shell {
		max-width: 1440px;
		margin: 0 auto;
		padding: 0px 40px 0px 40px;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg);
	}
	/* La página de detalle no tiene barra global: su encabezado se pega arriba,
	   por eso no lleva relleno superior en el shell. */
	.shell--no-nav { padding-top: 0; }

	/* Wider desktop tiers: expand the work area progressively without letting
	   the operational surfaces become uncomfortably wide. */
	@media (min-width: 1536px) {
		.shell { max-width: 1536px; }
	}
	@media (min-width: 1728px) {
		.shell { max-width: 1680px; }
	}
	/* Grandes monitores (1920): la superficie de trabajo aprovecha el ancho —
	   mapa, tarjetas y tabla crecen en proporción, manteniendo las 3 columnas. */
	@media (min-width: 1920px) {
		.shell { max-width: 1880px; }
	}

	.shell__main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.shell__footer {
		flex-shrink: 0;
		padding: 30px 0;
		color: var(--grey-muted);
		font-size: var(--text-sm);
		text-align: center;
	}

	@media (max-width: 700px) {
		.shell { padding: var(--space-4) var(--space-4) 0; }
	}
</style>
