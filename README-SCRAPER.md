# CrossFit WOD Scraper

A script agent that scrapes CrossFit Workout of the Day pages and follows backlinks chronologically to extract workout data.

## Overview

This scraper automatically:
1. Fetches CrossFit.com workout pages using wget/curl/requests
2. Parses the page content to extract workout data
3. Identifies the previous day's workout link
4. Continues following previous links until stopped
5. Saves all extracted data in structured JSON format

## Files

- `crossfit_scraper.py` - Python version with full features
- `crossfit-scraper.ps1` - PowerShell version (uses curl/Invoke-WebRequest)
- `run_scraper.py` - Interactive menu for Python version
- `crossfit-scraper-config.md` - Configuration file describing data to extract
- `requirements.txt` - Python dependencies
- `README-SCRAPER.md` - This file

## Quick Start

### Python Version (Recommended)

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the interactive menu:
```bash
python run_scraper.py
```

3. Or use command line directly:
```bash
# Scrape all workouts from today
python crossfit_scraper.py

# Scrape last 30 workouts from today
python crossfit_scraper.py --start-date 251115 --max-count 30

# Scrape between specific dates
python crossfit_scraper.py --start-date 251001 --end-date 250901
```

### PowerShell Version

```powershell
# Scrape all workouts from today
.\crossfit-scraper.ps1

# Scrape last 30 workouts from today
.\crossfit-scraper.ps1 -StartDate 251115 -MaxCount 30

# Scrape between specific dates
.\crossfit-scraper.ps1 -StartDate 251001 -EndDate 250901 -OutputDir "my-wod-data"
```

## Date Format

All dates use YYMMDD format:
- `251115` = November 15, 2025
- `251001` = October 1, 2025
- `250901` = September 1, 2025

## Command Line Options

### Python Version
```bash
python crossfit_scraper.py [OPTIONS]

Options:
  --start-date YYMMDD    Start date (default: today)
  --max-count N          Maximum number of workouts to scrape
  --end-date YYMMDD      Stop when reaching this date
  --output-dir DIR       Output directory (default: crossfit-wod-data)
  --delay SECONDS        Delay between requests (default: 2.0)
```

### PowerShell Version
```powershell
.\crossfit-scraper.ps1 [PARAMETERS]

Parameters:
  -StartDate YYMMDD      Start date (default: today)
  -MaxCount N            Maximum number of workouts to scrape
  -EndDate YYMMDD        Stop when reaching this date
  -OutputDir DIR         Output directory (default: crossfit-wod-data)
  -Delay SECONDS         Delay between requests (default: 2.0)
```

## Output Structure

The scraper creates the following files in the output directory:

### Individual Workout Files
`wod_YYMMDD.json` - Each workout gets its own JSON file:
```json
{
  "date": "251115",
  "url": "https://www.crossfit.com/251115",
  "title": "CrossFit Workout of the Day: 251115",
  "date_iso": "2025-11-15",
  "date_formatted": "November 15, 2025",
  "extracted_at": "2025-11-15T18:00:00Z",
  "navigation": {
    "previous": "/251114",
    "next": null,
    "previous_label": "Go to previous day",
    "next_label": "Go to next day"
  },
  "movements": [
    {
      "name": "Kettlebell Snatch",
      "link": "/essentials/the-kettlebell-snatch",
      "url": "https://www.crossfit.com/essentials/the-kettlebell-snatch"
    }
  ],
  "featured_content": {
    "type": "image",
    "content": "Image information"
  },
  "social_description": "...",
  "social_image": "https://...",
  "comment_topics": ["251114"]
}
```

### Index File
`index.json` - Master index with all scraped workouts:
```json
{
  "last_updated": "2025-11-15T18:00:00Z",
  "total_workouts": 30,
  "extracted_dates": ["251115", "251114", "251113", ...],
  "stats": {
    "total_scraped": 30,
    "errors": 0,
    "skipped": 0,
    "start_time": "2025-11-15T17:30:00Z"
  }
}
```

### Log File
`scraper.log` - Detailed logging of scraping progress:
```
[2025-11-15 18:00:00] [INFO] CrossFit WOD Scraper starting
[2025-11-15 18:00:01] [INFO] Fetching: https://www.crossfit.com/251115 (attempt 1/3)
[2025-11-15 18:00:02] [INFO] Successfully fetched 622040 bytes
[2025-11-15 18:00:03] [INFO] Extracting workout data for date: 251115
[2025-11-15 18:00:04] [INFO] Saved workout data to: wod_251115.json
...
```

## Stopping Conditions

The scraper automatically stops when:

1. **No Previous Link**: When the oldest available workout is reached
2. **Max Count**: When the specified number of workouts has been scraped
3. **End Date**: When the specified end date is reached
4. **HTTP Errors**: When pages fail to load after multiple retries
5. **Manual Stop**: Ctrl+C (Python) or Ctrl+C (PowerShell)

## Rate Limiting

- **Default Delay**: 2 seconds between requests
- **Retry Logic**: 3 attempts with exponential backoff
- **User-Agent**: Identifies as educational research tool
- **Respectful**: Designed to be gentle on CrossFit.com servers

## Error Handling

- **Network Errors**: Automatic retry with exponential backoff
- **JSON Parsing**: Graceful fallback if page structure changes
- **File Errors**: Logging and continuation where possible
- **Validation**: Data structure validation before saving

## Examples

### Test Run
```bash
# Test with just today's workout
python crossfit_scraper.py --max-count 1
```

### Scrape Last Week
```bash
# Scrape last 7 workouts
python crossfit_scraper.py --max-count 7
```

### Scrape Specific Range
```bash
# Scrape October 2025 workouts
python crossfit_scraper.py --start-date 251001 --end-date 250930
```

### Custom Output Directory
```bash
# Save to custom directory
python crossfit_scraper.py --output-dir "my-crossfit-data"
```

### Faster Scraping (Use Caution)
```bash
# Reduce delay between requests (be respectful)
python crossfit_scraper.py --delay 1.0
```

## Configuration

The `crossfit-scraper-config.md` file contains detailed configuration options for:
- Data extraction patterns
- Output formats
- Stopping conditions
- Rate limiting settings
- Error handling behavior

## Troubleshooting

### Common Issues

1. **"curl not found" (PowerShell)**
   - Install curl or use the Python version
   - Windows 10+ includes curl by default

2. **"Connection timeout"**
   - Increase delay with `--delay 5`
   - Check internet connection
   - Try running with `--max-count 1` to test

3. **"JSON parsing failed"**
   - CrossFit.com may have changed their page structure
   - Check the log file for details
   - The scraper will continue with available data

4. **"Permission denied"**
   - Ensure write permissions for output directory
   - Try specifying a different output directory

### Logs

Always check the log file (`scraper.log`) for detailed error information.

## Requirements

### Python Version
- Python 3.7+
- requests >= 2.31.0
- beautifulsoup4 >= 4.12.0
- lxml >= 4.9.0

### PowerShell Version
- PowerShell 5.1+ (Windows built-in)
- curl (Windows 10+ includes by default)
- Internet access

## Legal and Ethical

- **Educational Purpose**: This tool is designed for research and educational use
- **Rate Limiting**: Built-in delays prevent server overload
- **User-Agent**: Clearly identifies the tool as a research scraper
- **Terms of Service**: Please respect CrossFit.com's terms of service
- **Personal Use**: Best used for personal data analysis and research

## Support

For issues or questions:
1. Check the log file for error details
2. Try running with `--max-count 1` for testing
3. Verify internet connectivity
4. Check the configuration file for options
