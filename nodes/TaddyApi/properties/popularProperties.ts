import { INodeProperties } from 'n8n-workflow';
import { createOperationProperty, createPaginationProperties, createResponseFieldsProperty, PODCAST_FIELD_OPTIONS } from './baseProperties';
import { PODCAST_GENRES } from '../utils/genreOptions';

export const popularOperationProperty = createOperationProperty('popular', [
	{
		name: 'Get Popular',
		value: 'getPopular',
		description: 'Get popular/trending podcasts',
		action: 'Get popular content',
	},
]);

export const popularProperties: INodeProperties[] = [
	{
		displayName: 'Language',
		name: 'popularLanguage',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['popular'],
				operation: ['getPopular'],
			},
		},
		default: '',
		placeholder: 'en',
		description: 'Filter by language code (optional)',
	},
	{
		displayName: 'Genres',
		name: 'popularGenres',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['popular'],
				operation: ['getPopular'],
			},	
		},
		default: [],
		options: PODCAST_GENRES,
		description: 'Filter by genres (select multiple, leave empty for all genres)',
	},
	...createPaginationProperties(['popular'], ['getPopular'], 'popular'),
	createResponseFieldsProperty(
		'popularResponseFields',
		['popular'],
		['getPopular'],
		PODCAST_FIELD_OPTIONS as Array<{name: string; value: string; description?: string}>,
		['uuid', 'name', 'description']
	),
];