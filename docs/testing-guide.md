# Testing Guide for n8n-nodes-taddy

This document provides a comprehensive testing guide to ensure the Taddy API n8n node is production-ready and suitable for community use.

## Prerequisites

Before testing, ensure you have:
- Local n8n installation running
- Node properly linked (see [testing.md](./testing.md))
- Valid Taddy API credentials (X-USER-ID and X-API-KEY)
- Basic understanding of podcast/episode terminology

## Testing Methodology

### Phase 1: Core Functionality Testing

#### 1.1 Basic Search Operations
Test each resource type with minimal parameters to verify core functionality.

**Test Cases:**
```
Search Term: "Joe Rogan"
Content Types: Podcast Episode
Sort By: Popularity
Match Type: Most Terms
```

**Expected Results:**
- Node executes without errors
- Returns search metadata as first item
- Episodes include podcast series information (name, uuid)
- Results are relevant to search term

**Verification Steps:**
1. Create new workflow
2. Add Taddy API node
3. Configure basic search
4. Execute and verify structure
5. Check that `$json.totalCount` and `$json.pagesCount` are accessible in first item

#### 1.2 Resource Type Testing
Test each available resource type:

| Resource | Test Term | Expected Behavior |
|----------|-----------|------------------|
| Search Content | "technology" | Returns mixed results |
| Podcast Details | UUID/Name | Returns specific podcast |
| Episode Details | UUID/GUID | Returns specific episode |
| Popular Content | N/A | Returns trending podcasts |
| Latest Episodes | Podcast UUIDs | Returns recent episodes |
| Transcript | Episode UUID | Returns transcript data |

### Phase 2: Parameter Validation

#### 2.1 Search Parameters
Test all search parameter combinations:

**Content Types:**
- [x] Podcast Episode only
- [x] Podcast Series only  
- [x] Both selected
- [x] Neither selected (should default)

**Sort & Match Options:**
- [x] Popularity + Most Terms
- [x] Popularity + Exact Phrase
- [x] Exactness + All Terms
- [x] All combinations

**Pagination:**
- [x] Page 1, Limit 10 (default)
- [x] Page 2, Limit 5
- [x] Page 1, Limit 25 (maximum)
- [x] Invalid pagination (should handle gracefully)

#### 2.2 Field Selection Testing
Verify all response fields work correctly:

**Core Fields (always test):**
- [x] UUID
- [x] Name/Title
- [x] Description

**Episode-Specific Fields:**
- [x] Audio URL
- [x] Date Published
- [x] Duration
- [x] Episode Number
- [x] Season Number
- [x] Has Chapters

**Podcast-Specific Fields:**
- [x] iTunes ID
- [x] RSS URL
- [x] Website URL
- [x] Total Episodes Count

**Podcast Series Info (for episodes):**
- [x] Default: UUID + Name included automatically
- [x] Optional: Podcast Description
- [x] Optional: Podcast Image URL

### Phase 3: Advanced Features

#### 3.1 Exclude Terms Testing
Test the exclude functionality:

**Test Cases:**
```
Search Term: "Tim Ferriss"
Exclude Terms: "crypto, bitcoin"
Expected: Results about Tim Ferriss but excluding crypto/bitcoin content
```

**Manual vs. UI Testing:**
- Manual: `"Tim Ferriss -crypto"`
- UI: Search Term: `"Tim Ferriss"`, Exclude Terms: `"crypto"`
- Both should produce identical results

#### 3.2 Filtering Options
Test each filter type:

**Language Filtering:**
- [x] English (en → ENGLISH)
- [x] Spanish (es → SPANISH)
- [x] French (fr → FRENCH)
- [x] Invalid language code (should handle gracefully)

**Date Filtering:**
- [x] Published After: Recent date
- [x] Published Before: Past date
- [x] Date range (both filters)
- [x] Invalid dates (should show error)

**Advanced Filters:**
- [x] Countries (US, GB, CA)
- [x] Genres (Technology, Business)
- [x] Has Transcript: true/false
- [x] Duration filters
- [x] Episode count filters

### Phase 4: Error Handling & Edge Cases

#### 4.1 API Error Scenarios
Simulate common error conditions:

**Authentication Errors:**
- [x] Invalid API key
- [x] Missing credentials
- [x] Expired credentials

**Request Errors:**
- [x] Invalid search terms (too long, special characters)
- [x] Malformed parameters
- [x] Non-existent UUIDs

**Network Issues:**
- [x] Timeout scenarios
- [x] Rate limiting (if applicable)
- [x] Temporary API unavailability

#### 4.2 Data Edge Cases
Test with unusual but valid data:

