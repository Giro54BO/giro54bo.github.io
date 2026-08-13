// Descarga de Excel — placeholder para el prototipo.
//
// El botón "Excel" de cada tarjeta debe exportar sus datos a una planilla. Para
// el prototipo descargamos un .xlsx VACÍO válido (una hoja "Datos" sin filas):
// así el cliente entiende el comportamiento sin que aún exista el backend que
// arme el reporte real. Reemplazar por una exportación con datos cuando exista.
const EMPTY_XLSX_B64 =
	'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';

function slugify(name: string): string {
	return name
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '') || 'reporte';
}

/**
 * Descarga un .xlsx vacío con el nombre de la tarjeta. Prototipo: aún no arma
 * el reporte con datos, sólo demuestra la acción de exportar.
 */
export function downloadCardExcel(cardTitle: string): void {
	const binary = atob(EMPTY_XLSX_B64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	const blob = new Blob([bytes], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `iasa-${slugify(cardTitle)}.xlsx`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
