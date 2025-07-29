import { INodeProperties } from 'n8n-workflow';
import { createOperationProperty, createPaginationProperties } from './baseProperties';
import { PODCAST_GENRES } from '../utils/genreOptions';
import { COUNTRIES } from '../utils/countryOptions';

export const topChartsOperationProperty = createOperationProperty('topCharts', [
	{
		name: 'Get Top Charts by Country',
		value: 'getByCountry',
		description: 'Get Apple Podcasts top charts by country',
		action: 'Get top charts by country',
	},
	{
		name: 'Get Top Charts by Genre',
		value: 'getByGenres',
		description: 'Get Apple Podcasts top charts by genre',
		action: 'Get top charts by genre',
	},
]);

export const topChartsProperties: INodeProperties[] = [
	{
		displayName: 'Content Type',
		name: 'topChartsContentType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['topCharts'],
			},
		},
		options: [
			{
				name: 'Podcasts',
				value: 'PODCASTSERIES',
			},
			{
				name: 'Episodes',
				value: 'PODCASTEPISODE',
			},
		],
		default: 'PODCASTSERIES',
		description: 'Type of content to get top charts for. Note: Only Episodes are available when using "By Genres" with a country filter.',
	},
	{
		displayName: 'Country',
		name: 'topChartsCountry',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['topCharts'],
				operation: ['getByCountry'],
			},
		},
		options: COUNTRIES,
		default: 'UNITED_STATES_OF_AMERICA',
		description: 'Country to get top charts for',
	},
	{
		displayName: 'Genres',
		name: 'topChartsGenres',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['topCharts'],
				operation: ['getByGenres'],
			},
		},
		options: PODCAST_GENRES,
		default: ['PODCASTSERIES_TECHNOLOGY'],
		description: 'Genres to get top charts for',
	},
	{
		displayName: 'Filter by Country',
		name: 'topChartsFilterByCountry',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['topCharts'],
				operation: ['getByGenres'],
			},
		},
		options: COUNTRIES,
		default: '',
		description: 'Optionally filter results by country (required for episodes)',
	},
	{
		displayName: 'Source',
		name: 'topChartsSource',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['topCharts'],
			},
		},
		options: [
			{
				name: 'Apple Podcasts',
				value: 'APPLE_PODCASTS',
			},
		],
		default: 'APPLE_PODCASTS',
		description: 'Platform source for top charts data',
	},
	...createPaginationProperties(['topCharts'], ['getByCountry', 'getByGenres'], 'topCharts'),
];