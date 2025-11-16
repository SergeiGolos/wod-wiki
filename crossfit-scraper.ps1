<#
.SYNOPSIS
    CrossFit WOD Scraper - PowerShell version

.DESCRIPTION
    Scrapes CrossFit Workout of the Day pages and follows backlinks chronologically.
    Uses wget/curl for HTTP requests and PowerShell for data processing.

.PARAMETER StartDate
    Start date in YYMMDD format (default: today)

.PARAMETER MaxCount
    Maximum number of workouts to scrape

.PARAMETER EndDate
    End date in YYMMDD format (stop when reaching this date)

.PARAMETER OutputDir
    Output directory for scraped data (default: crossfit-wod-data)

.PARAMETER Delay
    Delay between requests in seconds (default: 2)

.EXAMPLE
    .\crossfit-scraper.ps1
    # Start from today and scrape all available previous workouts

.EXAMPLE
    .\crossfit-scraper.ps1 -StartDate 251115 -MaxCount 30
    # Start from Nov 15, 2025 and scrape 30 workouts

.EXAMPLE
    .\crossfit-scraper.ps1 -StartDate 251001 -EndDate 250901
    # Scrape workouts from Oct 1, 2025 back to Sep 1, 2025
#>

[CmdletBinding()]
param(
    [string]$StartDate = $null,
    [int]$MaxCount = 0,
    [string]$EndDate = $null,
    [string]$OutputDir = "crossfit-wod-data",
    [double]$Delay = 2.0
)

# Script variables
$BaseUrl = "https://www.crossfit.com"
$UserAgent = "CrossFit-WOD-Scraper/1.0 (PowerShell; Educational Research Tool)"

# Create output directory
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Setup logging
$LogFile = Join-Path $OutputDir "scraper.log"
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    
    # Write to console
    switch ($Level) {
        "ERROR" { Write-Host $LogEntry -ForegroundColor Red }
        "WARN"  { Write-Host $LogEntry -ForegroundColor Yellow }
        "INFO"  { Write-Host $LogEntry -ForegroundColor Green }
        default { Write-Host $LogEntry }
    }
    
    # Write to file
    Add-Content -Path $LogFile -Value $LogEntry -Encoding UTF8
}

# Statistics
$Stats = @{
    TotalScraped = 0
    Errors = 0
    Skipped = 0
    StartTime = Get-Date
    ExtractedDates = @()
}

function Get-DateFromUrl {
    param([string]$Url)
    
    if ($Url -match '/(\d{6})$') {
        return $matches[1]
    }
    return $null
}

function Convert-YymmddToDate {
    param([string]$Yymmdd)
    
    try {
        $year = 2000 + [int]$Yymmdd.Substring(0, 2)
        $month = [int]$Yymmdd.Substring(2, 2)
        $day = [int]$Yymmdd.Substring(4, 2)
        return Get-Date -Year $year -Month $month -Day $day
    }
    catch {
        return $null
    }
}

function Invoke-WebRequestWithRetry {
    param(
        [string]$Url,
        [int]$MaxRetries = 3
    )
    
    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        try {
            Write-Log "Fetching: $Url (attempt $attempt/$MaxRetries)"
            
            # Use curl (wget alternative) if available, otherwise Invoke-WebRequest
            if (Get-Command curl -ErrorAction SilentlyContinue) {
                $result = curl -s -S --user-agent "$UserAgent" --connect-timeout 30 --max-time 60 "$Url"
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Successfully fetched $($result.Length) bytes"
                    return $result
                }
            }
            else {
                $response = Invoke-WebRequest -Uri $Url -UserAgent $UserAgent -TimeoutSec 30 -UseBasicParsing
                Write-Log "Successfully fetched $($response.Content.Length) bytes"
                return $response.Content
            }
        }
        catch {
            Write-Log "Attempt $attempt failed for $Url : $($_.Exception.Message)" -Level "WARN"
            
            if ($attempt -lt $MaxRetries) {
                $waitTime = [math]::Pow(2, $attempt) * $Delay
                Write-Log "Waiting $($waitTime) seconds before retry..."
                Start-Sleep -Seconds $waitTime
            }
            else {
                Write-Log "Failed to fetch $Url after $MaxRetries attempts" -Level "ERROR"
                return $null
            }
        }
    }
    
    return $null
}

function Extract-JsonData {
    param([string]$Html)
    
    try {
        # Find the JSON data in the script tag
        $pattern = 'window\.__PRELOADED_STATE__\s*=\s*({.*?});'
        if ($Html -match $pattern) {
            $jsonStr = $matches[1]
            
            # Clean up the JSON string for PowerShell
            $jsonStr = $jsonStr -replace '(\w+):', '"$1":'
            $jsonStr = $jsonStr -replace "'(.*?)'", '"$1"'
            
            try {
                return $jsonStr | ConvertFrom-Json
            }
            catch {
                Write-Log "JSON parsing failed: $($_.Exception.Message)" -Level "WARN"
                return $null
            }
        }
    }
    catch {
        Write-Log "Failed to extract JSON data: $($_.Exception.Message)" -Level "WARN"
    }
    
    return $null
}

