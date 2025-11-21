# CrossFit WOD Scraper Configuration

## Overview
This configuration defines the data extraction patterns and behavior for the CrossFit.com workout scraper.

## Site Information
- **Base URL**: `https://www.crossfit.com`
- **Date Format**: YYMMDD (e.g., 251115 for November 15, 2025)
- **Current Example**: `https://www.crossfit.com/251115`

## Data to Extract

### 1. Workout Information
- **Title**: Workout of the Day title/headline
- **Date**: The workout date (from URL and page content)
- **Workout Content**: The actual workout description/exercises
- **Featured Content**: Any featured images or supplementary content

### 2. Navigation Links
- **Previous Day Link**: URL to the previous day's workout
- **Next Day Link**: URL to the next day's workout (if available)
- **Navigation Pattern**: Found in `DailyModule` component as `previousUrl` and `nextUrl`

### 3. Movement Information
- **Movement Links**: Links to exercise demonstrations
- **Movement Descriptions**: Text descriptions of movements
- **Educational Content**: Links to CrossFit essentials pages

### 4. Metadata
- **Page Title**: Full page title
- **Social Metadata**: Description and image URLs for social sharing
- **Comment Topics**: Related discussion topics

## Extraction Patterns

### Date Pattern
- **Regex**: `/25(\d{4})`
- **Description**: Matches YYMMDD format for 2025
- **Example**: `/251115` → November 15, 2025

### Navigation Pattern
- **JSON Path**: `DailyModule.previousUrl`
- **JSON Path**: `DailyModule.nextUrl`
- **Pattern**: `"previousUrl":"/251114"`

### Workout Content Pattern
- **Selector**: Elements containing workout descriptions
- **Identifiers**: `Workout of the day`, movement lists, exercise descriptions

### Movement Links Pattern
- **Pattern**: Links to `/essentials/` pages
- **Example**: `href="/essentials/the-kettlebell-snatch"`

## File Output Format

### JSON Structure
```json
{
  "date": "251115",
  "url": "https://www.crossfit.com/251115",
  "title": "CrossFit Workout of the Day: 251115",
  "workout": {
    "title": "Workout of the day",
    "content": "Workout description here",
    "movements": [
      {
        "name": "Kettlebell Snatch",
        "link": "/essentials/the-kettlebell-snatch"
      }
    ]
  },
  "navigation": {
    "previous": "/251114",
    "next": null
  },
  "featured": {
    "type": "image",
    "content": "Image information"
  },
  "metadata": {
    "social_description": "...",
    "social_image": "https://...",
    "comment_topics": ["251114"]
  },
  "extracted_at": "2025-11-15T18:00:00Z"
}
```

## Stopping Conditions

### Automatic Stops
1. **No Previous Link**: When a page has no `previousUrl` (reached the oldest available workout)
2. **HTTP Errors**: 404, 500, or other server errors
3. **Rate Limiting**: When the site requests rate limiting
4. **Invalid Date Format**: When the date pattern breaks

### Manual Stops
1. **Date Range**: Stop when reaching a specific date (configurable)
2. **Count Limit**: Stop after extracting N workouts (configurable)
3. **Keyboard Interrupt**: Ctrl+C to stop execution

## Rate Limiting
- **Default Delay**: 2 seconds between requests
- **Respect robots.txt**: Follow site crawling guidelines
- **User-Agent**: Identify the script as a research tool

## Storage
- **Output Directory**: `./crossfit-wod-data/`
- **File Format**: Individual JSON files per workout
- **Index File**: `index.json` with all extracted workouts
- **Log File**: `scraper.log` with extraction progress

## Error Handling
- **Retry Logic**: 3 attempts for failed requests
- **Backoff Strategy**: Exponential backoff for rate limiting
- **Validation**: Verify extracted data structure
- **Logging**: Record all errors and warnings
