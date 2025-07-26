// Centralized API field definitions based on Taddy API documentation
export const PODCAST_SERIES_FIELDS = {
	// Core fields
	uuid: 'uuid',
	name: 'name', 
	description: 'description',
	imageUrl: 'imageUrl',
	itunesId: 'itunesId',
	rssUrl: 'rssUrl',
	websiteUrl: 'websiteUrl',
	language: 'language',
	countries: 'countries',
	totalEpisodeCount: 'totalEpisodeCount',
	popularityRank: 'popularityRank',
	// Nested fields (handled separately)
	genres: 'genres { name }',
	episodes: 'episodes'
} as const;

export const PODCAST_EPISODE_FIELDS = {
	// Core fields
	uuid: 'uuid',
	name: 'name',
	description: 'description', 
	audioUrl: 'audioUrl',
	websiteUrl: 'websiteUrl',
	datePublished: 'datePublished',
	duration: 'duration',
	episodeNumber: 'episodeNumber',
	seasonNumber: 'seasonNumber',
	// Nested fields (handled separately)
	podcastSeries: 'podcastSeries',
	transcript: 'transcript',
	chapters: 'chapters'
} as const;

// Available field options for UI
export const PODCAST_SERIES_FIELD_OPTIONS = [
	{ name: 'UUID', value: 'uuid' },
	{ name: 'Name', value: 'name' },
	{ name: 'Description', value: 'description' },
	{ name: 'Image URL', value: 'imageUrl' },
	{ name: 'iTunes ID', value: 'itunesId' },
	{ name: 'RSS URL', value: 'rssUrl' },
	{ name: 'Website URL', value: 'websiteUrl' },
	{ name: 'Language', value: 'language' },
	{ name: 'Countries', value: 'countries' },
	{ name: 'Total Episode Count', value: 'totalEpisodeCount' },
	{ name: 'Popularity Rank', value: 'popularityRank' },
	{ name: 'Genres', value: 'genres' }
] as const;

export const PODCAST_EPISODE_FIELD_OPTIONS = [
	{ name: 'Audio URL', value: 'audioUrl' },
	{ name: 'Date Published', value: 'datePublished' },
	{ name: 'Description', value: 'description' },
	{ name: 'Duration', value: 'duration' },
	{ name: 'Episode Number', value: 'episodeNumber' },
	{ name: 'Name', value: 'name' },
	{ name: 'Season Number', value: 'seasonNumber' },
	{ name: 'UUID', value: 'uuid' },
	{ name: 'Website URL', value: 'websiteUrl' },
	// Podcast series fields (for episodes that include podcast info)
	{ name: 'Podcast Description', value: 'podcastDescription' },
	{ name: 'Podcast Image URL', value: 'podcastImageUrl' },
	{ name: 'iTunes ID', value: 'itunesId' },
	{ name: 'RSS URL', value: 'rssUrl' }
] as const;

export interface SearchFilters {
	filterForTypes?: string[];
	filterForCountries?: string[];
	filterForLanguages?: string[];
	filterForGenres?: string[];
	filterForSeriesUuids?: string[];
	filterForPodcastContentType?: string;
	filterForPublishedAfter?: number;
	filterForPublishedBefore?: number;
	filterForLastUpdatedAfter?: number;
	filterForLastUpdatedBefore?: number;
	filterForDurationLessThan?: number;
	filterForDurationGreaterThan?: number;
	filterForTotalEpisodesLessThan?: number;
	filterForTotalEpisodesGreaterThan?: number;
	filterForHasTranscript?: boolean;
	filterForHasChapters?: boolean;
	isSafeMode?: boolean;
}

export interface SearchOptions {
	term: string;
	page?: number;
	limitPerPage?: number;
	sortBy?: 'EXACTNESS' | 'POPULARITY';
	matchType?: 'EXACT_PHRASE' | 'ALL_TERMS' | 'MOST_TERMS';
}

function buildFieldSelection(fields: string[], contentType: 'podcastSeries' | 'podcastEpisodes'): string {
	// Filter fields based on content type
	const episodeOnlyFields = ['audioUrl', 'websiteUrl', 'datePublished', 'duration', 'episodeNumber', 'seasonNumber'];
	const podcastOnlyFields = ['itunesId', 'rssUrl', 'websiteUrl', 'totalEpisodesCount'];
	
	let validFields = fields.filter(field => {
		if (contentType === 'podcastEpisodes' && podcastOnlyFields.includes(field)) {
			return false;
		}
		if (contentType === 'podcastSeries' && episodeOnlyFields.includes(field)) {
			return false;
		}
		return true;
	});
	
	// Ensure uuid is always included
	if (!validFields.includes('uuid')) {
		validFields.unshift('uuid');
	}
	
	return validFields.join('\n\t\t\t\t\t');
}

