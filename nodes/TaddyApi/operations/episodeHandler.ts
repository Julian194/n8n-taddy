import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { OperationHandler } from './types';
import { getResponseFields } from './parameterUtils';
import { buildGetEpisodeQuery } from '../utils/graphqlQueries';
import { processEpisodeResult } from '../utils/responseProcessors';
import { validateUuid } from '../utils/validators';
import { executeGraphQLQuery } from './common';

export class EpisodeHandler implements OperationHandler {
	async execute(context: IExecuteFunctions, itemIndex: number): Promise<any> {
		const identifierType = context.getNodeParameter('episodeIdentifierType', itemIndex) as 'uuid' | 'guid' | 'name';
		const identifier = context.getNodeParameter('episodeIdentifier', itemIndex) as string;
		const responseFields = getResponseFields(context, itemIndex, 'episodeResponseFields');
		const includeTranscript = context.getNodeParameter('episodeIncludeTranscript', itemIndex) as boolean;
		const includeChapters = context.getNodeParameter('episodeIncludeChapters', itemIndex) as boolean;

		if (!identifier) {
			throw new NodeOperationError(context.getNode(), 'Episode identifier is required', {
				itemIndex,
			});
		}

		if (identifierType === 'uuid' && !validateUuid(identifier)) {
			throw new NodeOperationError(context.getNode(), 'Invalid UUID format', {
				itemIndex,
			});
		}

		const query = buildGetEpisodeQuery(identifier, identifierType, responseFields, includeTranscript, includeChapters);
		const data = await executeGraphQLQuery(context, query);

		return processEpisodeResult(data);
	}
}