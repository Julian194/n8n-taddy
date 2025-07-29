import { 
	ProcessedResult, 
	SearchMetadata, 
	PodcastResult, 
	EpisodeResult, 
	ComicResult, 
	CreatorResult, 
	TranscriptItem,
	PopularContentResult,
	TopChartsResult 
} from '../types/resultTypes';

export function processSearchResults(data: any): ProcessedResult[] {
	const searchData = data.search;
	
	if (!searchData) return [];
	
	// Extract metadata from responseDetails array (first item)
	const responseDetails = searchData.responseDetails?.[0];
	const searchMetadata = {
		searchId: searchData.searchId,
		responseId: responseDetails?.id,
		totalCount: responseDetails?.totalCount,
		pagesCount: responseDetails?.pagesCount,
	};
	
	const results: ProcessedResult[] = [];
	
	results.push({
		_type: 'search_metadata',
		...searchMetadata,
	} as SearchMetadata);
	
	if (searchData.podcastSeries) {
		searchData.podcastSeries.forEach((podcast: any) => {
			results.push({
				type: 'podcast',
				...podcast,
			} as PodcastResult);
		});
	}
	
	if (searchData.podcastEpisodes) {
		searchData.podcastEpisodes.forEach((episode: any) => {
			results.push({
				type: 'episode',
				...episode,
			} as EpisodeResult);
		});
	}
	
	if (searchData.comicSeries) {
		searchData.comicSeries.forEach((comic: any) => {
			results.push({
				type: 'comic',
				...comic,
			} as ComicResult);
		});
	}
	
	if (searchData.creators) {
		searchData.creators.forEach((creator: any) => {
			results.push({
				type: 'creator',
				...creator,
			} as CreatorResult);
		});
	}
	
	return results;
}

export function processPodcastSeriesResult(data: any): PodcastResult {
	const podcast = data.getPodcastSeries;
	
	if (!podcast) {
		throw new Error('Podcast not found');
	}
	
	return {
		type: 'podcast',
		...podcast,
	} as PodcastResult;
}

export function processEpisodeResult(data: any): EpisodeResult {
	const episode = data.getPodcastEpisode;
	
	if (!episode) {
		throw new Error('Episode not found');
	}
	
	return {
		type: 'episode',
		...episode,
	} as EpisodeResult;
}

export function processPopularContentResults(data: any): PopularContentResult[] {
	const results: PopularContentResult[] = [];
	const popularData = data.getPopularContent;
	
	if (!popularData) return results;
	
	const metadata = {
		popularityRankId: popularData.popularityRankId,
	};
	
	if (popularData.podcastSeries) {
		popularData.podcastSeries.forEach((podcast: any) => {
			results.push({
				type: 'podcast',
				metadata,
				...podcast,
			} as PopularContentResult);
		});
	}
	
	return results;
}

export function processLatestEpisodesResults(data: any): EpisodeResult[] {
	const results: EpisodeResult[] = [];
	const latestData = data.getLatestPodcastEpisodes;
	
	if (!latestData) return results;
	
	if (Array.isArray(latestData)) {
		latestData.forEach((episode: any) => {
			results.push({
				type: 'episode',
				...episode,
			} as EpisodeResult);
		});
	}
	
	return results;
}

export function processTranscriptResult(data: any): TranscriptItem[] {
	const transcriptItems = data.getEpisodeTranscript;
	
	if (!transcriptItems || !Array.isArray(transcriptItems)) {
		throw new Error('Transcript not found or not available');
	}
	
	return transcriptItems.map((item: any) => ({
		type: 'transcript_item',
		...item,
	} as TranscriptItem));
}

export function processTopChartsResults(data: any, operation: 'country' | 'genres'): TopChartsResult[] {
	const results: TopChartsResult[] = [];
	const topChartsData = operation === 'country' ? data.getTopChartsByCountry : data.getTopChartsByGenres;
	
	if (!topChartsData) return results;
	
	const metadata = {
		topChartsId: topChartsData.topChartsId,
	};
	
	if (topChartsData.podcastSeries) {
		topChartsData.podcastSeries.forEach((podcast: any) => {
			results.push({
				type: 'podcast',
				metadata,
				...podcast,
			} as TopChartsResult);
		});
	}
	
	if (topChartsData.podcastEpisodes) {
		topChartsData.podcastEpisodes.forEach((episode: any) => {
			results.push({
				type: 'episode',
				metadata,
				...episode,
			} as TopChartsResult);
		});
	}
	
	return results;
}

export function processGraphQLError(error: any): string {
	if (error.response?.data?.errors) {
		const graphqlErrors = error.response.data.errors;
		return graphqlErrors.map((err: any) => err.message).join(', ');
	}
	
	if (error.message) {
		return error.message;
	}
	
	return 'Unknown GraphQL error occurred';
}