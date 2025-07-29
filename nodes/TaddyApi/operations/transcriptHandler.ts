import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { OperationHandler } from './types';
import { buildGetEpisodeTranscriptQuery } from '../utils/graphqlQueries';
import { processTranscriptResult } from '../utils/responseProcessors';
import { validateUuid } from '../utils/validators';
import { executeGraphQLQuery } from './common';

export class TranscriptHandler implements OperationHandler {
	async execute(context: IExecuteFunctions, itemIndex: number): Promise<any> {
		const episodeUuid = context.getNodeParameter('transcriptEpisodeUuid', itemIndex) as string;
		const useOnDemandCredits = context.getNodeParameter('useOnDemandCredits', itemIndex) as boolean;

		if (!episodeUuid) {
			throw new NodeOperationError(context.getNode(), 'Episode UUID is required', {
				itemIndex,
			});
		}

		if (!validateUuid(episodeUuid)) {
			throw new NodeOperationError(context.getNode(), 'Invalid episode UUID format', {
				itemIndex,
			});
		}

		const query = buildGetEpisodeTranscriptQuery(episodeUuid, useOnDemandCredits);
		const data = await executeGraphQLQuery(context, query);

		return processTranscriptResult(data);
	}
}