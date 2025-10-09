#!/usr/bin/env pwsh
# Fix contract tests by removing .toThrow() wrappers
# These tests were created as TDD placeholders but implementations now exist

$testFiles = @(
    "tests/unit/runtime/RoundsBehavior.contract.test.ts",
    "tests/unit/runtime/RoundsBlock.contract.test.ts",
    "tests/unit/runtime/TimerBlock.contract.test.ts",
    "tests/unit/runtime/EffortBlock.contract.test.ts"
)

Write-Host "Fixing contract test wrappers..." -ForegroundColor Cyan

foreach ($file in $testFiles) {
    $fullPath = Join-Path $PSScriptRoot ".." $file
    
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw
        
        # Pattern 1: expect(() => { ... }).toThrow();
        # Replace with just the inner content
        $content = $content -replace '(?s)it\(([^)]+)\)\s*=>\s*{\s*expect\(\(\)\s*=>\s*{\s*(.*?)\s*}\)\.toThrow\(\);', 'it($1) => {$2'
        
        # Pattern 2: expect(() => { ... }).toThrow('not implemented');
        $content = $content -replace '(?s)it\(([^)]+)\)\s*=>\s*{\s*expect\(\(\)\s*=>\s*{\s*(.*?)\s*}\)\.toThrow\([^)]*\);', 'it($1) => {$2'
        
        Set-Content $fullPath $content -NoNewline
        Write-Host "✓ Fixed: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ Not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nRunning tests to verify fixes..." -ForegroundColor Cyan
npm run test:unit

Write-Host "`nContract test fixes complete!" -ForegroundColor Green
