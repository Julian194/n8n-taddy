import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TaddyApi implements ICredentialType {
	name = 'taddyApi';
	displayName = 'Taddy API';
	documentationUrl = 'https://taddy.org/developers/intro-to-taddy-graphql-api';
	properties: INodeProperties[] = [
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Taddy API User ID',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Taddy API Key',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-USER-ID': '={{$credentials.userId}}',
				'X-API-KEY': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.taddy.org',
			url: '',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				query: '{ __schema { types { name } } }',
			},
		},
	};
}