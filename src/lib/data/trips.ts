import { GEOCERCAS } from './geo';

export type TripState =
	| 'en-carga'
	| 'en-transito'
	| 'en-frontera'
	| 'en-descarga'
	| 'en-retorno'
	| 'incidencia';

export interface TripEvent {
	id: string;
	timestamp: string;
	tipo: 'inicio' | 'parada' | 'frontera' | 'incidencia' | 'carga' | 'descarga' | 'retorno' | 'sistema';
	titulo: string;
	descripcion?: string;
	ubicacion?: string;
	/** Id de GEOCERCAS si el evento lo generó una geocerca (entrada/salida o alerta por excepción). */
	geocerca?: string;
	/** Tiempo que la unidad pasó en este estado (sólo estados de detención:
	 *  carga, descanso, frontera, descarga). Lo asigna `conDuraciones`. */
	duracion?: string;
}

/**
 * Situación de la unidad frente a las geocercas — capacidad propuesta.
 * Convierte el ping pasivo del GPS en información operativa: en qué zona
 * crítica está la unidad, desde cuándo y por cuánto tiempo.
 */
export interface TripGeocerca {
	estado: 'dentro' | 'en-ruta';
	actual?: string;       // id de GEOCERCAS, cuando está dentro
	desde?: string;        // marca de tiempo de entrada
	tiempoDentro?: string; // permanencia acumulada
	proxima?: string;      // id de GEOCERCAS, cuando va en ruta
	etaProxima?: string;   // ETA a la próxima zona
}

/** Datos SAP del despacho (hoja "Información de envío IASA"). */
export interface TripSap {
	pedido: string;           // desPedidoSAP
	salidaMercancia: string;  // desSalidaMercanciaSAP
	numeroTransporte: string; // desNumeroTransporteSAP
	cliCodigo: string;        // desCliCodigoSAP
	cenCodigo: string;        // desCenCodigoSAP
}

/** Datos de agencia de frontera (SUMA). */
export interface TripAgencia {
	estadoCruce: 'Sí' | 'No';
	fechaCruce?: string;
	pasoAgencia: 'Sí' | 'No';
	fechaRetorno?: string;
	dex?: string;
	mic?: string;
	crt?: string;
}

/** Datos de agencia de Perú — solo carga de consumo Perú. */
export interface TripAgenciaPeru {
	estadoNacionalizacion: string;
	fechaNacionalizacion?: string;
	pasoAgencia: 'Sí' | 'No';
	canal?: string;
	clienteDestino?: string;
}

/** Recepción en destino (SCP) — fin del viaje. */
export interface TripRecepcion {
	fecha: string;
	pesoRecibido: string;
}

export interface Trip {
	id: string;              // Despacho Correlativo Txn
	unidad: string;          // Vehiculo ID (placa)
	placa: string;
	tipoVehiculo: string;
	conductor: string;       // Carnet chofer (choId)
	conductorTel?: string;
	transportista: string;   // TraNombre
	transportistaTel?: string;
	nit: string;             // TraNit
	origen: string;          // ciudad de la planta de carga
	destino: string;
	rutaCodigo: string;      // rutCodigo
	rutaNombre: string;      // RutNombre — desglose, ej. 'BO - PDF - AREQUIPA'
	planta: string;          // PltNombre
	estado: TripState;
	tiempoEnEstado: string;
	ultimaUbicacion: string;
	ultimaActualizacion: string;
	carga: string;           // MatNombre
	materialId: string;      // matId
	pesoIngreso: string;     // peso vacío
	pesoSalida: string;      // peso bruto
	pesoNeto: string;        // peso de producto
	distancia: string;
	fechaDocumentada: string;
	fechaSalida: string;
	/**
	 * ¿La unidad lleva GPS Tag? No toda la flota lo tendrá: sin GPS no hay
	 * posición, geocercas ni ETA — sólo el lead time planificado de la ruta.
	 */
	gps: boolean;
	etaOriginal?: string;
	etaActual?: string;
	etaRecorrido?: string;   // ej. '30 a 36 hrs.'
	retraso?: string;
	cumpleEtaIdeal: boolean; // ¿el despacho cumple su ETA ideal (etaOriginal)?
	lote?: string;
	precinto: string;
	cerradoPor: string;      // desUsrIdCerrado
	observaciones?: string;
	geocerca: TripGeocerca;
	geocercasRuta: string[]; // ids de GEOCERCAS sobre el corredor del despacho
	sap: TripSap;
	agencia?: TripAgencia;
	agenciaPeru?: TripAgenciaPeru;
	recepcion?: TripRecepcion;
	urgente: boolean;
	eventos: TripEvent[];
	coordenadas: { lat: number; lng: number };
}

export interface Alerta {
	id: string;
	/** Omitido únicamente para incidencias globales que afectan a la red. */
	tripId?: string;
	unidad?: string;
	tipo: AlertaTipo;
	mensaje: string;
	tiempo: string;
}

export type AlertaTipo = 'desvio' | 'parada' | 'retraso' | 'critico';

export const ALERTA_TYPE_LABELS: Record<AlertaTipo, string> = {
	critico: 'Crítico',
	retraso: 'Retraso',
	parada: 'Parada obligatoria',
	desvio: 'Desvío de ruta',
};

export const ALERTA_TYPE_ICONS: Record<AlertaTipo, string> = {
	critico: 'report',
	retraso: 'schedule',
	parada: 'pause_circle',
	desvio: 'alt_route',
};

export const STATE_LABELS: Record<TripState, string> = {
	'en-carga':        'En carga',
	'en-transito':     'En tránsito',
	'en-frontera':     'En frontera',
	'en-descarga':     'En descarga',
	'incidencia':      'Incidencia',
	'en-retorno':      'Disponible',
};

/** Shared status iconography used by badges, filters, tables, and map previews. */
export const STATE_ICONS: Record<TripState, string> = {
	'en-carga':        'forklift',
	'en-transito':     'local_shipping',
	'en-frontera':     'flag',
	'en-descarga':     'download',
	'en-retorno':      'undo',
	'incidencia':      'report',
};

