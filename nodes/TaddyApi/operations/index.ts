import { SearchHandler } from './searchHandler';
import { PodcastHandler } from './podcastHandler';
import { EpisodeHandler } from './episodeHandler';
import { PopularHandler } from './popularHandler';
import { LatestHandler } from './latestHandler';
import { TranscriptHandler } from './transcriptHandler';
import { TopChartsByCountryHandler, TopChartsByGenresHandler } from './topChartsHandler';

export const operationHandlers = {
	'search.searchContent': new SearchHandler(),
	'podcast.getDetails': new PodcastHandler(),
	'episode.getDetails': new EpisodeHandler(),
	'popular.getPopular': new PopularHandler(),
	'latest.getLatest': new LatestHandler(),
	'transcript.getTranscript': new TranscriptHandler(),
	'topCharts.getByCountry': new TopChartsByCountryHandler(),
	'topCharts.getByGenres': new TopChartsByGenresHandler(),
};

export * from './types';
export * from './common';
export * from './parameterUtils';