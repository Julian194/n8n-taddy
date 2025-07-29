import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { OperationHandler } from './types';
import { getResponseFields } from './parameterUtils';
import { buildGetPodcastSeriesQuery } from '../utils/graphqlQueries';
import { processPodcastSeriesResult } from '../utils/responseProcessors';
import { validateUuid, validateItunesId, validateUrl } from '../utils/validators';
import { executeGraphQLQuery } from './common';

export class PodcastHandler implements OperationHandler {
	async execute(context: IExecuteFunctions, itemIndex: number): Promise<any> {
		const identifierType = context.getNodeParameter('podcastIdentifierType', itemIndex) as 'uuid' | 'name' | 'itunesId' | 'rssUrl';
		const identifier = context.getNodeParameter('podcastIdentifier', itemIndex) as string;
		const responseFields = getResponseFields(context, itemIndex, 'podcastResponseFields');
		const includeEpisodes = context.getNodeParameter('podcastIncludeEpisodes', itemIndex) as boolean;
		const episodeFields = includeEpisodes ? getResponseFields(context, itemIndex, 'podcastEpisodeFields') : ['uuid', 'name', 'description'];

		if (!identifier) {
			throw new NodeOperationError(context.getNode(), 'Podcast identifier is required', {
				itemIndex,
			});
		}

		this.validateIdentifier(identifierType, identifier, context, itemIndex);

		const includeGenres = responseFields.includes('genres');
		const query = buildGetPodcastSeriesQuery(identifier, identifierType, responseFields, includeGenres, includeEpisodes, episodeFields);
		const data = await executeGraphQLQuery(context, query);

		return processPodcastSeriesResult(data);
	}

	private validateIdentifier(identifierType: string, identifier: string, context: IExecuteFunctions, itemIndex: number): void {
		switch (identifierType) {
			case 'uuid':
				if (!validateUuid(identifier)) {
					throw new NodeOperationError(context.getNode(), 'Invalid UUID format', { itemIndex });
				}
				break;
			case 'itunesId':
				if (!validateItunesId(identifier)) {
					throw new NodeOperationError(context.getNode(), 'Invalid iTunes ID format', { itemIndex });
				}
				break;
			case 'rssUrl':
				if (!validateUrl(identifier)) {
					throw new NodeOperationError(context.getNode(), 'Invalid RSS URL format', { itemIndex });
				}
				break;
		}
	}
}