const rawTrips: Trip[] = [
	{
		id: 'PEWDSP206746',
		unidad: '3480IZA',
		placa: '3480IZA',
		tipoVehiculo: 'Remolque',
		conductor: '3148750',
		transportista: 'COOPERATIVA DE TRANSPORTE DE',
		nit: '182078028',
		origen: 'Warnes',
		destino: 'Arequipa',
		rutaCodigo: 'BPAREQ',
		rutaNombre: 'BO - PDF - AREQUIPA',
		planta: 'Planta de extracción Warnes Don Felipe',
		estado: 'incidencia',
		tiempoEnEstado: '3h 42min',
		ultimaUbicacion: 'Cochabamba, Bolivia',
		ultimaActualizacion: 'hace 8 min',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '14.980 kg',
		pesoSalida: '43.060 kg',
		pesoNeto: '28.080 kg',
		distancia: '1.150 km | 22 h 16 min',
		fechaDocumentada: '29/Jul/2026',
		cumpleEtaIdeal: false,
		gps: true,
		fechaSalida: '28 jul 2026, 22:00',
		etaOriginal: '30 Jul. 11:30',
		etaActual: '30 Jul. 16:15',
		etaRecorrido: '30 a 36 hrs.',
		retraso: '1 hr 4 min',
		lote: '2T 28/07/2026',
		precinto: 'BO7250965',
		cerradoPor: 'wmoza',
		geocerca: { estado: 'en-ruta', proxima: 'frontera-desaguadero', etaProxima: '29 Jul. 19:40' },
		geocercasRuta: ['planta-warnes', 'frontera-desaguadero', 'cd-arequipa'],
		sap: { pedido: '6012827783', salidaMercancia: '0819352885', numeroTransporte: '0007767479', cliCodigo: '0000458281', cenCodigo: 'B419' },
		agenciaPeru: { estadoNacionalizacion: 'Pendiente', pasoAgencia: 'No', clienteDestino: 'Cliente SAP 0000458281' },
		urgente: true,
		coordenadas: { lat: -17.3895, lng: -66.1568 },
		eventos: [
			{ id: 'e1', timestamp: '28 jul, 22:00', tipo: 'carga',      titulo: 'Inicio de carga', ubicacion: 'Warnes, Bolivia', geocerca: 'planta-warnes' },
			{ id: 'e2', timestamp: '29 jul, 06:40', tipo: 'parada',     titulo: 'Descanso', descripcion: 'Descanso obligatorio de 45 min.', ubicacion: 'Cochabamba, Bolivia' },
			{ id: 'e3', timestamp: '29 jul, 10:18', tipo: 'incidencia', titulo: 'Incidente', descripcion: 'Falla mecánica reportada. Vehículo detenido en vía. Servicio técnico en camino.', ubicacion: 'Cochabamba, Bolivia' },
		],
	},
	{
		id: 'PEWDSP206749',
		unidad: '794UTB',
		placa: '794UTB',
		tipoVehiculo: 'Remolque',
		conductor: '6792656',
		transportista: 'EMPRESA EL PORVENIR Ltda.',
		nit: '1020681028',
		origen: 'Warnes',
		destino: 'Arequipa',
		rutaCodigo: 'BPAREQ',
		rutaNombre: 'BO - PDF - AREQUIPA',
		planta: 'Planta de extracción Warnes Don Felipe',
		estado: 'en-frontera',
		tiempoEnEstado: '5h 18min',
		ultimaUbicacion: 'Desaguadero, frontera BO–PE',
		ultimaActualizacion: 'hace 3 min',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '18.430 kg',
		pesoSalida: '45.090 kg',
		pesoNeto: '26.660 kg',
		distancia: '1.150 km | 22 h 16 min',
		fechaDocumentada: '29/Jul/2026',
		cumpleEtaIdeal: false,
		gps: true,
		fechaSalida: '28 jul 2026, 20:30',
		etaOriginal: '30 Jul. 09:00',
		etaActual: '30 Jul. 14:30',
		etaRecorrido: '30 a 36 hrs.',
		lote: '3T. 28/07/2026',
		precinto: 'BO7250968',
		cerradoPor: 'wmoza',
		geocerca: { estado: 'dentro', actual: 'frontera-desaguadero', desde: '29 jul, 09:02', tiempoDentro: '5h 18min' },
		geocercasRuta: ['planta-warnes', 'frontera-desaguadero', 'cd-arequipa'],
		sap: { pedido: '6012827783', salidaMercancia: '0819352888', numeroTransporte: '0007767482', cliCodigo: '0000458281', cenCodigo: 'B419' },
		agencia: { estadoCruce: 'No', pasoAgencia: 'Sí', dex: 'DEX-2026-118734', mic: 'MIC-BO-482201', crt: 'CRT-BO-771102' },
		agenciaPeru: { estadoNacionalizacion: 'En proceso', pasoAgencia: 'Sí', canal: 'Naranja', clienteDestino: 'Cliente SAP 0000458281' },
		urgente: true,
		coordenadas: { lat: -16.5623, lng: -69.0408 },
		eventos: [
			{ id: 'e1', timestamp: '28 jul, 20:30', tipo: 'carga',    titulo: 'Inicio de carga', ubicacion: 'Warnes, Bolivia', geocerca: 'planta-warnes' },
			{ id: 'e2', timestamp: '29 jul, 05:10', tipo: 'parada',   titulo: 'Descanso', ubicacion: 'Caracollo, Bolivia' },
			{ id: 'e3', timestamp: '29 jul, 09:02', tipo: 'frontera', titulo: 'Llegada a frontera', descripcion: 'Inicio de trámite aduanero en agencia de frontera.', ubicacion: 'Desaguadero, Bolivia', geocerca: 'frontera-desaguadero' },
			{ id: 'e4', timestamp: '29 jul, 13:20', tipo: 'sistema',  titulo: 'Alerta de demora', descripcion: 'El tiempo en frontera superó el umbral de 4h. Alerta enviada a coordinación.', geocerca: 'frontera-desaguadero' },
		],
	},
	{
		id: 'PEWDSP206752',
		unidad: '2857PHD',
		placa: '2857PHD',
		tipoVehiculo: 'Remolque',
		conductor: '5523901',
		transportista: 'EMPRESA EL PORVENIR Ltda.',
		nit: '1020681028',
		origen: 'Warnes',
		destino: 'La Paz',
		rutaCodigo: 'BPLPZ',
		rutaNombre: 'BO - PDF - LA PAZ',
		planta: 'Planta de extracción Warnes Don Felipe',
		estado: 'en-transito',
		tiempoEnEstado: '6h 30min',
		ultimaUbicacion: 'Patacamaya, La Paz',
		ultimaActualizacion: 'hace 5 min',
		carga: 'ACEITE DE SOYA',
		materialId: '000000000003410953',
		pesoIngreso: '15.840 kg',
		pesoSalida: '44.120 kg',
		pesoNeto: '28.280 kg',
		distancia: '873 km | 16 h 40 min',
		fechaDocumentada: '28/Jul/2026',
		cumpleEtaIdeal: true,
		gps: true,
		fechaSalida: '29 jul 2026, 03:10',
		etaOriginal: '29 Jul. 20:00',
		etaActual: '29 Jul. 20:00',
		etaRecorrido: '16 a 20 hrs.',
		lote: '4T 28/07/2026',
		precinto: 'BO7250974',
		cerradoPor: 'wmoza',
		geocerca: { estado: 'en-ruta', proxima: 'cd-la-paz', etaProxima: '29 Jul. 20:00' },
		geocercasRuta: ['planta-warnes', 'cd-la-paz'],
		sap: { pedido: '6012827791', salidaMercancia: '0819352901', numeroTransporte: '0007767495', cliCodigo: '0000458302', cenCodigo: 'B419' },
		urgente: false,
		coordenadas: { lat: -17.23, lng: -67.92 },
		eventos: [
			{ id: 'e1', timestamp: '29 jul, 03:10', tipo: 'inicio', titulo: 'Salida de planta', ubicacion: 'Warnes, Bolivia', geocerca: 'planta-warnes' },
			{ id: 'e2', timestamp: '29 jul, 09:35', tipo: 'parada', titulo: 'Descanso', descripcion: 'Descanso obligatorio de 30 min.', ubicacion: 'Caracollo, Oruro' },
		],
	},
	{
		id: 'PLPDSP067060',
		unidad: '2332XZP',
		placa: '2332XZP',
		tipoVehiculo: 'Remolque',
		conductor: '4941278',
		transportista: 'CECILUNA TRANSPORTES S.R.L.',
		nit: '402420029',
		origen: 'El Alto',
		destino: 'Ilo',
		rutaCodigo: 'BEILO',
		rutaNombre: 'BO - EL ALTO - ILO',
		planta: 'Planta La Paz - El Alto',
		estado: 'en-frontera',
		tiempoEnEstado: '2h 50min',
		ultimaUbicacion: 'Desaguadero, frontera BO–PE',
		ultimaActualizacion: 'hace 6 min',
		carga: 'ACEITE DE SOYA',
		materialId: '000000000003410953',
		pesoIngreso: '15.370 kg',
		pesoSalida: '44.370 kg',
		pesoNeto: '29.000 kg',
		distancia: '537 km | 9 h 26 min',
		fechaDocumentada: '29/Jul/2026',
		cumpleEtaIdeal: false,
		gps: true,
		fechaSalida: '29 jul 2026, 05:15',
		etaOriginal: '29 Jul. 18:45',
		etaActual: '29 Jul. 21:10',
		etaRecorrido: '9 a 12 hrs.',
		lote: '29/7/2026 08:54:00',
		precinto: 'BO7241004 BO7241005 BO7241006 BO7241007',
		cerradoPor: 'JOB_DESPACHO',
		geocerca: { estado: 'dentro', actual: 'frontera-desaguadero', desde: '29 jul, 11:05', tiempoDentro: '2h 50min' },
		geocercasRuta: ['planta-el-alto', 'frontera-desaguadero', 'puerto-ilo'],
		sap: { pedido: '6012827874', salidaMercancia: '0819352441', numeroTransporte: '0007766590', cliCodigo: '0000464766', cenCodigo: 'B423' },
		agencia: { estadoCruce: 'No', pasoAgencia: 'Sí', dex: 'DEX-2026-118902', mic: 'MIC-BO-482377', crt: 'CRT-BO-771248' },
		agenciaPeru: { estadoNacionalizacion: 'En proceso', pasoAgencia: 'Sí', canal: 'Verde', clienteDestino: 'Cliente SAP 0000464766' },
		urgente: false,
		coordenadas: { lat: -16.5623, lng: -69.0408 },
		eventos: [
			{ id: 'e1', timestamp: '29 jul, 05:15', tipo: 'carga',    titulo: 'Inicio de carga', ubicacion: 'El Alto, Bolivia', geocerca: 'planta-el-alto' },
			{ id: 'e2', timestamp: '29 jul, 08:54', tipo: 'inicio',   titulo: 'Salida de planta', ubicacion: 'Planta La Paz - El Alto', geocerca: 'planta-el-alto' },
			{ id: 'e3', timestamp: '29 jul, 11:05', tipo: 'frontera', titulo: 'Llegada a frontera', descripcion: 'En cola para inspección de agencia.', ubicacion: 'Desaguadero, Bolivia', geocerca: 'frontera-desaguadero' },
		],
	},
	{
		id: 'ORUDSP008917',
		unidad: '5271KTC',
		placa: '5271KTC',
		tipoVehiculo: 'Remolque',
		conductor: '5971661',
		transportista: 'TRANSPORTES FUENTES SRL.',
		nit: '1025665020',
		origen: 'Oruro',
		destino: 'Arica',
		rutaCodigo: 'BOARIC',
		rutaNombre: 'BO - ORURO - ARICA',
		planta: 'Oruro',
		estado: 'en-carga',
		tiempoEnEstado: '1h 20min',
		ultimaUbicacion: 'Planta Oruro',
		ultimaActualizacion: 'hace 12 min',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '16.210 kg',
		pesoSalida: '41.430 kg',
		pesoNeto: '25.220 kg',
		distancia: '432 km | 7 h 38 min',
		fechaDocumentada: '27/Jul/2026',
		cumpleEtaIdeal: true,
		gps: true,
		fechaSalida: 'Pendiente',
		etaOriginal: '30 Jul. 08:00',
		etaActual: '—',
		etaRecorrido: '7 a 9 hrs.',
		precinto: 'BO7245109',
		cerradoPor: 'caracollo_ext',
		geocerca: { estado: 'dentro', actual: 'planta-oruro', desde: '29 jul, 12:40', tiempoDentro: '1h 20min' },
		geocercasRuta: ['planta-oruro', 'frontera-tambo-quemado', 'puerto-arica'],
		sap: { pedido: '6012828006', salidaMercancia: '0819353025', numeroTransporte: '0007767452', cliCodigo: '0000464766', cenCodigo: 'B424' },
		urgente: false,
		coordenadas: { lat: -17.9698, lng: -67.1069 },
		eventos: [
			{ id: 'e1', timestamp: '29 jul, 12:40', tipo: 'sistema', titulo: 'Alerta de demora', descripcion: 'El tiempo de espera en carga superó el promedio; todas las bahías ocupadas. Alerta enviada a coordinación.', ubicacion: 'Planta Oruro', geocerca: 'planta-oruro' },
		],
	},
	{
		id: 'ORUDSP008918',
		unidad: '4228LFS',
		placa: '4228LFS',
		tipoVehiculo: 'Remolque',
		conductor: '7002798',
		transportista: 'TRANSPORTES FUENTES SRL.',
		nit: '1025665020',
		origen: 'Oruro',
		destino: 'Arica',
		rutaCodigo: 'BOARIC',
		rutaNombre: 'BO - ORURO - ARICA',
		planta: 'Oruro',
		estado: 'en-transito',
		tiempoEnEstado: '4h 05min',
		ultimaUbicacion: 'Putre, Chile',
		ultimaActualizacion: 'hace 2 min',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '16.170 kg',
		pesoSalida: '35.670 kg',
		pesoNeto: '19.500 kg',
		distancia: '432 km | 7 h 38 min',
		fechaDocumentada: '28/Jul/2026',
		cumpleEtaIdeal: true,
		gps: true,
		fechaSalida: '29 jul 2026, 04:50',
		etaOriginal: '29 Jul. 13:30',
		etaActual: '29 Jul. 13:30',
		etaRecorrido: '7 a 9 hrs.',
		precinto: 'BO7245105',
		cerradoPor: 'caracollo_ext',
		geocerca: { estado: 'en-ruta', proxima: 'puerto-arica', etaProxima: '29 Jul. 13:30' },
		geocercasRuta: ['planta-oruro', 'frontera-tambo-quemado', 'puerto-arica'],
		sap: { pedido: '6012827491', salidaMercancia: '0819351622', numeroTransporte: '0007765679', cliCodigo: '0000464766', cenCodigo: 'B424' },
		agencia: { estadoCruce: 'Sí', fechaCruce: '29 jul 2026, 09:12', pasoAgencia: 'Sí', dex: 'DEX-2026-118655', mic: 'MIC-BO-482118', crt: 'CRT-BO-771034' },
		urgente: false,
		coordenadas: { lat: -18.1961, lng: -69.5592 },
		eventos: [
			{ id: 'e1', timestamp: '29 jul, 04:50', tipo: 'inicio',   titulo: 'Salida de planta', ubicacion: 'Oruro, Bolivia', geocerca: 'planta-oruro' },
			{ id: 'e2', timestamp: '29 jul, 08:40', tipo: 'frontera', titulo: 'Llegada a frontera', ubicacion: 'Tambo Quemado, Bolivia', geocerca: 'frontera-tambo-quemado' },
			{ id: 'e3', timestamp: '29 jul, 09:12', tipo: 'frontera', titulo: 'Cruce de frontera completado', descripcion: 'Documentación DEX/MIC/CRT verificada por agencia.', ubicacion: 'Chungará, Chile', geocerca: 'frontera-tambo-quemado' },
		],
	},
	{
		id: 'ORUDSP008919',
		unidad: '6484FRL',
		placa: '6484FRL',
		tipoVehiculo: 'Remolque',
		conductor: '9917043',
		transportista: 'INTERNAL. SERVICIO DE TRANSPORTE',
		nit: '1018437025',
		origen: 'Oruro',
		destino: 'Arica',
		rutaCodigo: 'BOARIC',
		rutaNombre: 'BO - ORURO - ARICA',
		planta: 'Oruro',
		estado: 'en-transito',
		tiempoEnEstado: '2h 10min',
		ultimaUbicacion: 'Turco, Oruro',
		ultimaActualizacion: 'hace 1 min',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '13.930 kg',
		pesoSalida: '41.960 kg',
		pesoNeto: '28.030 kg',
		distancia: '432 km | 7 h 38 min',
		fechaDocumentada: '29/Jul/2026',
		cumpleEtaIdeal: true,
		gps: true,
		fechaSalida: '29 jul 2026, 07:20',
		etaOriginal: '29 Jul. 15:50',
		etaActual: '29 Jul. 15:50',
		etaRecorrido: '7 a 9 hrs.',
		precinto: 'BO7245110',
		cerradoPor: 'caracollo_ext',
		geocerca: { estado: 'en-ruta', proxima: 'frontera-tambo-quemado', etaProxima: '29 Jul. 11:40' },
		geocercasRuta: ['planta-oruro', 'frontera-tambo-quemado', 'puerto-arica'],
		sap: { pedido: '6012828006', salidaMercancia: '0819353026', numeroTransporte: '0007767453', cliCodigo: '0000464766', cenCodigo: 'B424' },
		agencia: { estadoCruce: 'No', pasoAgencia: 'Sí' },
		urgente: false,
		coordenadas: { lat: -18.1731, lng: -68.1937 },
		eventos: [
			{ id: 'e1', timestamp: '29 jul, 07:20', tipo: 'inicio', titulo: 'Salida de planta', ubicacion: 'Oruro, Bolivia', geocerca: 'planta-oruro' },
			{ id: 'e2', timestamp: '29 jul, 09:05', tipo: 'parada', titulo: 'Control en ruta', descripcion: 'Control de tránsito de 10 min.', ubicacion: 'Turco, Oruro' },
		],
	},
	{
		id: 'ORUDSP008920',
		unidad: '1186LTC',
		placa: '1186LTC',
		tipoVehiculo: 'Remolque',
		conductor: '4068813',
		transportista: 'TRANSNOTEYSUR S.R.L.',
		nit: '402294029',
		origen: 'Oruro',
		destino: 'Arica',
		rutaCodigo: 'BOARIC',
		rutaNombre: 'BO - ORURO - ARICA',
		planta: 'Oruro',
		estado: 'en-descarga',
		tiempoEnEstado: '35min',
		ultimaUbicacion: 'Puerto de Arica, Chile',
		ultimaActualizacion: 'hace 4 min',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '16.260 kg',
		pesoSalida: '42.240 kg',
		pesoNeto: '25.980 kg',
		distancia: '432 km | 7 h 38 min',
		fechaDocumentada: '27/Jul/2026',
		cumpleEtaIdeal: false,
		gps: true,
		fechaSalida: '28 jul 2026, 23:40',
		etaOriginal: '29 Jul. 08:30',
		etaActual: 'Llegó 29 Jul. 15:05',
		etaRecorrido: '7 a 9 hrs.',
		precinto: 'BO7245106',
		cerradoPor: 'caracollo_ext',
		geocerca: { estado: 'dentro', actual: 'puerto-arica', desde: '29 jul, 15:05', tiempoDentro: '35min' },
		geocercasRuta: ['planta-oruro', 'frontera-tambo-quemado', 'puerto-arica'],
		sap: { pedido: '6012828006', salidaMercancia: '0819353022', numeroTransporte: '0007767449', cliCodigo: '0000464766', cenCodigo: 'B424' },
		agencia: { estadoCruce: 'Sí', fechaCruce: '29 jul 2026, 06:55', pasoAgencia: 'Sí', dex: 'DEX-2026-118656', mic: 'MIC-BO-482119', crt: 'CRT-BO-771035' },
		recepcion: { fecha: '29 jul 2026, 15:40', pesoRecibido: '25.940 kg' },
		urgente: false,
		coordenadas: { lat: -18.4783, lng: -70.3126 },
		eventos: [
			{ id: 'e1', timestamp: '28 jul, 23:40', tipo: 'inicio',   titulo: 'Salida de planta', ubicacion: 'Oruro, Bolivia', geocerca: 'planta-oruro' },
			{ id: 'e2', timestamp: '29 jul, 06:55', tipo: 'frontera', titulo: 'Cruce de frontera completado', ubicacion: 'Chungará, Chile', geocerca: 'frontera-tambo-quemado' },
			{ id: 'e3', timestamp: '29 jul, 15:05', tipo: 'descarga', titulo: 'Llegada a destino e inicio de descarga', ubicacion: 'Puerto de Arica, Chile', geocerca: 'puerto-arica' },
			{ id: 'e4', timestamp: '29 jul, 15:40', tipo: 'sistema',  titulo: 'Recepción registrada', descripcion: 'Peso recibido: 25.940 kg.', ubicacion: 'Puerto de Arica, Chile', geocerca: 'puerto-arica' },
		],
	},
	{
		// Unidad sin GPS Tag: no toda la flota lo llevará. Sin GPS no hay posición,
		// geocercas ni ETA; el seguimiento se apoya en los hitos documentales
		// (SCL/SCP) y el único tiempo disponible es el lead time planificado.
		id: 'ORUDSP008921',
		unidad: '3096NXA',
		placa: '3096NXA',
		tipoVehiculo: 'Remolque',
		conductor: '5120477',
		transportista: 'TRANSNOTEYSUR S.R.L.',
		nit: '402294029',
		origen: 'Oruro',
		destino: 'Arica',
		rutaCodigo: 'BOARIC',
		rutaNombre: 'BO - ORURO - ARICA',
		planta: 'Oruro',
		estado: 'en-transito',
		tiempoEnEstado: '6h 05min',
		ultimaUbicacion: 'Sin GPS — última referencia: salida de planta Oruro',
		ultimaActualizacion: 'Sin GPS',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '15.880 kg',
		pesoSalida: '41.700 kg',
		pesoNeto: '25.820 kg',
		distancia: '432 km | 7 h 38 min',
		fechaDocumentada: '28/Jul/2026',
		cumpleEtaIdeal: false,
		gps: false,
		fechaSalida: '28 jul 2026, 21:15',
		precinto: 'BO7245111',
		cerradoPor: 'caracollo_ext',
		// Sin GPS no hay detección de entrada/salida: la ruta no tiene geocercas.
		geocerca: { estado: 'en-ruta' },
		geocercasRuta: [],
		sap: { pedido: '6012828006', salidaMercancia: '0819353031', numeroTransporte: '0007767461', cliCodigo: '0000464766', cenCodigo: 'B424' },
		agencia: { estadoCruce: 'No', pasoAgencia: 'No' },
		urgente: false,
		coordenadas: { lat: -17.9833, lng: -67.1167 },
		eventos: [
			{ id: 'e1', timestamp: '28 jul, 21:15', tipo: 'inicio',  titulo: 'Salida de planta', descripcion: 'Registrado en SCL. Sin GPS: los avances se conocen por hitos documentales.', ubicacion: 'Oruro, Bolivia' },
		],
	},

	// ── Despachos entregados (semanas anteriores) ────────────────────────────
	// Historial para la demo: al filtrar por "Semana pasada" o "Este mes" se ven
	// viajes ya completados. Están en retorno, con recepción registrada.

	// ·· Esta semana (20–26 jul) ··
	{
		id: 'PEWDSP206740',
		unidad: '2748HRK',
		placa: '2748HRK',
		tipoVehiculo: 'Remolque',
		conductor: '5240118',
		transportista: 'COOPERATIVA DE TRANSPORTE DE',
		nit: '182078028',
		origen: 'Warnes',
		destino: 'Arequipa',
		rutaCodigo: 'BPAREQ',
		rutaNombre: 'BO - PDF - AREQUIPA',
		planta: 'Planta de extracción Warnes Don Felipe',
		estado: 'en-retorno',
		tiempoEnEstado: '1 día 4h',
		ultimaUbicacion: 'Descargado en Arequipa · unidad en retorno',
		ultimaActualizacion: 'hace 3 h',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '15.120 kg',
		pesoSalida: '43.500 kg',
		pesoNeto: '28.380 kg',
		distancia: '1.150 km | 22 h 16 min',
		fechaDocumentada: '22/Jul/2026',
		cumpleEtaIdeal: true,
		gps: true,
		fechaSalida: '21 jul 2026, 21:00',
		etaOriginal: '23 Jul. 09:30',
		etaActual: 'Llegó 23 Jul. 08:55',
		etaRecorrido: '30 a 36 hrs.',
		lote: '1T 21/07/2026',
		precinto: 'BO7250940',
		cerradoPor: 'wmoza',
		geocerca: { estado: 'dentro', actual: 'cd-arequipa', desde: '23 jul, 08:55', tiempoDentro: 'Entregado' },
		geocercasRuta: ['planta-warnes', 'frontera-desaguadero', 'cd-arequipa'],
		sap: { pedido: '6012827740', salidaMercancia: '0819352810', numeroTransporte: '0007767401', cliCodigo: '0000458281', cenCodigo: 'B419' },
		agencia: { estadoCruce: 'Sí', fechaCruce: '22 jul 2026, 07:40', pasoAgencia: 'Sí', dex: 'DEX-2026-118412', mic: 'MIC-BO-481902', crt: 'CRT-BO-770815' },
		recepcion: { fecha: '23 jul 2026, 09:20', pesoRecibido: '28.340 kg' },
		urgente: false,
		coordenadas: { lat: -16.4090, lng: -71.5375 },
		eventos: [
			{ id: 'e1', timestamp: '21 jul, 21:00', tipo: 'carga',    titulo: 'Inicio de carga', ubicacion: 'Warnes, Bolivia', geocerca: 'planta-warnes' },
			{ id: 'e2', timestamp: '22 jul, 07:40', tipo: 'frontera', titulo: 'Cruce de frontera completado', ubicacion: 'Desaguadero, frontera BO–PE', geocerca: 'frontera-desaguadero' },
			{ id: 'e3', timestamp: '23 jul, 08:55', tipo: 'descarga', titulo: 'Llegada a destino e inicio de descarga', ubicacion: 'CD Arequipa, Perú', geocerca: 'cd-arequipa' },
			{ id: 'e4', timestamp: '23 jul, 09:20', tipo: 'sistema',  titulo: 'Recepción registrada', descripcion: 'Peso recibido: 28.340 kg.', ubicacion: 'CD Arequipa, Perú', geocerca: 'cd-arequipa' },
		],
	},
	{
		id: 'ORUDSP008910',
		unidad: '3921KLT',
		placa: '3921KLT',
		tipoVehiculo: 'Remolque',
		conductor: '4771260',
		transportista: 'TRANSPORTES FUENTES SRL.',
		nit: '1025665020',
		origen: 'Oruro',
		destino: 'Arica',
		rutaCodigo: 'BOARIC',
		rutaNombre: 'BO - ORURO - ARICA',
		planta: 'Oruro',
		estado: 'en-retorno',
		tiempoEnEstado: '2 días 6h',
		ultimaUbicacion: 'Descargado en Puerto de Arica · unidad en retorno',
		ultimaActualizacion: 'hace 6 h',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '16.040 kg',
		pesoSalida: '41.820 kg',
		pesoNeto: '25.780 kg',
		distancia: '432 km | 7 h 38 min',
		fechaDocumentada: '23/Jul/2026',
		cumpleEtaIdeal: true,
		gps: true,
		fechaSalida: '23 jul 2026, 04:30',
		etaOriginal: '23 Jul. 13:00',
		etaActual: 'Llegó 23 Jul. 12:35',
		etaRecorrido: '7 a 9 hrs.',
		precinto: 'BO7245080',
		cerradoPor: 'caracollo_ext',
		geocerca: { estado: 'dentro', actual: 'puerto-arica', desde: '23 jul, 12:35', tiempoDentro: 'Entregado' },
		geocercasRuta: ['planta-oruro', 'frontera-tambo-quemado', 'puerto-arica'],
		sap: { pedido: '6012827910', salidaMercancia: '0819352990', numeroTransporte: '0007767410', cliCodigo: '0000464766', cenCodigo: 'B424' },
		agencia: { estadoCruce: 'Sí', fechaCruce: '23 jul 2026, 08:10', pasoAgencia: 'Sí', dex: 'DEX-2026-118455', mic: 'MIC-BO-481955', crt: 'CRT-BO-770860' },
		recepcion: { fecha: '23 jul 2026, 13:05', pesoRecibido: '25.720 kg' },
		urgente: false,
		coordenadas: { lat: -18.4783, lng: -70.3126 },
		eventos: [
			{ id: 'e1', timestamp: '23 jul, 04:30', tipo: 'inicio',   titulo: 'Salida de planta', ubicacion: 'Oruro, Bolivia', geocerca: 'planta-oruro' },
			{ id: 'e2', timestamp: '23 jul, 08:10', tipo: 'frontera', titulo: 'Cruce de frontera completado', ubicacion: 'Chungará, Chile', geocerca: 'frontera-tambo-quemado' },
			{ id: 'e3', timestamp: '23 jul, 12:35', tipo: 'descarga', titulo: 'Llegada a destino e inicio de descarga', ubicacion: 'Puerto de Arica, Chile', geocerca: 'puerto-arica' },
			{ id: 'e4', timestamp: '23 jul, 13:05', tipo: 'sistema',  titulo: 'Recepción registrada', descripcion: 'Peso recibido: 25.720 kg.', ubicacion: 'Puerto de Arica, Chile', geocerca: 'puerto-arica' },
		],
	},
	{
		id: 'PLPDSP067040',
		unidad: '1180ZXB',
		placa: '1180ZXB',
		tipoVehiculo: 'Remolque',
		conductor: '3908145',
		transportista: 'CECILUNA TRANSPORTES S.R.L.',
		nit: '402420029',
		origen: 'El Alto',
		destino: 'Ilo',
		rutaCodigo: 'BEILO',
		rutaNombre: 'BO - EL ALTO - ILO',
		planta: 'Planta La Paz - El Alto',
		estado: 'en-retorno',
		tiempoEnEstado: '1 día 2h',
		ultimaUbicacion: 'Descargado en Puerto de Ilo · unidad en retorno',
		ultimaActualizacion: 'hace 9 h',
		carga: 'ACEITE DE SOYA',
		materialId: '000000000003410953',
		pesoIngreso: '15.510 kg',
		pesoSalida: '44.200 kg',
		pesoNeto: '28.690 kg',
		distancia: '537 km | 9 h 26 min',
		fechaDocumentada: '24/Jul/2026',
		cumpleEtaIdeal: false,
		gps: true,
		fechaSalida: '24 jul 2026, 05:00',
		etaOriginal: '24 Jul. 15:00',
		etaActual: 'Llegó 24 Jul. 16:20',
		etaRecorrido: '9 a 12 hrs.',
		retraso: '1 hr 20 min',
		lote: '2T 24/07/2026',
		precinto: 'BO7241080',
		cerradoPor: 'JOB_DESPACHO',
		geocerca: { estado: 'dentro', actual: 'puerto-ilo', desde: '24 jul, 16:20', tiempoDentro: 'Entregado' },
		geocercasRuta: ['planta-el-alto', 'frontera-desaguadero', 'puerto-ilo'],
		sap: { pedido: '6012827840', salidaMercancia: '0819352400', numeroTransporte: '0007766540', cliCodigo: '0000464766', cenCodigo: 'B423' },
		agencia: { estadoCruce: 'Sí', fechaCruce: '24 jul 2026, 09:45', pasoAgencia: 'Sí', dex: 'DEX-2026-118488', mic: 'MIC-BO-481988', crt: 'CRT-BO-770895' },
		recepcion: { fecha: '24 jul 2026, 16:50', pesoRecibido: '28.610 kg' },
		urgente: false,
		coordenadas: { lat: -17.6394, lng: -71.3436 },
		eventos: [
			{ id: 'e1', timestamp: '24 jul, 05:00', tipo: 'inicio',   titulo: 'Salida de planta', ubicacion: 'El Alto, Bolivia', geocerca: 'planta-el-alto' },
			{ id: 'e2', timestamp: '24 jul, 09:45', tipo: 'frontera', titulo: 'Cruce de frontera completado', ubicacion: 'Desaguadero, frontera BO–PE', geocerca: 'frontera-desaguadero' },
			{ id: 'e3', timestamp: '24 jul, 16:20', tipo: 'descarga', titulo: 'Llegada a destino e inicio de descarga', ubicacion: 'Puerto de Ilo, Perú', geocerca: 'puerto-ilo' },
			{ id: 'e4', timestamp: '24 jul, 16:50', tipo: 'sistema',  titulo: 'Recepción registrada', descripcion: 'Peso recibido: 28.610 kg.', ubicacion: 'Puerto de Ilo, Perú', geocerca: 'puerto-ilo' },
		],
	},

	// ·· Semana pasada (13–19 jul) ··
	{
		id: 'PEWDSP206730',
		unidad: '4402PLM',
		placa: '4402PLM',
		tipoVehiculo: 'Remolque',
		conductor: '6118304',
		transportista: 'EMPRESA EL PORVENIR Ltda.',
		nit: '1020681028',
		origen: 'Warnes',
		destino: 'La Paz',
		rutaCodigo: 'BPLPZ',
		rutaNombre: 'BO - PDF - LA PAZ',
		planta: 'Planta de extracción Warnes Don Felipe',
		estado: 'en-retorno',
		tiempoEnEstado: '5 días',
		ultimaUbicacion: 'Descargado en CD La Paz · unidad disponible',
		ultimaActualizacion: 'hace 4 días',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '15.700 kg',
		pesoSalida: '42.900 kg',
		pesoNeto: '27.200 kg',
		distancia: '873 km | 16 h 40 min',
		fechaDocumentada: '15/Jul/2026',
		cumpleEtaIdeal: true,
		gps: true,
		fechaSalida: '15 jul 2026, 06:20',
		etaOriginal: '16 Jul. 00:00',
		etaActual: 'Llegó 15 Jul. 23:10',
		etaRecorrido: '16 a 20 hrs.',
		lote: '3T 15/07/2026',
		precinto: 'BO7250820',
		cerradoPor: 'wmoza',
		geocerca: { estado: 'dentro', actual: 'cd-la-paz', desde: '15 jul, 23:10', tiempoDentro: 'Entregado' },
		geocercasRuta: ['planta-warnes', 'cd-la-paz'],
		sap: { pedido: '6012827730', salidaMercancia: '0819352700', numeroTransporte: '0007767301', cliCodigo: '0000458302', cenCodigo: 'B419' },
		recepcion: { fecha: '15 jul 2026, 23:40', pesoRecibido: '27.160 kg' },
		urgente: false,
		coordenadas: { lat: -16.4897, lng: -68.1500 },
		eventos: [
			{ id: 'e1', timestamp: '15 jul, 06:20', tipo: 'carga',    titulo: 'Inicio de carga', ubicacion: 'Warnes, Bolivia', geocerca: 'planta-warnes' },
			{ id: 'e2', timestamp: '15 jul, 23:10', tipo: 'descarga', titulo: 'Llegada a destino e inicio de descarga', ubicacion: 'CD La Paz, Bolivia', geocerca: 'cd-la-paz' },
			{ id: 'e3', timestamp: '15 jul, 23:40', tipo: 'sistema',  titulo: 'Recepción registrada', descripcion: 'Peso recibido: 27.160 kg.', ubicacion: 'CD La Paz, Bolivia', geocerca: 'cd-la-paz' },
		],
	},
	{
		id: 'ORUDSP008900',
		unidad: '2213NFC',
		placa: '2213NFC',
		tipoVehiculo: 'Remolque',
		conductor: '5502971',
		transportista: 'TRANSNOTEYSUR S.R.L.',
		nit: '402294029',
		origen: 'Oruro',
		destino: 'Arica',
		rutaCodigo: 'BOARIC',
		rutaNombre: 'BO - ORURO - ARICA',
		planta: 'Oruro',
		estado: 'en-retorno',
		tiempoEnEstado: '6 días',
		ultimaUbicacion: 'Descargado en Puerto de Arica · unidad disponible',
		ultimaActualizacion: 'hace 5 días',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '16.300 kg',
		pesoSalida: '42.100 kg',
		pesoNeto: '25.800 kg',
		distancia: '432 km | 7 h 38 min',
		fechaDocumentada: '16/Jul/2026',
		cumpleEtaIdeal: true,
		gps: true,
		fechaSalida: '16 jul 2026, 03:50',
		etaOriginal: '16 Jul. 12:30',
		etaActual: 'Llegó 16 Jul. 12:05',
		etaRecorrido: '7 a 9 hrs.',
		precinto: 'BO7245040',
		cerradoPor: 'caracollo_ext',
		geocerca: { estado: 'dentro', actual: 'puerto-arica', desde: '16 jul, 12:05', tiempoDentro: 'Entregado' },
		geocercasRuta: ['planta-oruro', 'frontera-tambo-quemado', 'puerto-arica'],
		sap: { pedido: '6012827900', salidaMercancia: '0819352950', numeroTransporte: '0007767290', cliCodigo: '0000464766', cenCodigo: 'B424' },
		agencia: { estadoCruce: 'Sí', fechaCruce: '16 jul 2026, 07:30', pasoAgencia: 'Sí', dex: 'DEX-2026-118380', mic: 'MIC-BO-481860', crt: 'CRT-BO-770780' },
		recepcion: { fecha: '16 jul 2026, 12:35', pesoRecibido: '25.760 kg' },
		urgente: false,
		coordenadas: { lat: -18.4783, lng: -70.3126 },
		eventos: [
			{ id: 'e1', timestamp: '16 jul, 03:50', tipo: 'inicio',   titulo: 'Salida de planta', ubicacion: 'Oruro, Bolivia', geocerca: 'planta-oruro' },
			{ id: 'e2', timestamp: '16 jul, 07:30', tipo: 'frontera', titulo: 'Cruce de frontera completado', ubicacion: 'Chungará, Chile', geocerca: 'frontera-tambo-quemado' },
			{ id: 'e3', timestamp: '16 jul, 12:05', tipo: 'descarga', titulo: 'Llegada a destino e inicio de descarga', ubicacion: 'Puerto de Arica, Chile', geocerca: 'puerto-arica' },
			{ id: 'e4', timestamp: '16 jul, 12:35', tipo: 'sistema',  titulo: 'Recepción registrada', descripcion: 'Peso recibido: 25.760 kg.', ubicacion: 'Puerto de Arica, Chile', geocerca: 'puerto-arica' },
		],
	},
	{
		id: 'PEWDSP206732',
		unidad: '3067QAD',
		placa: '3067QAD',
		tipoVehiculo: 'Remolque',
		conductor: '4290617',
		transportista: 'COOPERATIVA DE TRANSPORTE DE',
		nit: '182078028',
		origen: 'Warnes',
		destino: 'Arequipa',
		rutaCodigo: 'BPAREQ',
		rutaNombre: 'BO - PDF - AREQUIPA',
		planta: 'Planta de extracción Warnes Don Felipe',
		estado: 'en-retorno',
		tiempoEnEstado: '4 días',
		ultimaUbicacion: 'Descargado en Arequipa · unidad disponible',
		ultimaActualizacion: 'hace 4 días',
		carga: 'TORTA DE SOYA A GRANEL - HI PRO',
		materialId: '000000000009910975',
		pesoIngreso: '14.860 kg',
		pesoSalida: '43.200 kg',
		pesoNeto: '28.340 kg',
		distancia: '1.150 km | 22 h 16 min',
		fechaDocumentada: '17/Jul/2026',
		cumpleEtaIdeal: true,
		gps: true,
		fechaSalida: '17 jul 2026, 20:40',
		etaOriginal: '19 Jul. 08:30',
		etaActual: 'Llegó 19 Jul. 07:50',
		etaRecorrido: '30 a 36 hrs.',
		lote: '1T 17/07/2026',
		precinto: 'BO7250860',
		cerradoPor: 'wmoza',
		geocerca: { estado: 'dentro', actual: 'cd-arequipa', desde: '19 jul, 07:50', tiempoDentro: 'Entregado' },
		geocercasRuta: ['planta-warnes', 'frontera-desaguadero', 'cd-arequipa'],
		sap: { pedido: '6012827732', salidaMercancia: '0819352730', numeroTransporte: '0007767320', cliCodigo: '0000458281', cenCodigo: 'B419' },
		agencia: { estadoCruce: 'Sí', fechaCruce: '18 jul 2026, 07:15', pasoAgencia: 'Sí', dex: 'DEX-2026-118340', mic: 'MIC-BO-481820', crt: 'CRT-BO-770740' },
		recepcion: { fecha: '19 jul 2026, 08:15', pesoRecibido: '28.290 kg' },
		urgente: false,
		coordenadas: { lat: -16.4090, lng: -71.5375 },
		eventos: [
			{ id: 'e1', timestamp: '17 jul, 20:40', tipo: 'carga',    titulo: 'Inicio de carga', ubicacion: 'Warnes, Bolivia', geocerca: 'planta-warnes' },
			{ id: 'e2', timestamp: '18 jul, 07:15', tipo: 'frontera', titulo: 'Cruce de frontera completado', ubicacion: 'Desaguadero, frontera BO–PE', geocerca: 'frontera-desaguadero' },
			{ id: 'e3', timestamp: '19 jul, 07:50', tipo: 'descarga', titulo: 'Llegada a destino e inicio de descarga', ubicacion: 'CD Arequipa, Perú', geocerca: 'cd-arequipa' },
			{ id: 'e4', timestamp: '19 jul, 08:15', tipo: 'sistema',  titulo: 'Recepción registrada', descripcion: 'Peso recibido: 28.290 kg.', ubicacion: 'CD Arequipa, Perú', geocerca: 'cd-arequipa' },
		],
	},
];

