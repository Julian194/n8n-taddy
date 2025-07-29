import { SearchFilters, SearchOptions } from '../operations/types';
import { mapLanguageCode } from './languageMappings';

export const PODCAST_SERIES_FIELDS = {
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
	genres: 'genres { name }',
	episodes: 'episodes'
} as const;

export const PODCAST_EPISODE_FIELDS = {
	uuid: 'uuid',
	name: 'name',
	description: 'description', 
	audioUrl: 'audioUrl',
	websiteUrl: 'websiteUrl',
	datePublished: 'datePublished',
	duration: 'duration',
	episodeNumber: 'episodeNumber',
	seasonNumber: 'seasonNumber',
	podcastSeries: 'podcastSeries',
	transcript: 'transcript',
	chapters: 'chapters'
} as const;
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


function buildFieldSelection(fields: string[], contentType: 'podcastSeries' | 'podcastEpisodes'): string {
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
	
	if (!validFields.includes('uuid')) {
		validFields.unshift('uuid');
	}
	
	return validFields.join('\n\t\t\t\t\t');
}

export function buildPodcastSeriesFieldSelection(
	fields: string[] = ['uuid', 'name', 'description'], 
	includeGenres = false,
	includeEpisodes = false,
	episodeFields: string[] = ['uuid', 'name', 'description']
): string {
	const availableFields = Object.keys(PODCAST_SERIES_FIELDS).filter(f => f !== 'genres' && f !== 'episodes');
	let podcastFields = fields.filter(field => availableFields.includes(field));
	
	if (!podcastFields.includes('uuid')) {
		podcastFields.unshift('uuid');
	}
	
	let fieldSelection = podcastFields.join('\n\t\t\t\t');
	
	if (includeGenres || fields.includes('genres')) {
		fieldSelection += '\n\t\t\t\tgenres {\n\t\t\t\t\tname\n\t\t\t\t}';
	}
	
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
	const availableFields = Object.keys(PODCAST_EPISODE_FIELDS).filter(f => 
		f !== 'podcastSeries' && f !== 'transcript' && f !== 'chapters'
	);
	
	let episodeFields = fields.filter(field => availableFields.includes(field));
	
	if (!episodeFields.includes('uuid')) {
		episodeFields.unshift('uuid');
	}
	
	let fieldSelection = episodeFields.join('\n\t\t\t\t');
	
	if (includePodcastSeries) {
		const basicPodcastFields = ['uuid', 'name'];
		
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
	
	if (includeTranscript) {
		fieldSelection += `\n\t\t\t\ttranscript`;
	}
	
	if (includeChapters) {
		fieldSelection += `\n\t\t\t\tchapters {\n\t\t\t\t\tid\n\t\t\t\t\ttitle\n\t\t\t\t\tstartTimecode\n\t\t\t\t}`;
	}
	
	return fieldSelection;
}

export function buildSearchQuery(options: SearchOptions, filters: SearchFilters, responseFields: string[] = ['uuid', 'name', 'description']): string {
	const { term, page = 1, limitPerPage = 10, sortBy = 'POPULARITY', matchType = 'MOST_TERMS' } = options;
	
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
		const languageEnums = filters.filterForLanguages.map(lang => mapLanguageCode(lang));
		
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
		const languageEnum = mapLanguageCode(language);
		args.push(`filterByLanguage: ${languageEnum}`);
	}
	
	if (genres && genres.length > 0) {
		args.push(`filterByGenres: [${genres.join(', ')}]`);
	}
	
	if (page > 1) {
		args.push(`page: ${page}`);
	}
	
	if (limitPerPage !== 10) {
		args.push(`limitPerPage: ${limitPerPage}`);
	}
	
	const argsString = args.length > 0 ? `(${args.join(', ')})` : '';
	
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

