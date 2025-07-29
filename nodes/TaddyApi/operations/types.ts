import { IExecuteFunctions } from 'n8n-workflow';

export interface OperationHandler {
	execute(context: IExecuteFunctions, itemIndex: number): Promise<any>;
}

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