// Keep the demo's operational dates aligned with the current week without
// changing the relative timing between trips, ETAs, geofences, and events.
// Las fechas base de julio se desplazan tantos días como haga falta para que el
// lunes base (27 jul 2026, día de los despachos activos) caiga sobre el lunes de
// la semana en curso. Al ser dinámico, el tablero siempre trae datos "de esta
// semana" el día que se demuestre, sin importar cuándo se ejecute.
const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Lunes de la semana a la que pertenece `d`. */
function lunesDeFecha(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // 0 = lunes … 6 = domingo
	return x;
}

// Lunes base de los datos crudos (27 jul 2026) → lunes de la semana actual.
const RAW_ANCHOR = new Date(2026, 6, 27);
const DEMO_SHIFT_DAYS = Math.round((lunesDeFecha(new Date()).getTime() - RAW_ANCHOR.getTime()) / 86_400_000);

function shiftDemoDates(value: unknown): unknown {
	if (typeof value === 'string') {
		const shift = (day: number, month: number, year: number) => {
			const date = new Date(year, month, day + DEMO_SHIFT_DAYS);
			return { day: date.getDate(), month: date.getMonth(), year: date.getFullYear() };
		};

		return value
			.replace(/(\d{1,2})\/(Jul|07)\/(2026)/gi, (_, day, month, year) => {
				const shifted = shift(Number(day), 6, Number(year));
				return `${String(shifted.day).padStart(2, '0')}/${MES_ABBR[shifted.month]}/${shifted.year}`;
			})
			.replace(/(\d{1,2})\/(0?7)\/(2026)/g, (_, day, month, year) => {
				const shifted = shift(Number(day), 6, Number(year));
				return `${String(shifted.day).padStart(2, '0')}/${String(shifted.month + 1).padStart(2, '0')}/${shifted.year}`;
			})
			.replace(/(\d{1,2})\s+(Jul\.?)((?:\s+2026)?)/gi, (_, day, month, yearSuffix) => {
				const shifted = shift(Number(day), 6, 2026);
				const monthLabel = MES_ABBR[shifted.month];
				const punctuation = month.endsWith('.') ? '.' : '';
				return `${shifted.day} ${monthLabel}${punctuation}${yearSuffix}`;
			});
	}
	if (Array.isArray(value)) return value.map(shiftDemoDates);
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, shiftDemoDates(entry)]));
	}
	return value;
}

