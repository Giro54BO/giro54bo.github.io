import { error } from '@sveltejs/kit';
import { trips } from '$lib/data/trips';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const trip = trips.find(t => t.id === params.id);
	if (!trip) error(404, 'Viaje no encontrado');
	return { trip };
};
