const fs = require('fs');
const path = require('path');

const dir = 'src/runtime/compiler/metrics';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Remove `readonly type: string = "...";`
  content = content.replace(/^[ \t]*readonly type: string = "[^"]+";\r?\n/gm, '');
  
  // 2. Rename `readonly metricType = MetricType.X;` to `readonly type = MetricType.X;`
  content = content.replace(/readonly metricType = (MetricType\.[a-zA-Z]+);/g, 'readonly type = $1;');
  
  // 3. Handle `behavior: ...` and `origin: ...` merging
  const behaviorMatch = content.match(/readonly behavior[^=]*= '([^']+)';/);
  if (behaviorMatch) {
    const originVal = behaviorMatch[1];
    content = content.replace(/^[ \t]*readonly origin: MetricOrigin = '[^']+';\r?\n/gm, '');
    content = content.replace(/^[ \t]*readonly behavior[^=]*= '[^']+';/gm, `  readonly origin: MetricOrigin = '${originVal}';`);
  }
  
  // 4. Remove standalone `readonly behavior: MetricBehavior;`
  content = content.replace(/^[ \t]*readonly behavior: MetricBehavior;\r?\n/gm, '');
  
  // Clean up double assignments in constructors
  content = content.replace(/this\.origin = 'parser';\s*this\.origin = 'parser';/g, "this.origin = 'parser';");
  content = content.replace(/this\.origin = 'runtime';\s*this\.origin = 'hinted';/g, "this.origin = 'hinted';");
  
  fs.writeFileSync(filePath, content);
}
console.log('Metrics fixed!');
