#!/usr/bin/env python3
"""
CrossFit WOD Scraper

A script to scrape CrossFit Workout of the Day pages and follow backlinks
chronologically to extract workout data.

Usage:
    python crossfit_scraper.py [--start-date YYMMDD] [--max-count N] [--output-dir DIR]
    python crossfit_scraper.py --help

Requirements:
    - requests
    - beautifulsoup4
    - lxml
"""

import requests
import json
import re
import time
import os
import sys
import argparse
import logging
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlparse
from pathlib import Path
from typing import Dict, List, Optional, Any
from bs4 import BeautifulSoup

class CrossFitScraper:
    def __init__(self, output_dir: str = "crossfit-wod-data", delay: float = 2.0):
        self.base_url = "https://www.crossfit.com"
        self.output_dir = Path(output_dir)
        self.delay = delay
        self.session = requests.Session()
        
        # Set user agent to identify as a research tool
        self.session.headers.update({
            'User-Agent': 'CrossFit-WOD-Scraper/1.0 (Educational Research Tool; Contact: research@example.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        
        # Create output directory
        self.output_dir.mkdir(exist_ok=True)
        
        # Setup logging
        self.setup_logging()
        
        # Statistics
        self.stats = {
            'total_scraped': 0,
            'errors': 0,
            'skipped': 0,
            'start_time': None,
            'extracted_dates': []
        }
        
    def setup_logging(self):
        """Setup logging configuration."""
        log_file = self.output_dir / "scraper.log"
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Setup root logger
        logger = logging.getLogger()
        logger.setLevel(logging.INFO)
        
        # File handler
        file_handler = logging.FileHandler(log_file, mode='a', encoding='utf-8')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        self.logger = logger
        
    def parse_date_from_url(self, url: str) -> Optional[str]:
        """Extract YYMMDD date from URL."""
        match = re.search(r'/(\d{6})$', url)
        return match.group(1) if match else None
        
    def parse_yymmdd_to_date(self, yymmdd: str) -> Optional[datetime]:
        """Convert YYMMDD to datetime object."""
        try:
            # Assuming 2000s for YY
            year = 2000 + int(yymmdd[:2])
            month = int(yymmdd[2:4])
            day = int(yymmdd[4:6])
            return datetime(year, month, day)
        except ValueError:
            return None
            
    def fetch_page(self, url: str, retries: int = 3) -> Optional[str]:
        """Fetch a webpage with retry logic."""
        for attempt in range(retries):
            try:
                self.logger.info(f"Fetching: {url} (attempt {attempt + 1}/{retries})")
                
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                
                self.logger.info(f"Successfully fetched {len(response.content)} bytes")
                return response.text
                
            except requests.RequestException as e:
                self.logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt < retries - 1:
                    # Exponential backoff
                    wait_time = (2 ** attempt) * self.delay
                    self.logger.info(f"Waiting {wait_time:.1f} seconds before retry...")
                    time.sleep(wait_time)
                else:
                    self.logger.error(f"Failed to fetch {url} after {retries} attempts")
                    return None
                    
        return None
        
    def extract_json_data(self, html: str) -> Optional[Dict]:
        """Extract JSON data from __PRELOADED_STATE__ script."""
        try:
            # Find the JSON data in the script tag
            pattern = r'window\.__PRELOADED_STATE__\s*=\s*({.*?});'
            match = re.search(pattern, html, re.DOTALL)
            
            if match:
                json_str = match.group(1)
                # Clean up the JSON string
                json_str = re.sub(r'(\w+):', r'"\1":', json_str)  # Quote unquoted keys
                data = json.loads(json_str)
                return data
                
        except (json.JSONDecodeError, AttributeError) as e:
            self.logger.warning(f"Failed to extract JSON data: {e}")
            
        return None
        
    def extract_workout_content(self, html: str, json_data: Dict) -> Dict[str, Any]:
        """Extract workout content from HTML and JSON data."""
        workout_data = {
            'title': None,
            'content': None,
            'movements': [],
            'featured_content': None
        }
        
        try:
            # Extract from JSON data first (more reliable)
            if json_data and 'pages' in json_data:
                page_data = json_data['pages']
                
                # Get basic page info
                workout_data['title'] = page_data.get('title', '')
                
                # Extract social metadata
                if 'socialMetaData' in page_data:
                    social = page_data['socialMetaData']
                    workout_data['social_description'] = social.get('description', '')
                    workout_data['social_image'] = social.get('image', '')
                
                # Extract comment topics
                if 'commentTopics' in page_data:
                    workout_data['comment_topics'] = [
                        topic.get('title', '') for topic in page_data['commentTopics']
                    ]
                
                # Extract components data
                if 'components' in page_data:
                    for component in page_data['components']:
                        if component.get('name') == 'DailyModule':
                            props = component.get('props', {})
                            
                            # Navigation
                            workout_data['navigation'] = {
                                'previous': props.get('previousUrl'),
                                'next': props.get('nextUrl'),
                                'previous_label': props.get('previousDayLabelText'),
                                'next_label': props.get('nextDayLabelText')
                            }
                            
                            # Featured content
                            if 'featuredContent' in props:
                                featured = props['featuredContent']
                                workout_data['featured_content'] = {
                                    'type': featured.get('type'),
                                    'content': featured
                                }
                            
                            # Workout of the day data
                            if 'workoutOfTheDay' in props:
                                wod = props['workoutOfTheDay']
                                workout_data['wod_data'] = wod
            
            # Parse HTML for additional content
            soup = BeautifulSoup(html, 'lxml')
            
            # Extract movement links
            movement_links = soup.find_all('a', href=re.compile(r'/essentials/'))
            for link in movement_links:
                workout_data['movements'].append({
                    'name': link.get_text(strip=True),
                    'link': link.get('href', ''),
                    'url': urljoin(self.base_url, link.get('href', ''))
                })
            
            # Try to extract main workout content
            # Look for common workout content patterns
            workout_selectors = [
                '[data-testid*="workout"]',
                '.workout-content',
                '.wod-content',
                'div:contains("Workout of the day")',
                'h2:contains("Workout")',
            ]
            
            for selector in workout_selectors:
                try:
                    elements = soup.select(selector)
                    if elements:
                        content_parts = []
                        for elem in elements:
                            text = elem.get_text(strip=True)
                            if text and len(text) > 10:  # Filter out very short texts
                                content_parts.append(text)
                        
                        if content_parts:
                            workout_data['content'] = '\n'.join(content_parts)
                            break
                except:
                    continue
                    
            # If no structured content found, try to extract from main content area
            if not workout_data['content']:
                main_content = soup.find('main') or soup.find('div', class_=re.compile(r'content'))
                if main_content:
                    text = main_content.get_text(strip=True)
                    # Try to find workout-relevant content
                    workout_patterns = [
                        r'(?:Workout|WOD).*?(?=\n\n|$)',
                        r'(?:Round|Time|AMRAP|EMOM|RFT).*?(?=\n\n|$)',
                        r'\d+.*?(?:reps|rounds?|cal|lb|kg|m).*?(?=\n\n|$)'
                    ]
                    
                    for pattern in workout_patterns:
                        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
                        if matches:
                            workout_data['content'] = '\n'.join(matches)
                            break
            
        except Exception as e:
            self.logger.warning(f"Error extracting workout content: {e}")
            
        return workout_data
        
    def extract_workout_data(self, url: str) -> Optional[Dict[str, Any]]:
        """Extract complete workout data from a URL."""
        date_str = self.parse_date_from_url(url)
        if not date_str:
            self.logger.error(f"Could not extract date from URL: {url}")
            return None
            
        self.logger.info(f"Extracting workout data for date: {date_str}")
        
        # Fetch the page
        html = self.fetch_page(url)
        if not html:
            return None
            
        # Extract JSON data
        json_data = self.extract_json_data(html)
        
        # Extract workout content
        workout_content = self.extract_workout_content(html, json_data)
        
        # Build complete data structure
        workout_data = {
            'date': date_str,
            'url': url,
            'extracted_at': datetime.now().isoformat() + 'Z',
            **workout_content
        }
        
        # Add date conversion
        date_obj = self.parse_yymmdd_to_date(date_str)
        if date_obj:
            workout_data['date_iso'] = date_obj.isoformat()
            workout_data['date_formatted'] = date_obj.strftime('%B %d, %Y')
            
        return workout_data
        
    def save_workout_data(self, workout_data: Dict[str, Any]):
        """Save workout data to file."""
        date_str = workout_data['date']
        filename = f"wod_{date_str}.json"
        filepath = self.output_dir / filename
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(workout_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Saved workout data to: {filepath}")
            self.stats['total_scraped'] += 1
            self.stats['extracted_dates'].append(date_str)
            
        except Exception as e:
            self.logger.error(f"Failed to save workout data: {e}")
            self.stats['errors'] += 1
            
    def update_index(self):
        """Update the main index file with all extracted workouts."""
        index_file = self.output_dir / "index.json"
        index_data = {
            'last_updated': datetime.now().isoformat() + 'Z',
            'total_workouts': self.stats['total_scraped'],
            'extracted_dates': sorted(self.stats['extracted_dates']),
            'stats': self.stats
        }
        
        try:
            with open(index_file, 'w', encoding='utf-8') as f:
                json.dump(index_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Updated index file: {index_file}")
            
        except Exception as e:
            self.logger.error(f"Failed to update index file: {e}")
            
    def scrape_until_end(self, start_url: str, max_count: Optional[int] = None, 
                        end_date: Optional[str] = None):
        """Scrape workouts starting from start_url and following previous links."""
        self.logger.info(f"Starting scrape from: {start_url}")
        self.stats['start_time'] = datetime.now()
        
        current_url = start_url
        scraped_count = 0
        
        while current_url and (max_count is None or scraped_count < max_count):
            # Check if we should stop based on date
            if end_date:
                current_date = self.parse_date_from_url(current_url)
                if current_date and current_date < end_date:
                    self.logger.info(f"Reached end date {end_date}, stopping scrape")
                    break
            
            # Extract workout data
            workout_data = self.extract_workout_data(current_url)
            if not workout_data:
                self.logger.error(f"Failed to extract data from {current_url}")
                self.stats['errors'] += 1
                break
                
            # Save the data
            self.save_workout_data(workout_data)
            scraped_count += 1
            
            # Update index periodically
            if scraped_count % 10 == 0:
                self.update_index()
                
            # Get the previous day's URL
            navigation = workout_data.get('navigation', {})
            previous_url = navigation.get('previous')
            
            if not previous_url:
                self.logger.info("No previous link found - reached the oldest available workout")
                break
                
            current_url = urljoin(self.base_url, previous_url)
            
            # Rate limiting
            self.logger.info(f"Waiting {self.delay} seconds before next request...")
            time.sleep(self.delay)
            
        # Final index update
        self.update_index()
        
        # Log final statistics
        duration = datetime.now() - self.stats['start_time']
        self.logger.info(f"Scraping completed in {duration}")
        self.logger.info(f"Total workouts scraped: {self.stats['total_scraped']}")
        self.logger.info(f"Errors encountered: {self.stats['errors']}")

def main():
    parser = argparse.ArgumentParser(
        description="Scrape CrossFit Workout of the Day pages",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python crossfit_scraper.py
    # Start from today and scrape all available previous workouts
  
  python crossfit_scraper.py --start-date 251115 --max-count 30
    # Start from Nov 15, 2025 and scrape 30 workouts
  
  python crossfit_scraper.py --start-date 251001 --end-date 250901
    # Scrape workouts from Oct 1, 2025 back to Sep 1, 2025
        """
    )
    
    parser.add_argument(
        '--start-date', 
        type=str, 
        help='Start date in YYMMDD format (default: today)',
        default=None
    )
    
    parser.add_argument(
        '--max-count', 
        type=int, 
        help='Maximum number of workouts to scrape',
        default=None
    )
    
    parser.add_argument(
        '--end-date',
        type=str,
        help='End date in YYMMDD format (stop when reaching this date)',
        default=None
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        help='Output directory for scraped data',
        default='crossfit-wod-data'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        help='Delay between requests in seconds',
        default=2.0
    )
    
    args = parser.parse_args()
    
    # Determine start URL
    if args.start_date:
        start_url = f"https://www.crossfit.com/{args.start_date}"
    else:
        # Use today's date
        today = datetime.now().strftime('%y%m%d')
        start_url = f"https://www.crossfit.com/{today}"
    
    # Create scraper
    scraper = CrossFitScraper(output_dir=args.output_dir, delay=args.delay)
    
    try:
        # Start scraping
        scraper.scrape_until_end(
            start_url=start_url,
            max_count=args.max_count,
            end_date=args.end_date
        )
        
    except KeyboardInterrupt:
        print("\nScraping interrupted by user")
        scraper.update_index()
        sys.exit(1)
        
    except Exception as e:
        print(f"Scraping failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
