# Fix all contract test files systematically
# This script:
# 1. Adds the proper import statement
# 2. Removes TDD placeholder lines (const Block = undefined as any)
# 3. Removes .toThrow('not implemented') for non-validation tests
# 4. Keeps .toThrow() for actual validation tests

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
        # Insert after the last import line
        $content = $content -replace "(import.*from.*[';]`r?`n)", "`$1$importStatement`n"
    }
    
    # Step 2: Remove TDD placeholder lines
    Write-Host "  Removing TDD placeholder lines..." -ForegroundColor Green
    $content = $content -replace "(?m)^\s+const $className = undefined as any;`r?`n", ""
    
    # Step 3: Handle .toThrow() wrappers
    # We need to be more careful - only remove .toThrow('not implemented')
    # and unwrap the expect(() => { ... }) structure
    Write-Host "  Processing .toThrow() wrappers..." -ForegroundColor Green
    
    # Strategy: Find each test block and process it
    # Pattern: it('...', () => { expect(() => { TEST_BODY }).toThrow('not implemented'); });
    
    # First, let's just change .toThrow('not implemented') to .toThrow() for validation tests
    # and remove the expect wrapper for non-validation tests
    
    # For validation tests (should reject/should not throw), change to just .toThrow()
    $content = $content -replace "(\s+it\('should reject[^']*'[^}]+new $className[^}]+)\)\.toThrow\('not implemented'\);", '$1).toThrow();'
    
    # For all other tests, we need to unwrap the expect(() => { ... }).toThrow('not implemented')
    # This is tricky with regex, so let's do it line by line
    $lines = $content -split "`r?`n"
    $newLines = @()
    $inExpectBlock = $false
    $expectBlockStartLine = -1
    $blockContent = @()
    $indentLevel = 0
    
    for ($i = 0; $i < $lines.Count; $i++) {
        $line = $lines[$i]
        
        # Check if this line starts an expect block for non-validation tests
        if ($line -match '^\s+expect\(\(\) => \{$' -and $i -gt 0 -and $lines[$i-1] -notmatch 'should reject|should not throw') {
            $inExpectBlock = $true
            $expectBlockStartLine = $newLines.Count
            $indentLevel = ($line -replace '\S.*$', '').Length
            continue
        }
        
        # Check if this line ends the expect block with .toThrow('not implemented')
        if ($inExpectBlock -and $line -match '^\s+\}(\))?\.toThrow\(''not implemented''\);$') {
            $inExpectBlock = $false
            # Add the block content without the expect wrapper
            $newLines += $blockContent
            $blockContent = @()
            continue
        }
        
        # If we're in an expect block, collect the content (removing one indent level)
        if ($inExpectBlock) {
            # Remove the extra indentation (2 spaces)
            if ($line -match '^  (.*)$') {
                $blockContent += $matches[1]
            } else {
                $blockContent += $line
            }
        } else {
            $newLines += $line
        }
    }
    
    $content = $newLines -join "`n"
    
    # Step 4: Save the file
    $content | Set-Content $filePath -NoNewline
    Write-Host "  ✓ Completed $filePath" -ForegroundColor Green
}

Write-Host "`nAll files processed!" -ForegroundColor Cyan
