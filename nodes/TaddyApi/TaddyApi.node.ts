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

import { PODCAST_GENRES, COUNTRIES } from './utils/constants';

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
	const responseFields = this.getNodeParameter('podcastResponseFields', itemIndex) as string[];
	const includeEpisodes = this.getNodeParameter('podcastIncludeEpisodes', itemIndex) as boolean;
	const episodeFields = includeEpisodes ? this.getNodeParameter('podcastEpisodeFields', itemIndex) as string[] : ['uuid', 'name', 'description'];

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
	const includeGenres = responseFields.includes('genres');
	const query = buildGetPodcastSeriesQuery(identifier, identifierType, responseFields, includeGenres, includeEpisodes, episodeFields);
	const data = await executeGraphQLQuery(this, query);

	// Process and return result
	return processPodcastSeriesResult(data);
}

async function executeGetEpisodeDetails(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const identifierType = this.getNodeParameter('episodeIdentifierType', itemIndex) as 'uuid' | 'guid' | 'name';
	const identifier = this.getNodeParameter('episodeIdentifier', itemIndex) as string;
	const responseFields = this.getNodeParameter('episodeResponseFields', itemIndex) as string[];
	const includeTranscript = this.getNodeParameter('episodeIncludeTranscript', itemIndex) as boolean;
	const includeChapters = this.getNodeParameter('episodeIncludeChapters', itemIndex) as boolean;

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
	const query = buildGetEpisodeQuery(identifier, identifierType, responseFields, includeTranscript, includeChapters);
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
	const responseFields = this.getNodeParameter('latestResponseFields', itemIndex) as string[];
	
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
	const query = buildGetLatestEpisodesQuery(podcastUuids, responseFields);
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
						value: 'websiteUrl',
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
			{
				displayName: 'Response Fields',
				name: 'podcastResponseFields',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['podcast'],
						operation: ['getDetails'],
					},
				},
				options: [
					{ name: 'Countries', value: 'countries' },
					{ name: 'Description', value: 'description' },
					{ name: 'Genres', value: 'genres' },
					{ name: 'Image URL', value: 'imageUrl' },
					{ name: 'iTunes ID', value: 'itunesId' },
					{ name: 'Language', value: 'language' },
					{ name: 'Name', value: 'name' },
					{ name: 'Popularity Rank', value: 'popularityRank' },
					{ name: 'RSS URL', value: 'rssUrl' },
					{ name: 'Total Episode Count', value: 'totalEpisodeCount' },
					{ name: 'UUID', value: 'uuid' },
					{ name: 'Website URL', value: 'websiteUrl' },
				],
				default: ['uuid', 'name', 'description'],
				description: 'Select which fields to include in the response',
			},
			{
				displayName: 'Include Episodes',
				name: 'podcastIncludeEpisodes',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['podcast'],
						operation: ['getDetails'],
					},
				},
				default: false,
				description: 'Whether to include episodes in the response',
			},
			{
				displayName: 'Episode Fields',
				name: 'podcastEpisodeFields',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['podcast'],
						operation: ['getDetails'],
						podcastIncludeEpisodes: [true],
					},
				},
				options: [
					{ name: 'Audio URL', value: 'audioUrl' },
					{ name: 'Date Published', value: 'datePublished' },
					{ name: 'Description', value: 'description' },
					{ name: 'Duration', value: 'duration' },
					{ name: 'Episode Number', value: 'episodeNumber' },
					{ name: 'Name', value: 'name' },
					{ name: 'Season Number', value: 'seasonNumber' },
					{ name: 'UUID', value: 'uuid' },
					{ name: 'Website URL', value: 'websiteUrl' },
				],
				default: ['uuid', 'name', 'description'],
				description: 'Select which episode fields to include',
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
			{
				displayName: 'Response Fields',
				name: 'episodeResponseFields',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['episode'],
						operation: ['getDetails'],
					},
				},
				options: [
					{ name: 'Audio URL', value: 'audioUrl' },
					{ name: 'Date Published', value: 'datePublished' },
					{ name: 'Description', value: 'description' },
					{ name: 'Duration', value: 'duration' },
					{ name: 'Episode Number', value: 'episodeNumber' },
					{ name: 'iTunes ID', value: 'itunesId' },
					{ name: 'Name', value: 'name' },
					{ name: 'Podcast Description', value: 'podcastDescription' },
					{ name: 'Podcast Image URL', value: 'podcastImageUrl' },
					{ name: 'RSS URL', value: 'rssUrl' },
					{ name: 'Season Number', value: 'seasonNumber' },
					{ name: 'UUID', value: 'uuid' },
					{ name: 'Website URL', value: 'websiteUrl' },
				],
				default: ['uuid', 'name', 'description'],
				description: 'Select which fields to include in the response',
			},
			{
				displayName: 'Include Transcript',
				name: 'episodeIncludeTranscript',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['episode'],
						operation: ['getDetails'],
					},
				},
				default: false,
				description: 'Whether to include episode transcript data',
			},
			{
				displayName: 'Include Chapters',
				name: 'episodeIncludeChapters',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['episode'],
						operation: ['getDetails'],
					},
				},
				default: false,
				description: 'Whether to include episode chapter data',
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
				options: PODCAST_GENRES,
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
			{
				displayName: 'Response Fields',
				name: 'latestResponseFields',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['latest'],
						operation: ['getLatest'],
					},
				},
				options: [
					{ name: 'Audio URL', value: 'audioUrl' },
					{ name: 'Date Published', value: 'datePublished' },
					{ name: 'Description', value: 'description' },
					{ name: 'Duration', value: 'duration' },
					{ name: 'Episode Number', value: 'episodeNumber' },
					{ name: 'Name', value: 'name' },
					{ name: 'Podcast Description', value: 'podcastDescription' },
					{ name: 'Podcast Image URL', value: 'podcastImageUrl' },
					{ name: 'Season Number', value: 'seasonNumber' },
					{ name: 'UUID', value: 'uuid' },
					{ name: 'Website URL', value: 'websiteUrl' },
				],
				default: ['uuid', 'name', 'description'],
				description: 'Select which fields to include in the response',
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