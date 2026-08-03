<script lang="ts">
	import { filtros, filtrarViajes, rangoDePeriodo } from '$lib/data/dash-filters.svelte';
	import { fmtISODate } from '$lib/data/units';
import { trips } from '$lib/data/trips';

	const range = $derived.by(() => {
		const preset = rangoDePeriodo(filtros.fecha);
		return preset ?? { desde: filtros.rangoDesde, hasta: filtros.rangoHasta };
	});
	const dispatchCount = $derived(filtrarViajes(trips, { includeSearch: true }).length);

	function displayDate(value: string) {
		return fmtISODate(value);
	}
</script>

<div class="date-range-bar" role="status" aria-live="polite">
	<span class="icon date-range-bar__icon" aria-hidden="true">calendar_month</span>
	<span>
		Información del <strong>{displayDate(range.desde)}</strong>
		al <strong>{displayDate(range.hasta)}</strong>
		· {dispatchCount} {dispatchCount === 1 ? 'despacho' : 'despachos'}
	</span>
</div>
