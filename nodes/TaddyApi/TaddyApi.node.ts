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
	const genre = this.getNodeParameter('popularGenre', itemIndex) as string;
	const page = this.getNodeParameter('popularPage', itemIndex) as number;
	const limitPerPage = this.getNodeParameter('popularLimitPerPage', itemIndex) as number;

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
		genre || undefined,
		validPage,
		validLimit
	);
	const data = await executeGraphQLQuery(this, query);

	// Process and return results
	return processPopularContentResults(data);
}

async function executeGetLatestEpisodes(this: IExecuteFunctions, itemIndex: number): Promise<any[]> {
	const filterType = this.getNodeParameter('latestFilterType', itemIndex) as string;
	const page = this.getNodeParameter('latestPage', itemIndex) as number;
	const limitPerPage = this.getNodeParameter('latestLimitPerPage', itemIndex) as number;

	// Validate pagination
	const { page: validPage, limitPerPage: validLimit } = validatePaginationParams(page, limitPerPage);

	let podcastUuids: string[] | undefined;
	let rssUrls: string[] | undefined;

	if (filterType === 'uuids') {
		const uuidsString = this.getNodeParameter('latestPodcastUuids', itemIndex) as string;
		if (!uuidsString) {
			throw new NodeOperationError(this.getNode(), 'Podcast UUIDs are required when filter type is "uuids"', {
				itemIndex,
			});
		}
		
		podcastUuids = uuidsString.split(',').map(uuid => uuid.trim());
		
		// Validate UUIDs
		for (const uuid of podcastUuids) {
			if (!validateUuid(uuid)) {
				throw new NodeOperationError(this.getNode(), `Invalid UUID format: ${uuid}`, {
					itemIndex,
				});
			}
		}

		// Check max limit
		if (podcastUuids.length > 1000) {
			throw new NodeOperationError(this.getNode(), 'Maximum 1000 podcast UUIDs allowed', {
				itemIndex,
			});
		}
	} else if (filterType === 'rssUrls') {
		const urlsString = this.getNodeParameter('latestRssUrls', itemIndex) as string;
		if (!urlsString) {
			throw new NodeOperationError(this.getNode(), 'RSS URLs are required when filter type is "rssUrls"', {
				itemIndex,
			});
		}
		
		rssUrls = urlsString.split(',').map(url => url.trim());
		
		// Validate URLs
		for (const url of rssUrls) {
			if (!validateUrl(url)) {
				throw new NodeOperationError(this.getNode(), `Invalid RSS URL format: ${url}`, {
					itemIndex,
				});
			}
		}

		// Check max limit
		if (rssUrls.length > 1000) {
			throw new NodeOperationError(this.getNode(), 'Maximum 1000 RSS URLs allowed', {
				itemIndex,
			});
		}
	}

	// Build and execute query
	const query = buildGetLatestEpisodesQuery(podcastUuids, rssUrls, validPage, validLimit);
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
				displayName: 'Genre',
				name: 'popularGenre',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['popular'],
						operation: ['getPopular'],
					},	
				},
				default: '',
				options: [
					{ name: 'All Genres', value: '' },
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
				description: 'Filter by genre (optional)',
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
			// Latest Episodes Parameters
			{
				displayName: 'Filter Type',
				name: 'latestFilterType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['latest'],
						operation: ['getLatest'],
					},
				},
				options: [
					{
						name: 'All Podcasts',
						value: 'all',
					},
					{
						name: 'Specific Podcast UUIDs',
						value: 'uuids',
					},
					{
						name: 'Specific RSS URLs',
						value: 'rssUrls',
					},
				],
				default: 'all',
				description: 'How to filter the latest episodes',
			},
			{
				displayName: 'Podcast UUIDs',
				name: 'latestPodcastUuids',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['latest'],
						operation: ['getLatest'],
						latestFilterType: ['uuids'],
					},
				},
				default: '',
				placeholder: 'uuid1,uuid2,uuid3',
				description: 'Comma-separated list of podcast UUIDs (max 1000)',
			},
			{
				displayName: 'RSS URLs',
				name: 'latestRssUrls',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['latest'],
						operation: ['getLatest'],
						latestFilterType: ['rssUrls'],
					},
				},
				default: '',
				placeholder: 'https://feed1.com,https://feed2.com',
				description: 'Comma-separated list of RSS URLs (max 1000)',
			},
			{
				displayName: 'Page',
				name: 'latestPage',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['latest'],
						operation: ['getLatest'],
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
				name: 'latestLimitPerPage',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['latest'],
						operation: ['getLatest'],
					},
				},
				default: 10,
				typeOptions: {
					minValue: 1,
					maxValue: 25,
				},
				description: 'Number of results per page (1-25)',
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