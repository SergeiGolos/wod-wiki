# Fix all contract test files by properly handling TDD placeholders
# Strategy: Use precise multi-line regex patterns

$files = @(
    @{
        path = "tests/unit/runtime/TimerBlock.contract.test.ts"
        import = "import { TimerBlock } from '../../../src/runtime/blocks/TimerBlock';"
        className = "TimerBlock"
    },
    @{
        path = "tests/unit/runtime/RoundsBlock.contract.test.ts"
        import = "import { RoundsBlock } from '../../../src/runtime/blocks/RoundsBlock';"
        className = "RoundsBlock"
    },
    @{
        path = "tests/unit/runtime/EffortBlock.contract.test.ts"
        import = "import { EffortBlock } from '../../../src/runtime/blocks/EffortBlock';"
        className = "EffortBlock"
    }
)

foreach ($fileInfo in $files) {
    $filePath = $fileInfo.path
    $importStatement = $fileInfo.import
    $className = $fileInfo.className
    
    Write-Host "Processing $filePath..." -ForegroundColor Yellow
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  File not found, skipping..." -ForegroundColor Red
        continue
    }
    
    $content = Get-Content $filePath -Raw
    
    # Step 1: Add import if not present
    if ($content -notmatch "import.*$className.*from") {
        Write-Host "  Adding import statement..." -ForegroundColor Green
        $content = $content -replace "(import \{ mockPerformanceNow \} from '\./timer-test-utils';)", "`$1`n$importStatement"
    }
    
    # Step 2: Remove placeholder lines
    Write-Host "  Removing placeholder lines..." -ForegroundColor Green
    $content = $content -replace "(?m)^\s+const $className = undefined as any;[\r\n]+", ""
    
    # Step 3: Fix validation tests (keep .toThrow() but remove 'not implemented')
    Write-Host "  Fixing validation tests..." -ForegroundColor Green
    $content = $content -replace "\.toThrow\('not implemented'\);", ".toThrow();"
    
    # Step 4: Remove expect wrappers for non-validation tests
    # This is complex, so let's do it test by test using a simpler approach
    Write-Host "  Removing expect wrappers..." -ForegroundColor Green
    
    # Pattern: Tests that DON'T have "should reject" or similar validation language
    # We'll process the file line by line
    $lines = $content -split "`r`n|`n"
    $output = New-Object System.Collections.ArrayList
    $skipNext = $false
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        # Skip lines that are just "expect(() => {"
        if ($line -match '^\s+expect\(\(\) => \{$') {
            # Check if the test name contains validation keywords
            $testName = ""
            for ($j = $i-1; $j -ge ([Math]::Max(0, $i-10)); $j--) {
                if ($lines[$j] -match "it\('([^']+)'") {
                    $testName = $matches[1]
                    break
                }
            }
            
            if ($testName -match 'reject|throw|invalid|error') {
                # This is a validation test, keep the expect wrapper
                [void]$output.Add($line)
            } else {
                # This is not a validation test, skip this line
                continue
            }
        }
        # Skip lines that are just "}).toThrow();"
        elseif ($line -match '^\s+\}\)\.toThrow\(\);$') {
            # Check if we skipped the expect line
            if ($output[-1] -notmatch 'expect\(\(\) => \{') {
                # We didn't skip it, so keep this line
                [void]$output.Add($line)
            }
            # Otherwise skip this closing line too
        }
        else {
            [void]$output.Add($line)
        }
    }
    
    $content = $output -join "`n"
    
    # Save
    $content | Set-Content $filePath -NoNewline
    Write-Host "  ✓ Completed!" -ForegroundColor Green
}

Write-Host "`nDone processing all files!" -ForegroundColor Cyan
