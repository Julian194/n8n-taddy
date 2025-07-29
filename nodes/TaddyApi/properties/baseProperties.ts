import { INodeProperties } from 'n8n-workflow';

export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Episode',
			value: 'episode',
		},
		{
			name: 'Latest Episode',
			value: 'latest',
		},
		{
			name: 'Podcast',
			value: 'podcast',
		},
		{
			name: 'Popular Content',
			value: 'popular',
		},
		{
			name: 'Search',
			value: 'search',
		},
		{
			name: 'Top Chart',
			value: 'topCharts',
		},
		{
			name: 'Transcript',
			value: 'transcript',
		},
	],
	default: 'search',
	required: true,
};

export function createOperationProperty(resource: string, operations: Array<{name: string, value: string, description: string, action: string}>): INodeProperties {
	return {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: '',
		default: operations.length > 0 ? operations[0].value : '',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [resource],
			},
		},
		options: operations,
		required: true,
	};
}

export function createPaginationProperties(resourceFilter: string[], operationFilter: string[], namePrefix = ''): INodeProperties[] {
	const prefix = namePrefix ? `${namePrefix}` : '';
	
	return [
		{
			displayName: 'Page',
			name: `${prefix}page`,
			type: 'number',
			displayOptions: {
				show: {
					resource: resourceFilter,
					operation: operationFilter,
				},
			},
			default: 1,
			typeOptions: {
				minValue: 1,
				maxValue: 20,
			},
			description: 'Page number (1-20)',
		},
		{
			displayName: 'Results Per Page',
			name: `${prefix}limitPerPage`,
			type: 'number',
			displayOptions: {
				show: {
					resource: resourceFilter,
					operation: operationFilter,
				},
			},
			default: 10,
			typeOptions: {
				minValue: 1,
				maxValue: 25,
			},
			description: 'Number of results per page (1-25)',
		},
	];
}

export function createResponseFieldsProperty(
	name: string,
	resourceFilter: string[],
	operationFilter: string[],
	fieldOptions: Array<{name: string; value: string; description?: string}>,
	defaultFields: string[] = ['uuid', 'name', 'description']
): INodeProperties {
	return {
		displayName: 'Response Fields',
		name,
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: resourceFilter,
				operation: operationFilter,
			},
		},
		options: fieldOptions,
		default: [],
		noDataExpression: true,
		description: 'Select which fields to include in the response',
	};
}

export const COMMON_FIELD_OPTIONS = {
	uuid: { name: 'UUID', value: 'uuid', description: 'Unique identifier' },
	name: { name: 'Name/Title', value: 'name', description: 'Name or title' },
	description: { name: 'Description', value: 'description', description: 'Description or summary' },
	imageUrl: { name: 'Image URL', value: 'imageUrl', description: 'Cover art or image URL' },
	language: { name: 'Language', value: 'language', description: 'Content language' },
	popularityRank: { name: 'Popularity Rank', value: 'popularityRank', description: 'Popularity ranking' },
	websiteUrl: { name: 'Website URL', value: 'websiteUrl', description: 'Official website' },
} as const;

export const PODCAST_FIELD_OPTIONS = [
	COMMON_FIELD_OPTIONS.uuid,
	COMMON_FIELD_OPTIONS.name,
	COMMON_FIELD_OPTIONS.description,
	COMMON_FIELD_OPTIONS.imageUrl,
	{ name: 'iTunes ID', value: 'itunesId' },
	COMMON_FIELD_OPTIONS.language,
	COMMON_FIELD_OPTIONS.popularityRank,
	{ name: 'RSS URL', value: 'rssUrl' },
	{ name: 'Total Episodes Count', value: 'totalEpisodesCount' },
	COMMON_FIELD_OPTIONS.websiteUrl,
	{ name: 'Countries', value: 'countries' },
	{ name: 'Genres', value: 'genres' },
];

export const EPISODE_FIELD_OPTIONS = [
	COMMON_FIELD_OPTIONS.uuid,
	COMMON_FIELD_OPTIONS.name,
	COMMON_FIELD_OPTIONS.description,
	{ name: 'Audio URL', value: 'audioUrl' },
	{ name: 'Date Published', value: 'datePublished' },
	{ name: 'Duration', value: 'duration' },
	{ name: 'Episode Number', value: 'episodeNumber' },
	{ name: 'Season Number', value: 'seasonNumber' },
	{ name: 'Website URL', value: 'websiteUrl' },
	{ name: 'Podcast Description', value: 'podcastDescription' },
	{ name: 'Podcast Image URL', value: 'podcastImageUrl' },
	{ name: 'iTunes ID', value: 'itunesId' },
	{ name: 'RSS URL', value: 'rssUrl' },
];