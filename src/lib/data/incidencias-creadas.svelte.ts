// Incidencias registradas desde el formulario durante la sesión.
//
// Viven en un módulo (no en un componente) para sobrevivir a la navegación:
// al registrar una incidencia y volver al despacho o a la sección Incidencias,
// la lista se vuelve a montar y un `$state` local se perdería. Es el mismo
// patrón que el estado de los filtros del dashboard (dash-filters.svelte.ts).
import type { Alerta } from './trips';

export const incidenciasCreadas = $state({ items: [] as Alerta[] });

/** Añade una incidencia recién creada al principio (la más reciente primero). */
export function registrarIncidencia(alerta: Alerta) {
	incidenciasCreadas.items = [alerta, ...incidenciasCreadas.items];
}
