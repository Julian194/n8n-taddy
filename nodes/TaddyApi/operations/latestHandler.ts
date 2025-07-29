import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { OperationHandler } from './types';
import { getResponseFields } from './parameterUtils';
import { buildGetLatestEpisodesQuery } from '../utils/graphqlQueries';
import { processLatestEpisodesResults } from '../utils/responseProcessors';
import { validateUuid } from '../utils/validators';
import { executeGraphQLQuery } from './common';

export class LatestHandler implements OperationHandler {
	async execute(context: IExecuteFunctions, itemIndex: number): Promise<any[]> {
		const uuidsString = context.getNodeParameter('latestPodcastUuids', itemIndex) as string;
		const responseFields = getResponseFields(context, itemIndex, 'latestResponseFields');
		
		if (!uuidsString) {
			throw new NodeOperationError(context.getNode(), 'Podcast UUIDs are required', {
				itemIndex,
			});
		}
		
		const podcastUuids = uuidsString.split(',').map(uuid => uuid.trim());
		
		for (const uuid of podcastUuids) {
			if (!validateUuid(uuid)) {
				throw new NodeOperationError(context.getNode(), `Invalid UUID format: ${uuid}`, {
					itemIndex,
				});
			}
		}

		const query = buildGetLatestEpisodesQuery(podcastUuids, responseFields);
		const data = await executeGraphQLQuery(context, query);

		return processLatestEpisodesResults(data);
	}
}