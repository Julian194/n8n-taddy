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
	const episodeOnlyFields = ['audioUrl', 'webUrl', 'datePublished', 'duration', 'episodeNumber', 'seasonNumber', 'hasChapters'];
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

export function buildGetPodcastSeriesQuery(identifier: string, identifierType: 'uuid' | 'name' | 'itunesId' | 'rssUrl'): string {
	const param = identifierType === 'uuid' ? 'uuid' : 
	             identifierType === 'name' ? 'name' :
	             identifierType === 'itunesId' ? 'itunesId' : 'rssUrl';
	
	return `
		query {
			getPodcastSeries(${param}: "${identifier}") {
				uuid
				name
				description
				imageUrl
				itunesId
				rssUrl
				websiteUrl
				language
				countries
				totalEpisodeCount
				hasTranscript
				genres {
					name
				}
				popularityRank
				episodes {
					uuid
					name
					description
					audioUrl
					webUrl
					datePublished
					duration
					episodeNumber
					seasonNumber
					hasTranscript
					hasChapters
				}
			}
		}
	`;
}

export function buildGetEpisodeQuery(identifier: string, identifierType: 'uuid' | 'guid' | 'name'): string {
	return `
		query {
			getEpisode(${identifierType}: "${identifier}") {
				uuid
				name
				description
				audioUrl
				webUrl
				datePublished
				duration
				episodeNumber
				seasonNumber
				hasTranscript
				hasChapters
				podcastSeries {
					uuid
					name
					description
					imageUrl
					itunesId
					rssUrl
				}
				transcript {
					transcriptText
					transcriptSrtUrl
					transcriptVttUrl
				}
				chapters {
					startTime
					endTime
					title
					url
				}
			}
		}
	`;
}

export function buildGetPopularContentQuery(language?: string, genres?: string[], page = 1, limitPerPage = 10, responseFields: string[] = ['uuid', 'name', 'description']): string {
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
	
	// Ensure uuid is always included
	const fieldsToInclude = [...new Set(['uuid', ...responseFields])];
	const fieldSelection = fieldsToInclude.join('\n\t\t\t\t\t');
	
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

export function buildGetLatestEpisodesQuery(podcastUuids?: string[], rssUrls?: string[], page = 1, limitPerPage = 10): string {
	const uuidsArg = podcastUuids?.length ? `uuids: [${podcastUuids.map(uuid => `"${uuid}"`).join(', ')}]` : '';
	const args = [uuidsArg]
		.filter(arg => arg !== '')
		.join(', ');
	
	return `
		query {
			getLatestPodcastEpisodes(${args}) {
				uuid
				name
				description
				audioUrl
				datePublished
				duration
				episodeNumber
				seasonNumber
				podcastSeries {
					uuid
					name
					imageUrl
				}
			}
		}
	`;
}

export function buildGetEpisodeTranscriptQuery(uuid: string, useOnDemandCredits = false): string {
	return `
		query {
			getEpisodeTranscript(uuid: "${uuid}", useOnDemandCreditsIfNeeded: ${useOnDemandCredits}) {
				transcriptText
				transcriptSrtUrl
				transcriptVttUrl
				transcriptJson {
					startTime
					endTime
					text
					speaker
				}
			}
		}
	`;
}

export function buildGetTopChartsByCountryQuery(
	contentType: 'PODCASTSERIES' | 'PODCASTEPISODE',
	country: string,
	source = 'APPLE_PODCASTS',
	page = 1,
	limitPerPage = 10
): string {
	const args = [
		`taddyType: ${contentType}`,
		`country: ${country}`,
		`source: ${source}`,
		`page: ${page}`,
		`limitPerPage: ${limitPerPage}`
	];

	return `
		query {
			getTopChartsByCountry(${args.join(', ')}) {
				topChartsId
				podcastSeries {
					uuid
					name
				}
				podcastEpisodes {
					uuid
					name
					podcastSeries {
						uuid
						name
					}
				}
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
	limitPerPage = 10
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

	return `
		query {
			getTopChartsByGenres(${args.join(', ')}) {
				topChartsId
				podcastSeries {
					uuid
					name
				}
				podcastEpisodes {
					uuid
					name
					podcastSeries {
						uuid
						name
					}
				}
			}
		}
	`;
}

// Temporarily disabled for debugging
/*
function buildFilterArgs(filters: SearchFilters): string {
	const args: string[] = [];
	
	if (filters.filterForTypes?.length) {
		if (filters.filterForTypes.length === 1) {
			args.push(`filterForTypes: ${filters.filterForTypes[0]}`);
		} else {
			args.push(`filterForTypes: [${filters.filterForTypes.join(', ')}]`);
		}
	}
	
	if (filters.filterForCountries?.length) {
		args.push(`filterForCountries: [${filters.filterForCountries.map(country => `"${country}"`).join(', ')}]`);
	}
	
	if (filters.filterForLanguages?.length) {
		args.push(`filterForLanguages: [${filters.filterForLanguages.map(lang => `"${lang}"`).join(', ')}]`);
	}
	
	if (filters.filterForGenres?.length) {
		args.push(`filterForGenres: [${filters.filterForGenres.map(genre => `"${genre}"`).join(', ')}]`);
	}
	
	if (filters.filterForSeriesUuids?.length) {
		args.push(`filterForSeriesUuids: [${filters.filterForSeriesUuids.map(uuid => `"${uuid}"`).join(', ')}]`);
	}
	
	if (filters.filterForPodcastContentType) {
		args.push(`filterForPodcastContentType: ${filters.filterForPodcastContentType}`);
	}
	
	if (filters.filterForPublishedAfter) {
		args.push(`filterForPublishedAfter: ${filters.filterForPublishedAfter}`);
	}
	
	if (filters.filterForPublishedBefore) {
		args.push(`filterForPublishedBefore: ${filters.filterForPublishedBefore}`);
	}
	
	if (filters.filterForLastUpdatedAfter) {
		args.push(`filterForLastUpdatedAfter: ${filters.filterForLastUpdatedAfter}`);
	}
	
	if (filters.filterForLastUpdatedBefore) {
		args.push(`filterForLastUpdatedBefore: ${filters.filterForLastUpdatedBefore}`);
	}
	
	if (filters.filterForDurationLessThan !== undefined) {
		args.push(`filterForDurationLessThan: ${filters.filterForDurationLessThan}`);
	}
	
	if (filters.filterForDurationGreaterThan !== undefined) {
		args.push(`filterForDurationGreaterThan: ${filters.filterForDurationGreaterThan}`);
	}
	
	if (filters.filterForTotalEpisodesLessThan !== undefined) {
		args.push(`filterForTotalEpisodesLessThan: ${filters.filterForTotalEpisodesLessThan}`);
	}
	
	if (filters.filterForTotalEpisodesGreaterThan !== undefined) {
		args.push(`filterForTotalEpisodesGreaterThan: ${filters.filterForTotalEpisodesGreaterThan}`);
	}
	
	if (filters.filterForHasTranscript !== undefined) {
		args.push(`filterForHasTranscript: ${filters.filterForHasTranscript}`);
	}
	
	if (filters.filterForHasChapters !== undefined) {
		args.push(`filterForHasChapters: ${filters.filterForHasChapters}`);
	}
	
	if (filters.isSafeMode !== undefined) {
		args.push(`isSafeMode: ${filters.isSafeMode}`);
	}
	
	return args.join(', ');
}
*/