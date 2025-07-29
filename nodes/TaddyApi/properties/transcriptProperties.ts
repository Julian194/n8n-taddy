import { INodeProperties } from 'n8n-workflow';
import { createOperationProperty } from './baseProperties';

const transcriptOperationPropertyBase = createOperationProperty('transcript', [
	{
		name: 'Get',
		value: 'getTranscript',
		description: 'Get transcript for a specific episode',
		action: 'Get a transcript',
	},
]);

export const transcriptOperationProperty = {
	...transcriptOperationPropertyBase,
	default: 'getTranscript',
};

export const transcriptProperties: INodeProperties[] = [
	{
		displayName: 'Episode UUID',
		name: 'transcriptEpisodeUuid',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['transcript'],
				operation: ['getTranscript'],
			},
		},
		default: '',
		placeholder: 'Episode UUID',
		description: 'The UUID of the episode to get transcript for',
	},
	{
		displayName: 'Use On-Demand Credits',
		name: 'useOnDemandCredits',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['transcript'],
				operation: ['getTranscript'],
			},
		},
		default: false,
		description: 'Whether to use on-demand transcription credits if needed',
	},
];