const ROUTE_TIMINGS: Record<string, { duration: string; range: string }> = {
	'BO - PDF - AREQUIPA': { duration: '29 h 00 min', range: '29 a 34 hrs.' },
	'BO - PDF - LA PAZ':    { duration: '21 h 00 min', range: '20 a 24 hrs.' },
	'BO - EL ALTO - ILO':   { duration: '13 h 00 min', range: '13 a 16 hrs.' },
	'BO - ORURO - ARICA':   { duration: '11 h 00 min', range: '10 a 13 hrs.' },
};

function applyRealisticRouteTiming(trip: Trip): Trip {
	const timing = ROUTE_TIMINGS[trip.rutaNombre];
	if (!timing) return trip;
	const distance = trip.distancia.split('|')[0].trim();
	return { ...trip, distancia: `${distance} | ${timing.duration}`, etaRecorrido: timing.range };
}

// ────────────────────────────────────────────────────────────────────────────
// Prueba de estrés — flota sintética de la semana pico
// El cliente reporta ~700 despachos en tránsito por semana. Estos viajes
// sintéticos reproducen ese volumen para evaluar el rendimiento y la UI a
// escala. Sus fechas base (jul) pasan por shiftDemoDates y caen en la semana en
// curso. Ponga STRESS_TRIP_COUNT en 0 para volver a la flota base.
// ────────────────────────────────────────────────────────────────────────────
export const STRESS_TRIP_COUNT = 700;

