export interface ProcessedResult {
	type: 'podcast' | 'episode' | 'comic' | 'creator';
	uuid: string;
	name: string;
	description?: string;
	searchId?: string;
	ranking?: {
		score: number;
		relevance: string;
	};
	metadata?: {
		totalCount: number;
		pagesCount: number;
		id: string;
	};
	// Type-specific fields will be preserved as-is
	[key: string]: any;
}

export function processSearchResults(data: any): any[] {
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
	
	const results: any[] = [];
	
	// Add metadata as the first item for easy access
	results.push({
		_type: 'search_metadata',
		...searchMetadata,
	});
	
	// Process podcast series
	if (searchData.podcastSeries) {
		searchData.podcastSeries.forEach((podcast: any) => {
			results.push({
				type: 'podcast',
				uuid: podcast.uuid,
				name: podcast.name,
				description: podcast.description,
				...podcast,
			});
		});
	}
	
	// Process podcast episodes
	if (searchData.podcastEpisodes) {
		searchData.podcastEpisodes.forEach((episode: any) => {
			results.push({
				type: 'episode',
				uuid: episode.uuid,
				name: episode.name,
				description: episode.description,
				...episode,
			});
		});
	}
	
	// Process comic series
	if (searchData.comicSeries) {
		searchData.comicSeries.forEach((comic: any) => {
			results.push({
				type: 'comic',
				uuid: comic.uuid,
				name: comic.name,
				description: comic.description,
				...comic,
			});
		});
	}
	
	// Process creators
	if (searchData.creators) {
		searchData.creators.forEach((creator: any) => {
			results.push({
				type: 'creator',
				uuid: creator.uuid,
				name: creator.name,
				description: creator.description,
				...creator,
			});
		});
	}
	
	return results;
}

export function processPodcastSeriesResult(data: any): ProcessedResult {
	const podcast = data.getPodcastSeries;
	
	if (!podcast) {
		throw new Error('Podcast not found');
	}
	
	return {
		type: 'podcast',
		uuid: podcast.uuid,
		name: podcast.name,
		description: podcast.description,
		...podcast,
	};
}

export function processEpisodeResult(data: any): ProcessedResult {
	const episode = data.getEpisode;
	
	if (!episode) {
		throw new Error('Episode not found');
	}
	
	return {
		type: 'episode',
		uuid: episode.uuid,
		name: episode.name,
		description: episode.description,
		...episode,
	};
}

export function processPopularContentResults(data: any): ProcessedResult[] {
	const results: ProcessedResult[] = [];
	const popularData = data.getPopularContent;
	
	if (!popularData) return results;
	
	const metadata = {
		popularityRankId: popularData.popularityRankId,
	};
	
	if (popularData.podcastSeries) {
		popularData.podcastSeries.forEach((podcast: any) => {
			results.push({
				type: 'podcast',
				uuid: podcast.uuid,
				name: podcast.name,
				description: podcast.description,
				metadata,
				...podcast,
			});
		});
	}
	
	return results;
}

export function processLatestEpisodesResults(data: any): ProcessedResult[] {
	const results: ProcessedResult[] = [];
	const latestData = data.getLatestPodcastEpisodes;
	
	if (!latestData) return results;
	
	// getLatestPodcastEpisodes returns episodes directly as an array
	if (Array.isArray(latestData)) {
		latestData.forEach((episode: any) => {
			results.push({
				type: 'episode',
				uuid: episode.uuid,
				name: episode.name,
				description: episode.description,
				...episode,
			});
		});
	}
	
	return results;
}

export function processTranscriptResult(data: any): any {
	const transcript = data.getEpisodeTranscript;
	
	if (!transcript) {
		throw new Error('Transcript not found or not available');
	}
	
	return {
		type: 'transcript',
		...transcript,
	};
}

export function processTopChartsResults(data: any, operation: 'country' | 'genres'): ProcessedResult[] {
	const results: ProcessedResult[] = [];
	const topChartsData = operation === 'country' ? data.getTopChartsByCountry : data.getTopChartsByGenres;
	
	if (!topChartsData) return results;
	
	const metadata = {
		topChartsId: topChartsData.topChartsId,
	};
	
	// Process podcast series from top charts
	if (topChartsData.podcastSeries) {
		topChartsData.podcastSeries.forEach((podcast: any) => {
			results.push({
				type: 'podcast',
				uuid: podcast.uuid,
				name: podcast.name,
				metadata,
				...podcast,
			});
		});
	}
	
	// Process podcast episodes from top charts
	if (topChartsData.podcastEpisodes) {
		topChartsData.podcastEpisodes.forEach((episode: any) => {
			results.push({
				type: 'episode',
				uuid: episode.uuid,
				name: episode.name,
				metadata,
				...episode,
			});
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