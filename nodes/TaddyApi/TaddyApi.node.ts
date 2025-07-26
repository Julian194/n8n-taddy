import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeConnectionType,
	NodeOperationError,
	IHttpRequestMethods,
} from 'n8n-workflow';

import {
	buildSearchQuery,
	buildGetPodcastSeriesQuery,
	buildGetEpisodeQuery,
	buildGetPopularContentQuery,
	buildGetLatestEpisodesQuery,
	buildGetEpisodeTranscriptQuery,
	buildGetTopChartsByCountryQuery,
	buildGetTopChartsByGenresQuery,
	SearchFilters,
	SearchOptions,
} from './utils/graphqlQueries';

import {
	processSearchResults,
	processPodcastSeriesResult,
	processEpisodeResult,
	processPopularContentResults,
	processLatestEpisodesResults,
	processTranscriptResult,
	processTopChartsResults,
} from './utils/responseProcessors';

import {
	validateSearchTerm,
	validateFilterValues,
	validatePaginationParams,
	validateUuid,
	validateUrl,
	validateItunesId,
	validateLanguageCode,
	sanitizeSearchTerm,
} from './utils/validators';

async function executeGraphQLQuery(context: IExecuteFunctions, query: string): Promise<any> {
	const options = {
		method: 'POST' as IHttpRequestMethods,
		url: 'https://api.taddy.org',
		body: {
			query,
		},
		json: true,
	};

	try {
		const response = await context.helpers.requestWithAuthentication.call(context, 'taddyApi', options);
		
		if (response.errors) {
			// Include the actual GraphQL errors in the error message
			const errorDetails = response.errors.map((err: any) => err.message).join(', ');
			throw new NodeApiError(context.getNode(), {
				message: `GraphQL Error: ${errorDetails}`,
				description: `Errors: ${JSON.stringify(response.errors)}. Query: ${query}`,
			});
		}
		
		return response.data;
	} catch (error) {
		// Enhanced error logging for debugging - include all details in the error message
		const debugInfo = {
			message: error.message,
			status: error.response?.status,
			statusText: error.response?.statusText,
			responseData: error.response?.data,
			responseHeaders: error.response?.headers
		};
		
		const errorMsg = `API Error: ${error.message}. Status: ${error.response?.status}. Debug: ${JSON.stringify(debugInfo)}. Query: ${query}`;
		throw new NodeOperationError(context.getNode(), errorMsg);
	}
}

async function executeSearchContent(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const searchTerm = this.getNodeParameter('searchTerm', itemIndex) as string;
	const excludeTerms = this.getNodeParameter('excludeTerms', itemIndex, '') as string;
	const contentTypes = this.getNodeParameter('contentTypes', itemIndex) as string[];
	const sortBy = this.getNodeParameter('sortBy', itemIndex) as 'POPULARITY' | 'EXACTNESS';
	const matchType = this.getNodeParameter('matchType', itemIndex) as 'EXACT_PHRASE' | 'ALL_TERMS' | 'MOST_TERMS';
	const page = this.getNodeParameter('page', itemIndex) as number;
	const limitPerPage = this.getNodeParameter('limitPerPage', itemIndex) as number;
	const responseFields = this.getNodeParameter('responseFields', itemIndex) as string[];
	const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as any;

	// Build final search term with exclusions
	let finalSearchTerm = searchTerm;
	if (excludeTerms && excludeTerms.trim()) {
		const excludeList = excludeTerms
			.split(',')
			.map(term => term.trim())
			.filter(term => term.length > 0)
			.map(term => `-${term}`)
			.join(' ');
		
		if (excludeList) {
			finalSearchTerm = `${searchTerm} ${excludeList}`;
		}
	}

	// Validate search term
	if (!validateSearchTerm(finalSearchTerm)) {
		throw new NodeOperationError(this.getNode(), 'Invalid search term. Must be 1-500 characters.', {
			itemIndex,
		});
	}

	// Validate pagination
	const { page: validPage, limitPerPage: validLimit } = validatePaginationParams(page, limitPerPage);

	// Build search options
	const searchOptions: SearchOptions = {
		term: sanitizeSearchTerm(finalSearchTerm),
		page: validPage,
		limitPerPage: validLimit,
		sortBy,
		matchType,
	};

	// Build filters
	const filters: SearchFilters = {
		filterForTypes: contentTypes,
	};

	// Process additional options
	if (additionalOptions.filterForCountries) {
		filters.filterForCountries = additionalOptions.filterForCountries.split(',').map((c: string) => c.trim());
	}
	if (additionalOptions.filterForLanguages) {
		filters.filterForLanguages = additionalOptions.filterForLanguages.split(',').map((l: string) => l.trim());
	}
	if (additionalOptions.filterForGenres) {
		filters.filterForGenres = additionalOptions.filterForGenres.split(',').map((g: string) => g.trim());
	}
	if (additionalOptions.filterForSeriesUuids) {
		filters.filterForSeriesUuids = additionalOptions.filterForSeriesUuids.split(',').map((u: string) => u.trim());
	}
	if (additionalOptions.filterForPodcastContentType) {
		filters.filterForPodcastContentType = additionalOptions.filterForPodcastContentType;
	}
	if (additionalOptions.filterForPublishedAfter) {
		filters.filterForPublishedAfter = Math.floor(new Date(additionalOptions.filterForPublishedAfter).getTime() / 1000);
	}
	if (additionalOptions.filterForPublishedBefore) {
		filters.filterForPublishedBefore = Math.floor(new Date(additionalOptions.filterForPublishedBefore).getTime() / 1000);
	}
	if (additionalOptions.filterForLastUpdatedAfter) {
		filters.filterForLastUpdatedAfter = Math.floor(new Date(additionalOptions.filterForLastUpdatedAfter).getTime() / 1000);
	}
	if (additionalOptions.filterForLastUpdatedBefore) {
		filters.filterForLastUpdatedBefore = Math.floor(new Date(additionalOptions.filterForLastUpdatedBefore).getTime() / 1000);
	}
	if (additionalOptions.filterForDurationLessThan) {
		filters.filterForDurationLessThan = additionalOptions.filterForDurationLessThan;
	}
	if (additionalOptions.filterForDurationGreaterThan) {
		filters.filterForDurationGreaterThan = additionalOptions.filterForDurationGreaterThan;
	}
	if (additionalOptions.filterForTotalEpisodesLessThan) {
		filters.filterForTotalEpisodesLessThan = additionalOptions.filterForTotalEpisodesLessThan;
	}
	if (additionalOptions.filterForTotalEpisodesGreaterThan) {
		filters.filterForTotalEpisodesGreaterThan = additionalOptions.filterForTotalEpisodesGreaterThan;
	}
	if (additionalOptions.filterForHasTranscript !== undefined && additionalOptions.filterForHasTranscript !== '') {
		filters.filterForHasTranscript = additionalOptions.filterForHasTranscript;
	}
	if (additionalOptions.filterForHasChapters !== undefined && additionalOptions.filterForHasChapters !== '') {
		filters.filterForHasChapters = additionalOptions.filterForHasChapters;
	}
	if (additionalOptions.isSafeMode !== undefined && additionalOptions.isSafeMode !== '') {
		filters.isSafeMode = additionalOptions.isSafeMode;
	}

	// Validate filters
	const validationErrors = validateFilterValues(filters);
	if (validationErrors.length > 0) {
		throw new NodeOperationError(this.getNode(), `Filter validation errors: ${validationErrors.join(', ')}`, {
			itemIndex,
		});
	}

	// Build and execute query
	const query = buildSearchQuery(searchOptions, filters, responseFields);
	const data = await executeGraphQLQuery(this, query);

	// Process and return results
	return processSearchResults(data);
}

async function executeGetPodcastDetails(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const identifierType = this.getNodeParameter('podcastIdentifierType', itemIndex) as 'uuid' | 'name' | 'itunesId' | 'rssUrl';
	const identifier = this.getNodeParameter('podcastIdentifier', itemIndex) as string;

	if (!identifier) {
		throw new NodeOperationError(this.getNode(), 'Podcast identifier is required', {
			itemIndex,
		});
	}

	// Validate identifier based on type
	if (identifierType === 'uuid' && !validateUuid(identifier)) {
		throw new NodeOperationError(this.getNode(), 'Invalid UUID format', {
			itemIndex,
		});
	}
	if (identifierType === 'itunesId' && !validateItunesId(identifier)) {
		throw new NodeOperationError(this.getNode(), 'Invalid iTunes ID format', {
			itemIndex,
		});
	}
	if (identifierType === 'rssUrl' && !validateUrl(identifier)) {
		throw new NodeOperationError(this.getNode(), 'Invalid RSS URL format', {
			itemIndex,
		});
	}

	// Build and execute query
	const query = buildGetPodcastSeriesQuery(identifier, identifierType);
	const data = await executeGraphQLQuery(this, query);

	// Process and return result
	return processPodcastSeriesResult(data);
}

async function executeGetEpisodeDetails(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const identifierType = this.getNodeParameter('episodeIdentifierType', itemIndex) as 'uuid' | 'guid' | 'name';
	const identifier = this.getNodeParameter('episodeIdentifier', itemIndex) as string;

	if (!identifier) {
		throw new NodeOperationError(this.getNode(), 'Episode identifier is required', {
			itemIndex,
		});
	}

	// Validate identifier based on type
	if (identifierType === 'uuid' && !validateUuid(identifier)) {
		throw new NodeOperationError(this.getNode(), 'Invalid UUID format', {
			itemIndex,
		});
	}

	// Build and execute query
	const query = buildGetEpisodeQuery(identifier, identifierType);
	const data = await executeGraphQLQuery(this, query);

	// Process and return result
	return processEpisodeResult(data);
}

async function executeGetPopularContent(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const language = this.getNodeParameter('popularLanguage', itemIndex) as string;
	const genres = this.getNodeParameter('popularGenres', itemIndex) as string[];
	const page = this.getNodeParameter('popularPage', itemIndex) as number;
	const limitPerPage = this.getNodeParameter('popularLimitPerPage', itemIndex) as number;
	const responseFields = this.getNodeParameter('popularResponseFields', itemIndex) as string[];

	// Validate pagination
	const { page: validPage, limitPerPage: validLimit } = validatePaginationParams(page, limitPerPage);

	// Validate language code if provided
	if (language && !validateLanguageCode(language)) {
		throw new NodeOperationError(this.getNode(), 'Invalid language code format', {
			itemIndex,
		});
	}

	// Build and execute query
	const query = buildGetPopularContentQuery(
		language || undefined,
		genres?.length ? genres : undefined,
		validPage,
		validLimit,
		responseFields
	);
	const data = await executeGraphQLQuery(this, query);

	// Process and return results
	return processPopularContentResults(data);
}

