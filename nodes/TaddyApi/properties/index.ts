import { INodeProperties } from 'n8n-workflow';
import { resourceProperty } from './baseProperties';
import { searchOperationProperty, searchProperties } from './searchProperties';
import { podcastOperationProperty, podcastProperties } from './podcastProperties';
import { episodeOperationProperty, episodeProperties } from './episodeProperties';
import { popularOperationProperty, popularProperties } from './popularProperties';
import { latestOperationProperty, latestProperties } from './latestProperties';
import { transcriptOperationProperty, transcriptProperties } from './transcriptProperties';
import { topChartsOperationProperty, topChartsProperties } from './topChartsProperties';

export function getAllNodeProperties(): INodeProperties[] {
	return [
		resourceProperty,
		searchOperationProperty,
		podcastOperationProperty,
		episodeOperationProperty,
		popularOperationProperty,
		latestOperationProperty,
		transcriptOperationProperty,
		topChartsOperationProperty,
		...searchProperties,
		...podcastProperties,
		...episodeProperties,
		...popularProperties,
		...latestProperties,
		...transcriptProperties,
		...topChartsProperties,
	];
}

export * from './baseProperties';
export * from './searchProperties';
export * from './podcastProperties';
export * from './episodeProperties';
export * from './popularProperties';
export * from './latestProperties';
export * from './transcriptProperties';
export * from './topChartsProperties';