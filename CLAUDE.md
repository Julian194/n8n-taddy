# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an n8n custom node package that integrates with the Taddy Podcast API, providing access to 4+ million podcasts and 180+ million episodes through GraphQL queries. The node implements a programmatic-style n8n integration following n8n community node standards.

## Development Guidance

- Always fix linting issues before committing code
- Run `npm run lintfix` to automatically resolve linting problems
- Ensure code meets the project's linting standards

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

[... rest of the existing file content remains unchanged ...]