import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { OperationHandler } from './types';
import { getResponseFields, getPaginationParams } from './parameterUtils';
import { buildGetPopularContentQuery } from '../utils/graphqlQueries';
import { processPopularContentResults } from '../utils/responseProcessors';
import { validateLanguageCode } from '../utils/validators';
import { executeGraphQLQuery } from './common';

export class PopularHandler implements OperationHandler {
	async execute(context: IExecuteFunctions, itemIndex: number): Promise<any[]> {
		const language = context.getNodeParameter('popularLanguage', itemIndex) as string;
		const genres = context.getNodeParameter('popularGenres', itemIndex) as string[];
		const responseFields = getResponseFields(context, itemIndex, 'popularResponseFields');
		const { page, limitPerPage } = getPaginationParams(context, itemIndex, 'popular');

		if (language && !validateLanguageCode(language)) {
			throw new NodeOperationError(context.getNode(), 'Invalid language code format', {
				itemIndex,
			});
		}

		const query = buildGetPopularContentQuery(
			language || undefined,
			genres?.length ? genres : undefined,
			page,
			limitPerPage,
			responseFields
		);
		const data = await executeGraphQLQuery(context, query);

		return processPopularContentResults(data);
	}
}