function Extract-WorkoutContent {
    param(
        [string]$Html,
        [object]$JsonData
    )
    
    $workoutData = @{
        Title = $null
        Content = $null
        Movements = @()
        FeaturedContent = $null
        Navigation = $null
        SocialDescription = $null
        SocialImage = $null
        CommentTopics = @()
    }
    
    try {
        # Extract from JSON data first (more reliable)
        if ($JsonData -and $JsonData.pages) {
            $pageData = $JsonData.pages
            
            # Basic page info
            $workoutData.Title = $pageData.title
            
            # Social metadata
            if ($pageData.socialMetaData) {
                $workoutData.SocialDescription = $pageData.socialMetaData.description
                $workoutData.SocialImage = $pageData.socialMetaData.image
            }
            
            # Comment topics
            if ($pageData.commentTopics) {
                $workoutData.CommentTopics = $pageData.commentTopics | ForEach-Object { $_.title }
            }
            
            # Components data
            if ($pageData.components) {
                $dailyModule = $pageData.components | Where-Object { $_.name -eq "DailyModule" }
                
                if ($dailyModule -and $dailyModule.props) {
                    $props = $dailyModule.props
                    
                    # Navigation
                    $workoutData.Navigation = @{
                        Previous = $props.previousUrl
                        Next = $props.nextUrl
                        PreviousLabel = $props.previousDayLabelText
                        NextLabel = $props.nextDayLabelText
                    }
                    
                    # Featured content
                    if ($props.featuredContent) {
                        $workoutData.FeaturedContent = @{
                            Type = $props.featuredContent.type
                            Content = $props.featuredContent
                        }
                    }
                    
                    # Workout data
                    if ($props.workoutOfTheDay) {
                        $workoutData.WodData = $props.workoutOfTheDay
                    }
                }
            }
        }
        
        # Parse HTML for movement links
        if ($Html -match 'href="(/essentials/[^"]+)"[^>]*>([^<]+)</a>') {
            # This is a simple regex - in a real scenario you might want to use HTML parsing
            $movementLinks = [regex]::Matches($Html, 'href="(/essentials/[^"]+)"[^>]*>([^<]+)</a>')
            
            foreach ($match in $movementLinks) {
                $workoutData.Movements += @{
                    Name = $match.Groups[2].Value.Trim()
                    Link = $match.Groups[1].Value.Trim()
                    Url = $BaseUrl + $match.Groups[1].Value.Trim()
                }
            }
        }
        
        # Try to extract workout content using regex patterns
        $workoutPatterns = @(
            '(?:Workout|WOD).*?(?=\n\n|$)',
            '(?:Round|Time|AMRAP|EMOM|RFT).*?(?=\n\n|$)',
            '\d+.*?(?:reps|rounds?|cal|lb|kg|m).*?(?=\n\n|$)'
        )
        
        foreach ($pattern in $workoutPatterns) {
            $matches = [regex]::Matches($Html, $pattern, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($matches.Count -gt 0) {
                $content = $matches | ForEach-Object { $_.Value.Trim() } | Where-Object { $_.Length -gt 10 }
                if ($content.Count -gt 0) {
                    $workoutData.Content = $content -join "`n"
                    break
                }
            }
        }
    }
    catch {
        Write-Log "Error extracting workout content: $($_.Exception.Message)" -Level "WARN"
    }
    
    return $workoutData
}

function Extract-WorkoutData {
    param([string]$Url)
    
    $dateStr = Get-DateFromUrl -Url $Url
    if (!$dateStr) {
        Write-Log "Could not extract date from URL: $Url" -Level "ERROR"
        return $null
    }
    
    Write-Log "Extracting workout data for date: $dateStr"
    
    # Fetch the page
    $html = Invoke-WebRequestWithRetry -Url $Url
    if (!$html) {
        return $null
    }
    
    # Extract JSON data
    $jsonData = Extract-JsonData -Html $html
    
    # Extract workout content
    $workoutContent = Extract-WorkoutContent -Html $html -JsonData $jsonData
    
    # Build complete data structure
    $workoutData = @{
        Date = $dateStr
        Url = $Url
        ExtractedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    
    # Add all workout content properties
    $workoutContent.PSObject.Properties | ForEach-Object {
        $workoutData | Add-Member -NotePropertyName $_.Name -NotePropertyValue $_.Value
    }
    
    # Add date conversion
    $dateObj = Convert-YymmddToDate -Yymmdd $dateStr
    if ($dateObj) {
        $workoutData | Add-Member -NotePropertyName "DateIso" -NotePropertyValue $dateObj.ToString("yyyy-MM-dd")
        $workoutData | Add-Member -NotePropertyName "DateFormatted" -NotePropertyValue $dateObj.ToString("MMMM d, yyyy")
    }
    
    return $workoutData
}

function Save-WorkoutData {
    param([object]$WorkoutData)
    
    $filename = "wod_$($WorkoutData.Date).json"
    $filepath = Join-Path $OutputDir $filename
    
    try {
        $json = $WorkoutData | ConvertTo-Json -Depth 10
        Set-Content -Path $filepath -Value $json -Encoding UTF8
        
        Write-Log "Saved workout data to: $filepath"
        $Stats.TotalScraped++
        $Stats.ExtractedDates += $WorkoutData.Date
    }
    catch {
        Write-Log "Failed to save workout data: $($_.Exception.Message)" -Level "ERROR"
        $Stats.Errors++
    }
}

function Update-Index {
    $indexFile = Join-Path $OutputDir "index.json"
    
    $indexData = @{
        LastUpdated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
        TotalWorkouts = $Stats.TotalScraped
        ExtractedDates = $Stats.ExtractedDates | Sort-Object
        Stats = @{
            TotalScraped = $Stats.TotalScraped
            Errors = $Stats.Errors
            Skipped = $Stats.Skipped
            StartTime = $Stats.StartTime.ToString("yyyy-MM-ddTHH:mm:ssZ")
        }
    }
    
    try {
        $json = $indexData | ConvertTo-Json -Depth 10
        Set-Content -Path $indexFile -Value $json -Encoding UTF8
        
        Write-Log "Updated index file: $indexFile"
    }
    catch {
        Write-Log "Failed to update index file: $($_.Exception.Message)" -Level "ERROR"
    }
}

function Start-Scraping {
    param(
        [string]$StartUrl,
        [int]$MaxCount = 0,
        [string]$EndDate = $null
    )
    
    Write-Log "Starting scrape from: $StartUrl"
    
    $currentUrl = $StartUrl
    $scrapedCount = 0
    
    while ($currentUrl -and ($MaxCount -eq 0 -or $scrapedCount -lt $MaxCount)) {
        # Check if we should stop based on date
        if ($EndDate) {
            $currentDate = Get-DateFromUrl -Url $currentUrl
            if ($currentDate -and $currentDate -lt $EndDate) {
                Write-Log "Reached end date $EndDate, stopping scrape"
                break
            }
        }
        
        # Extract workout data
        $workoutData = Extract-WorkoutData -Url $currentUrl
        if (!$workoutData) {
            Write-Log "Failed to extract data from $currentUrl" -Level "ERROR"
            $Stats.Errors++
            break
        }
        
        # Save the data
        Save-WorkoutData -WorkoutData $workoutData
        $scrapedCount++
        
        # Update index periodically
        if ($scrapedCount % 10 -eq 0) {
            Update-Index
        }
        
        # Get the previous day's URL
        $previousUrl = $null
        if ($workoutData.Navigation -and $workoutData.Navigation.Previous) {
            $previousUrl = $BaseUrl + $workoutData.Navigation.Previous
        }
        
        if (!$previousUrl) {
            Write-Log "No previous link found - reached the oldest available workout"
            break
        }
        
        $currentUrl = $previousUrl
        
        # Rate limiting
        Write-Log "Waiting $Delay seconds before next request..."
        Start-Sleep -Seconds $Delay
    }
    
    # Final index update
    Update-Index
    
    # Log final statistics
    $duration = (Get-Date) - $Stats.StartTime
    Write-Log "Scraping completed in $($duration.ToString('hh\:mm\:ss'))"
    Write-Log "Total workouts scraped: $($Stats.TotalScraped)"
    Write-Log "Errors encountered: $($Stats.Errors)"
}

# Main execution
try {
    # Determine start URL
    if (!$StartDate) {
        $StartDate = (Get-Date).ToString("yyMMdd")
    }
    $startUrl = "$BaseUrl/$StartDate"
    
    Write-Log "CrossFit WOD Scraper starting"
    Write-Log "Start URL: $startUrl"
    Write-Log "Max Count: $(if ($MaxCount -gt 0) { $MaxCount } else { 'Unlimited' })"
    Write-Log "End Date: $(if ($EndDate) { $EndDate } else { 'None' })"
    Write-Log "Output Directory: $OutputDir"
    
    # Start scraping
    Start-Scraping -StartUrl $startUrl -MaxCount $MaxCount -EndDate $EndDate
    
}
catch {
    Write-Log "Scraping failed: $($_.Exception.Message)" -Level "ERROR"
    exit 1
}

Write-Log "CrossFit WOD Scraper completed successfully"
