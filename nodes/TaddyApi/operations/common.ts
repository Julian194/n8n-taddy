import { IExecuteFunctions, NodeApiError, NodeOperationError, IHttpRequestMethods } from 'n8n-workflow';

export async function executeGraphQLQuery(context: IExecuteFunctions, query: string): Promise<any> {
	const options = {
		method: 'POST' as IHttpRequestMethods,
		url: 'https://api.taddy.org',
		body: {
			query,
		},
		json: true,
	};

	try {
		const response = await context.helpers.requestWithAuthentication.call(context, 'taddyApi', options);
		
		if (response.errors) {
			const errorDetails = response.errors.map((err: any) => err.message).join(', ');
			throw new NodeApiError(context.getNode(), {
				message: `GraphQL Error: ${errorDetails}`,
				description: `Errors: ${JSON.stringify(response.errors)}. Query: ${query}`,
			});
		}
		
		return response.data;
	} catch (error) {
		const debugInfo = {
			message: error.message,
			status: error.response?.status,
			statusText: error.response?.statusText,
			responseData: error.response?.data,
			responseHeaders: error.response?.headers
		};
		
		const errorMsg = `API Error: ${error.message}. Status: ${error.response?.status}. Debug: ${JSON.stringify(debugInfo)}. Query: ${query}`;
		throw new NodeOperationError(context.getNode(), errorMsg);
	}
}