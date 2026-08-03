<script lang="ts">
	import { page } from '$app/stores';
	import logo from '$lib/assets/iasa-logo.png';
	import { alertas } from '$lib/data/trips';

	const alertCount = alertas.length;

	const navItems: { href: string; label: string; icon: string; section: string; badge?: number }[] = [
		{ href: '/dashboard', label: 'Dashboard',   icon: 'grid_view', section: 'dashboard' },
		{ href: '/viajes',    label: 'Viajes',      icon: 'route',      section: 'viajes' },
		{ href: '/incidencias', label: 'Incidencias', icon: 'warning',  section: 'incidencias', badge: alertCount },
	];

	const activeSection = $derived(
		$page.route.id?.startsWith('/dashboard') ? 'dashboard' :
		$page.route.id?.startsWith('/viajes') ? 'viajes' :
		$page.route.id?.startsWith('/incidencias') ? 'incidencias' : ''
	);
</script>

<header class="topnav">
	<a href="/" class="topnav__logo" aria-label="IASA Industrias de Aceite S.A. — Inicio">
		<img src={logo} alt="IASA" />
	</a>

	<nav class="topnav__pill" aria-label="Navegación principal">
		{#each navItems as item}
				{@const active = activeSection === item.section}
			<a
				href={item.href}
				class="topnav__link"
				class:topnav__link--active={active}
				aria-current={active ? 'page' : undefined}
			>
				<span class="icon topnav__link-icon" aria-hidden="true">{item.icon}</span>
				{item.label}
				{#if item.badge}
					<span class="topnav__badge" aria-label="{item.badge} alertas">{item.badge}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<button class="topnav__user" type="button">
		<span class="icon" aria-hidden="true">account_circle</span>
		Orlando Cortez
		<span class="icon" aria-hidden="true">dehaze</span>
	</button>
</header>

<style>
	.topnav {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		height: 75px;
		border-bottom: 1px solid var(--border);
		background: var(--bg);
		flex-shrink: 0;
	}

	.topnav__logo {
		padding-top: var(--space-4);
	}
	.topnav__logo img {
		height: 45px;
		width: auto;
		display: block;
	}

	.topnav__pill {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-4);
		height: 45px;
		padding: 0 var(--space-2);
		background: var(--surface);
		border-radius: var(--radius-full);
		box-shadow: 0 1px 2px oklch(0 0 0 / 0.05);
	}

	.topnav__link {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		height: 37px;
		padding: 8px 12px;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 500;
		text-transform: uppercase;
		color: var(--grey-normal);
		white-space: nowrap;
		transition: color var(--duration-fast) var(--ease-out-quart);
	}
	.topnav__link:hover { color: var(--blue-dark); }
	.topnav__link:focus-visible { outline: 2px solid var(--blue-dark); outline-offset: 2px; }

	.topnav__link--active {
		height: 33px;
		background: var(--blue-dark);
		color: var(--blue-lighter);
		font-weight: 700;
		border-radius: var(--radius-full);
	}
	.topnav__link--active:hover { color: white; }

	.topnav__link-icon {
		font-size: 18px;
		font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
	}

	.topnav__badge {
		background: var(--error-bg);
		color: var(--error-ink);
		font-size: var(--text-2xs);
		font-weight: 700;
		min-width: 18px;
		height: 19px;
		border-radius: var(--radius-full);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
	}

	.topnav__user {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--blue-dark);
		white-space: nowrap;
		cursor: pointer;
	}
	.topnav__user .icon { font-size: 18px; }
	.topnav__user:hover { background: var(--teal-50); }

	@media (max-width: 900px) {
		.topnav__pill { position: static; transform: none; }
		.topnav__link { gap: 6px; padding: 8px; }
	}

	/* Móvil: el logo y la cuenta comparten la primera línea y las pestañas
	   pasan debajo, ocupando el ancho completo. */
	@media (max-width: 700px) {
		.topnav {
			flex-wrap: wrap;
			height: auto;
			padding-bottom: var(--space-3);
			row-gap: var(--space-3);
		}
		.topnav__logo { padding-top: var(--space-3); }
		.topnav__user { margin-left: auto; }
		.topnav__pill {
			order: 3;
			width: 100%;
			justify-content: space-between;
			gap: var(--space-1);
			overflow-x: auto;
			scrollbar-width: none;
		}
		.topnav__pill::-webkit-scrollbar { display: none; }
		.topnav__link { flex: 0 0 auto; }
		/* Las tres pestañas no caben con icono: la etiqueta basta para
		   identificarlas y se gana el ancho que hace falta. */
		.topnav__link-icon { display: none; }
	}
</style>