// Centralized field selection builders using the field definitions above
export function buildPodcastSeriesFieldSelection(
	fields: string[] = ['uuid', 'name', 'description'], 
	includeGenres = false,
	includeEpisodes = false,
	episodeFields: string[] = ['uuid', 'name', 'description']
): string {
	// Get valid podcast series fields
	const availableFields = Object.keys(PODCAST_SERIES_FIELDS).filter(f => f !== 'genres' && f !== 'episodes');
	let podcastFields = fields.filter(field => availableFields.includes(field));
	
	// Ensure uuid is always included
	if (!podcastFields.includes('uuid')) {
		podcastFields.unshift('uuid');
	}
	
	let fieldSelection = podcastFields.join('\n\t\t\t\t');
	
	// Add genres if requested
	if (includeGenres || fields.includes('genres')) {
		fieldSelection += '\n\t\t\t\tgenres {\n\t\t\t\t\tname\n\t\t\t\t}';
	}
	
	// Add episodes if requested
	if (includeEpisodes) {
		const episodeFieldSelection = buildEpisodeFieldSelection(episodeFields, false, false, false);
		fieldSelection += `\n\t\t\t\tepisodes {\n\t\t\t\t\t${episodeFieldSelection.replace(/\n\t\t\t\t/g, '\n\t\t\t\t\t')}\n\t\t\t\t}`;
	}
	
	return fieldSelection;
}

export function buildEpisodeFieldSelection(
	fields: string[] = ['uuid', 'name', 'description'], 
	includePodcastSeries = true, 
	includeTranscript = false, 
	includeChapters = false
): string {
	// Get valid episode fields (excluding nested objects)
	const availableFields = Object.keys(PODCAST_EPISODE_FIELDS).filter(f => 
		f !== 'podcastSeries' && f !== 'transcript' && f !== 'chapters'
	);
	
	let episodeFields = fields.filter(field => availableFields.includes(field));
	
	// Ensure uuid is always included
	if (!episodeFields.includes('uuid')) {
		episodeFields.unshift('uuid');
	}
	
	let fieldSelection = episodeFields.join('\n\t\t\t\t');
	
	// Add podcast series if requested
	if (includePodcastSeries) {
		const basicPodcastFields = ['uuid', 'name'];
		
		// Check for specific podcast fields requested
		if (fields.includes('podcastDescription')) {
			basicPodcastFields.push('description');
		}
		if (fields.includes('podcastImageUrl')) {
			basicPodcastFields.push('imageUrl');
		}
		if (fields.includes('itunesId')) {
			basicPodcastFields.push('itunesId');
		}
		if (fields.includes('rssUrl')) {
			basicPodcastFields.push('rssUrl');
		}
		
		fieldSelection += `\n\t\t\t\tpodcastSeries {\n\t\t\t\t\t${[...new Set(basicPodcastFields)].join('\n\t\t\t\t\t')}\n\t\t\t\t}`;
	}
	
	// Add transcript if requested
	if (includeTranscript) {
		fieldSelection += `\n\t\t\t\ttranscript`;
	}
	
	// Add chapters if requested
	if (includeChapters) {
		fieldSelection += `\n\t\t\t\tchapters {\n\t\t\t\t\tid\n\t\t\t\t\ttitle\n\t\t\t\t\tstartTimecode\n\t\t\t\t}`;
	}
	
	return fieldSelection;
}