async function executeGetLatestEpisodes(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const uuidsString = this.getNodeParameter('latestPodcastUuids', itemIndex) as string;
	
	if (!uuidsString) {
		throw new NodeOperationError(this.getNode(), 'Podcast UUIDs are required', {
			itemIndex,
		});
	}
	
	const podcastUuids = uuidsString.split(',').map(uuid => uuid.trim());
	
	// Validate UUIDs
	for (const uuid of podcastUuids) {
		if (!validateUuid(uuid)) {
			throw new NodeOperationError(this.getNode(), `Invalid UUID format: ${uuid}`, {
				itemIndex,
			});
		}
	}

	// Build and execute query
	const query = buildGetLatestEpisodesQuery(podcastUuids);
	const data = await executeGraphQLQuery(this, query);

	// Process and return results
	return processLatestEpisodesResults(data);
}

async function executeGetTranscript(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const episodeUuid = this.getNodeParameter('transcriptEpisodeUuid', itemIndex) as string;
	const useOnDemandCredits = this.getNodeParameter('useOnDemandCredits', itemIndex) as boolean;

	if (!episodeUuid) {
		throw new NodeOperationError(this.getNode(), 'Episode UUID is required', {
			itemIndex,
		});
	}

	// Validate UUID format
	if (!validateUuid(episodeUuid)) {
		throw new NodeOperationError(this.getNode(), 'Invalid episode UUID format', {
			itemIndex,
		});
	}

	// Build and execute query
	const query = buildGetEpisodeTranscriptQuery(episodeUuid, useOnDemandCredits);
	const data = await executeGraphQLQuery(this, query);

	// Process and return result
	return processTranscriptResult(data);
}

async function executeGetTopChartsByCountry(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const contentType = this.getNodeParameter('topChartsContentType', itemIndex) as 'PODCASTSERIES' | 'PODCASTEPISODE';
	const country = this.getNodeParameter('topChartsCountry', itemIndex) as string;
	const source = this.getNodeParameter('topChartsSource', itemIndex, 'APPLE_PODCASTS') as string;
	const page = this.getNodeParameter('topChartsPage', itemIndex) as number;
	const limitPerPage = this.getNodeParameter('topChartsLimitPerPage', itemIndex) as number;

	// Validate pagination
	const { page: validPage, limitPerPage: validLimit } = validatePaginationParams(page, limitPerPage);

	// Build and execute query
	const query = buildGetTopChartsByCountryQuery(contentType, country, source, validPage, validLimit);
	const data = await executeGraphQLQuery(this, query);

	// Process and return results
	return processTopChartsResults(data, 'country');
}

async function executeGetTopChartsByGenres(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const contentType = this.getNodeParameter('topChartsContentType', itemIndex) as 'PODCASTSERIES' | 'PODCASTEPISODE';
	const genres = this.getNodeParameter('topChartsGenres', itemIndex) as string[];
	const source = this.getNodeParameter('topChartsSource', itemIndex, 'APPLE_PODCASTS') as string;
	const filterByCountry = this.getNodeParameter('topChartsFilterByCountry', itemIndex, '') as string;
	const page = this.getNodeParameter('topChartsPage', itemIndex) as number;
	const limitPerPage = this.getNodeParameter('topChartsLimitPerPage', itemIndex) as number;

	if (!genres || genres.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one genre must be selected', {
			itemIndex,
		});
	}

	// Validate content type when country filter is used
	if (filterByCountry && contentType === 'PODCASTSERIES') {
		throw new NodeOperationError(this.getNode(), 'Podcasts content type is not available when filtering by country. Please select Episodes instead.', {
			itemIndex,
		});
	}

	// Validate pagination
	const { page: validPage, limitPerPage: validLimit } = validatePaginationParams(page, limitPerPage);

	// Build and execute query
	const query = buildGetTopChartsByGenresQuery(
		contentType,
		genres,
		source,
		filterByCountry || undefined,
		validPage,
		validLimit
	);
	const data = await executeGraphQLQuery(this, query);

	// Process and return results
	return processTopChartsResults(data, 'genres');
}

