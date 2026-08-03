// Estado de los filtros del dashboard.
//
// Vive en un módulo, no en el componente: al abrir un despacho y volver, la
// página se vuelve a montar y unos `$state` locales se reiniciarían, dejando
// el dashboard como si nunca se hubiera filtrado nada.
import { toISODate } from './units';
import { parseFechaDoc } from './units';
import { STATE_LABELS, type Trip, type TripState } from './trips';

export type PeriodoKey =
	| 'esta-semana' | 'este-mes' | 'semana-pasada' | 'mes-pasado'
	| 'este-ano' | 'ano-pasado' | 'rango';

export const PERIODOS: { value: PeriodoKey; label: string }[] = [
	{ value: 'esta-semana',   label: 'Esta semana' },
	{ value: 'este-mes',      label: 'Este mes' },
	{ value: 'semana-pasada', label: 'Semana pasada' },
	{ value: 'mes-pasado',    label: 'Mes pasado' },
	{ value: 'este-ano',      label: 'Este año' },
	{ value: 'ano-pasado',    label: 'Año pasado' },
	{ value: 'rango',         label: 'Rango' },
];

export const PERIODO_POR_DEFECTO: PeriodoKey = 'esta-semana';

/** Lunes de la semana a la que pertenece la fecha dada. */
function lunesDe(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // 0 = lunes … 6 = domingo
	return x;
}

function masDias(d: Date, n: number): Date {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}

/**
 * Fechas que abarca un periodo. Devuelve null para 'rango', que es el único
 * caso en el que las fechas las elige el usuario.
 */
export function rangoDePeriodo(p: PeriodoKey, hoy: Date = new Date()): { desde: string; hasta: string } | null {
	if (p === 'rango') return null;
	const anio = hoy.getFullYear();
	const mes = hoy.getMonth();

	switch (p) {
		case 'esta-semana': {
			const l = lunesDe(hoy);
			return { desde: toISODate(l), hasta: toISODate(masDias(l, 6)) };
		}
		case 'semana-pasada': {
			const l = masDias(lunesDe(hoy), -7);
			return { desde: toISODate(l), hasta: toISODate(masDias(l, 6)) };
		}
		case 'este-mes':
			// Día 0 del mes siguiente = último día del mes en curso.
			return { desde: toISODate(new Date(anio, mes, 1)), hasta: toISODate(new Date(anio, mes + 1, 0)) };
		case 'mes-pasado':
			return { desde: toISODate(new Date(anio, mes - 1, 1)), hasta: toISODate(new Date(anio, mes, 0)) };
		case 'este-ano':
			return { desde: toISODate(new Date(anio, 0, 1)), hasta: toISODate(new Date(anio, 11, 31)) };
		case 'ano-pasado':
			return { desde: toISODate(new Date(anio - 1, 0, 1)), hasta: toISODate(new Date(anio - 1, 11, 31)) };
	}
}

const semanaActual = rangoDePeriodo(PERIODO_POR_DEFECTO)!;

export const filtros = $state({
	estado:        null as TripState | null,
	busqueda:      '',
	producto:      '',
	cliente:       '',
	transportista: '',
	origen:        [] as string[],
	destino:       [] as string[],
	fecha:         PERIODO_POR_DEFECTO as PeriodoKey,
	// Sólo se usan con el periodo 'rango'; arrancan en la semana en curso para
	// que al elegir "Rango" el selector ya venga con fechas válidas.
	rangoDesde:    semanaActual.desde,
	rangoHasta:    semanaActual.hasta,
});

/** Makes search tolerant of accents and surrounding whitespace. */
export function normalizarBusqueda(value: string): string {
	return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/**
 * Applies the shared dashboard filters to any trip collection.
 * Keeping this here prevents Dashboard and Viajes from drifting apart when a
 * new filter is added or when a period preset is selected.
 */
export function filtrarViajes(items: Trip[], options: { includeSearch?: boolean; includeStatus?: boolean } = {}): Trip[] {
	const periodo = rangoDePeriodo(filtros.fecha);
	const desde = periodo?.desde ?? filtros.rangoDesde;
	const hasta = periodo?.hasta ?? filtros.rangoHasta;
	const query = normalizarBusqueda(filtros.busqueda);

	return items.filter((trip) => {
		if (options.includeStatus !== false && filtros.estado && trip.estado !== filtros.estado) return false;
		if (filtros.producto && trip.carga !== filtros.producto) return false;
		if (filtros.cliente && trip.sap.cliCodigo !== filtros.cliente) return false;
		if (filtros.transportista && trip.transportista !== filtros.transportista) return false;
		if (filtros.origen.length && !filtros.origen.includes(trip.origen)) return false;
		if (filtros.destino.length && !filtros.destino.includes(trip.destino)) return false;

		if (desde || hasta) {
			const fecha = parseFechaDoc(trip.fechaDocumentada);
			if (!fecha) return false;
			if (desde && fecha < new Date(`${desde}T00:00:00`)) return false;
			if (hasta && fecha > new Date(`${hasta}T23:59:59`)) return false;
		}

		if (options.includeSearch && query) {
			const searchable = [
				trip.id, trip.conductor, trip.transportista, trip.unidad,
				trip.rutaCodigo, trip.rutaNombre, trip.origen, trip.destino,
				trip.carga, STATE_LABELS[trip.estado], trip.fechaDocumentada,
				trip.sap.salidaMercancia, trip.sap.cliCodigo, trip.sap.pedido,
				trip.sap.numeroTransporte, trip.sap.cenCodigo,
			];
			if (!searchable.some((value) => normalizarBusqueda(value).includes(query))) return false;
		}

		return true;
	});
}

export function limpiarFiltros() {
	const semana = rangoDePeriodo(PERIODO_POR_DEFECTO)!;
	filtros.estado = null;
	filtros.busqueda = '';
	filtros.producto = '';
	filtros.cliente = '';
	filtros.transportista = '';
	filtros.origen = [];
	filtros.destino = [];
	filtros.fecha = PERIODO_POR_DEFECTO;
	filtros.rangoDesde = semana.desde;
	filtros.rangoHasta = semana.hasta;
}
