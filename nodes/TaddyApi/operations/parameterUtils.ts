import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { SearchFilters, SearchOptions } from './types';
import { 
	validateSearchTerm, 
	validateFilterValues, 
	validatePaginationParams, 
	sanitizeSearchTerm 
} from '../utils/validators';

export function buildSearchFilters(context: IExecuteFunctions, itemIndex: number): SearchFilters {
	const additionalOptions = context.getNodeParameter('additionalOptions', itemIndex, {}) as any;
	const contentTypes = context.getNodeParameter('contentTypes', itemIndex) as string[];
	
	const filters: SearchFilters = {
		filterForTypes: contentTypes,
	};

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

	return filters;
}

export function buildSearchOptions(context: IExecuteFunctions, itemIndex: number): SearchOptions {
	const searchTerm = context.getNodeParameter('searchTerm', itemIndex) as string;
	const excludeTerms = context.getNodeParameter('excludeTerms', itemIndex, '') as string;
	const sortBy = context.getNodeParameter('sortBy', itemIndex) as 'POPULARITY' | 'EXACTNESS';
	const matchType = context.getNodeParameter('matchType', itemIndex) as 'EXACT_PHRASE' | 'ALL_TERMS' | 'MOST_TERMS';
	const page = context.getNodeParameter('page', itemIndex) as number;
	const limitPerPage = context.getNodeParameter('limitPerPage', itemIndex) as number;

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

	if (!validateSearchTerm(finalSearchTerm)) {
		throw new NodeOperationError(context.getNode(), 'Invalid search term. Must be 1-500 characters.', {
			itemIndex,
		});
	}

	const { page: validPage, limitPerPage: validLimit } = validatePaginationParams(page, limitPerPage);

	return {
		term: sanitizeSearchTerm(finalSearchTerm),
		page: validPage,
		limitPerPage: validLimit,
		sortBy,
		matchType,
	};
}

export function validateFilters(filters: SearchFilters, context: IExecuteFunctions, itemIndex: number): void {
	const validationErrors = validateFilterValues(filters);
	if (validationErrors.length > 0) {
		throw new NodeOperationError(context.getNode(), `Filter validation errors: ${validationErrors.join(', ')}`, {
			itemIndex,
		});
	}
}

export function getResponseFields(context: IExecuteFunctions, itemIndex: number, parameterName: string): string[] {
	return context.getNodeParameter(parameterName, itemIndex) as string[];
}

export function getPaginationParams(context: IExecuteFunctions, itemIndex: number, prefix = ''): { page: number; limitPerPage: number } {
	const page = context.getNodeParameter(`${prefix}page`, itemIndex) as number;
	const limitPerPage = context.getNodeParameter(`${prefix}limitPerPage`, itemIndex) as number;
	return validatePaginationParams(page, limitPerPage);
}