export function buildSearchQuery(options: SearchOptions, filters: SearchFilters, responseFields: string[] = ['uuid', 'name', 'description']): string {
	const { term, page = 1, limitPerPage = 10, sortBy = 'POPULARITY', matchType = 'MOST_TERMS' } = options;
	
	// Build the full parameter list
	const allParams = [
		`term: "${term}"`,
		`page: ${page}`,
		`limitPerPage: ${limitPerPage}`,
		`sortBy: ${sortBy}`,
		`matchBy: ${matchType}`
	];
	
	if (filters.filterForTypes?.length) {
		if (filters.filterForTypes.length === 1) {
			allParams.push(`filterForTypes: ${filters.filterForTypes[0]}`);
		} else {
			allParams.push(`filterForTypes: [${filters.filterForTypes.join(', ')}]`);
		}
	}
	
	if (filters.filterForLanguages?.length) {
		// Convert language codes to proper Taddy API enum values
		const languageEnums = filters.filterForLanguages.map(lang => {
			const langCode = lang.toLowerCase();
			// Map common language codes to Taddy API enum values
			const languageMap: Record<string, string> = {
				'en': 'ENGLISH',
				'es': 'SPANISH', 
				'fr': 'FRENCH',
				'de': 'GERMAN',
				'it': 'ITALIAN',
				'pt': 'PORTUGUESE',
				'ru': 'RUSSIAN',
				'ja': 'JAPANESE',
				'ko': 'KOREAN',
				'zh': 'CHINESE',
				'ar': 'ARABIC',
				'hi': 'HINDI',
				'nl': 'DUTCH_FLEMISH',
				'sv': 'SWEDISH',
				'no': 'NORWEGIAN',
				'da': 'DANISH',
				'fi': 'FINNISH',
				'pl': 'POLISH',
				'tr': 'TURKISH',
				'cs': 'CZECH',
				'hu': 'HUNGARIAN',
				'ro': 'ROMANIAN_MOLDOVAN',
				'sk': 'SLOVAK',
				'bg': 'BULGARIAN',
				'hr': 'CROATIAN',
				'sl': 'SLOVENIAN',
				'sr': 'SERBIAN',
				'mk': 'MACEDONIAN',
				'bs': 'BOSNIAN',
				'sq': 'ALBANIAN',
				'lv': 'LATVIAN',
				'lt': 'LITHUANIAN',
				'et': 'ESTONIAN',
				'mt': 'MALTESE',
				'ga': 'IRISH',
				'cy': 'WELSH',
				'is': 'ICELANDIC',
				'fo': 'FAROESE',
				'he': 'HEBREW',
				'th': 'THAI',
				'vi': 'VIETNAMESE',
				'id': 'INDONESIAN',
				'ms': 'MALAY',
				'tl': 'TAGALOG',
				'sw': 'SWAHILI',
				'am': 'AMHARIC',
				'bn': 'BENGALI',
				'gu': 'GUJARATI',
				'kn': 'KANNADA',
				'ml': 'MALAYALAM',
				'mr': 'MARATHI',
				'ne': 'NEPALI',
				'or': 'ORIYA',
				'pa': 'PUNJABI',
				'si': 'SINHALA',
				'ta': 'TAMIL',
				'te': 'TELUGU',
				'ur': 'URDU',
				'fa': 'FARSI',
				'ku': 'KURDISH',
				'ka': 'GEORGIAN',
				'hy': 'ARMENIAN',
				'az': 'AZERBAIJANI',
				'kk': 'KAZAKH',
				'ky': 'KYRGYZ',
				'tg': 'TAJIK',
				'tk': 'TURKMEN',
				'uz': 'UZBEK',
				'mn': 'MONGOLIAN',
				'my': 'BURMESE',
				'km': 'CENTRAL_KHMER',
				'lo': 'LAO',
				'bo': 'TIBETAN',
				'dz': 'DZONGKHA'
			};
			
			return languageMap[langCode] || lang.toUpperCase();
		});
		
		if (languageEnums.length === 1) {
			allParams.push(`filterForLanguages: ${languageEnums[0]}`);
		} else {
			allParams.push(`filterForLanguages: [${languageEnums.join(', ')}]`);
		}
	}
	
	if (filters.filterForPublishedAfter) {
		allParams.push(`filterForPublishedAfter: ${filters.filterForPublishedAfter}`);
	}
	
	if (filters.filterForPublishedBefore) {
		allParams.push(`filterForPublishedBefore: ${filters.filterForPublishedBefore}`);
	}
	
	if (filters.filterForDurationLessThan !== undefined) {
		allParams.push(`filterForDurationLessThan: ${filters.filterForDurationLessThan}`);
	}
	
	if (filters.filterForDurationGreaterThan !== undefined) {
		allParams.push(`filterForDurationGreaterThan: ${filters.filterForDurationGreaterThan}`);
	}
	
	if (filters.filterForTotalEpisodesLessThan !== undefined) {
		allParams.push(`filterForTotalEpisodesLessThan: ${filters.filterForTotalEpisodesLessThan}`);
	}
	
	if (filters.filterForTotalEpisodesGreaterThan !== undefined) {
		allParams.push(`filterForTotalEpisodesGreaterThan: ${filters.filterForTotalEpisodesGreaterThan}`);
	}
	
	if (filters.filterForHasTranscript !== undefined) {
		allParams.push(`filterForHasTranscript: ${filters.filterForHasTranscript}`);
	}
	
	if (filters.filterForHasChapters !== undefined) {
		allParams.push(`filterForHasChapters: ${filters.filterForHasChapters}`);
	}
	
	if (filters.isSafeMode !== undefined) {
		allParams.push(`isSafeMode: ${filters.isSafeMode}`);
	}
	
	// Build response sections based on content types being searched
	let responseSection = `searchId
		responseDetails {
			id
			pagesCount
			totalCount
		}`;
	
	const includesPodcasts = !filters.filterForTypes || filters.filterForTypes.includes('PODCASTSERIES');
	const includesEpisodes = !filters.filterForTypes || filters.filterForTypes.includes('PODCASTEPISODE');
	
	if (includesPodcasts) {
		const podcastFields = buildFieldSelection(responseFields, 'podcastSeries');
		responseSection += `\n\t\t\t\tpodcastSeries {\n\t\t\t\t\t${podcastFields}\n\t\t\t\t}`;
	}
	
	if (includesEpisodes) {
		const episodeFields = buildFieldSelection(responseFields, 'podcastEpisodes');
		
		// Build podcast series fields - always include uuid and name, plus optional fields
		let podcastSeriesFields = 'uuid\n\t\t\t\t\t\tname';
		if (responseFields.includes('podcastDescription')) {
			podcastSeriesFields += '\n\t\t\t\t\t\tdescription';
		}
		if (responseFields.includes('podcastImageUrl')) {
			podcastSeriesFields += '\n\t\t\t\t\t\timageUrl';
		}
		
		responseSection += `\n\t\t\t\tpodcastEpisodes {\n\t\t\t\t\t${episodeFields}\n\t\t\t\t\tpodcastSeries {\n\t\t\t\t\t\t${podcastSeriesFields}\n\t\t\t\t\t}\n\t\t\t\t}`;
	}
	
	return `
		query {
			search(
				${allParams.join(',\n\t\t\t\t')}
			) {
				${responseSection}
			}
		}
	`;
}

