<script lang="ts">
	import type { TripState } from '$lib/data/trips';
	import { STATE_ICONS, STATE_LABELS } from '$lib/data/trips';

	let { estado, size = 'md' }: { estado: TripState; size?: 'sm' | 'md' } = $props();

</script>

<span class="badge badge--{estado} badge--{size} tooltip-trigger" role="status" aria-label={STATE_LABELS[estado]}>
	<span class="icon icon--sm" aria-hidden="true">{STATE_ICONS[estado]}</span>
	<span class="tooltip-bubble">{STATE_LABELS[estado]}</span>
	{STATE_LABELS[estado]}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-sm);
		font-weight: 700;
		border-radius: var(--radius-full);
		white-space: nowrap;
	}

	.badge--md { padding: 3px 10px; }
	.badge--sm { padding: 2px 8px; font-size: var(--text-xs); }

	.badge--en-carga        { background: var(--status-en-carga-bg);        color: var(--status-en-carga-ink); }
	.badge--en-transito     { background: var(--status-en-transito-bg);     color: var(--status-en-transito-ink); }
	.badge--en-frontera     { background: var(--status-en-frontera-bg);     color: var(--status-en-frontera-ink); }
	.badge--en-descarga     { background: var(--status-en-descarga-bg);     color: var(--status-en-descarga-ink); }
	.badge--en-retorno      { background: var(--status-en-retorno-bg);      color: var(--status-en-retorno-ink); }
	.badge--incidencia      { background: var(--status-incidencia-bg);      color: var(--status-incidencia-ink); }
</style>
