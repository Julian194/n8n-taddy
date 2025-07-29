# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an n8n custom node package that integrates with the Taddy Podcast API, providing access to 4+ million podcasts and 180+ million episodes through GraphQL queries. The node implements a programmatic-style n8n integration following n8n community node standards.

## Build and Development Commands

```bash
# Build the node (compiles TypeScript and processes icons)
npm run build

# Watch mode for development
npm run dev

# Lint code
npm run lint

# Auto-fix linting issues
npm run lintfix

# Format code
npm run format

# Prepare for publishing (builds and lints)
npm run prepublishOnly
```

## Testing the Node Locally

The node uses npm linking for local development:

```bash
# 1. Build and link the package
npm run build
npm link

# 2. Set up n8n custom directory (if needed)
mkdir -p ~/.n8n/custom
cd ~/.n8n/custom
npm init -y

# 3. Link the node in n8n
npm link n8n-nodes-taddy

# 4. Start n8n
n8n start
```

After changes, you must rebuild and update the link:
```bash
npm run build
cd ~/.n8n/custom
npm unlink n8n-nodes-taddy
npm link n8n-nodes-taddy
```

Then restart n8n to pick up changes.

## Architecture Overview

### Core Components

- **Main Node** (`nodes/TaddyApi/TaddyApi.node.ts`): Lightweight coordinator (80 lines) that delegates to operation handlers for 7 resource types (Search, Podcast, Episode, Popular Content, Latest Episodes, Top Charts, Transcript)
- **Credentials** (`credentials/TaddyApi.credentials.ts`): Handles X-USER-ID and X-API-KEY authentication headers
- **Modular Architecture**: The codebase is organized into focused modules:
  - `properties/`: UI property definitions for each resource type
  - `operations/`: Business logic handlers for each operation
  - `types/`: TypeScript interfaces for type safety
  - `utils/`: Shared utilities (GraphQL queries, response processors, validators, language mappings)

### Modular Handler Architecture

The node uses a class-based handler system with dedicated handlers for each operation:
- **SearchHandler** - Full-text search with advanced filtering
- **PodcastHandler** - Podcast lookup by UUID/name/iTunes ID/RSS URL
- **EpisodeHandler** - Episode lookup by UUID/GUID/name
- **PopularHandler** - Trending podcasts with language/genre filters
- **LatestHandler** - Recent episodes from multiple podcasts
- **TranscriptHandler** - Episode transcript retrieval
- **TopChartsByCountryHandler** & **TopChartsByGenresHandler** - Top charts data

All handlers implement the `OperationHandler` interface and use shared utilities for GraphQL communication, parameter processing, and validation.

### File Structure

The refactored codebase follows a modular architecture:

```
nodes/TaddyApi/
├── TaddyApi.node.ts (80 lines - main coordinator)
├── properties/ (UI property definitions)
│   ├── index.ts (exports all properties)
│   ├── baseProperties.ts (reusable property generators)
│   ├── searchProperties.ts
│   ├── podcastProperties.ts
│   ├── episodeProperties.ts
│   ├── popularProperties.ts
│   ├── latestProperties.ts
│   ├── transcriptProperties.ts
│   └── topChartsProperties.ts
├── operations/ (business logic handlers)
│   ├── index.ts (handler registry)
│   ├── types.ts (shared interfaces)
│   ├── common.ts (GraphQL execution)
│   ├── parameterUtils.ts (parameter processing)
│   ├── searchHandler.ts
│   ├── podcastHandler.ts
│   ├── episodeHandler.ts
│   ├── popularHandler.ts
│   ├── latestHandler.ts
│   ├── transcriptHandler.ts
│   └── topChartsHandler.ts
├── types/
│   └── resultTypes.ts (typed result interfaces)
└── utils/
    ├── graphqlQueries.ts (query builders)
    ├── responseProcessors.ts (result processors)
    ├── validators.ts (input validation)
    ├── languageMappings.ts (language code mappings)
    └── constants.ts (genre/country constants)
```

### Benefits of Refactored Architecture

- **95% reduction in main file size** (1,616 lines → 80 lines)
- **Improved maintainability** through clear separation of concerns
- **Enhanced type safety** with specific result interfaces
- **Better testability** with isolated handler classes
- **Easier debugging** with focused, single-responsibility modules
- **Consistent code organization** following established patterns

### API Integration Patterns

The node integrates with Taddy's GraphQL API using these patterns:
- **Query Building**: Dynamic GraphQL query construction based on user parameters
- **Parameter Validation**: Comprehensive input validation before API calls
- **Response Processing**: Standardized response transformation with metadata injection
- **Error Handling**: GraphQL error parsing with detailed error messages