export function buildGetPodcastSeriesQuery(
	identifier: string, 
	identifierType: 'uuid' | 'name' | 'itunesId' | 'rssUrl',
	responseFields: string[] = ['uuid', 'name', 'description'],
	includeGenres = false,
	includeEpisodes = false,
	episodeFields: string[] = ['uuid', 'name', 'description']
): string {
	const param = identifierType === 'uuid' ? 'uuid' : 
	             identifierType === 'name' ? 'name' :
	             identifierType === 'itunesId' ? 'itunesId' : 'rssUrl';
	
	const fieldSelection = buildPodcastSeriesFieldSelection(responseFields, includeGenres, includeEpisodes, episodeFields);
	
	return `
		query {
			getPodcastSeries(${param}: "${identifier}") {
				${fieldSelection}
			}
		}
	`;
}

export function buildGetEpisodeQuery(
	identifier: string, 
	identifierType: 'uuid' | 'guid' | 'name',
	responseFields: string[] = ['uuid', 'name', 'description'],
	includeTranscript = false,
	includeChapters = false
): string {
	const fieldSelection = buildEpisodeFieldSelection(responseFields, true, includeTranscript, includeChapters);
	
	return `
		query {
			getPodcastEpisode(${identifierType}: "${identifier}") {
				${fieldSelection}
			}
		}
	`;
}

export function buildGetPopularContentQuery(
	language?: string, 
	genres?: string[], 
	page = 1, 
	limitPerPage = 10, 
	responseFields: string[] = ['uuid', 'name', 'description']
): string {
	const args: string[] = [];
	
	if (language) {
		// Convert language code to enum (e.g., "en" -> "ENGLISH")
		const languageEnum = language.toUpperCase() === 'EN' ? 'ENGLISH' : language.toUpperCase();
		args.push(`filterByLanguage: ${languageEnum}`);
	}
	
	if (genres && genres.length > 0) {
		// Genres are already in full enum format (e.g., "PODCASTSERIES_TECHNOLOGY")
		args.push(`filterByGenres: [${genres.join(', ')}]`);
	}
	
	// Add pagination - API supports page parameter
	if (page > 1) {
		args.push(`page: ${page}`);
	}
	
	// Add limitPerPage if different from default
	if (limitPerPage !== 10) {
		args.push(`limitPerPage: ${limitPerPage}`);
	}
	
	const argsString = args.length > 0 ? `(${args.join(', ')})` : '';
	
	// Use centralized field selection for podcast series
	const fieldSelection = buildPodcastSeriesFieldSelection(responseFields, responseFields.includes('genres'), false);
	
	return `
		query {
			getPopularContent${argsString} {
				popularityRankId
				podcastSeries {
					${fieldSelection}
				}
			}
		}
	`;
}