export class TaddyApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Taddy API',
		name: 'taddyApi',
		icon: 'file:taddyApi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Taddy Podcast API - Search 4M+ podcasts and 180M+ episodes',
		defaults: {
			name: 'Taddy API',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'taddyApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.taddy.org',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
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
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['search'],
					},
				},
				options: [
					{
						name: 'Search Content',
						value: 'searchContent',
						description: 'Search across podcasts, episodes, comics, and creators',
						action: 'Search for content',
					},
				],
				default: 'searchContent',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['podcast'],
					},
				},
				options: [
					{
						name: 'Get Details',
						value: 'getDetails',
						description: 'Get detailed information about a specific podcast',
						action: 'Get podcast details',
					},
				],
				default: 'getDetails',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['episode'],
					},
				},
				options: [
					{
						name: 'Get Details',
						value: 'getDetails',
						description: 'Get detailed information about a specific episode',
						action: 'Get episode details',
					},
				],
				default: 'getDetails',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['popular'],
					},
				},
				options: [
					{
						name: 'Get Popular',
						value: 'getPopular',
						description: 'Get popular/trending podcasts',
						action: 'Get popular content',
					},
				],
				default: 'getPopular',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['latest'],
					},
				},
				options: [
					{
						name: 'Get Latest',
						value: 'getLatest',
						description: 'Get latest episodes from multiple podcasts',
						action: 'Get latest episodes',
					},
				],
				default: 'getLatest',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['transcript'],
					},
				},
				options: [
					{
						name: 'Get Transcript',
						value: 'getTranscript',
						description: 'Get transcript for a specific episode',
						action: 'Get episode transcript',
					},
				],
				default: 'getTranscript',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['topCharts'],
					},
				},
				options: [
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
				],
				default: 'getByCountry',
				required: true,
			},
			// Search Content Parameters
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
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['search'],
						operation: ['searchContent'],
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
				name: 'limitPerPage',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['search'],
						operation: ['searchContent'],
					},
				},
				default: 10,
				typeOptions: {
					minValue: 1,
					maxValue: 25,
				},
				description: 'Number of results per page (1-25)',
			},
			{
				displayName: 'Response Fields',
				name: 'responseFields',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['search'],
						operation: ['searchContent'],
					},
				},
				options: [
					{
						name: 'Audio URL',
						value: 'audioUrl',
						description: 'Audio file URL (episodes only)',
					},
					{
						name: 'Date Published',
						value: 'datePublished',
						description: 'Publication date (episodes only)',
					},
					{
						name: 'Description',
						value: 'description',
						description: 'Description or summary',
					},
					{
						name: 'Duration',
						value: 'duration',
						description: 'Duration in seconds (episodes only)',
					},
					{
						name: 'Episode Number',
						value: 'episodeNumber',
						description: 'Episode number (episodes only)',
					},
					{
						name: 'Has Chapters',
						value: 'hasChapters',
						description: 'Whether chapters are available (episodes only)',
					},
					{
						name: 'Has Transcript',
						value: 'hasTranscript',
						description: 'Whether transcript is available',
					},
					{
						name: 'Image URL',
						value: 'imageUrl',
						description: 'Cover art or image URL',
					},
					{
						name: 'iTunes ID',
						value: 'itunesId',
						description: 'ITunes identifier (podcasts only)',
					},
					{
						name: 'Language',
						value: 'language',
						description: 'Content language',
					},
					{
						name: 'Name/Title',
						value: 'name',
						description: 'Name or title',
					},
					{
						name: 'Podcast Description (for Episodes)',
						value: 'podcastDescription',
						description: 'Include description of the podcast that the episode belongs to',
					},
					{
						name: 'Podcast Image URL (for Episodes)',
						value: 'podcastImageUrl',
						description: 'Include cover art of the podcast that the episode belongs to',
					},
					{
						name: 'Popularity Rank',
						value: 'popularityRank',
						description: 'Popularity ranking',
					},
					{
						name: 'RSS URL',
						value: 'rssUrl',
						description: 'RSS feed URL (podcasts only)',
					},
					{
						name: 'Season Number',
						value: 'seasonNumber',
						description: 'Season number (episodes only)',
					},
					{
						name: 'Total Episodes Count',
						value: 'totalEpisodesCount',
						description: 'Total number of episodes (podcasts only)',
					},
					{
						name: 'UUID',
						value: 'uuid',
						description: 'Unique identifier',
					},
					{
						name: 'Web URL',
						value: 'webUrl',
						description: 'Web page URL (episodes only)',
					},
					{
						name: 'Website URL',
						value: 'websiteUrl',
						description: 'Official website (podcasts only)',
					},
				],
				default: ['uuid', 'name', 'description'],
				description: 'Select which fields to include in the response',
			},
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
			// Podcast Details Parameters
			{
				displayName: 'Identifier Type',
				name: 'podcastIdentifierType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['podcast'],
						operation: ['getDetails'],
					},
				},
				options: [
					{
						name: 'UUID',
						value: 'uuid',
					},
					{
						name: 'Name',
						value: 'name',
					},
					{
						name: 'iTunes ID',
						value: 'itunesId',
					},
					{
						name: 'RSS URL',
						value: 'rssUrl',
					},
				],
				default: 'uuid',
				description: 'How to identify the podcast',
			},
			{
				displayName: 'Identifier Value',
				name: 'podcastIdentifier',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['podcast'],
						operation: ['getDetails'],
					},
				},
				default: '',
				placeholder: 'Enter UUID, name, iTunes ID, or RSS URL',
				description: 'The identifier value for the podcast',
			},
			// Episode Details Parameters
			{
				displayName: 'Identifier Type',
				name: 'episodeIdentifierType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['episode'],
						operation: ['getDetails'],
					},
				},
				options: [
					{
						name: 'UUID',
						value: 'uuid',
					},
					{
						name: 'GUID',
						value: 'guid',
					},
					{
						name: 'Name',
						value: 'name',
					},
				],
				default: 'uuid',
				description: 'How to identify the episode',
			},
			{
				displayName: 'Identifier Value',
				name: 'episodeIdentifier',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['episode'],
						operation: ['getDetails'],
					},
				},
				default: '',
				placeholder: 'Enter UUID, GUID, or episode name',
				description: 'The identifier value for the episode',
			},
			// Popular Content Parameters
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
				options: [
					{ name: 'Arts', value: 'PODCASTSERIES_ARTS' },
					{ name: 'Arts - Books', value: 'PODCASTSERIES_ARTS_BOOKS' },
					{ name: 'Arts - Design', value: 'PODCASTSERIES_ARTS_DESIGN' },
					{ name: 'Arts - Fashion and Beauty', value: 'PODCASTSERIES_ARTS_FASHION_AND_BEAUTY' },
					{ name: 'Arts - Food', value: 'PODCASTSERIES_ARTS_FOOD' },
					{ name: 'Arts - Performing Arts', value: 'PODCASTSERIES_ARTS_PERFORMING_ARTS' },
					{ name: 'Arts - Visual Arts', value: 'PODCASTSERIES_ARTS_VISUAL_ARTS' },
					{ name: 'Business', value: 'PODCASTSERIES_BUSINESS' },
					{ name: 'Business - Careers', value: 'PODCASTSERIES_BUSINESS_CAREERS' },
					{ name: 'Business - Entrepreneurship', value: 'PODCASTSERIES_BUSINESS_ENTREPRENEURSHIP' },
					{ name: 'Business - Investing', value: 'PODCASTSERIES_BUSINESS_INVESTING' },
					{ name: 'Business - Management', value: 'PODCASTSERIES_BUSINESS_MANAGEMENT' },
					{ name: 'Business - Marketing', value: 'PODCASTSERIES_BUSINESS_MARKETING' },
					{ name: 'Business - Non Profit', value: 'PODCASTSERIES_BUSINESS_NON_PROFIT' },
					{ name: 'Comedy', value: 'PODCASTSERIES_COMEDY' },
					{ name: 'Comedy - Improv', value: 'PODCASTSERIES_COMEDY_IMPROV' },
					{ name: 'Comedy - Interviews', value: 'PODCASTSERIES_COMEDY_INTERVIEWS' },
					{ name: 'Comedy - Stand-Up', value: 'PODCASTSERIES_COMEDY_STANDUP' },
					{ name: 'Education', value: 'PODCASTSERIES_EDUCATION' },
					{ name: 'Education - Courses', value: 'PODCASTSERIES_EDUCATION_COURSES' },
					{ name: 'Education - How To', value: 'PODCASTSERIES_EDUCATION_HOW_TO' },
					{ name: 'Education - Language Learning', value: 'PODCASTSERIES_EDUCATION_LANGUAGE_LEARNING' },
					{ name: 'Education - Self Improvement', value: 'PODCASTSERIES_EDUCATION_SELF_IMPROVEMENT' },
					{ name: 'Fiction', value: 'PODCASTSERIES_FICTION' },
					{ name: 'Fiction - Comedy Fiction', value: 'PODCASTSERIES_FICTION_COMEDY_FICTION' },
					{ name: 'Fiction - Drama', value: 'PODCASTSERIES_FICTION_DRAMA' },
					{ name: 'Fiction - Science Fiction', value: 'PODCASTSERIES_FICTION_SCIENCE_FICTION' },
					{ name: 'Government', value: 'PODCASTSERIES_GOVERNMENT' },
					{ name: 'Health and Fitness', value: 'PODCASTSERIES_HEALTH_AND_FITNESS' },
					{ name: 'Health and Fitness - Alternative Health', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_ALTERNATIVE_HEALTH' },
					{ name: 'Health and Fitness - Fitness', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_FITNESS' },
					{ name: 'Health and Fitness - Medicine', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_MEDICINE' },
					{ name: 'Health and Fitness - Mental Health', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_MENTAL_HEALTH' },
					{ name: 'Health and Fitness - Nutrition', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_NUTRITION' },
					{ name: 'Health and Fitness - Sexuality', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_SEXUALITY' },
					{ name: 'History', value: 'PODCASTSERIES_HISTORY' },
					{ name: 'Kids and Family', value: 'PODCASTSERIES_KIDS_AND_FAMILY' },
					{ name: 'Kids and Family - Education for Kids', value: 'PODCASTSERIES_KIDS_AND_FAMILY_EDUCATION_FOR_KIDS' },
					{ name: 'Kids and Family - Parenting', value: 'PODCASTSERIES_KIDS_AND_FAMILY_PARENTING' },
					{ name: 'Kids and Family - Pets and Animals', value: 'PODCASTSERIES_KIDS_AND_FAMILY_PETS_AND_ANIMALS' },
					{ name: 'Kids and Family - Stories for Kids', value: 'PODCASTSERIES_KIDS_AND_FAMILY_STORIES_FOR_KIDS' },
					{ name: 'Leisure', value: 'PODCASTSERIES_LEISURE' },
					{ name: 'Leisure - Animation and Manga', value: 'PODCASTSERIES_LEISURE_ANIMATION_AND_MANGA' },
					{ name: 'Leisure - Automotive', value: 'PODCASTSERIES_LEISURE_AUTOMOTIVE' },
					{ name: 'Leisure - Aviation', value: 'PODCASTSERIES_LEISURE_AVIATION' },
					{ name: 'Leisure - Crafts', value: 'PODCASTSERIES_LEISURE_CRAFTS' },
					{ name: 'Leisure - Games', value: 'PODCASTSERIES_LEISURE_GAMES' },
					{ name: 'Leisure - Hobbies', value: 'PODCASTSERIES_LEISURE_HOBBIES' },
					{ name: 'Leisure - Home and Garden', value: 'PODCASTSERIES_LEISURE_HOME_AND_GARDEN' },
					{ name: 'Leisure - Video Games', value: 'PODCASTSERIES_LEISURE_VIDEO_GAMES' },
					{ name: 'Music', value: 'PODCASTSERIES_MUSIC' },
					{ name: 'Music - Commentary', value: 'PODCASTSERIES_MUSIC_COMMENTARY' },
					{ name: 'Music - History', value: 'PODCASTSERIES_MUSIC_HISTORY' },
					{ name: 'Music - Interviews', value: 'PODCASTSERIES_MUSIC_INTERVIEWS' },
					{ name: 'News', value: 'PODCASTSERIES_NEWS' },
					{ name: 'News - Business', value: 'PODCASTSERIES_NEWS_BUSINESS' },
					{ name: 'News - Commentary', value: 'PODCASTSERIES_NEWS_COMMENTARY' },
					{ name: 'News - Daily News', value: 'PODCASTSERIES_NEWS_DAILY_NEWS' },
					{ name: 'News - Entertainment', value: 'PODCASTSERIES_NEWS_ENTERTAINMENT' },
					{ name: 'News - Politics', value: 'PODCASTSERIES_NEWS_POLITICS' },
					{ name: 'News - Sports', value: 'PODCASTSERIES_NEWS_SPORTS' },
					{ name: 'News - Tech', value: 'PODCASTSERIES_NEWS_TECH' },
					{ name: 'Religion and Spirituality', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY' },
					{ name: 'Religion and Spirituality - Buddhism', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_BUDDHISM' },
					{ name: 'Religion and Spirituality - Christianity', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_CHRISTIANITY' },
					{ name: 'Religion and Spirituality - Hinduism', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_HINDUISM' },
					{ name: 'Religion and Spirituality - Islam', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_ISLAM' },
					{ name: 'Religion and Spirituality - Judaism', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_JUDAISM' },
					{ name: 'Religion and Spirituality - Religion', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_RELIGION' },
					{ name: 'Religion and Spirituality - Spirituality', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_SPIRITUALITY' },
					{ name: 'Science', value: 'PODCASTSERIES_SCIENCE' },
					{ name: 'Science - Astronomy', value: 'PODCASTSERIES_SCIENCE_ASTRONOMY' },
					{ name: 'Science - Chemistry', value: 'PODCASTSERIES_SCIENCE_CHEMISTRY' },
					{ name: 'Science - Earth Sciences', value: 'PODCASTSERIES_SCIENCE_EARTH_SCIENCES' },
					{ name: 'Science - Life Sciences', value: 'PODCASTSERIES_SCIENCE_LIFE_SCIENCES' },
					{ name: 'Science - Mathematics', value: 'PODCASTSERIES_SCIENCE_MATHEMATICS' },
					{ name: 'Science - Natural Sciences', value: 'PODCASTSERIES_SCIENCE_NATURAL_SCIENCES' },
					{ name: 'Science - Nature', value: 'PODCASTSERIES_SCIENCE_NATURE' },
					{ name: 'Science - Physics', value: 'PODCASTSERIES_SCIENCE_PHYSICS' },
					{ name: 'Science - Social Sciences', value: 'PODCASTSERIES_SCIENCE_SOCIAL_SCIENCES' },
					{ name: 'Society and Culture', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE' },
					{ name: 'Society and Culture - Documentary', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_DOCUMENTARY' },
					{ name: 'Society and Culture - Personal Journals', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_PERSONAL_JOURNALS' },
					{ name: 'Society and Culture - Philosophy', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_PHILOSOPHY' },
					{ name: 'Society and Culture - Places and Travel', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_PLACES_AND_TRAVEL' },
					{ name: 'Society and Culture - Relationships', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_RELATIONSHIPS' },
					{ name: 'Sports', value: 'PODCASTSERIES_SPORTS' },
					{ name: 'Sports - Baseball', value: 'PODCASTSERIES_SPORTS_BASEBALL' },
					{ name: 'Sports - Basketball', value: 'PODCASTSERIES_SPORTS_BASKETBALL' },
					{ name: 'Sports - Cricket', value: 'PODCASTSERIES_SPORTS_CRICKET' },
					{ name: 'Sports - Fantasy Sports', value: 'PODCASTSERIES_SPORTS_FANTASY_SPORTS' },
					{ name: 'Sports - Football', value: 'PODCASTSERIES_SPORTS_FOOTBALL' },
					{ name: 'Sports - Golf', value: 'PODCASTSERIES_SPORTS_GOLF' },
					{ name: 'Sports - Hockey', value: 'PODCASTSERIES_SPORTS_HOCKEY' },
					{ name: 'Sports - Rugby', value: 'PODCASTSERIES_SPORTS_RUGBY' },
					{ name: 'Sports - Running', value: 'PODCASTSERIES_SPORTS_RUNNING' },
					{ name: 'Sports - Soccer', value: 'PODCASTSERIES_SPORTS_SOCCER' },
					{ name: 'Sports - Swimming', value: 'PODCASTSERIES_SPORTS_SWIMMING' },
					{ name: 'Sports - Tennis', value: 'PODCASTSERIES_SPORTS_TENNIS' },
					{ name: 'Sports - Volleyball', value: 'PODCASTSERIES_SPORTS_VOLLEYBALL' },
					{ name: 'Sports - Wilderness', value: 'PODCASTSERIES_SPORTS_WILDERNESS' },
					{ name: 'Sports - Wrestling', value: 'PODCASTSERIES_SPORTS_WRESTLING' },
					{ name: 'Technology', value: 'PODCASTSERIES_TECHNOLOGY' },
					{ name: 'True Crime', value: 'PODCASTSERIES_TRUE_CRIME' },
					{ name: 'TV and Film', value: 'PODCASTSERIES_TV_AND_FILM' },
					{ name: 'TV and Film - After Shows', value: 'PODCASTSERIES_TV_AND_FILM_AFTER_SHOWS' },
					{ name: 'TV and Film - Film Reviews', value: 'PODCASTSERIES_TV_AND_FILM_FILM_REVIEWS' },
					{ name: 'TV and Film - History', value: 'PODCASTSERIES_TV_AND_FILM_HISTORY' },
					{ name: 'TV and Film - Interviews', value: 'PODCASTSERIES_TV_AND_FILM_INTERVIEWS' },
					{ name: 'TV and Film - TV Reviews', value: 'PODCASTSERIES_TV_AND_FILM_TV_REVIEWS' },
				],
				description: 'Filter by genres (select multiple, leave empty for all genres)',
			},
			{
				displayName: 'Page',
				name: 'popularPage',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['popular'],
						operation: ['getPopular'],
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
				name: 'popularLimitPerPage',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['popular'],
						operation: ['getPopular'],
					},
				},
				default: 10,
				typeOptions: {
					minValue: 1,
					maxValue: 25,
				},
				description: 'Number of results per page (1-25)',
			},
			{
				displayName: 'Response Fields',
				name: 'popularResponseFields',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['popular'],
						operation: ['getPopular'],
					},
				},
				options: [
					{
						name: 'Description',
						value: 'description',
						description: 'Podcast description',
					},
					{
						name: 'Image URL',
						value: 'imageUrl',
						description: 'Podcast cover art URL',
					},
					{
						name: 'iTunes ID',
						value: 'itunesId',
						description: 'ITunes identifier',
					},
					{
						name: 'Language',
						value: 'language',
						description: 'Podcast language',
					},
					{
						name: 'Name/Title',
						value: 'name',
						description: 'Podcast name',
					},
					{
						name: 'Popularity Rank',
						value: 'popularityRank',
						description: 'Popularity ranking',
					},
					{
						name: 'RSS URL',
						value: 'rssUrl',
						description: 'RSS feed URL',
					},
					{
						name: 'Total Episodes Count',
						value: 'totalEpisodesCount',
						description: 'Total number of episodes',
					},
					{
						name: 'UUID',
						value: 'uuid',
						description: 'Unique identifier',
					},
				],
				default: ['uuid', 'name', 'description'],
				description: 'Select which fields to include in the response',
			},
			// Latest Episodes Parameters
			{
				displayName: 'Podcast UUIDs',
				name: 'latestPodcastUuids',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['latest'],
						operation: ['getLatest'],
					},
				},
				default: '',
				placeholder: 'uuid1,uuid2,uuid3',
				description: 'Comma-separated list of podcast UUIDs to get latest episodes from',
			},
			// Transcript Parameters
			{
				displayName: 'Episode UUID',
				name: 'transcriptEpisodeUuid',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['transcript'],
						operation: ['getTranscript'],
					},
				},
				default: '',
				placeholder: 'Episode UUID',
				description: 'The UUID of the episode to get transcript for',
			},
			{
				displayName: 'Use On-Demand Credits',
				name: 'useOnDemandCredits',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['transcript'],
						operation: ['getTranscript'],
					},
				},
				default: false,
				description: 'Whether to use on-demand transcription credits if needed',
			},
			// Top Charts Parameters
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
				options: [
					{ name: 'Afghanistan', value: 'AFGHANISTAN' },
					{ name: 'Åland Islands', value: 'ALAND_ISLANDS' },
					{ name: 'Albania', value: 'ALBANIA' },
					{ name: 'Algeria', value: 'ALGERIA' },
					{ name: 'American Samoa', value: 'AMERICAN_SAMOA' },
					{ name: 'Andorra', value: 'ANDORRA' },
					{ name: 'Angola', value: 'ANGOLA' },
					{ name: 'Anguilla', value: 'ANGUILLA' },
					{ name: 'Antarctica', value: 'ANTARCTICA' },
					{ name: 'Antigua and Barbuda', value: 'ANTIGUA_AND_BARBUDA' },
					{ name: 'Argentina', value: 'ARGENTINA' },
					{ name: 'Armenia', value: 'ARMENIA' },
					{ name: 'Aruba', value: 'ARUBA' },
					{ name: 'Australia', value: 'AUSTRALIA' },
					{ name: 'Austria', value: 'AUSTRIA' },
					{ name: 'Azerbaijan', value: 'AZERBAIJAN' },
					{ name: 'Bahamas', value: 'BAHAMAS' },
					{ name: 'Bahrain', value: 'BAHRAIN' },
					{ name: 'Bangladesh', value: 'BANGLADESH' },
					{ name: 'Barbados', value: 'BARBADOS' },
					{ name: 'Belarus', value: 'BELARUS' },
					{ name: 'Belgium', value: 'BELGIUM' },
					{ name: 'Belize', value: 'BELIZE' },
					{ name: 'Benin', value: 'BENIN' },
					{ name: 'Bermuda', value: 'BERMUDA' },
					{ name: 'Bhutan', value: 'BHUTAN' },
					{ name: 'Bolivia', value: 'BOLIVIA_PLURINATIONAL_STATE_OF' },
					{ name: 'Bonaire, Sint Eustatius and Saba', value: 'BONAIRE_SINT_EUSTATIUS_AND_SABA' },
					{ name: 'Bosnia and Herzegovina', value: 'BOSNIA_AND_HERZEGOVINA' },
					{ name: 'Botswana', value: 'BOTSWANA' },
					{ name: 'Bouvet Island', value: 'BOUVET_ISLAND' },
					{ name: 'Brazil', value: 'BRAZIL' },
					{ name: 'British Indian Ocean Territory', value: 'BRITISH_INDIAN_OCEAN_TERRITORY_THE' },
					{ name: 'Brunei Darussalam', value: 'BRUNEI_DARUSSALAM' },
					{ name: 'Bulgaria', value: 'BULGARIA' },
					{ name: 'Burkina Faso', value: 'BURKINA_FASO' },
					{ name: 'Burundi', value: 'BURUNDI' },
					{ name: 'Cabo Verde', value: 'CABO_VERDE' },
					{ name: 'Cambodia', value: 'CAMBODIA' },
					{ name: 'Cameroon', value: 'CAMEROON' },
					{ name: 'Canada', value: 'CANADA' },
					{ name: 'Cayman Islands', value: 'CAYMAN_ISLANDS' },
					{ name: 'Central African Republic', value: 'CENTRAL_AFRICAN_REPUBLIC' },
					{ name: 'Chad', value: 'CHAD' },
					{ name: 'Chile', value: 'CHILE' },
					{ name: 'China', value: 'CHINA' },
					{ name: 'Christmas Island', value: 'CHRISTMAS_ISLAND' },
					{ name: 'Cocos (Keeling) Islands', value: 'COCOS_KEELING_ISLANDS' },
					{ name: 'Colombia', value: 'COLOMBIA' },
					{ name: 'Comoros', value: 'COMOROS' },
					{ name: 'Congo', value: 'CONGO' },
					{ name: 'Congo (Democratic Republic)', value: 'CONGO_THE_DEMOCRATIC_REPUBLIC_OF' },
					{ name: 'Cook Islands', value: 'COOK_ISLANDS' },
					{ name: 'Costa Rica', value: 'COSTA_RICA' },
					{ name: "Côte d'Ivoire", value: 'COTE_D_IVOIRE' },
					{ name: 'Croatia', value: 'CROATIA' },
					{ name: 'Cuba', value: 'CUBA' },
					{ name: 'Curaçao', value: 'CURACAO' },
					{ name: 'Cyprus', value: 'CYPRUS' },
					{ name: 'Czechia', value: 'CZECHIA' },
					{ name: 'Denmark', value: 'DENMARK' },
					{ name: 'Djibouti', value: 'DJIBOUTI' },
					{ name: 'Dominica', value: 'DOMINICA' },
					{ name: 'Dominican Republic', value: 'DOMINICAN_REPUBLIC' },
					{ name: 'Ecuador', value: 'ECUADOR' },
					{ name: 'Egypt', value: 'EGYPT' },
					{ name: 'El Salvador', value: 'EL_SALVADOR' },
					{ name: 'Equatorial Guinea', value: 'EQUATORIAL_GUINEA' },
					{ name: 'Eritrea', value: 'ERITREA' },
					{ name: 'Estonia', value: 'ESTONIA' },
					{ name: 'Eswatini', value: 'ESWATINI' },
					{ name: 'Ethiopia', value: 'ETHIOPIA' },
					{ name: 'Falkland Islands (Malvinas)', value: 'FALKLAND_ISLANDS_THE_MALVINAS' },
					{ name: 'Faroe Islands', value: 'FAROE_ISLANDS' },
					{ name: 'Fiji', value: 'FIJI' },
					{ name: 'Finland', value: 'FINLAND' },
					{ name: 'France', value: 'FRANCE' },
					{ name: 'French Guiana', value: 'FRENCH_GUIANA' },
					{ name: 'French Polynesia', value: 'FRENCH_POLYNESIA' },
					{ name: 'French Southern Territories', value: 'FRENCH_SOUTHERN_TERRITORIES' },
					{ name: 'Gabon', value: 'GABON' },
					{ name: 'Gambia', value: 'GAMBIA' },
					{ name: 'Georgia', value: 'GEORGIA' },
					{ name: 'Germany', value: 'GERMANY' },
					{ name: 'Ghana', value: 'GHANA' },
					{ name: 'Gibraltar', value: 'GIBRALTAR' },
					{ name: 'Greece', value: 'GREECE' },
					{ name: 'Greenland', value: 'GREENLAND' },
					{ name: 'Grenada', value: 'GRENADA' },
					{ name: 'Guadeloupe', value: 'GUADELOUPE' },
					{ name: 'Guam', value: 'GUAM' },
					{ name: 'Guatemala', value: 'GUATEMALA' },
					{ name: 'Guernsey', value: 'GUERNSEY' },
					{ name: 'Guinea', value: 'GUINEA' },
					{ name: 'Guinea-Bissau', value: 'GUINEA_BISSAU' },
					{ name: 'Guyana', value: 'GUYANA' },
					{ name: 'Haiti', value: 'HAITI' },
					{ name: 'Heard Island and McDonald Islands', value: 'HEARD_ISLAND_AND_MCDONALD_ISLANDS' },
					{ name: 'Holy See', value: 'HOLY_SEE' },
					{ name: 'Honduras', value: 'HONDURAS' },
					{ name: 'Hong Kong', value: 'HONG_KONG' },
					{ name: 'Hungary', value: 'HUNGARY' },
					{ name: 'Iceland', value: 'ICELAND' },
					{ name: 'India', value: 'INDIA' },
					{ name: 'Indonesia', value: 'INDONESIA' },
					{ name: 'Iran', value: 'IRAN' },
					{ name: 'Iraq', value: 'IRAQ' },
					{ name: 'Ireland', value: 'IRELAND' },
					{ name: 'Isle of Man', value: 'ISLE_OF_MAN' },
					{ name: 'Israel', value: 'ISRAEL' },
					{ name: 'Italy', value: 'ITALY' },
					{ name: 'Jamaica', value: 'JAMAICA' },
					{ name: 'Japan', value: 'JAPAN' },
					{ name: 'Jersey', value: 'JERSEY' },
					{ name: 'Jordan', value: 'JORDAN' },
					{ name: 'Kazakhstan', value: 'KAZAKHSTAN' },
					{ name: 'Kenya', value: 'KENYA' },
					{ name: 'Kiribati', value: 'KIRIBATI' },
					{ name: 'Korea (North)', value: 'KOREA_NORTH' },
					{ name: 'Korea (South)', value: 'KOREA_SOUTH' },
					{ name: 'Kuwait', value: 'KUWAIT' },
					{ name: 'Kyrgyzstan', value: 'KYRGYZSTAN' },
					{ name: 'Lao People\'s Democratic Republic', value: 'LAO_PEOPLES_DEMOCRATIC_REPUBLIC_THE' },
					{ name: 'Latvia', value: 'LATVIA' },
					{ name: 'Lebanon', value: 'LEBANON' },
					{ name: 'Lesotho', value: 'LESOTHO' },
					{ name: 'Liberia', value: 'LIBERIA' },
					{ name: 'Libya', value: 'LIBYA' },
					{ name: 'Liechtenstein', value: 'LIECHTENSTEIN' },
					{ name: 'Lithuania', value: 'LITHUANIA' },
					{ name: 'Luxembourg', value: 'LUXEMBOURG' },
					{ name: 'Macao', value: 'MACAO' },
					{ name: 'Madagascar', value: 'MADAGASCAR' },
					{ name: 'Malawi', value: 'MALAWI' },
					{ name: 'Malaysia', value: 'MALAYSIA' },
					{ name: 'Maldives', value: 'MALDIVES' },
					{ name: 'Mali', value: 'MALI' },
					{ name: 'Malta', value: 'MALTA' },
					{ name: 'Marshall Islands', value: 'MARSHALL_ISLANDS' },
					{ name: 'Martinique', value: 'MARTINIQUE' },
					{ name: 'Mauritania', value: 'MAURITANIA' },
					{ name: 'Mauritius', value: 'MAURITIUS' },
					{ name: 'Mayotte', value: 'MAYOTTE' },
					{ name: 'Mexico', value: 'MEXICO' },
					{ name: 'Micronesia', value: 'MICRONESIA_FEDERATED_STATES' },
					{ name: 'Minor Outlying Islands (US)', value: 'MINOR_OUTLYING_ISLANDS_US' },
					{ name: 'Moldova', value: 'MOLDOVA_THE_REPUBLIC' },
					{ name: 'Monaco', value: 'MONACO' },
					{ name: 'Mongolia', value: 'MONGOLIA' },
					{ name: 'Montenegro', value: 'MONTENEGRO' },
					{ name: 'Montserrat', value: 'MONTSERRAT' },
					{ name: 'Morocco', value: 'MOROCCO' },
					{ name: 'Mozambique', value: 'MOZAMBIQUE' },
					{ name: 'Myanmar', value: 'MYANMAR' },
					{ name: 'Namibia', value: 'NAMIBIA' },
					{ name: 'Nauru', value: 'NAURU' },
					{ name: 'Nepal', value: 'NEPAL' },
					{ name: 'Netherlands', value: 'NETHERLANDS' },
					{ name: 'New Caledonia', value: 'NEW_CALEDONIA' },
					{ name: 'New Zealand', value: 'NEW_ZEALAND' },
					{ name: 'Nicaragua', value: 'NICARAGUA' },
					{ name: 'Niger', value: 'NIGER' },
					{ name: 'Nigeria', value: 'NIGERIA' },
					{ name: 'Niue', value: 'NIUE' },
					{ name: 'None', value: '' },
					{ name: 'Norfolk Island', value: 'NORFOLK_ISLAND' },
					{ name: 'North Macedonia', value: 'NORTH_MACEDONIA' },
					{ name: 'Northern Mariana Islands', value: 'NORTHERN_MARIANA_ISLANDS' },
					{ name: 'Norway', value: 'NORWAY' },
					{ name: 'Oman', value: 'OMAN' },
					{ name: 'Pakistan', value: 'PAKISTAN' },
					{ name: 'Palau', value: 'PALAU' },
					{ name: 'Palestine, State Of', value: 'PALESTINE_STATE' },
					{ name: 'Panama', value: 'PANAMA' },
					{ name: 'Papua New Guinea', value: 'PAPUA_NEW_GUINEA' },
					{ name: 'Paraguay', value: 'PARAGUAY' },
					{ name: 'Peru', value: 'PERU' },
					{ name: 'Philippines', value: 'PHILIPPINES' },
					{ name: 'Pitcairn', value: 'PITCAIRN' },
					{ name: 'Poland', value: 'POLAND' },
					{ name: 'Portugal', value: 'PORTUGAL' },
					{ name: 'Puerto Rico', value: 'PUERTO_RICO' },
					{ name: 'Qatar', value: 'QATAR' },
					{ name: 'Réunion', value: 'REUNION' },
					{ name: 'Romania', value: 'ROMANIA' },
					{ name: 'Russia', value: 'RUSSIA' },
					{ name: 'Rwanda', value: 'RWANDA' },
					{ name: 'Saint Barthélemy', value: 'SAINT_BARTHELEMY' },
					{ name: 'Saint Helena, Ascension and Tristan Da Cunha', value: 'SAINT_HELENA_ASCENSION_AND_TRISTAN_DA_CUNHA' },
					{ name: 'Saint Kitts and Nevis', value: 'SAINT_KITTS_AND_NEVIS' },
					{ name: 'Saint Lucia', value: 'SAINT_LUCIA' },
					{ name: 'Saint Martin (French Part)', value: 'SAINT_MARTIN_FRENCH_PART' },
					{ name: 'Saint Pierre and Miquelon', value: 'SAINT_PIERRE_AND_MIQUELON' },
					{ name: 'Saint Vincent and the Grenadines', value: 'SAINT_VINCENT_AND_THE_GRENADINES' },
					{ name: 'Samoa', value: 'SAMOA' },
					{ name: 'San Marino', value: 'SAN_MARINO' },
					{ name: 'Sao Tome and Principe', value: 'SAO_TOME_AND_PRINCIPE' },
					{ name: 'Saudi Arabia', value: 'SAUDI_ARABIA' },
					{ name: 'Senegal', value: 'SENEGAL' },
					{ name: 'Serbia', value: 'SERBIA' },
					{ name: 'Seychelles', value: 'SEYCHELLES' },
					{ name: 'Sierra Leone', value: 'SIERRA_LEONE' },
					{ name: 'Singapore', value: 'SINGAPORE' },
					{ name: 'Sint Maarten (Dutch Part)', value: 'SINT_MAARTEN_DUTCH_PART' },
					{ name: 'Slovakia', value: 'SLOVAKIA' },
					{ name: 'Slovenia', value: 'SLOVENIA' },
					{ name: 'Solomon Islands', value: 'SOLOMON_ISLANDS' },
					{ name: 'Somalia', value: 'SOMALIA' },
					{ name: 'South Africa', value: 'SOUTH_AFRICA' },
					{ name: 'South Georgia and the South Sandwich Islands', value: 'SOUTH_GEORGIA_AND_THE_SOUTH_SANDWICH_ISLANDS' },
					{ name: 'South Sudan', value: 'SOUTH_SUDAN' },
					{ name: 'Spain', value: 'SPAIN' },
					{ name: 'Sri Lanka', value: 'SRI_LANKA' },
					{ name: 'Sudan', value: 'SUDAN' },
					{ name: 'Suriname', value: 'SURINAME' },
					{ name: 'Svalbard and Jan Mayen', value: 'SVALBARD_AND_JAN_MAYEN' },
					{ name: 'Sweden', value: 'SWEDEN' },
					{ name: 'Switzerland', value: 'SWITZERLAND' },
					{ name: 'Syria', value: 'SYRIA' },
					{ name: 'Taiwan', value: 'TAIWAN' },
					{ name: 'Tajikistan', value: 'TAJIKISTAN' },
					{ name: 'Tanzania', value: 'TANZANIA' },
					{ name: 'Thailand', value: 'THAILAND' },
					{ name: 'Timor-Leste', value: 'TIMOR_LESTE' },
					{ name: 'Togo', value: 'TOGO' },
					{ name: 'Tokelau', value: 'TOKELAU' },
					{ name: 'Tonga', value: 'TONGA' },
					{ name: 'Trinidad and Tobago', value: 'TRINIDAD_AND_TOBAGO' },
					{ name: 'Tunisia', value: 'TUNISIA' },
					{ name: 'Turkey', value: 'TURKEY' },
					{ name: 'Turkmenistan', value: 'TURKMENISTAN' },
					{ name: 'Turks and Caicos Islands', value: 'TURKS_AND_CAICOS_ISLANDS' },
					{ name: 'Tuvalu', value: 'TUVALU' },
					{ name: 'Uganda', value: 'UGANDA' },
					{ name: 'Ukraine', value: 'UKRAINE' },
					{ name: 'United Arab Emirates', value: 'UNITED_ARAB_EMIRATES' },
					{ name: 'United Kingdom', value: 'UNITED_KINGDOM' },
					{ name: 'United States', value: 'UNITED_STATES_OF_AMERICA' },
					{ name: 'Uruguay', value: 'URUGUAY' },
					{ name: 'Uzbekistan', value: 'UZBEKISTAN' },
					{ name: 'Vanuatu', value: 'VANUATU' },
					{ name: 'Venezuela', value: 'VENEZUELA' },
					{ name: 'Vietnam', value: 'VIETNAM' },
					{ name: 'Virgin Islands (British)', value: 'VIRGIN_ISLANDS_BRITISH' },
					{ name: 'Virgin Islands (U.S.)', value: 'VIRGIN_ISLANDS_US' },
					{ name: 'Wallis and Futuna', value: 'WALLIS_AND_FUTUNA' },
					{ name: 'Western Sahara', value: 'WESTERN_SAHARA' },
					{ name: 'Yemen', value: 'YEMEN' },
					{ name: 'Zambia', value: 'ZAMBIA' },
					{ name: 'Zimbabwe', value: 'ZIMBABWE' },
				],
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
				options: [
					{ name: 'Arts', value: 'PODCASTSERIES_ARTS' },
					{ name: 'Arts - Books', value: 'PODCASTSERIES_ARTS_BOOKS' },
					{ name: 'Arts - Design', value: 'PODCASTSERIES_ARTS_DESIGN' },
					{ name: 'Arts - Fashion and Beauty', value: 'PODCASTSERIES_ARTS_FASHION_AND_BEAUTY' },
					{ name: 'Arts - Food', value: 'PODCASTSERIES_ARTS_FOOD' },
					{ name: 'Arts - Performing Arts', value: 'PODCASTSERIES_ARTS_PERFORMING_ARTS' },
					{ name: 'Arts - Visual Arts', value: 'PODCASTSERIES_ARTS_VISUAL_ARTS' },
					{ name: 'Business', value: 'PODCASTSERIES_BUSINESS' },
					{ name: 'Business - Careers', value: 'PODCASTSERIES_BUSINESS_CAREERS' },
					{ name: 'Business - Entrepreneurship', value: 'PODCASTSERIES_BUSINESS_ENTREPRENEURSHIP' },
					{ name: 'Business - Investing', value: 'PODCASTSERIES_BUSINESS_INVESTING' },
					{ name: 'Business - Management', value: 'PODCASTSERIES_BUSINESS_MANAGEMENT' },
					{ name: 'Business - Marketing', value: 'PODCASTSERIES_BUSINESS_MARKETING' },
					{ name: 'Business - Non Profit', value: 'PODCASTSERIES_BUSINESS_NON_PROFIT' },
					{ name: 'Comedy', value: 'PODCASTSERIES_COMEDY' },
					{ name: 'Comedy - Improv', value: 'PODCASTSERIES_COMEDY_IMPROV' },
					{ name: 'Comedy - Interviews', value: 'PODCASTSERIES_COMEDY_INTERVIEWS' },
					{ name: 'Comedy - Stand-Up', value: 'PODCASTSERIES_COMEDY_STANDUP' },
					{ name: 'Education', value: 'PODCASTSERIES_EDUCATION' },
					{ name: 'Education - Courses', value: 'PODCASTSERIES_EDUCATION_COURSES' },
					{ name: 'Education - How To', value: 'PODCASTSERIES_EDUCATION_HOW_TO' },
					{ name: 'Education - Language Learning', value: 'PODCASTSERIES_EDUCATION_LANGUAGE_LEARNING' },
					{ name: 'Education - Self Improvement', value: 'PODCASTSERIES_EDUCATION_SELF_IMPROVEMENT' },
					{ name: 'Fiction', value: 'PODCASTSERIES_FICTION' },
					{ name: 'Fiction - Comedy Fiction', value: 'PODCASTSERIES_FICTION_COMEDY_FICTION' },
					{ name: 'Fiction - Drama', value: 'PODCASTSERIES_FICTION_DRAMA' },
					{ name: 'Fiction - Science Fiction', value: 'PODCASTSERIES_FICTION_SCIENCE_FICTION' },
					{ name: 'Government', value: 'PODCASTSERIES_GOVERNMENT' },
					{ name: 'Health and Fitness', value: 'PODCASTSERIES_HEALTH_AND_FITNESS' },
					{ name: 'Health and Fitness - Alternative Health', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_ALTERNATIVE_HEALTH' },
					{ name: 'Health and Fitness - Fitness', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_FITNESS' },
					{ name: 'Health and Fitness - Medicine', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_MEDICINE' },
					{ name: 'Health and Fitness - Mental Health', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_MENTAL_HEALTH' },
					{ name: 'Health and Fitness - Nutrition', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_NUTRITION' },
					{ name: 'Health and Fitness - Sexuality', value: 'PODCASTSERIES_HEALTH_AND_FITNESS_SEXUALITY' },
					{ name: 'History', value: 'PODCASTSERIES_HISTORY' },
					{ name: 'Kids and Family', value: 'PODCASTSERIES_KIDS_AND_FAMILY' },
					{ name: 'Kids and Family - Education for Kids', value: 'PODCASTSERIES_KIDS_AND_FAMILY_EDUCATION_FOR_KIDS' },
					{ name: 'Kids and Family - Parenting', value: 'PODCASTSERIES_KIDS_AND_FAMILY_PARENTING' },
					{ name: 'Kids and Family - Pets and Animals', value: 'PODCASTSERIES_KIDS_AND_FAMILY_PETS_AND_ANIMALS' },
					{ name: 'Kids and Family - Stories for Kids', value: 'PODCASTSERIES_KIDS_AND_FAMILY_STORIES_FOR_KIDS' },
					{ name: 'Leisure', value: 'PODCASTSERIES_LEISURE' },
					{ name: 'Leisure - Animation and Manga', value: 'PODCASTSERIES_LEISURE_ANIMATION_AND_MANGA' },
					{ name: 'Leisure - Automotive', value: 'PODCASTSERIES_LEISURE_AUTOMOTIVE' },
					{ name: 'Leisure - Aviation', value: 'PODCASTSERIES_LEISURE_AVIATION' },
					{ name: 'Leisure - Crafts', value: 'PODCASTSERIES_LEISURE_CRAFTS' },
					{ name: 'Leisure - Games', value: 'PODCASTSERIES_LEISURE_GAMES' },
					{ name: 'Leisure - Hobbies', value: 'PODCASTSERIES_LEISURE_HOBBIES' },
					{ name: 'Leisure - Home and Garden', value: 'PODCASTSERIES_LEISURE_HOME_AND_GARDEN' },
					{ name: 'Leisure - Video Games', value: 'PODCASTSERIES_LEISURE_VIDEO_GAMES' },
					{ name: 'Music', value: 'PODCASTSERIES_MUSIC' },
					{ name: 'Music - Commentary', value: 'PODCASTSERIES_MUSIC_COMMENTARY' },
					{ name: 'Music - History', value: 'PODCASTSERIES_MUSIC_HISTORY' },
					{ name: 'Music - Interviews', value: 'PODCASTSERIES_MUSIC_INTERVIEWS' },
					{ name: 'News', value: 'PODCASTSERIES_NEWS' },
					{ name: 'News - Business', value: 'PODCASTSERIES_NEWS_BUSINESS' },
					{ name: 'News - Commentary', value: 'PODCASTSERIES_NEWS_COMMENTARY' },
					{ name: 'News - Daily News', value: 'PODCASTSERIES_NEWS_DAILY_NEWS' },
					{ name: 'News - Entertainment', value: 'PODCASTSERIES_NEWS_ENTERTAINMENT' },
					{ name: 'News - Politics', value: 'PODCASTSERIES_NEWS_POLITICS' },
					{ name: 'News - Sports', value: 'PODCASTSERIES_NEWS_SPORTS' },
					{ name: 'News - Tech', value: 'PODCASTSERIES_NEWS_TECH' },
					{ name: 'Religion and Spirituality', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY' },
					{ name: 'Religion and Spirituality - Buddhism', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_BUDDHISM' },
					{ name: 'Religion and Spirituality - Christianity', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_CHRISTIANITY' },
					{ name: 'Religion and Spirituality - Hinduism', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_HINDUISM' },
					{ name: 'Religion and Spirituality - Islam', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_ISLAM' },
					{ name: 'Religion and Spirituality - Judaism', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_JUDAISM' },
					{ name: 'Religion and Spirituality - Religion', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_RELIGION' },
					{ name: 'Religion and Spirituality - Spirituality', value: 'PODCASTSERIES_RELIGION_AND_SPIRITUALITY_SPIRITUALITY' },
					{ name: 'Science', value: 'PODCASTSERIES_SCIENCE' },
					{ name: 'Science - Astronomy', value: 'PODCASTSERIES_SCIENCE_ASTRONOMY' },
					{ name: 'Science - Chemistry', value: 'PODCASTSERIES_SCIENCE_CHEMISTRY' },
					{ name: 'Science - Earth Sciences', value: 'PODCASTSERIES_SCIENCE_EARTH_SCIENCES' },
					{ name: 'Science - Life Sciences', value: 'PODCASTSERIES_SCIENCE_LIFE_SCIENCES' },
					{ name: 'Science - Mathematics', value: 'PODCASTSERIES_SCIENCE_MATHEMATICS' },
					{ name: 'Science - Natural Sciences', value: 'PODCASTSERIES_SCIENCE_NATURAL_SCIENCES' },
					{ name: 'Science - Nature', value: 'PODCASTSERIES_SCIENCE_NATURE' },
					{ name: 'Science - Physics', value: 'PODCASTSERIES_SCIENCE_PHYSICS' },
					{ name: 'Science - Social Sciences', value: 'PODCASTSERIES_SCIENCE_SOCIAL_SCIENCES' },
					{ name: 'Society and Culture', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE' },
					{ name: 'Society and Culture - Documentary', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_DOCUMENTARY' },
					{ name: 'Society and Culture - Personal Journals', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_PERSONAL_JOURNALS' },
					{ name: 'Society and Culture - Philosophy', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_PHILOSOPHY' },
					{ name: 'Society and Culture - Places and Travel', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_PLACES_AND_TRAVEL' },
					{ name: 'Society and Culture - Relationships', value: 'PODCASTSERIES_SOCIETY_AND_CULTURE_RELATIONSHIPS' },
					{ name: 'Sports', value: 'PODCASTSERIES_SPORTS' },
					{ name: 'Sports - Baseball', value: 'PODCASTSERIES_SPORTS_BASEBALL' },
					{ name: 'Sports - Basketball', value: 'PODCASTSERIES_SPORTS_BASKETBALL' },
					{ name: 'Sports - Cricket', value: 'PODCASTSERIES_SPORTS_CRICKET' },
					{ name: 'Sports - Fantasy Sports', value: 'PODCASTSERIES_SPORTS_FANTASY_SPORTS' },
					{ name: 'Sports - Football', value: 'PODCASTSERIES_SPORTS_FOOTBALL' },
					{ name: 'Sports - Golf', value: 'PODCASTSERIES_SPORTS_GOLF' },
					{ name: 'Sports - Hockey', value: 'PODCASTSERIES_SPORTS_HOCKEY' },
					{ name: 'Sports - Rugby', value: 'PODCASTSERIES_SPORTS_RUGBY' },
					{ name: 'Sports - Running', value: 'PODCASTSERIES_SPORTS_RUNNING' },
					{ name: 'Sports - Soccer', value: 'PODCASTSERIES_SPORTS_SOCCER' },
					{ name: 'Sports - Swimming', value: 'PODCASTSERIES_SPORTS_SWIMMING' },
					{ name: 'Sports - Tennis', value: 'PODCASTSERIES_SPORTS_TENNIS' },
					{ name: 'Sports - Volleyball', value: 'PODCASTSERIES_SPORTS_VOLLEYBALL' },
					{ name: 'Sports - Wilderness', value: 'PODCASTSERIES_SPORTS_WILDERNESS' },
					{ name: 'Sports - Wrestling', value: 'PODCASTSERIES_SPORTS_WRESTLING' },
					{ name: 'Technology', value: 'PODCASTSERIES_TECHNOLOGY' },
					{ name: 'True Crime', value: 'PODCASTSERIES_TRUE_CRIME' },
					{ name: 'TV and Film', value: 'PODCASTSERIES_TV_AND_FILM' },
					{ name: 'TV and Film - After Shows', value: 'PODCASTSERIES_TV_AND_FILM_AFTER_SHOWS' },
					{ name: 'TV and Film - Film Reviews', value: 'PODCASTSERIES_TV_AND_FILM_FILM_REVIEWS' },
					{ name: 'TV and Film - History', value: 'PODCASTSERIES_TV_AND_FILM_HISTORY' },
					{ name: 'TV and Film - Interviews', value: 'PODCASTSERIES_TV_AND_FILM_INTERVIEWS' },
					{ name: 'TV and Film - TV Reviews', value: 'PODCASTSERIES_TV_AND_FILM_TV_REVIEWS' },
				],
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
				options: [
					{ name: 'Afghanistan', value: 'AFGHANISTAN' },
					{ name: 'Åland Islands', value: 'ALAND_ISLANDS' },
					{ name: 'Albania', value: 'ALBANIA' },
					{ name: 'Algeria', value: 'ALGERIA' },
					{ name: 'American Samoa', value: 'AMERICAN_SAMOA' },
					{ name: 'Andorra', value: 'ANDORRA' },
					{ name: 'Angola', value: 'ANGOLA' },
					{ name: 'Anguilla', value: 'ANGUILLA' },
					{ name: 'Antarctica', value: 'ANTARCTICA' },
					{ name: 'Antigua and Barbuda', value: 'ANTIGUA_AND_BARBUDA' },
					{ name: 'Argentina', value: 'ARGENTINA' },
					{ name: 'Armenia', value: 'ARMENIA' },
					{ name: 'Aruba', value: 'ARUBA' },
					{ name: 'Australia', value: 'AUSTRALIA' },
					{ name: 'Austria', value: 'AUSTRIA' },
					{ name: 'Azerbaijan', value: 'AZERBAIJAN' },
					{ name: 'Bahamas', value: 'BAHAMAS' },
					{ name: 'Bahrain', value: 'BAHRAIN' },
					{ name: 'Bangladesh', value: 'BANGLADESH' },
					{ name: 'Barbados', value: 'BARBADOS' },
					{ name: 'Belarus', value: 'BELARUS' },
					{ name: 'Belgium', value: 'BELGIUM' },
					{ name: 'Belize', value: 'BELIZE' },
					{ name: 'Benin', value: 'BENIN' },
					{ name: 'Bermuda', value: 'BERMUDA' },
					{ name: 'Bhutan', value: 'BHUTAN' },
					{ name: 'Bolivia', value: 'BOLIVIA_PLURINATIONAL_STATE_OF' },
					{ name: 'Bonaire, Sint Eustatius and Saba', value: 'BONAIRE_SINT_EUSTATIUS_AND_SABA' },
					{ name: 'Bosnia and Herzegovina', value: 'BOSNIA_AND_HERZEGOVINA' },
					{ name: 'Botswana', value: 'BOTSWANA' },
					{ name: 'Bouvet Island', value: 'BOUVET_ISLAND' },
					{ name: 'Brazil', value: 'BRAZIL' },
					{ name: 'British Indian Ocean Territory', value: 'BRITISH_INDIAN_OCEAN_TERRITORY_THE' },
					{ name: 'Brunei Darussalam', value: 'BRUNEI_DARUSSALAM' },
					{ name: 'Bulgaria', value: 'BULGARIA' },
					{ name: 'Burkina Faso', value: 'BURKINA_FASO' },
					{ name: 'Burundi', value: 'BURUNDI' },
					{ name: 'Cabo Verde', value: 'CABO_VERDE' },
					{ name: 'Cambodia', value: 'CAMBODIA' },
					{ name: 'Cameroon', value: 'CAMEROON' },
					{ name: 'Canada', value: 'CANADA' },
					{ name: 'Cayman Islands', value: 'CAYMAN_ISLANDS' },
					{ name: 'Central African Republic', value: 'CENTRAL_AFRICAN_REPUBLIC' },
					{ name: 'Chad', value: 'CHAD' },
					{ name: 'Chile', value: 'CHILE' },
					{ name: 'China', value: 'CHINA' },
					{ name: 'Christmas Island', value: 'CHRISTMAS_ISLAND' },
					{ name: 'Cocos (Keeling) Islands', value: 'COCOS_KEELING_ISLANDS' },
					{ name: 'Colombia', value: 'COLOMBIA' },
					{ name: 'Comoros', value: 'COMOROS' },
					{ name: 'Congo', value: 'CONGO' },
					{ name: 'Congo (Democratic Republic)', value: 'CONGO_THE_DEMOCRATIC_REPUBLIC_OF' },
					{ name: 'Cook Islands', value: 'COOK_ISLANDS' },
					{ name: 'Costa Rica', value: 'COSTA_RICA' },
					{ name: "Côte d'Ivoire", value: 'COTE_D_IVOIRE' },
					{ name: 'Croatia', value: 'CROATIA' },
					{ name: 'Cuba', value: 'CUBA' },
					{ name: 'Curaçao', value: 'CURACAO' },
					{ name: 'Cyprus', value: 'CYPRUS' },
					{ name: 'Czechia', value: 'CZECHIA' },
					{ name: 'Denmark', value: 'DENMARK' },
					{ name: 'Djibouti', value: 'DJIBOUTI' },
					{ name: 'Dominica', value: 'DOMINICA' },
					{ name: 'Dominican Republic', value: 'DOMINICAN_REPUBLIC' },
					{ name: 'Ecuador', value: 'ECUADOR' },
					{ name: 'Egypt', value: 'EGYPT' },
					{ name: 'El Salvador', value: 'EL_SALVADOR' },
					{ name: 'Equatorial Guinea', value: 'EQUATORIAL_GUINEA' },
					{ name: 'Eritrea', value: 'ERITREA' },
					{ name: 'Estonia', value: 'ESTONIA' },
					{ name: 'Eswatini', value: 'ESWATINI' },
					{ name: 'Ethiopia', value: 'ETHIOPIA' },
					{ name: 'Falkland Islands (Malvinas)', value: 'FALKLAND_ISLANDS_THE_MALVINAS' },
					{ name: 'Faroe Islands', value: 'FAROE_ISLANDS' },
					{ name: 'Fiji', value: 'FIJI' },
					{ name: 'Finland', value: 'FINLAND' },
					{ name: 'France', value: 'FRANCE' },
					{ name: 'French Guiana', value: 'FRENCH_GUIANA' },
					{ name: 'French Polynesia', value: 'FRENCH_POLYNESIA' },
					{ name: 'French Southern Territories', value: 'FRENCH_SOUTHERN_TERRITORIES' },
					{ name: 'Gabon', value: 'GABON' },
					{ name: 'Gambia', value: 'GAMBIA' },
					{ name: 'Georgia', value: 'GEORGIA' },
					{ name: 'Germany', value: 'GERMANY' },
					{ name: 'Ghana', value: 'GHANA' },
					{ name: 'Gibraltar', value: 'GIBRALTAR' },
					{ name: 'Greece', value: 'GREECE' },
					{ name: 'Greenland', value: 'GREENLAND' },
					{ name: 'Grenada', value: 'GRENADA' },
					{ name: 'Guadeloupe', value: 'GUADELOUPE' },
					{ name: 'Guam', value: 'GUAM' },
					{ name: 'Guatemala', value: 'GUATEMALA' },
					{ name: 'Guernsey', value: 'GUERNSEY' },
					{ name: 'Guinea', value: 'GUINEA' },
					{ name: 'Guinea-Bissau', value: 'GUINEA_BISSAU' },
					{ name: 'Guyana', value: 'GUYANA' },
					{ name: 'Haiti', value: 'HAITI' },
					{ name: 'Heard Island and McDonald Islands', value: 'HEARD_ISLAND_AND_MCDONALD_ISLANDS' },
					{ name: 'Holy See', value: 'HOLY_SEE' },
					{ name: 'Honduras', value: 'HONDURAS' },
					{ name: 'Hong Kong', value: 'HONG_KONG' },
					{ name: 'Hungary', value: 'HUNGARY' },
					{ name: 'Iceland', value: 'ICELAND' },
					{ name: 'India', value: 'INDIA' },
					{ name: 'Indonesia', value: 'INDONESIA' },
					{ name: 'Iran', value: 'IRAN' },
					{ name: 'Iraq', value: 'IRAQ' },
					{ name: 'Ireland', value: 'IRELAND' },
					{ name: 'Isle of Man', value: 'ISLE_OF_MAN' },
					{ name: 'Israel', value: 'ISRAEL' },
					{ name: 'Italy', value: 'ITALY' },
					{ name: 'Jamaica', value: 'JAMAICA' },
					{ name: 'Japan', value: 'JAPAN' },
					{ name: 'Jersey', value: 'JERSEY' },
					{ name: 'Jordan', value: 'JORDAN' },
					{ name: 'Kazakhstan', value: 'KAZAKHSTAN' },
					{ name: 'Kenya', value: 'KENYA' },
					{ name: 'Kiribati', value: 'KIRIBATI' },
					{ name: 'Korea (North)', value: 'KOREA_NORTH' },
					{ name: 'Korea (South)', value: 'KOREA_SOUTH' },
					{ name: 'Kuwait', value: 'KUWAIT' },
					{ name: 'Kyrgyzstan', value: 'KYRGYZSTAN' },
					{ name: 'Lao People\'s Democratic Republic', value: 'LAO_PEOPLES_DEMOCRATIC_REPUBLIC_THE' },
					{ name: 'Latvia', value: 'LATVIA' },
					{ name: 'Lebanon', value: 'LEBANON' },
					{ name: 'Lesotho', value: 'LESOTHO' },
					{ name: 'Liberia', value: 'LIBERIA' },
					{ name: 'Libya', value: 'LIBYA' },
					{ name: 'Liechtenstein', value: 'LIECHTENSTEIN' },
					{ name: 'Lithuania', value: 'LITHUANIA' },
					{ name: 'Luxembourg', value: 'LUXEMBOURG' },
					{ name: 'Macao', value: 'MACAO' },
					{ name: 'Madagascar', value: 'MADAGASCAR' },
					{ name: 'Malawi', value: 'MALAWI' },
					{ name: 'Malaysia', value: 'MALAYSIA' },
					{ name: 'Maldives', value: 'MALDIVES' },
					{ name: 'Mali', value: 'MALI' },
					{ name: 'Malta', value: 'MALTA' },
					{ name: 'Marshall Islands', value: 'MARSHALL_ISLANDS' },
					{ name: 'Martinique', value: 'MARTINIQUE' },
					{ name: 'Mauritania', value: 'MAURITANIA' },
					{ name: 'Mauritius', value: 'MAURITIUS' },
					{ name: 'Mayotte', value: 'MAYOTTE' },
					{ name: 'Mexico', value: 'MEXICO' },
					{ name: 'Micronesia', value: 'MICRONESIA_FEDERATED_STATES' },
					{ name: 'Minor Outlying Islands (US)', value: 'MINOR_OUTLYING_ISLANDS_US' },
					{ name: 'Moldova', value: 'MOLDOVA_THE_REPUBLIC' },
					{ name: 'Monaco', value: 'MONACO' },
					{ name: 'Mongolia', value: 'MONGOLIA' },
					{ name: 'Montenegro', value: 'MONTENEGRO' },
					{ name: 'Montserrat', value: 'MONTSERRAT' },
					{ name: 'Morocco', value: 'MOROCCO' },
					{ name: 'Mozambique', value: 'MOZAMBIQUE' },
					{ name: 'Myanmar', value: 'MYANMAR' },
					{ name: 'Namibia', value: 'NAMIBIA' },
					{ name: 'Nauru', value: 'NAURU' },
					{ name: 'Nepal', value: 'NEPAL' },
					{ name: 'Netherlands', value: 'NETHERLANDS' },
					{ name: 'New Caledonia', value: 'NEW_CALEDONIA' },
					{ name: 'New Zealand', value: 'NEW_ZEALAND' },
					{ name: 'Nicaragua', value: 'NICARAGUA' },
					{ name: 'Niger', value: 'NIGER' },
					{ name: 'Nigeria', value: 'NIGERIA' },
					{ name: 'Niue', value: 'NIUE' },
					{ name: 'None', value: '' },
					{ name: 'Norfolk Island', value: 'NORFOLK_ISLAND' },
					{ name: 'North Macedonia', value: 'NORTH_MACEDONIA' },
					{ name: 'Northern Mariana Islands', value: 'NORTHERN_MARIANA_ISLANDS' },
					{ name: 'Norway', value: 'NORWAY' },
					{ name: 'Oman', value: 'OMAN' },
					{ name: 'Pakistan', value: 'PAKISTAN' },
					{ name: 'Palau', value: 'PALAU' },
					{ name: 'Palestine, State Of', value: 'PALESTINE_STATE' },
					{ name: 'Panama', value: 'PANAMA' },
					{ name: 'Papua New Guinea', value: 'PAPUA_NEW_GUINEA' },
					{ name: 'Paraguay', value: 'PARAGUAY' },
					{ name: 'Peru', value: 'PERU' },
					{ name: 'Philippines', value: 'PHILIPPINES' },
					{ name: 'Pitcairn', value: 'PITCAIRN' },
					{ name: 'Poland', value: 'POLAND' },
					{ name: 'Portugal', value: 'PORTUGAL' },
					{ name: 'Puerto Rico', value: 'PUERTO_RICO' },
					{ name: 'Qatar', value: 'QATAR' },
					{ name: 'Réunion', value: 'REUNION' },
					{ name: 'Romania', value: 'ROMANIA' },
					{ name: 'Russia', value: 'RUSSIA' },
					{ name: 'Rwanda', value: 'RWANDA' },
					{ name: 'Saint Barthélemy', value: 'SAINT_BARTHELEMY' },
					{ name: 'Saint Helena, Ascension and Tristan Da Cunha', value: 'SAINT_HELENA_ASCENSION_AND_TRISTAN_DA_CUNHA' },
					{ name: 'Saint Kitts and Nevis', value: 'SAINT_KITTS_AND_NEVIS' },
					{ name: 'Saint Lucia', value: 'SAINT_LUCIA' },
					{ name: 'Saint Martin (French Part)', value: 'SAINT_MARTIN_FRENCH_PART' },
					{ name: 'Saint Pierre and Miquelon', value: 'SAINT_PIERRE_AND_MIQUELON' },
					{ name: 'Saint Vincent and the Grenadines', value: 'SAINT_VINCENT_AND_THE_GRENADINES' },
					{ name: 'Samoa', value: 'SAMOA' },
					{ name: 'San Marino', value: 'SAN_MARINO' },
					{ name: 'Sao Tome and Principe', value: 'SAO_TOME_AND_PRINCIPE' },
					{ name: 'Saudi Arabia', value: 'SAUDI_ARABIA' },
					{ name: 'Senegal', value: 'SENEGAL' },
					{ name: 'Serbia', value: 'SERBIA' },
					{ name: 'Seychelles', value: 'SEYCHELLES' },
					{ name: 'Sierra Leone', value: 'SIERRA_LEONE' },
					{ name: 'Singapore', value: 'SINGAPORE' },
					{ name: 'Sint Maarten (Dutch Part)', value: 'SINT_MAARTEN_DUTCH_PART' },
					{ name: 'Slovakia', value: 'SLOVAKIA' },
					{ name: 'Slovenia', value: 'SLOVENIA' },
					{ name: 'Solomon Islands', value: 'SOLOMON_ISLANDS' },
					{ name: 'Somalia', value: 'SOMALIA' },
					{ name: 'South Africa', value: 'SOUTH_AFRICA' },
					{ name: 'South Georgia and the South Sandwich Islands', value: 'SOUTH_GEORGIA_AND_THE_SOUTH_SANDWICH_ISLANDS' },
					{ name: 'South Sudan', value: 'SOUTH_SUDAN' },
					{ name: 'Spain', value: 'SPAIN' },
					{ name: 'Sri Lanka', value: 'SRI_LANKA' },
					{ name: 'Sudan', value: 'SUDAN' },
					{ name: 'Suriname', value: 'SURINAME' },
					{ name: 'Svalbard and Jan Mayen', value: 'SVALBARD_AND_JAN_MAYEN' },
					{ name: 'Sweden', value: 'SWEDEN' },
					{ name: 'Switzerland', value: 'SWITZERLAND' },
					{ name: 'Syria', value: 'SYRIA' },
					{ name: 'Taiwan', value: 'TAIWAN' },
					{ name: 'Tajikistan', value: 'TAJIKISTAN' },
					{ name: 'Tanzania', value: 'TANZANIA' },
					{ name: 'Thailand', value: 'THAILAND' },
					{ name: 'Timor-Leste', value: 'TIMOR_LESTE' },
					{ name: 'Togo', value: 'TOGO' },
					{ name: 'Tokelau', value: 'TOKELAU' },
					{ name: 'Tonga', value: 'TONGA' },
					{ name: 'Trinidad and Tobago', value: 'TRINIDAD_AND_TOBAGO' },
					{ name: 'Tunisia', value: 'TUNISIA' },
					{ name: 'Turkey', value: 'TURKEY' },
					{ name: 'Turkmenistan', value: 'TURKMENISTAN' },
					{ name: 'Turks and Caicos Islands', value: 'TURKS_AND_CAICOS_ISLANDS' },
					{ name: 'Tuvalu', value: 'TUVALU' },
					{ name: 'Uganda', value: 'UGANDA' },
					{ name: 'Ukraine', value: 'UKRAINE' },
					{ name: 'United Arab Emirates', value: 'UNITED_ARAB_EMIRATES' },
					{ name: 'United Kingdom', value: 'UNITED_KINGDOM' },
					{ name: 'United States', value: 'UNITED_STATES_OF_AMERICA' },
					{ name: 'Uruguay', value: 'URUGUAY' },
					{ name: 'Uzbekistan', value: 'UZBEKISTAN' },
					{ name: 'Vanuatu', value: 'VANUATU' },
					{ name: 'Venezuela', value: 'VENEZUELA' },
					{ name: 'Vietnam', value: 'VIETNAM' },
					{ name: 'Virgin Islands (British)', value: 'VIRGIN_ISLANDS_BRITISH' },
					{ name: 'Virgin Islands (U.S.)', value: 'VIRGIN_ISLANDS_US' },
					{ name: 'Wallis and Futuna', value: 'WALLIS_AND_FUTUNA' },
					{ name: 'Western Sahara', value: 'WESTERN_SAHARA' },
					{ name: 'Yemen', value: 'YEMEN' },
					{ name: 'Zambia', value: 'ZAMBIA' },
					{ name: 'Zimbabwe', value: 'ZIMBABWE' },
				],
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
			{
				displayName: 'Page',
				name: 'topChartsPage',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['topCharts'],
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
				name: 'topChartsLimitPerPage',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['topCharts'],
					},
				},
				default: 10,
				typeOptions: {
					minValue: 1,
					maxValue: 25,
				},
				description: 'Number of results per page (1-25)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let responseData: any;

				if (resource === 'search' && operation === 'searchContent') {
					responseData = await executeSearchContent.call(this, i);
				} else if (resource === 'podcast' && operation === 'getDetails') {
					responseData = await executeGetPodcastDetails.call(this, i);
				} else if (resource === 'episode' && operation === 'getDetails') {
					responseData = await executeGetEpisodeDetails.call(this, i);
				} else if (resource === 'popular' && operation === 'getPopular') {
					responseData = await executeGetPopularContent.call(this, i);
				} else if (resource === 'latest' && operation === 'getLatest') {
					responseData = await executeGetLatestEpisodes.call(this, i);
				} else if (resource === 'transcript' && operation === 'getTranscript') {
					responseData = await executeGetTranscript.call(this, i);
				} else if (resource === 'topCharts' && operation === 'getByCountry') {
					responseData = await executeGetTopChartsByCountry.call(this, i);
				} else if (resource === 'topCharts' && operation === 'getByGenres') {
					responseData = await executeGetTopChartsByGenres.call(this, i);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${resource}.${operation}`, {
						itemIndex: i,
					});
				}

				if (Array.isArray(responseData)) {
					responseData.forEach((item) => {
						returnData.push({
							json: item,
							pairedItem: { item: i },
						});
					});
				} else {
					returnData.push({
						json: responseData,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}