**Search Terms:**
- [x] Empty string
- [x] Very long terms (500+ characters)
- [x] Special characters (@#$%^&*)
- [x] Unicode characters (émojis, áccents)
- [x] Numbers only
- [x] Single character

**Result Scenarios:**
- [x] Zero results
- [x] Single result
- [x] Maximum results (25 per page)
- [x] Very large total counts

### Phase 5: Integration Testing

#### 5.1 Workflow Integration
Test how the node works with other n8n nodes:

**Common Patterns:**
```
Taddy Search → Set Node → Filter → HTTP Request
```

**Test Scenarios:**
1. **Data Transformation:**
   - Extract podcast names into array
   - Format dates for display
   - Build URLs from episode data

2. **Conditional Logic:**
   - Filter by duration > 30 minutes
   - Skip episodes without transcripts
   - Process only specific podcasts

3. **Pagination Workflows:**
   - Use metadata to loop through pages
   - Collect all results across pages
   - Stop when no more results

#### 5.2 Real-World Use Cases
Test practical scenarios:

**Use Case 1: Podcast Discovery**
- Search for episodes about specific topics
- Filter by language and date
- Extract podcast information for subscription

**Use Case 2: Content Analysis**
- Find episodes with transcripts
- Get transcript content
- Analyze for keywords/themes

**Use Case 3: Podcast Monitoring**
- Search for specific podcast episodes
- Check for new releases
- Send notifications when found

### Phase 6: Performance & Reliability

#### 6.1 Performance Testing
Measure response times and resource usage:

**Metrics to Track:**
- [x] Response time for basic searches (< 5 seconds)
- [x] Response time with many fields selected
- [x] Memory usage with large result sets
- [x] Network bandwidth utilization

**Load Testing:**
- [x] Multiple concurrent searches
- [x] Rapid successive requests
- [x] Large result set processing

#### 6.2 Reliability Testing
Test consistency and stability:

**Consistency Tests:**
- [x] Same query returns consistent results
- [x] Pagination maintains result order
- [x] Field selection doesn't affect other data

**Stability Tests:**
- [x] Long-running workflows
- [x] Error recovery scenarios
- [x] Memory leak detection

## Testing Checklist

Use this checklist before releasing:

### ✅ Basic Functionality
- [ ] All 6 resource types work correctly
- [ ] Search returns structured results
- [ ] Metadata is accessible in first item
- [ ] Episode results include podcast information
- [ ] All field selections work

### ✅ Advanced Features  
- [ ] Exclude terms functionality works
- [ ] Language filtering works correctly
- [ ] Date filtering works correctly
- [ ] All additional filters work
- [ ] Field selection is properly filtered by content type

### ✅ Error Handling
- [ ] Invalid credentials show helpful errors
- [ ] Malformed queries are handled gracefully
- [ ] Network errors are caught and reported
- [ ] Validation errors are user-friendly

### ✅ Integration
- [ ] Works with common n8n node patterns
- [ ] Metadata enables pagination workflows
- [ ] Results can be processed by other nodes
- [ ] No memory leaks in long workflows

### ✅ Documentation
- [ ] All features are documented
- [ ] Examples work as described
- [ ] Parameter descriptions are accurate
- [ ] Error messages are helpful

## Test Data Recommendations

Use these search terms for consistent testing:

**Popular/Reliable Terms:**
- "Joe Rogan" (many results)
- "NPR" (quality content)
- "technology" (broad topic)
- "interview" (common format)

**Edge Case Terms:**
- "zzqxprogramming" (likely zero results)
- "a" (single character)
- "🎙️" (emoji)
- Numbers: "2024", "100"

**Test Podcasts (use UUIDs when available):**
- The Joe Rogan Experience
- Serial
- This American Life
- TED Talks Daily

## Automated Testing Script

Here's a basic Node.js script for automated testing:

```javascript
// test-node.js
const axios = require('axios');

const testCases = [
  {
    name: "Basic Search",
    params: {
      searchTerm: "technology",
      contentTypes: ["PODCASTEPISODE"],
      page: 1,
      limitPerPage: 5
    }
  },
  {
    name: "Language Filter",
    params: {
      searchTerm: "news",
      contentTypes: ["PODCASTEPISODE"],
      additionalOptions: {
        filterForLanguages: "en"
      }
    }
  }
  // Add more test cases...
];

// Run through each test case and verify results
testCases.forEach(async (testCase) => {
  console.log(`Testing: ${testCase.name}`);
  // Implement your test logic here
});
```

## Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| "Bad request" errors | API returns error message | Check parameter formatting, especially dates and enums |
| Missing podcast info | Episodes don't have podcastSeries data | Verify field selection includes podcast fields |
| Zero results | Empty result set | Try broader search terms, check filters |
| Timeout errors | Requests hanging | Check API credentials and network connectivity |
| Memory issues | n8n becomes slow | Limit result sets, process in batches |

## Pre-Release Checklist

Before sharing with the community:

- [ ] All Phase 1-6 tests pass
- [ ] Documentation is complete and accurate
- [ ] Examples work for new users
- [ ] Error messages are helpful
- [ ] Performance is acceptable (< 5s response times)
- [ ] No obvious security issues
- [ ] Follows n8n community node standards
- [ ] Package.json metadata is complete
- [ ] README includes installation instructions
- [ ] License is appropriate for distribution

## Community Feedback Testing

After initial release, monitor for:

- Common error patterns in community reports
- Feature requests indicating missing functionality
- Performance issues at scale
- Integration problems with popular workflows
- Documentation gaps based on user questions

## Continuous Testing

Set up ongoing validation:

- Regular API connectivity checks
- Periodic verification of all test cases
- Monitor for API changes that affect functionality
- Track performance trends over time
- Validate with new n8n versions

---

**Note:** This testing guide should be executed thoroughly before any public release. The goal is to ensure reliability, usability, and maintainability for the n8n community.