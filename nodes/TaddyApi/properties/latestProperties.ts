import { INodeProperties } from 'n8n-workflow';
import { createOperationProperty, createResponseFieldsProperty, EPISODE_FIELD_OPTIONS } from './baseProperties';

const latestOperationPropertyBase = createOperationProperty('latest', [
	{
		name: 'Get',
		value: 'getLatest',
		description: 'Get latest episodes from multiple podcasts',
		action: 'Get latest episodes',
	},
]);

export const latestOperationProperty = {
	...latestOperationPropertyBase,
	default: 'getLatest',
};

export const latestProperties: INodeProperties[] = [
	{
		displayName: 'Podcast UUIDs',
		name: 'latestPodcastUuids',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['latest'],
				operation: ['getLatest'],
			},
		},
		default: '',
		placeholder: 'uuid1,uuid2,uuid3',
		description: 'Comma-separated list of podcast UUIDs to get latest episodes from',
	},
	createResponseFieldsProperty(
		'latestResponseFields',
		['latest'],
		['getLatest'],
		EPISODE_FIELD_OPTIONS.filter(field => 
			!['itunesId', 'rssUrl'].includes(field.value)
		),
		['uuid', 'name', 'description']
	),
];