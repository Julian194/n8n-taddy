import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { OperationHandler } from './types';
import { getPaginationParams } from './parameterUtils';
import { buildGetTopChartsByCountryQuery, buildGetTopChartsByGenresQuery } from '../utils/graphqlQueries';
import { processTopChartsResults } from '../utils/responseProcessors';
import { executeGraphQLQuery } from './common';

export class TopChartsByCountryHandler implements OperationHandler {
	async execute(context: IExecuteFunctions, itemIndex: number): Promise<any[]> {
		const contentType = context.getNodeParameter('topChartsContentType', itemIndex) as 'PODCASTSERIES' | 'PODCASTEPISODE';
		const country = context.getNodeParameter('topChartsCountry', itemIndex) as string;
		const source = context.getNodeParameter('topChartsSource', itemIndex, 'APPLE_PODCASTS') as string;
		const { page, limitPerPage } = getPaginationParams(context, itemIndex, 'topCharts');

		const query = buildGetTopChartsByCountryQuery(contentType, country, source, page, limitPerPage);
		const data = await executeGraphQLQuery(context, query);

		return processTopChartsResults(data, 'country');
	}
}

export class TopChartsByGenresHandler implements OperationHandler {
	async execute(context: IExecuteFunctions, itemIndex: number): Promise<any[]> {
		const contentType = context.getNodeParameter('topChartsContentType', itemIndex) as 'PODCASTSERIES' | 'PODCASTEPISODE';
		const genres = context.getNodeParameter('topChartsGenres', itemIndex) as string[];
		const source = context.getNodeParameter('topChartsSource', itemIndex, 'APPLE_PODCASTS') as string;
		const filterByCountry = context.getNodeParameter('topChartsFilterByCountry', itemIndex, '') as string;
		const { page, limitPerPage } = getPaginationParams(context, itemIndex, 'topCharts');

		if (!genres || genres.length === 0) {
			throw new NodeOperationError(context.getNode(), 'At least one genre must be selected', {
				itemIndex,
			});
		}

		if (filterByCountry && contentType === 'PODCASTSERIES') {
			throw new NodeOperationError(context.getNode(), 'Podcasts content type is not available when filtering by country. Please select Episodes instead.', {
				itemIndex,
			});
		}

		const query = buildGetTopChartsByGenresQuery(
			contentType,
			genres,
			source,
			filterByCountry || undefined,
			page,
			limitPerPage
		);
		const data = await executeGraphQLQuery(context, query);

		return processTopChartsResults(data, 'genres');
	}
}