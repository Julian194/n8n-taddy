import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import { getAllNodeProperties } from './properties';
import { operationHandlers } from './operations';

export class TaddyApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Taddy API',
		name: 'taddyApi',
		icon: 'file:taddyApi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Taddy Podcast API - Search 4M+ podcasts and 180M+ episodes',
		defaults: {
			name: 'Taddy API',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'taddyApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.taddy.org',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		properties: getAllNodeProperties(),
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const handlerKey = `${resource}.${operation}`;

				const handler = operationHandlers[handlerKey as keyof typeof operationHandlers];
				if (!handler) {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${resource}.${operation}`, {
						itemIndex: i,
					});
				}

				const responseData = await handler.execute(this, i);

				if (Array.isArray(responseData)) {
					responseData.forEach((item) => {
						returnData.push({
							json: item,
							pairedItem: { item: i },
						});
					});
				} else {
					returnData.push({
						json: responseData,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}