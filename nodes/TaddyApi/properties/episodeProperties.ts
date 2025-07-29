import { INodeProperties } from 'n8n-workflow';
import { createOperationProperty, createResponseFieldsProperty, EPISODE_FIELD_OPTIONS } from './baseProperties';

export const episodeOperationProperty = createOperationProperty('episode', [
	{
		name: 'Get Details',
		value: 'getDetails',
		description: 'Get detailed information about a specific episode',
		action: 'Get episode details',
	},
]);

export const episodeProperties: INodeProperties[] = [
	{
		displayName: 'Identifier Type',
		name: 'episodeIdentifierType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['episode'],
				operation: ['getDetails'],
			},
		},
		options: [
			{
				name: 'UUID',
				value: 'uuid',
			},
			{
				name: 'GUID',
				value: 'guid',
			},
			{
				name: 'Name',
				value: 'name',
			},
		],
		default: 'uuid',
		description: 'How to identify the episode',
	},
	{
		displayName: 'Identifier Value',
		name: 'episodeIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['episode'],
				operation: ['getDetails'],
			},
		},
		default: '',
		placeholder: 'Enter UUID, GUID, or episode name',
		description: 'The identifier value for the episode',
	},
	createResponseFieldsProperty(
		'episodeResponseFields',
		['episode'],
		['getDetails'],
		EPISODE_FIELD_OPTIONS,
		['uuid', 'name', 'description']
	),
	{
		displayName: 'Include Transcript',
		name: 'episodeIncludeTranscript',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['episode'],
				operation: ['getDetails'],
			},
		},
		default: false,
		description: 'Whether to include episode transcript data',
	},
	{
		displayName: 'Include Chapters',
		name: 'episodeIncludeChapters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['episode'],
				operation: ['getDetails'],
			},
		},
		default: false,
		description: 'Whether to include episode chapter data',
	},
];