### UI Architecture

The node uses n8n's dynamic UI system with modular property definitions:
- **Resource-Operation Pattern**: 7 resources, each with specific operations
- **Modular Properties**: UI properties are organized by resource type in separate files
- **Reusable Components**: Common property patterns (pagination, response fields) are generated by utility functions
- **Conditional Fields**: UI fields show/hide based on selected resource and operation
- **Advanced Options**: Complex filters grouped in collapsible sections
- **Input Validation**: Real-time validation with user-friendly error messages
- **Field Selection**: Dynamic response field selection with content-type awareness
- **Exclude Terms**: Dedicated UI field for excluding search terms
- **Genre Dropdown**: 111 genre options for Popular Content filtering
- **Language Support**: Automatic conversion of language codes to enum values (e.g., 'en' → 'ENGLISH')

## GraphQL API Specifics

### Query Construction
- Search operations use the new `search` endpoint (not the deprecated `searchForTermInDatabaseWithFilterOptions`)
- Uses `matchBy` parameter instead of `matchType` for search matching
- Individual lookups use specific queries (`getPodcastSeries`, `getEpisode`, etc.)
- Popular content uses `getPopularContent` with language/genre enum filters
- Latest episodes use `getLatestEpisodes` with podcast UUID or RSS URL arrays
- Includes `responseDetails` for pagination metadata (pagesCount, totalCount)

### Authentication
The API requires two headers:
- `X-USER-ID`: User identifier from Taddy
- `X-API-KEY`: API key from Taddy
These are configured in the credentials file and applied automatically.

### Response Processing
Search responses return an array where:
- **First item**: Search metadata with `_type: 'search_metadata'` containing:
  - `searchId`: Unique search identifier
  - `totalCount`: Total number of results
  - `pagesCount`: Total number of pages
  - `responseId`: Response details identifier
- **Subsequent items**: Individual results (episodes, podcasts, etc.) with:
  - `type`: Content type (podcast/episode/comic/creator)
  - `uuid`: Unique identifier
  - `name` and `description`: Basic metadata
  - Additional type-specific fields preserved as-is
  - Episodes include `podcastSeries` information by default (uuid, name)

## Development Notes

### TypeScript Configuration
- Targets Node.js environment (no DOM APIs)
- Uses strict TypeScript settings
- Compiles to `dist/` directory for n8n consumption

### Icon Handling
- SVG icon located at `nodes/TaddyApi/taddyApi.svg`
- Processed by Gulp during build
- Referenced as `file:taddyApi.svg` in node description

### Package Configuration
- Package name: `n8n-nodes-taddy`
- Main entry: `index.js`
- n8n configuration points to compiled files in `dist/`
- Peer dependency on `n8n-workflow`

### Documentation Structure
- `docs/github-issue.md`: Original requirements specification
- `docs/taddy-api-docs.md`: Complete Taddy API documentation
- `docs/testing.md`: Testing procedures
- `docs/testing-guide.md`: Comprehensive testing guide for production readiness
- `docs/programmatic-style-node.md`: n8n node development guide

## Key Features

### Search Features
- **Field Selection**: Choose which fields to include in response (uuid, name, description, audioUrl, etc.)
- **Exclude Terms**: Dedicated field for excluding terms from search results
- **Advanced Filtering**: Language, date, country, genre, duration, and more
- **Pagination Support**: Access totalCount and pagesCount in search metadata
- **Episode Context**: Episodes automatically include podcast series information

### Language Support
The node automatically converts common language codes to Taddy API enums:
- `en` → `ENGLISH`
- `es` → `SPANISH`
- `fr` → `FRENCH`
- `de` → `GERMAN`
- And 50+ more languages

### Date Handling
All date filters are automatically converted to epoch timestamps as required by the API.

### Response Structure
Search results return pagination metadata as the first array item, followed by individual results.

## Common Issues and Solutions

### Node Not Appearing in n8n
- Ensure `npm link` was run in both project directory and `~/.n8n/custom/`
- Restart n8n after linking changes
- Check n8n logs for loading errors

### GraphQL Query Errors
- Verify API credentials are correctly configured
- Check query syntax in `utils/graphqlQueries.ts`
- Use error logging to inspect actual queries being sent
- Ensure enum values match Taddy API specification (e.g., `ENGLISH` not `"en"`)
- Date filters must use epoch timestamps (not ISO strings)
- Language filters must be enum values, not arrays when single value
- The API uses `responseDetails` array for metadata, not top-level fields

### Build Failures
- Ensure all imports are correct
- Check TypeScript compilation errors
- Verify all required n8n workflow types are available