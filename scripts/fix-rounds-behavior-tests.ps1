#!/usr/bin/env pwsh
# Fix RoundsBehavior.contract.test.ts remaining sections

$filePath = "tests/unit/runtime/RoundsBehavior.contract.test.ts"
Write-Host "Fixing $filePath..." -ForegroundColor Cyan

$content = Get-Content $filePath -Raw

# Fix Rounds Completion section
$content = $content -replace `
    "(?ms)  describe\('Rounds Completion', \(\) => \{.*?it\('should emit rounds:complete when all rounds finished', \(\) => \{.*?expect\(\(\) => \{(.*?)      \}\)\.toThrow\(\);",
    @"
  describe('Rounds Completion', () => {
    it('should emit rounds:complete when all rounds finished', () => {
      const behavior = new RoundsBehavior(2);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      behavior.onNext(runtime, mockBlock); // Round 2
      const actions = behavior.onNext(runtime, mockBlock); // Complete
      
      // Should emit rounds:complete
      const completeAction = actions.find((a: any) => a.type === 'emit' && a.event?.includes('rounds:complete'));
      expect(completeAction).toBeDefined();
"@

Set-Content $filePath $content -NoNewline
Write-Host "✓ Fixed $filePath" -ForegroundColor Green
