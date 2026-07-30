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
	tripId: string;
	unidad: string;
	tipo: 'desvio' | 'parada' | 'retraso' | 'critico';
	mensaje: string;
	tiempo: string;
}

export const STATE_LABELS: Record<TripState, string> = {
	'en-carga':        'En carga',
	'en-transito':     'En tránsito',
	'en-frontera':     'En frontera',
	'en-descarga':     'En descarga',
	'en-retorno':      'En retorno',
	'incidencia':      'Detenido por incidencia',
};

export const trips: Trip[] = [
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
			{ id: 'e1', timestamp: '29 jul, 12:40', tipo: 'sistema', titulo: 'En carga', descripcion: 'Todas las bahías de carga ocupadas.', ubicacion: 'Planta Oruro', geocerca: 'planta-oruro' },
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

export const alertas: Alerta[] = [
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
];

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