type StressRoute = {
	origen: string; destino: string; rutaCodigo: string; rutaNombre: string;
	planta: string; prefijo: string; km: string;
	geocercasRuta: string[]; frontera?: string; destinoZona: string;
	/** Índice de la frontera en `ciudades`/`coords` (−1 si el corredor es doméstico). */
	fronteraIdx: number;
	ciudades: string[]; coords: [number, number][];
};

const STRESS_ROUTES: StressRoute[] = [
	{ origen: 'Warnes', destino: 'Arequipa', rutaCodigo: 'BPAREQ', rutaNombre: 'BO - PDF - AREQUIPA', planta: 'Planta de extracción Warnes Don Felipe', prefijo: 'PEWDSP', km: '1.150 km',
		geocercasRuta: ['planta-warnes', 'frontera-desaguadero', 'cd-arequipa'], frontera: 'frontera-desaguadero', destinoZona: 'cd-arequipa', fronteraIdx: 3,
		ciudades: ['Cochabamba, Bolivia', 'Caracollo, Bolivia', 'Patacamaya, Bolivia', 'Desaguadero, frontera BO–PE', 'Puno, Perú', 'Arequipa, Perú'],
		coords: [[-17.39, -66.16], [-17.66, -67.19], [-17.24, -67.92], [-16.56, -69.04], [-15.84, -70.02], [-16.41, -71.54]] },
	{ origen: 'Oruro', destino: 'Arica', rutaCodigo: 'BOARIC', rutaNombre: 'BO - ORURO - ARICA', planta: 'Oruro', prefijo: 'ORUDSP', km: '432 km',
		geocercasRuta: ['planta-oruro', 'frontera-tambo-quemado', 'puerto-arica'], frontera: 'frontera-tambo-quemado', destinoZona: 'puerto-arica', fronteraIdx: 3,
		ciudades: ['Oruro, Bolivia', 'Toledo, Bolivia', 'Pisiga, frontera BO–CL', 'Tambo Quemado, frontera BO–CL', 'Putre, Chile', 'Arica, Chile'],
		coords: [[-17.98, -67.15], [-18.02, -67.36], [-19.19, -68.66], [-18.27, -68.47], [-18.20, -69.56], [-18.48, -70.31]] },
	{ origen: 'El Alto', destino: 'Ilo', rutaCodigo: 'BEILO', rutaNombre: 'BO - EL ALTO - ILO', planta: 'Planta La Paz - El Alto', prefijo: 'PLPDSP', km: '537 km',
		geocercasRuta: ['planta-el-alto', 'frontera-desaguadero', 'puerto-ilo'], frontera: 'frontera-desaguadero', destinoZona: 'puerto-ilo', fronteraIdx: 2,
		ciudades: ['El Alto, Bolivia', 'Viacha, Bolivia', 'Desaguadero, frontera BO–PE', 'Moquegua, Perú', 'Ilo, Perú'],
		coords: [[-16.50, -68.16], [-16.65, -68.30], [-16.56, -69.04], [-17.19, -70.93], [-17.64, -71.34]] },
	{ origen: 'Warnes', destino: 'La Paz', rutaCodigo: 'BPLPZ', rutaNombre: 'BO - PDF - LA PAZ', planta: 'Planta de extracción Warnes Don Felipe', prefijo: 'PEWDSP', km: '873 km',
		geocercasRuta: ['planta-warnes', 'cd-la-paz'], destinoZona: 'cd-la-paz', fronteraIdx: -1,
		ciudades: ['Cochabamba, Bolivia', 'Caracollo, Bolivia', 'Patacamaya, Bolivia', 'El Alto, Bolivia', 'La Paz, Bolivia'],
		coords: [[-17.39, -66.16], [-17.66, -67.19], [-17.24, -67.92], [-16.50, -68.16], [-16.50, -68.12]] },
];

