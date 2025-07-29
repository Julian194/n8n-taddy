import { INodeProperties } from 'n8n-workflow';
import { createOperationProperty, createPaginationProperties, createResponseFieldsProperty, COMMON_FIELD_OPTIONS, EPISODE_FIELD_OPTIONS } from './baseProperties';

const searchOperationPropertyBase = createOperationProperty('search', [
	{
		name: 'Search',
		value: 'searchContent',
		description: 'Search across podcasts, episodes, comics, and creators',
		action: 'Search podcasts and episodes',
	},
]);

export const searchOperationProperty = {
	...searchOperationPropertyBase,
	default: 'searchContent',
};

export const searchProperties: INodeProperties[] = [
	{
		displayName: 'Search Term',
		name: 'searchTerm',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['searchContent'],
			},
		},
		default: '',
		placeholder: 'Enter search term',
		description: 'The term to search for across podcasts, episodes, comics, and creators. You can exclude terms by adding a minus sign (e.g., "Tim Ferriss -crypto").',
	},
	{
		displayName: 'Exclude Terms',
		name: 'excludeTerms',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['searchContent'],
			},
		},
		default: '',
		placeholder: 'crypto, bitcoin, investment',
		description: 'Comma-separated list of terms to exclude from search results. These will be automatically added with minus signs to your search term.',
	},
	{
		displayName: 'Content Types',
		name: 'contentTypes',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['searchContent'],
			},
		},
		options: [
			{
				name: 'Podcast Series',
				value: 'PODCASTSERIES',
			},
			{
				name: 'Podcast Episode',
				value: 'PODCASTEPISODE',
			},
			{
				name: 'Comic Series',
				value: 'COMICSERIES',
			},
			{
				name: 'Creator',
				value: 'CREATOR',
			},
		],
		default: ['PODCASTSERIES', 'PODCASTEPISODE'],
		description: 'Types of content to search for',
	},
	{
		displayName: 'Sort By',
		name: 'sortBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['searchContent'],
			},
		},
		options: [
			{
				name: 'Exactness',
				value: 'EXACTNESS',
			},
			{
				name: 'Popularity',
				value: 'POPULARITY',
			},
		],
		default: 'POPULARITY',
		description: 'How to sort the search results',
	},
	{
		displayName: 'Match Type',
		name: 'matchType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['searchContent'],
			},
		},
		options: [
			{
				name: 'All Terms',
				value: 'ALL_TERMS',
			},
			{
				name: 'Exact Phrase',
				value: 'EXACT_PHRASE',
			},
			{
				name: 'Most Terms',
				value: 'MOST_TERMS',
			},
		],
		default: 'MOST_TERMS',
		description: 'How to match the search terms',
	},
	...createPaginationProperties(['search'], ['searchContent']),
	createResponseFieldsProperty(
		'responseFields',
		['search'],
		['searchContent'],
		[
			...EPISODE_FIELD_OPTIONS,
			COMMON_FIELD_OPTIONS.popularityRank,
		],
		['uuid', 'name', 'description']
	),
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['searchContent'],
			},
		},
		options: [
			{
				displayName: 'Countries',
				name: 'filterForCountries',
				type: 'string',
				default: '',
				placeholder: 'US,GB,CA',
				description: 'Filter by comma-separated ISO country codes (e.g., US,GB,CA)',
			},
			{
				displayName: 'Duration Greater Than (Seconds)',
				name: 'filterForDurationGreaterThan',
				type: 'number',
				default: '',
				typeOptions: {
					minValue: 1,
				},
				description: 'Filter for episodes longer than this duration in seconds',
			},
			{
				displayName: 'Duration Less Than (Seconds)',
				name: 'filterForDurationLessThan',
				type: 'number',
				default: '',
				typeOptions: {
					minValue: 1,
				},
				description: 'Filter for episodes shorter than this duration in seconds',
			},
			{
				displayName: 'Genres',
				name: 'filterForGenres',
				type: 'string',
				default: '',
				placeholder: 'Technology,Business,News',
				description: 'Filter by comma-separated genres',
			},
			{
				displayName: 'Has Chapters',
				name: 'filterForHasChapters',
				type: 'boolean',
				default: false,
				description: 'Whether to filter for episodes that have chapters',
			},
			{
				displayName: 'Has Transcript',
				name: 'filterForHasTranscript',
				type: 'boolean',
				default: false,
				description: 'Whether to filter for content that has transcripts',
			},
			{
				displayName: 'Languages',
				name: 'filterForLanguages',
				type: 'string',
				default: '',
				placeholder: 'en,es,fr',
				description: 'Filter by comma-separated language codes (e.g., en,es,fr)',
			},
			{
				displayName: 'Last Updated After',
				name: 'filterForLastUpdatedAfter',
				type: 'dateTime',
				default: '',
				description: 'Filter for content last updated after this date',
			},
			{
				displayName: 'Last Updated Before',
				name: 'filterForLastUpdatedBefore',
				type: 'dateTime',
				default: '',
				description: 'Filter for content last updated before this date',
			},
			{
				displayName: 'Podcast Content Type',
				name: 'filterForPodcastContentType',
				type: 'options',
				options: [
					{
						name: 'Audio',
						value: 'AUDIO',
					},
					{
						name: 'Video',
						value: 'VIDEO',
					},
				],
				default: 'AUDIO',
				description: 'Filter by audio or video content',
			},
			{
				displayName: 'Podcast UUIDs',
				name: 'filterForSeriesUuids',
				type: 'string',
				default: '',
				placeholder: 'uuid1,uuid2,uuid3',
				description: 'Filter by comma-separated podcast UUIDs',
			},
			{
				displayName: 'Published After',
				name: 'filterForPublishedAfter',
				type: 'dateTime',
				default: '',
				description: 'Filter for content published after this date',
			},
			{
				displayName: 'Published Before',
				name: 'filterForPublishedBefore',
				type: 'dateTime',
				default: '',
				description: 'Filter for content published before this date',
			},
			{
				displayName: 'Safe Mode',
				name: 'isSafeMode',
				type: 'boolean',
				default: true,
				description: 'Whether to filter out explicit content',
			},
			{
				displayName: 'Total Episodes Greater Than',
				name: 'filterForTotalEpisodesGreaterThan',
				type: 'number',
				default: '',
				typeOptions: {
					minValue: 1,
				},
				description: 'Filter for podcasts with more than this many episodes',
			},
			{
				displayName: 'Total Episodes Less Than',
				name: 'filterForTotalEpisodesLessThan',
				type: 'number',
				default: '',
				typeOptions: {
					minValue: 1,
				},
				description: 'Filter for podcasts with fewer than this many episodes',
			},
		],
	},
];