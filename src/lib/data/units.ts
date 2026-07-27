// Utilidades de unidades y fechas para métricas del dashboard.

/** "14.980 kg" → 14980 (los puntos son separador de miles, sin decimales en kg). */
export function parseKg(s: string | undefined): number {
	if (!s) return 0;
	const n = parseInt(s.replace(/[^\d]/g, ''), 10);
	return Number.isNaN(n) ? 0 : n;
}

/** Kilogramos → toneladas formateadas, ej. 14980 → "14,98 t". */
export function fmtTon(kg: number): string {
	return (kg / 1000).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' t';
}

/** Convierte una cadena de peso ("28.080 kg") directamente a toneladas formateadas. */
export function kgToTon(peso: string | undefined): string {
	return fmtTon(parseKg(peso));
}

const MESES_ES: Record<string, number> = {
	ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
	jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

/**
 * Parsea la fecha documentada del despacho ("20/Mar/2026") a un Date (día, 00:00).
 * Devuelve null si no reconoce el formato (p. ej. "Pendiente").
 */
export function parseFechaDoc(s: string | undefined): Date | null {
	if (!s) return null;
	const m = s.trim().match(/^(\d{1,2})\/([A-Za-zÁÉÍÓÚáéíóú]{3})\/(\d{4})$/);
	if (!m) return null;
	const mes = MESES_ES[m[2].toLowerCase().slice(0, 3)];
	if (mes === undefined) return null;
	return new Date(+m[3], mes, +m[1]);
}

const MESES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Date → "2026-03-20", el formato que consume <input type="date">. */
export function toISODate(d: Date): string {
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "2026-03-20" → "20/Mar/2026", el formato que se muestra al usuario. */
export function fmtISODate(iso: string | undefined): string {
	if (!iso) return '—';
	const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return iso;
	return `${+m[3]}/${MESES_ABBR[+m[2] - 1]}/${m[1]}`;
}