const STRESS_CARRIERS = [
	{ nombre: 'COOPERATIVA DE TRANSPORTE DE', nit: '182078028' },
	{ nombre: 'EMPRESA EL PORVENIR Ltda.', nit: '1020681028' },
	{ nombre: 'CECILUNA TRANSPORTES S.R.L.', nit: '164902024' },
	{ nombre: 'TRANSPORTES FUENTES SRL.', nit: '318273027' },
	{ nombre: 'INTERNAL. SERVICIO DE TRANSPORTE', nit: '279013025' },
	{ nombre: 'TRANSNOTEYSUR S.R.L.', nit: '204517026' },
];
const STRESS_PRODUCTS = [
	{ carga: 'ACEITE DE SOYA', materialId: '000000000009910412' },
	{ carga: 'TORTA DE SOYA A GRANEL - HI PRO', materialId: '000000000009910975' },
];

/** PRNG determinista (LCG) — builds estables entre recargas. */
function makeRng(seed: number) {
	let s = seed >>> 0;
	return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 0xffffffff; };
}

function generateStressTrips(count: number): Trip[] {
	if (count <= 0) return [];
	const rng = makeRng(20260812);
	const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)];
	const pad = (n: number, len: number) => String(n).padStart(len, '0');
	const kg = (n: number) => `${Math.floor(n / 1000)}.${pad(n % 1000, 3)} kg`;
	const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
	const dias = ['27', '28', '29'];
	const cerradores = ['wmoza', 'jlara', 'rvilla', 'mcondori', 'aquispe'];
	// coords del template = [lat, lng]; los centros de GEOCERCAS = [lng, lat].
	const zonaPos = (zoneId: string): { lat: number; lng: number } => {
		const c = GEOCERCAS[zoneId]?.centro;
		return c ? { lat: c[1], lng: c[0] } : { lat: 0, lng: 0 };
	};
	const jitter = (v: number) => +(v + (rng() - 0.5) * 0.05).toFixed(4);
	const out: Trip[] = [];

	for (let i = 0; i < count; i++) {
		const r = pick(STRESS_ROUTES);
		const tieneFrontera = r.fronteraIdx >= 0;
		const lastIdx = r.coords.length - 1;
		const originZone = r.geocercasRuta[0];
		const dia = dias[Math.floor(rng() * dias.length)];
		const etaHH = pad(12 + Math.floor(rng() * 8), 2);
		const id = `${r.prefijo}${pad(300000 + i, 6)}`;

		// Etapa del viaje → estado. Posición, geocerca, ubicación y eventos se
		// derivan de la MISMA etapa para que el mapa, el itinerario y la línea de
		// tiempo cuenten la misma historia.
		let estado: TripState;
		const roll = rng();
		if (roll < 0.03) estado = 'incidencia';
		else if (roll < 0.09) estado = 'en-descarga';
		else if (roll < 0.17) estado = 'en-carga';
		else if (roll < 0.24 && tieneFrontera) estado = 'en-frontera';
		else estado = 'en-transito';

		let posLat: number;
		let posLng: number;
		let ubicacion: string;
		let geocerca: TripGeocerca;
		let pasoFrontera = false;

		if (estado === 'en-carga') {
			const p = zonaPos(originZone);
			posLat = jitter(p.lat); posLng = jitter(p.lng);
			ubicacion = `${r.origen}, Bolivia`;
			geocerca = { estado: 'dentro', actual: originZone, desde: `${dia} Jul. 0${2 + Math.floor(rng() * 6)}:15`, tiempoDentro: `${20 + Math.floor(rng() * 39)}min` };
		} else if (estado === 'en-frontera') {
			const [la, ln] = r.coords[r.fronteraIdx];
			posLat = jitter(la); posLng = jitter(ln);
			ubicacion = r.ciudades[r.fronteraIdx];
			geocerca = { estado: 'dentro', actual: r.frontera!, desde: `${dia} Jul. ${etaHH}:10`, tiempoDentro: `${1 + Math.floor(rng() * 4)}h ${pad(Math.floor(rng() * 59), 2)}min` };
		} else if (estado === 'en-descarga') {
			const [la, ln] = r.coords[lastIdx];
			posLat = jitter(la); posLng = jitter(ln);
			ubicacion = r.ciudades[lastIdx];
			pasoFrontera = tieneFrontera;
			geocerca = { estado: 'dentro', actual: r.destinoZona, desde: `${dia} Jul. ${etaHH}:00`, tiempoDentro: `${10 + Math.floor(rng() * 49)}min` };
		} else {
			// en-transito / incidencia → un punto entre nodos, antes o después de
			// la frontera (si el corredor la tiene).
			const post = tieneFrontera ? rng() < 0.5 : true;
			let idx: number;
			if (tieneFrontera && !post) {
				idx = Math.floor(rng() * r.fronteraIdx); // planta → frontera
			} else if (tieneFrontera) {
				const lo = r.fronteraIdx + 1;
				idx = lo + Math.floor(rng() * Math.max(1, lastIdx - lo)); // frontera → destino
				pasoFrontera = true;
			} else {
				idx = Math.floor(rng() * lastIdx); // corredor doméstico
			}
			const [la, ln] = r.coords[idx];
			posLat = jitter(la); posLng = jitter(ln);
			ubicacion = r.ciudades[idx];
			const proxima = pasoFrontera || !tieneFrontera ? r.destinoZona : r.frontera!;
			geocerca = { estado: 'en-ruta', proxima, etaProxima: `${dia} Jul. ${etaHH}:30` };
		}

		// ── Eventos coherentes con la etapa alcanzada ──
		let evH = 5 + Math.floor(rng() * 4);
		const evTs = () => { const t = `${dia} jul, ${pad(Math.min(evH, 23), 2)}:${pad(Math.floor(rng() * 59), 2)}`; evH += 2 + Math.floor(rng() * 3); return t; };
		const eventos: TripEvent[] = [
			{ id: `${id}-e1`, timestamp: evTs(), tipo: 'carga', titulo: 'Inicio de carga', ubicacion: `${r.origen}, Bolivia`, geocerca: originZone },
		];
		if (estado !== 'en-carga') {
			eventos.push({ id: `${id}-e2`, timestamp: evTs(), tipo: 'inicio', titulo: 'Salida de planta', ubicacion: `${r.origen}, Bolivia` });
		}
		if (estado === 'en-frontera') {
			eventos.push({ id: `${id}-e3`, timestamp: evTs(), tipo: 'frontera', titulo: 'Llegada a frontera', ubicacion: r.ciudades[r.fronteraIdx], geocerca: r.frontera });
		} else if (pasoFrontera && r.frontera) {
			eventos.push({ id: `${id}-e3`, timestamp: evTs(), tipo: 'frontera', titulo: 'Cruce de frontera completado', ubicacion: r.ciudades[r.fronteraIdx], geocerca: r.frontera });
		}
		if (estado === 'en-descarga') {
			eventos.push({ id: `${id}-e4`, timestamp: evTs(), tipo: 'descarga', titulo: 'Llegada a destino e inicio de descarga', ubicacion: r.ciudades[lastIdx], geocerca: r.destinoZona });
		}
		if (estado === 'incidencia') {
			eventos.push({ id: `${id}-inc`, timestamp: evTs(), tipo: 'incidencia', titulo: 'Incidente', descripcion: 'Falla mecánica reportada. Vehículo detenido en vía. Servicio técnico en camino.', ubicacion });
		}

		const carrier = pick(STRESS_CARRIERS);
		const prod = pick(STRESS_PRODUCTS);
		const neto = 26800 + Math.floor(rng() * 2800);
		const placa = `${pad(1000 + Math.floor(rng() * 8999), 4)}${pick(L)}${pick(L)}${pick(L)}`;
		const gps = rng() > 0.06;
		const hh = pad(6 + Math.floor(rng() * 12), 2);

		out.push({
			id,
			unidad: placa,
			placa,
			tipoVehiculo: 'Remolque',
			conductor: pad(3000000 + Math.floor(rng() * 6999999), 7),
			transportista: carrier.nombre,
			nit: carrier.nit,
			origen: r.origen,
			destino: r.destino,
			rutaCodigo: r.rutaCodigo,
			rutaNombre: r.rutaNombre,
			planta: r.planta,
			estado,
			tiempoEnEstado: `${Math.floor(rng() * 9)}h ${pad(Math.floor(rng() * 59), 2)}min`,
			ultimaUbicacion: ubicacion,
			ultimaActualizacion: `hace ${1 + Math.floor(rng() * 45)} min`,
			carga: prod.carga,
			materialId: prod.materialId,
			pesoIngreso: kg(14980),
			pesoSalida: kg(14980 + neto),
			pesoNeto: kg(neto),
			distancia: r.km,
			fechaDocumentada: `${dia}/Jul/2026`,
			fechaSalida: `${dia} jul 2026, ${hh}:00`,
			gps,
			etaOriginal: `31 Jul. ${pad(8 + Math.floor(rng() * 10), 2)}:00`,
			etaActual: `31 Jul. ${pad(9 + Math.floor(rng() * 11), 2)}:30`,
			cumpleEtaIdeal: rng() > 0.4,
			precinto: `BO${pad(7000000 + Math.floor(rng() * 999999), 7)}`,
			cerradoPor: pick(cerradores),
			geocerca,
			geocercasRuta: r.geocercasRuta,
			sap: {
				pedido: pad(6012800000 + Math.floor(rng() * 99999), 10),
				salidaMercancia: pad(819352000 + Math.floor(rng() * 9999), 10),
				numeroTransporte: pad(7767000 + Math.floor(rng() * 9999), 10),
				cliCodigo: pad(458200 + Math.floor(rng() * 199), 10),
				cenCodigo: 'B419',
			},
			urgente: estado === 'incidencia' || rng() < 0.04,
			coordenadas: { lat: posLat, lng: posLng },
			eventos,
		});
	}
	return out;
}

