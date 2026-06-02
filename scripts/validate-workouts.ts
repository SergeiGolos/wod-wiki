import * as fs from 'fs';
import * as path from 'path';
import { sharedParser } from '../src/parser/parserInstance';
import { globalCompiler } from '../src/runtime/services/runtimeServices';
import { ICodeStatement } from '../src/core/models/CodeStatement';

const MARKDOWN_DIR = path.resolve(process.cwd(), 'markdown');
const OUTPUT_FILE = path.resolve(process.cwd(), 'scripts/validation-report.html');

interface WorkoutBlock {
  raw: string;
  lineOffset: number;
}

function extractWodBlocks(content: string): WorkoutBlock[] {
  const blocks: WorkoutBlock[] = [];
  const lines = content.split('\n');
  let inBlock = false;
  let currentBlock: string[] = [];
  let blockStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '```wod') {
      inBlock = true;
      blockStartLine = i + 1;
      currentBlock = [];
    } else if (inBlock && line.trim() === '```') {
      inBlock = false;
      blocks.push({
        raw: currentBlock.join('\n'),
        lineOffset: blockStartLine
      });
    } else if (inBlock) {
      currentBlock.push(line);
    }
  }
  return blocks;
}

function processDirectory(dir: string, results: Map<string, any[]>) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relPath = path.relative(MARKDOWN_DIR, fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const blocks = extractWodBlocks(content);

      if (blocks.length > 0) {
        const fileResults = blocks.map(block => {
          const script = sharedParser.read(block.raw);

          let compileLog = '';
          const strategyMap = new Map<number, string>();

          try {
             const mockRuntime: any = {
                stack: { current: null }
             };

             if (script.statements) {
                const topLevel = script.statements.filter((s: any) => s.parent === undefined);

                const traceStrategies = (stmts: any[]) => {
                   for (const stmt of stmts) {
                      const runtimeBlock = globalCompiler.compile([stmt], mockRuntime);
                      if (runtimeBlock && runtimeBlock.label) {
                         strategyMap.set(stmt.id, runtimeBlock.label);
                      }
                      if (stmt.children) {
                         for (const childGroup of stmt.children) {
                            const childStmts = childGroup.map((id: number) => script.statements.find((s: any) => s.id === id)).filter(Boolean);
                            traceStrategies(childStmts);
                         }
                      }
                   }
                };

                traceStrategies(topLevel);
             }
          } catch (e: any) {
             compileLog = e.message;
          }

          return {
            block,
            script,
            strategyMap,
            compileLog
          };
        });
        results.set(relPath, fileResults);
      }
    }
  }
}

