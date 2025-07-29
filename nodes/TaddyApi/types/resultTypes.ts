
export interface SearchMetadata {
	_type: 'search_metadata';
	searchId: string;
	responseId: string;
	totalCount: number;
	pagesCount: number;
}

export interface PodcastResult {
	type: 'podcast';
	uuid: string;
	name: string;
	description?: string;
	imageUrl?: string;
	itunesId?: string;
	rssUrl?: string;
	websiteUrl?: string;
	language?: string;
	countries?: string[];
	totalEpisodeCount?: number;
	popularityRank?: number;
	genres?: Array<{ name: string }>;
	episodes?: EpisodeResult[];
}

export interface EpisodeResult {
	type: 'episode';
	uuid: string;
	name: string;
	description?: string;
	audioUrl?: string;
	websiteUrl?: string;
	datePublished?: string;
	duration?: number;
	episodeNumber?: number;
	seasonNumber?: number;
	podcastSeries?: {
		uuid: string;
		name: string;
		description?: string;
		imageUrl?: string;
		itunesId?: string;
		rssUrl?: string;
	};
	transcript?: string;
	chapters?: Array<{
		id: string;
		title: string;
		startTimecode: number;
	}>;
}

export interface ComicResult {
	type: 'comic';
	uuid: string;
	name: string;
	description?: string;
}

export interface CreatorResult {
	type: 'creator';
	uuid: string;
	name: string;
	description?: string;
}

export interface TranscriptItem {
	type: 'transcript_item';
	id: string;
	text: string;
	speaker?: string;
	startTimecode?: number;
	endTimecode?: number;
}

export interface PopularContentResult extends PodcastResult {
	metadata?: {
		popularityRankId: string;
	};
}

export interface TopChartsResult {
	type: 'podcast' | 'episode';
	uuid: string;
	name: string;
	description?: string;
	metadata?: {
		topChartsId: string;
	};
	[key: string]: any;
}

export type ProcessedResult = 
	SearchMetadata |
	PodcastResult |
	EpisodeResult |
	ComicResult |
	CreatorResult |
	TranscriptItem |
	PopularContentResult |
	TopChartsResult;