// Tiempo que la unidad pasó en cada estado de detención, por título de evento.
// El estado ACTUAL del despacho no se fija aquí: la vista de detalle lo
// sustituye por `tiempoEnEstado` real (coincide con las tarjetas). Los hitos de
// paso (Salida de planta, Control en ruta, Recepción, Alerta) no llevan tiempo.
const DURACION_POR_TITULO: Record<string, string> = {
	'Inicio de carga': '2h 10min',
	'Descanso': '45min',
	'Llegada a frontera': '38min',
	'Cruce de frontera completado': '1h 15min',
	'Llegada a destino e inicio de descarga': '32min',
};
function conDuraciones(trip: Trip): Trip {
	const tieneLlegadaFrontera = trip.eventos.some((e) => e.titulo === 'Llegada a frontera');
	return {
		...trip,
		eventos: trip.eventos.map((e) => {
			// Evita duplicar el tiempo de frontera cuando existen ambos hitos.
			if (e.titulo === 'Cruce de frontera completado' && tieneLlegadaFrontera) return e;
			const d = DURACION_POR_TITULO[e.titulo];
			return d ? { ...e, duracion: d } : e;
		}),
	};
}

export const trips: Trip[] = [...rawTrips, ...generateStressTrips(STRESS_TRIP_COUNT)]
	.map((trip) => shiftDemoDates(trip) as Trip)
	.map(applyRealisticRouteTiming)
	.map(conDuraciones);

