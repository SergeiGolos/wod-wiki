#!/usr/bin/env python3
"""
Quick runner for the CrossFit WOD scraper with predefined options
"""

import subprocess
import sys
from datetime import datetime

def main():
    # Get today's date in YYMMDD format
    today = datetime.now().strftime('%y%m%d')
    
    print("CrossFit WOD Scraper")
    print("=" * 50)
    print()
    print("Choose an option:")
    print("1. Scrape from today back (all available)")
    print("2. Scrape last 30 workouts from today")
    print("3. Scrape last 7 workouts from today")
    print("4. Custom scrape with specific date")
    print("5. Test with just 1 workout (today)")
    print()
    
    try:
        choice = input("Enter choice (1-5): ").strip()
        
        cmd = ["python", "crossfit_scraper.py"]
        
        if choice == "1":
            # Scrape all from today
            cmd.extend(["--start-date", today])
            print(f"Scraping all workouts from {today}...")
            
        elif choice == "2":
            # Last 30 workouts
            cmd.extend(["--start-date", today, "--max-count", "30"])
            print(f"Scraping last 30 workouts from {today}...")
            
        elif choice == "3":
            # Last 7 workouts
            cmd.extend(["--start-date", today, "--max-count", "7"])
            print(f"Scraping last 7 workouts from {today}...")
            
        elif choice == "4":
            # Custom date
            date_str = input("Enter start date (YYMMDD): ").strip()
            count = input("Enter max count (leave empty for all): ").strip()
            
            cmd.extend(["--start-date", date_str])
            if count:
                cmd.extend(["--max-count", count])
            
            print(f"Scraping from {date_str}, max count: {count or 'all'}...")
            
        elif choice == "5":
            # Test with 1 workout
            cmd.extend(["--start-date", today, "--max-count", "1"])
            print(f"Testing scraper with today's workout ({today})...")
            
        else:
            print("Invalid choice!")
            return
        
        print()
        print("Command:", " ".join(cmd))
        print()
        print("Starting scraper... (Press Ctrl+C to stop)")
        print("-" * 50)
        
        # Run the scraper
        result = subprocess.run(cmd)
        
        if result.returncode == 0:
            print("-" * 50)
            print("✅ Scraping completed successfully!")
        else:
            print("-" * 50)
            print("❌ Scraping failed or was interrupted!")
            
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
