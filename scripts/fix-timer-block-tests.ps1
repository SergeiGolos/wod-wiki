$file = "tests/unit/runtime/TimerBlock.contract.test.ts"
$content = Get-Content $file -Raw

# Remove "const TimerBlock = undefined as any;" lines
$content = $content -replace "(?m)^\s+const TimerBlock = undefined as any;\r?\n", ""

# Remove .toThrow('not implemented') wrappers while preserving test body
$content = $content -replace "expect\(\(\) => \{([\s\S]*?)\}\)\.toThrow\('not implemented'\);", '$1'

$content | Set-Content $file -NoNewline
Write-Host "Fixed TimerBlock contract tests"
