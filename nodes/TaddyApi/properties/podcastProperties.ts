import { INodeProperties } from 'n8n-workflow';
import { createOperationProperty, createResponseFieldsProperty, PODCAST_FIELD_OPTIONS, EPISODE_FIELD_OPTIONS } from './baseProperties';

const podcastOperationPropertyBase = createOperationProperty('podcast', [
	{
		name: 'Get',
		value: 'getDetails',
		description: 'Get detailed information about a specific podcast',
		action: 'Get a podcast',
	},
]);

export const podcastOperationProperty = {
	...podcastOperationPropertyBase,
	default: 'getDetails',
};

export const podcastProperties: INodeProperties[] = [
	{
		displayName: 'Identifier Type',
		name: 'podcastIdentifierType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['podcast'],
				operation: ['getDetails'],
			},
		},
		options: [
			{
				name: 'UUID',
				value: 'uuid',
			},
			{
				name: 'Name',
				value: 'name',
			},
			{
				name: 'iTunes ID',
				value: 'itunesId',
			},
			{
				name: 'RSS URL',
				value: 'rssUrl',
			},
		],
		default: 'uuid',
		description: 'How to identify the podcast',
	},
	{
		displayName: 'Identifier Value',
		name: 'podcastIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['podcast'],
				operation: ['getDetails'],
			},
		},
		default: '',
		placeholder: 'Enter UUID, name, iTunes ID, or RSS URL',
		description: 'The identifier value for the podcast',
	},
	createResponseFieldsProperty(
		'podcastResponseFields',
		['podcast'],
		['getDetails'],
		PODCAST_FIELD_OPTIONS,
		['uuid', 'name', 'description']
	),
	{
		displayName: 'Include Episodes',
		name: 'podcastIncludeEpisodes',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['podcast'],
				operation: ['getDetails'],
			},
		},
		default: false,
		description: 'Whether to include episodes in the response',
	},
	{
		displayName: 'Episode Fields',
		name: 'podcastEpisodeFields',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['podcast'],
				operation: ['getDetails'],
				podcastIncludeEpisodes: [true],
			},
		},
		options: EPISODE_FIELD_OPTIONS.filter(field => 
			!['podcastDescription', 'podcastImageUrl', 'itunesId', 'rssUrl'].includes(field.value)
		),
		default: ['uuid', 'name', 'description'],
		description: 'Select which episode fields to include',
	},
];