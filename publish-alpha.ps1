# PowerShell script to bump version, mark alpha with timestamp, build, and publish (npm)
# Usage: .\publish-alpha.ps1

$ErrorActionPreference = 'Stop'

# 1. Get latest tag
$gitTag = git describe --tags --abbrev=0
if (-not $gitTag) { throw 'No git tag found.' }

# 2. Parse version, increment patch
$versionPattern = '^(\d+)\.(\d+)\.(\d+)'
if ($gitTag -match $versionPattern) {
    $major = $Matches[1]
    $minor = $Matches[2]
    $patch = [int]$Matches[3] + 1
} else {
    throw "Latest tag '$gitTag' is not a valid semver version."
}

# 3. Get current time for alpha label (yymmddhhmm)
$now = Get-Date -Format 'yyMMddHHmm'
$alphaVer = "$major.$minor.$patch-alpha.$now"

# 4. Update package.json version
$json = Get-Content package.json | Out-String | ConvertFrom-Json
$json.version = $alphaVer
$json | ConvertTo-Json -Depth 10 | Set-Content package.json
Write-Host "Updated version to $alphaVer"

# 5. Build
npm run build

# 6. Publish with alpha tag
npm publish --tag alpha