const baseAlertas: Alerta[] = [
	{
		id: 'A-001',
		tripId: 'PEWDSP206746',
		unidad: '3480IZA',
		tipo: 'critico',
		mensaje: 'Falla mecánica cerca de Cochabamba. Vehículo detenido en vía.',
		tiempo: 'hace 8 min',
	},
	{
		id: 'A-002',
		tripId: 'PEWDSP206749',
		unidad: '794UTB',
		tipo: 'retraso',
		mensaje: 'Tiempo en frontera supera umbral esperado (4h). Demora en trámite aduanero en Desaguadero.',
		tiempo: 'hace 22 min',
	},
	{
		id: 'A-003',
		tripId: 'ORUDSP008917',
		unidad: '5271KTC',
		tipo: 'parada',
		mensaje: 'Unidad en espera de carga por más de 1h en planta Oruro.',
		tiempo: 'hace 30 min',
	},
	{
		// Incidencia global: no pertenece a un despacho concreto.
		id: 'A-004',
		tipo: 'desvio',
		mensaje: 'Bloqueo preventivo en la ruta hacia Desaguadero. Coordinación monitorea el desvío.',
		tiempo: 'hace 42 min',
	},
];

// Prueba de estrés — incidencias en volumen. Con cientos de alertas la vista de
// tarjetas deja de escalar: por eso Incidencias pasa a tabla (con búsqueda y
// chips por tipo). Ponga STRESS_INC_COUNT en 0 para volver a las 4 base.
export const STRESS_INC_COUNT = 140;

function generateStressIncidencias(pool: Trip[], count: number): Alerta[] {
	if (count <= 0 || pool.length === 0) return [];
	const rng = makeRng(76543210);
	const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)];
	const tipos: AlertaTipo[] = ['critico', 'critico', 'retraso', 'retraso', 'retraso', 'parada', 'parada', 'desvio'];
	const plantillas: Record<AlertaTipo, string[]> = {
		critico: [
			'Falla mecánica reportada. Vehículo detenido en {loc}.',
			'Accidente de tránsito en {loc}. Unidad inmovilizada.',
			'Reventón de neumático cerca de {loc}. Atención en sitio.',
		],
		retraso: [
			'Tiempo en frontera supera el umbral esperado en {loc}.',
			'Demora en trámite aduanero en {loc}.',
			'Retraso por congestión vehicular cerca de {loc}.',
		],
		parada: [
			'Unidad en espera de carga por más de 1h en {loc}.',
			'Parada obligatoria prolongada en {loc}.',
			'Unidad detenida sin novedad reportada en {loc}.',
		],
		desvio: [
			'Bloqueo en la ruta hacia {loc}. Desvío en coordinación.',
			'Desvío por corte de vía cerca de {loc}.',
			'Ruta alterna activada por manifestación en {loc}.',
		],
	};
	const globalLocs = ['Desaguadero', 'Tambo Quemado', 'Patacamaya', 'Cochabamba', 'Oruro'];
	const out: Alerta[] = [];
	for (let i = 0; i < count; i++) {
		const tipo = pick(tipos);
		const trip = rng() < 0.08 ? null : pick(pool);
		const loc = trip ? trip.ultimaUbicacion : pick(globalLocs);
		const min = 2 + Math.floor(rng() * 340);
		const tiempo = min < 60 ? `hace ${min} min` : `hace ${Math.floor(min / 60)} h ${min % 60} min`;
		out.push({
			id: `SIM-${String(i + 1).padStart(4, '0')}`,
			tripId: trip?.id,
			unidad: trip?.unidad,
			tipo,
			mensaje: pick(plantillas[tipo]).replace('{loc}', loc),
			tiempo,
		});
	}
	return out;
}

export const alertas: Alerta[] = [...baseAlertas, ...generateStressIncidencias(trips, STRESS_INC_COUNT)];

export function getStateCounts(list: Trip[]) {
	return {
		enTransito:    list.filter(t => t.estado === 'en-transito').length,
		enFrontera:    list.filter(t => t.estado === 'en-frontera').length,
		conIncidencia: list.filter(t => t.estado === 'incidencia').length,
		enCarga:       list.filter(t => t.estado === 'en-carga').length,
		enDescarga:    list.filter(t => t.estado === 'en-descarga').length,
		enRetorno:     list.filter(t => t.estado === 'en-retorno').length,
	};
}
