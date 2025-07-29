import { IExecuteFunctions } from 'n8n-workflow';
import { OperationHandler } from './types';
import { buildSearchFilters, buildSearchOptions, validateFilters, getResponseFields } from './parameterUtils';
import { buildSearchQuery } from '../utils/graphqlQueries';
import { processSearchResults } from '../utils/responseProcessors';
import { executeGraphQLQuery } from './common';

export class SearchHandler implements OperationHandler {
	async execute(context: IExecuteFunctions, itemIndex: number): Promise<any[]> {
		const responseFields = getResponseFields(context, itemIndex, 'responseFields');
		const searchOptions = buildSearchOptions(context, itemIndex);
		const filters = buildSearchFilters(context, itemIndex);

		validateFilters(filters, context, itemIndex);

		const query = buildSearchQuery(searchOptions, filters, responseFields);
		const data = await executeGraphQLQuery(context, query);

		return processSearchResults(data);
	}
}