function generateHtmlReport(results: Map<string, any[]>) {
  let totalFiles = 0;
  let totalBlocks = 0;
  let blocksWithErrors = 0;

  // Group results by folder
  const groupedResults = new Map<string, Array<{ relPath: string; blocks: any[] }>>();

  for (const [relPath, blocks] of results.entries()) {
    totalFiles++;
    totalBlocks += blocks.length;

    let hasError = false;
    for (const b of blocks) {
      if ((b.script.errors && b.script.errors.length > 0) || b.compileLog) {
        hasError = true;
        blocksWithErrors++;
      }
    }

    const folder = path.dirname(relPath);
    const folderGroup = groupedResults.get(folder) || [];
    folderGroup.push({ relPath, blocks });
    groupedResults.set(folder, folderGroup);
  }

  // Sort folders alphabetically
  const sortedFolders = Array.from(groupedResults.keys()).sort();

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WOD Workout Validation Report</title>
  <style>
    :root {
      --bg: #f9fafb;
      --card-bg: #ffffff;
      --text: #111827;
      --text-muted: #6b7280;
      --border: #e5e7eb;
      --primary: #2563eb;
      --danger: #ef4444;
      --danger-bg: #fef2f2;
      --code-bg: #1f2937;
      --code-text: #f3f4f6;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 0;
      margin: 0;
      background-color: var(--bg);
      color: var(--text);
    }
    .header {
      background: var(--card-bg);
      padding: 20px 40px;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .stats { display: flex; gap: 20px; font-size: 14px; color: var(--text-muted); }
    .stats span { background: var(--bg); padding: 4px 10px; border-radius: 12px; border: 1px solid var(--border); }
    .stats .error-stat { color: var(--danger); border-color: #fca5a5; background: var(--danger-bg); font-weight: bold; }

    .container { padding: 20px 40px; max-width: 1400px; margin: 0 auto; }

    .folder-section {
      margin-bottom: 40px;
    }
    .folder-title {
      font-size: 20px;
      color: var(--primary);
      border-bottom: 2px solid var(--border);
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 20px;
      position: sticky;
      top: 90px;
      background: var(--bg);
      z-index: 10;
    }
    .file-title {
      font-size: 16px;
      color: #374151;
      margin-top: 30px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .workout-container {
      background: var(--card-bg);
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      border: 1px solid var(--border);
    }
    .workout-container.has-error {
      border-left: 4px solid var(--danger);
    }

    .block-header {
      margin-top: 0;
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 15px;
    }

    pre.raw-wod {
      background: var(--code-bg);
      color: var(--code-text);
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 13px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      line-height: 1.4;
      margin: 0 0 20px 0;
    }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { background-color: #f8fafc; font-weight: 600; color: #475569; position: sticky; top: 120px; z-index: 5; }

    .error-msg {
      color: var(--danger);
      background: var(--danger-bg);
      padding: 10px 15px;
      border-radius: 6px;
      font-weight: 500;
      margin-bottom: 15px;
      font-size: 13px;
      border: 1px solid #fecaca;
    }
    .error-msg ul { margin: 5px 0 0 0; padding-left: 20px; }

    .indent-0 { font-weight: 600; color: #111827; }
    .indent-1 { padding-left: 30px !important; color: #374151; border-left: 2px solid #e5e7eb; }
    .indent-2 { padding-left: 50px !important; color: #4b5563; border-left: 4px solid #e5e7eb; }
    .indent-3 { padding-left: 70px !important; color: #6b7280; border-left: 6px solid #e5e7eb; }

    .metric-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      background: #f1f5f9;
      color: #475569;
      margin-right: 4px;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #e2e8f0;
    }
    .metric-rounds { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
    .metric-duration { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .metric-effort { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
    .metric-rep { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
    .metric-weight { background: #fce7f3; color: #9d174d; border-color: #fbcfe8; }
    .metric-error { background: #fee2e2; color: #b91c1c; border-color: #fecaca; font-weight: bold; }

    .strategy-badge {
      background: #f3f4f6;
      color: #374151;
      font-size: 11px;
      padding: 3px 6px;
      border-radius: 4px;
      display: inline-block;
      font-weight: 600;
      border: 1px solid #d1d5db;
    }

    .statement-text { font-family: ui-monospace, SFMono-Regular, monospace; }
  </style>
</head>
<body>
  <div class="header">
    <h1>WOD Workout Validation Report</h1>
    <div class="stats">
      <span>Generated: ${new Date().toLocaleString()}</span>
      <span>Total Files: ${totalFiles}</span>
      <span>Total Blocks: ${totalBlocks}</span>
      <span class="${blocksWithErrors > 0 ? 'error-stat' : ''}">Blocks with Errors: ${blocksWithErrors}</span>
    </div>
  </div>

  <div class="container">
`;

  for (const folder of sortedFolders) {
    const files = groupedResults.get(folder)!;

    html += `<div class="folder-section">`;
    html += `<h2 class="folder-title">📂 ${folder === '.' ? 'Root' : escapeHtml(folder)}</h2>`;

    for (const file of files) {
      html += `<div class="file-title">📄 <strong>${escapeHtml(file.relPath)}</strong></div>`;

      for (let i = 0; i < file.blocks.length; i++) {
        const { block, script, strategyMap, compileLog } = file.blocks[i];

        const hasError = (script.errors && script.errors.length > 0) || compileLog;

        html += `<div class="workout-container ${hasError ? 'has-error' : ''}">`;
        html += `<h3 class="block-header">Block ${i + 1} (Starts at line ${block.lineOffset})</h3>`;

        if (script.errors && script.errors.length > 0) {
          html += `<div class="error-msg">Parse Errors Found:<ul>`;
          for (const err of script.errors) {
            html += `<li>${err.message}</li>`;
          }
          html += `</ul></div>`;
        }
        if (compileLog) {
           html += `<div class="error-msg">Compile Error: ${compileLog}</div>`;
        }

        html += `<pre class="raw-wod"><code>${escapeHtml(block.raw)}</code></pre>`;

        if (script.statements && script.statements.length > 0) {
          html += `<table>
            <thead>
              <tr>
                <th style="width: 40px;">ID</th>
                <th style="width: 45%;">Statement Structure</th>
                <th style="width: 15%;">Compiled Strategy</th>
                <th style="width: 40%;">Metrics</th>
              </tr>
            </thead>
            <tbody>`;

          const processStatement = (stmt: ICodeStatement, depth: number) => {
            const textLine = block.raw.split('\n')[stmt.meta.line - 1] || '';

            let metricsHtml = '';
            const metrics = stmt.metrics.toArray ? stmt.metrics.toArray() : Array.from(stmt.metrics as any);

            for (const m of metrics) {
               let val = m.value;
               if (typeof val === 'object') val = JSON.stringify(val);
               let className = 'metric-badge';
               if (m.type === 'rounds') className += ' metric-rounds';
               else if (m.type === 'duration') className += ' metric-duration';
               else if (m.type === 'effort') className += ' metric-effort';
               else if (m.type === 'rep') className += ' metric-rep';
               else if (m.type === 'weight' || m.type === 'resistance') className += ' metric-weight';

               metricsHtml += `<span class="${className}">${m.type}: ${val}</span>`;
            }

            if (metrics.length === 0) {
              metricsHtml = `<span class="metric-badge metric-error">No metrics parsed</span>`;
            }

            const strategyName = strategyMap.get(stmt.id) || '';

            html += `<tr>
              <td style="color:#9ca3af;">#${stmt.id}</td>
              <td class="indent-${Math.min(depth, 3)}"><span class="statement-text">${escapeHtml(textLine.trim())}</span></td>
              <td>${strategyName ? `<span class="strategy-badge">${strategyName}</span>` : ''}</td>
              <td>${metricsHtml}</td>
            </tr>`;

            if (stmt.children && stmt.children.length > 0) {
              for (const childGroup of stmt.children) {
                 for (const childId of childGroup) {
                    const childStmt = script.statements.find((s: any) => s.id === childId);
                    if (childStmt) {
                      processStatement(childStmt, depth + 1);
                    }
                 }
              }
            }
          };

          const topLevel = script.statements.filter((s: any) => s.parent === undefined);
          for (const stmt of topLevel) {
            processStatement(stmt, 0);
          }

          html += `</tbody></table>`;
        } else {
          html += `<p style="color: #6b7280; font-style: italic;">No statements were parsed successfully from this block.</p>`;
        }

        html += `</div>`;
      }
    }

    html += `</div>`; // Close folder-section
  }

  html += `
  </div>
</body>
</html>`;

  fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
  console.log(`Report generated at: ${OUTPUT_FILE}`);
}

function escapeHtml(unsafe: string) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function main() {
  const results = new Map<string, any[]>();
  processDirectory(MARKDOWN_DIR, results);
  generateHtmlReport(results);
}

main();
