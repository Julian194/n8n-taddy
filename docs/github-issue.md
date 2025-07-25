# Build Custom N8N Node for Taddy Podcast API

## Summary
Create a comprehensive n8n custom node that integrates with Taddy's GraphQL podcast API, supporting all search features and operations as described in the API documentation.

## Background
Taddy API provides access to 4+ million podcasts and 180+ million episodes with powerful search capabilities. This node will enable n8n users to:
- Search podcasts, episodes, comics, and creators
- Retrieve detailed information about content
- Access transcripts and metadata
- Filter by countries, languages, genres, and other criteria

## Technical Requirements

### Node Architecture
- **Type**: Programmatic-style n8n node (TypeScript)
- **API**: GraphQL integration with Taddy API (https://api.taddy.org)
- **Authentication**: X-USER-ID and X-API-KEY headers
- **Node Package**: Compatible with n8n community node standards

### Core Operations to Implement

1. **Search Content**
   - Full-text search across all content types
   - Support for PODCASTSERIES, PODCASTEPISODE, COMICSERIES, CREATOR
   - Advanced filtering: countries, languages, genres, dates, duration
   - Search behavior: EXACTNESS vs POPULARITY sorting
   - Match types: EXACT_PHRASE, ALL_TERMS, MOST_TERMS
   - Pagination support (1-20 pages, 1-25 results per page)

2. **Get Podcast Details**
   - Retrieve specific podcast information by UUID/name/RSS URL/iTunes ID
   - Include episodes, genres, transcription status, popularity rank
   - Support for episode filtering and pagination

3. **Get Episode Details**
   - Fetch episode information by UUID/GUID/name
   - Access transcripts, chapters, and metadata
   - Include podcast series details

4. **Get Popular Content**
   - Retrieve trending/popular podcasts
   - Filter by language and genre
   - Pagination support

5. **Get Latest Episodes**
   - Fetch recent episodes from multiple podcasts
   - Support for up to 1000 podcast UUIDs or RSS URLs
   - Pagination for large result sets

6. **Get Episode Transcript**
   - Access transcript data with timecodes and speakers
   - Support for on-demand transcription credits
   - Multiple transcript formats (paragraph, detailed)

### Search Filter Parameters

**Content Filtering:**
- `filterForTypes` - Content type selection
- `filterForCountries` - ISO country codes  
- `filterForLanguages` - Language selection
- `filterForGenres` - Podcast genre filtering
- `filterForSeriesUuids` - Specific podcast filtering
- `filterForPodcastContentType` - Audio vs Video

**Date & Duration Filters:**
- `filterForPublishedAfter/Before` - Publication date range
- `filterForLastUpdatedAfter/Before` - Update date range  
- `filterForDurationLessThan/GreaterThan` - Episode duration
- `filterForTotalEpisodesLessThan/GreaterThan` - Podcast size

**Content Features:**
- `filterForHasTranscript` - Transcript availability
- `filterForHasChapters` - Chapter availability
- `isSafeMode` - Filter explicit content

### File Structure
```
nodes/
  TaddyApi/
    TaddyApi.node.ts           # Main node implementation
    TaddyApiDescription.ts     # Dynamic UI properties
    utils/
      graphqlQueries.ts        # Query builders
      responseProcessors.ts    # Data processing
      validators.ts           # Input validation
credentials/
  TaddyApi.credentials.ts      # API credentials
package.json                  # Node package config
tsconfig.json                # TypeScript config
```

### Dynamic UI Implementation

**Operation-Based Fields:**
- Show/hide fields based on selected operation
- Context-aware form validation
- Progressive disclosure for advanced options

**Content Type Filtering:**
- Episode-specific filters only for episode searches
- Podcast-specific options for series operations
- Creator/comic filters for respective content types

**Advanced Options:**
- Collapsible sections for power users
- Sensible defaults for common use cases
- Help text explaining complex parameters

### Response Processing

**Unified Data Structure:**
```typescript
interface ProcessedResult {
  type: 'podcast' | 'episode' | 'comic' | 'creator';
  uuid: string;
  name: string;
  description?: string;
  searchId?: string;
  ranking?: {
    score: number;
    relevance: string;
  };
  metadata?: {
    totalCount: number;
    pagesCount: number;
  };
  // Type-specific fields
}
```

**Search Result Enhancement:**
- Add ranking scores and metadata
- Normalize response structure across content types
- Include search context (searchId, filters applied)

### Error Handling & Validation

**API Error Management:**
- GraphQL error parsing and user-friendly messages
- Rate limit detection and guidance
- Authentication failure handling
- Invalid parameter validation

**Input Validation:**
- Required field checking
- Parameter range validation (pages, limits)
- Date format verification
- UUID format validation

## Implementation Plan

### Phase 1: Core Infrastructure
- [ ] Set up TypeScript project structure
- [ ] Implement Taddy API credentials
- [ ] Create GraphQL client foundation
- [ ] Build basic query system

### Phase 2: Search Operation  
- [ ] Implement comprehensive search functionality
- [ ] Add all filter parameters
- [ ] Create dynamic UI components
- [ ] Implement response processing

### Phase 3: Additional Operations
- [ ] Get Podcast/Episode Details operations
- [ ] Popular Content and Latest Episodes
- [ ] Transcript access functionality
- [ ] Error handling and validation

### Phase 4: Polish & Testing
- [ ] Comprehensive error handling
- [ ] Input validation and sanitization
- [ ] Unit and integration tests
- [ ] Documentation and examples

## Acceptance Criteria

- [ ] Node successfully authenticates with Taddy API
- [ ] All search parameters from API documentation are supported
- [ ] Dynamic UI shows/hides fields based on context
- [ ] Response data is properly structured and processed
- [ ] Comprehensive error handling with clear messages
- [ ] Compatible with n8n community node standards
- [ ] Includes proper TypeScript types and validation
- [ ] Documented with usage examples

## Testing Strategy

**Unit Tests:**
- Query builder functions
- Response processors
- Input validators
- Error handlers

**Integration Tests:**
- Live API calls with test credentials
- GraphQL query validation
- Response parsing accuracy

**End-to-End Tests:**
- Complete workflows in n8n environment
- Error scenarios and edge cases
- Performance with large result sets

## Resources

- [Taddy API Documentation](https://taddy.org/developers/podcast-api)
- [N8N Custom Node Guide](https://docs.n8n.io/integrations/creating-nodes/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Taddy API Playground](https://api.taddy.org)

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>