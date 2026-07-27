export interface CityInfo {
	coords: [number, number]; // [lng, lat]
	pais: string;
}

/** Ciudades usadas como origen/destino de despachos. */
export const CITY_INFO: Record<string, CityInfo> = {
	// Bolivia
	'Santa Cruz': { coords: [-63.1806, -17.7833], pais: 'Bolivia' },
	Warnes:       { coords: [-63.1665, -17.5060], pais: 'Bolivia' },
	'La Paz':     { coords: [-68.1500, -16.4897], pais: 'Bolivia' },
	'El Alto':    { coords: [-68.1636, -16.5047], pais: 'Bolivia' },
	Oruro:        { coords: [-67.1069, -17.9698], pais: 'Bolivia' },
	// Perú
	Arequipa: { coords: [-71.5375, -16.4090], pais: 'Perú' },
	Ilo:      { coords: [-71.3436, -17.6394], pais: 'Perú' },
	Lima:     { coords: [-77.0428, -12.0464], pais: 'Perú' },
	// Chile
	Arica:    { coords: [-70.3126, -18.4783], pais: 'Chile' },
	Santiago: { coords: [-70.6693, -33.4489], pais: 'Chile' },
	// Ecuador
	Guayaquil:  { coords: [-79.8891, -2.1894], pais: 'Ecuador' },
	Quito:      { coords: [-78.4678, -0.1807], pais: 'Ecuador' },
	Cuenca:     { coords: [-79.0059, -2.9006], pais: 'Ecuador' },
	Manta:      { coords: [-80.7089, -0.9677], pais: 'Ecuador' },
	Ambato:     { coords: [-78.6198, -1.2417], pais: 'Ecuador' },
	Ibarra:     { coords: [-78.1222,  0.3516], pais: 'Ecuador' },
	Esmeraldas: { coords: [-79.6528,  0.9682], pais: 'Ecuador' },
	Quevedo:    { coords: [-79.4635, -1.0225], pais: 'Ecuador' },
	// Colombia
	Cali:     { coords: [-76.5320,  3.4516], pais: 'Colombia' },
	'Bogotá': { coords: [-74.0721,  4.7110], pais: 'Colombia' },
};

// ── Geocercas ──
// Perímetros virtuales sobre puntos críticos. Automatizan la detección de
// entradas/salidas y las alertas por excepción (demora dentro de una zona).
// Capacidad propuesta — todavía no integrada con ningún sistema del cliente.

export type GeocercaTipo = 'planta' | 'silo' | 'frontera' | 'puerto' | 'centro-distribucion';

export interface Geocerca {
	id: string;
	nombre: string;
	tipo: GeocercaTipo;
	centro: [number, number]; // [lng, lat]
	radioKm: number;
}

export const GEOCERCA_ICONS: Record<GeocercaTipo, string> = {
	planta:                'factory',
	silo:                  'factory',
	frontera:              'flag',
	puerto:                'anchor',
	'centro-distribucion': 'warehouse',
};

export const GEOCERCA_TIPO_LABELS: Record<GeocercaTipo, string> = {
	planta:                'Planta',
	silo:                  'Silo',
	frontera:              'Frontera',
	puerto:                'Puerto',
	'centro-distribucion': 'Centro de distribución',
};

export const GEOCERCAS: Record<string, Geocerca> = {
	'planta-warnes':          { id: 'planta-warnes',          nombre: 'Planta Warnes Don Felipe', tipo: 'planta',              centro: [-63.1665, -17.5060], radioKm: 5 },
	'planta-el-alto':         { id: 'planta-el-alto',         nombre: 'Planta La Paz - El Alto',  tipo: 'planta',              centro: [-68.1636, -16.5047], radioKm: 5 },
	'planta-oruro':           { id: 'planta-oruro',           nombre: 'Planta Oruro',             tipo: 'planta',              centro: [-67.1069, -17.9698], radioKm: 5 },
	'frontera-desaguadero':   { id: 'frontera-desaguadero',   nombre: 'Frontera Desaguadero',     tipo: 'frontera',            centro: [-69.0408, -16.5623], radioKm: 4 },
	'frontera-tambo-quemado': { id: 'frontera-tambo-quemado', nombre: 'Frontera Tambo Quemado',   tipo: 'frontera',            centro: [-68.4667, -18.2667], radioKm: 4 },
	'puerto-arica':           { id: 'puerto-arica',           nombre: 'Puerto de Arica',          tipo: 'puerto',              centro: [-70.3126, -18.4783], radioKm: 5 },
	'puerto-ilo':             { id: 'puerto-ilo',             nombre: 'Puerto de Ilo',            tipo: 'puerto',              centro: [-71.3436, -17.6394], radioKm: 5 },
	'cd-arequipa':            { id: 'cd-arequipa',            nombre: 'CD Arequipa',              tipo: 'centro-distribucion', centro: [-71.5375, -16.4090], radioKm: 5 },
	'cd-la-paz':              { id: 'cd-la-paz',              nombre: 'CD La Paz',                tipo: 'centro-distribucion', centro: [-68.1500, -16.4897], radioKm: 5 },
};

/** Un viaje es nacional si origen y destino están en el mismo país. */
export function esNacional(origen: string, destino: string): boolean {
	const o = CITY_INFO[origen];
	const d = CITY_INFO[destino];
	return !!o && !!d && o.pais === d.pais;
}