export function buildGetLatestEpisodesQuery(podcastUuids?: string[], responseFields: string[] = ['uuid', 'name', 'description']): string {
	const uuidsArg = podcastUuids?.length ? `uuids: [${podcastUuids.map(uuid => `"${uuid}"`).join(', ')}]` : '';
	const args = [uuidsArg]
		.filter(arg => arg !== '')
		.join(', ');
	
	// For getLatestPodcastEpisodes, only basic episode fields are available (no transcript/chapters)
	const fieldSelection = buildEpisodeFieldSelection(responseFields, true, false, false);
	
	return `
		query {
			getLatestPodcastEpisodes(${args}) {
				${fieldSelection}
			}
		}
	`;
}

export function buildGetEpisodeTranscriptQuery(uuid: string, useOnDemandCredits = false): string {
	return `
		query {
			getEpisodeTranscript(uuid: "${uuid}", useOnDemandCreditsIfNeeded: ${useOnDemandCredits}) {
				id
				text
				speaker
				startTimecode
				endTimecode
			}
		}
	`;
}

export function buildGetTopChartsByCountryQuery(
	contentType: 'PODCASTSERIES' | 'PODCASTEPISODE',
	country: string,
	source = 'APPLE_PODCASTS',
	page = 1,
	limitPerPage = 10,
	responseFields: string[] = ['uuid', 'name', 'description']
): string {
	const args = [
		`taddyType: ${contentType}`,
		`country: ${country}`,
		`source: ${source}`,
		`page: ${page}`,
		`limitPerPage: ${limitPerPage}`
	];

	let responseSection = '';
	
	if (contentType === 'PODCASTSERIES') {
		const fieldSelection = buildPodcastSeriesFieldSelection(responseFields, responseFields.includes('genres'), false);
		responseSection = `podcastSeries {\n\t\t\t\t\t${fieldSelection.replace(/\n\t\t\t\t/g, '\n\t\t\t\t\t')}\n\t\t\t\t}`;
	} else {
		const fieldSelection = buildEpisodeFieldSelection(responseFields, true, false, false);
		responseSection = `podcastEpisodes {\n\t\t\t\t\t${fieldSelection.replace(/\n\t\t\t\t/g, '\n\t\t\t\t\t')}\n\t\t\t\t}`;
	}

	return `
		query {
			getTopChartsByCountry(${args.join(', ')}) {
				topChartsId
				${responseSection}
			}
		}
	`;
}

export function buildGetTopChartsByGenresQuery(
	contentType: 'PODCASTSERIES' | 'PODCASTEPISODE',
	genres: string[],
	source = 'APPLE_PODCASTS',
	filterByCountry?: string,
	page = 1,
	limitPerPage = 10,
	responseFields: string[] = ['uuid', 'name', 'description']
): string {
	const args = [
		`taddyType: ${contentType}`,
		`genres: [${genres.join(', ')}]`,
		`source: ${source}`,
		`page: ${page}`,
		`limitPerPage: ${limitPerPage}`
	];

	if (filterByCountry) {
		args.push(`filterByCountry: ${filterByCountry}`);
	}

	let responseSection = '';
	
	if (contentType === 'PODCASTSERIES') {
		const fieldSelection = buildPodcastSeriesFieldSelection(responseFields, responseFields.includes('genres'), false);
		responseSection = `podcastSeries {\n\t\t\t\t\t${fieldSelection.replace(/\n\t\t\t\t/g, '\n\t\t\t\t\t')}\n\t\t\t\t}`;
	} else {
		const fieldSelection = buildEpisodeFieldSelection(responseFields, true, false, false);
		responseSection = `podcastEpisodes {\n\t\t\t\t\t${fieldSelection.replace(/\n\t\t\t\t/g, '\n\t\t\t\t\t')}\n\t\t\t\t}`;
	}

	return `
		query {
			getTopChartsByGenres(${args.join(', ')}) {
				topChartsId
				${responseSection}
			}
		}
	`;
}

