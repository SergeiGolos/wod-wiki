import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createParser, whiteboardScriptLanguage } from "@bitcobblers/wod-wiki-engine";
// Types
interface LintError {
  blockIndex: number;
  from: number;
  to: number;
  codeSnippet: string;
}

interface FileReport {
  filePath: string;
  errors: LintError[];
}

/**
 * Extracts Whiteboard Script blocks from markdown content
 */
function extractWhiteboardScriptBlocks(markdown: string): Array<{ content: string; dialect: string }> {
  const blocks: Array<{ content: string; dialect: string }> = [];
  const regex = /```(time|wod|climb|log|crossfit|cardio|yoga|habits)\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({ dialect: match[1], content: match[2] });
  }

  return blocks;
}

/**
 * Parses Whiteboard Script content and finds any syntax errors using the Lezer tree
 */
function lintWhiteboardScript(content: string, blockIndex: number, dialect: string = "time"): LintError[] {
  if (!content.trim()) return [];

  const parser = createParser(dialect);
  const script = parser.read(content, dialect);
  const errors: LintError[] = [];

  if (script.errors && script.errors.length > 0) {
    for (const err of script.errors) {
      errors.push({
        blockIndex,
        from: err.from ?? 0,
        to: err.to ?? 0,
        codeSnippet: err.message,
      });
    }
  }

  return errors;
}

/**
 * Recursively find all markdown files in a directory
 */
async function findMarkdownFiles(dir: string, fileList: string[] = []): Promise<string[]> {
  const files = await readdir(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      await findMarkdownFiles(filePath, fileList);
    } else if (filePath.endsWith(".md")) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Generate a markdown report
 */
async function generateReport(reports: FileReport[], totalFiles: number, outputPath: string) {
  const filesWithErrors = reports.filter(r => r.errors.length > 0);
  
  let reportContent = `# Whiteboard Script Linting Report\n\n`;
  reportContent += `**Total Files Scanned:** ${totalFiles}\n`;
  reportContent += `**Files with Errors:** ${filesWithErrors.length}\n`;
  reportContent += `**Status:** ${filesWithErrors.length === 0 ? "✅ All Whiteboard Script blocks pass validation" : "❌ Syntax errors found"}\n\n`;

  if (filesWithErrors.length > 0) {
    reportContent += `## Details\n\n`;
    
    for (const report of filesWithErrors) {
      reportContent += `### 📄 \`${report.filePath}\`\n\n`;
      reportContent += `Found ${report.errors.length} error(s):\n\n`;
      
      for (const error of report.errors) {
        reportContent += `- **Block ${error.blockIndex + 1}** (Character range: ${error.from}-${error.to})\n`;
        reportContent += `  \`\`\`text\n  ${error.codeSnippet}\n  \`\`\`\n\n`;
      }
    }
  }

  await writeFile(outputPath, reportContent, "utf-8");
  console.log(`\nReport generated at: ${outputPath}`);
}

async function main() {
  const markdownDir = join(process.cwd(), "markdown");
  const reportPath = join(process.cwd(), "wod-lint-report.md");
  
  console.log(`Scanning directory: ${markdownDir}`);
  
  try {
    const mdFiles = await findMarkdownFiles(markdownDir);
    console.log(`Found ${mdFiles.length} markdown file(s). Linting...`);
    
    const fileReports: FileReport[] = [];
    let totalErrors = 0;

    for (const filePath of mdFiles) {
      const content = await readFile(filePath, "utf-8");
      const whiteboardScriptBlocks = extractWhiteboardScriptBlocks(content);
      
      let fileErrors: LintError[] = [];
      
      whiteboardScriptBlocks.forEach((block, index) => {
        const errors = lintWhiteboardScript(block.content, index, block.dialect);
        if (errors.length > 0) {
          fileErrors.push(...errors);
          totalErrors += errors.length;
        }
      });
      
      const relativePath = filePath.replace(process.cwd() + "/", "");
      
      if (fileErrors.length > 0) {
        fileReports.push({
          filePath: relativePath,
          errors: fileErrors,
        });
        process.stdout.write("x");
      } else {
        process.stdout.write(".");
      }
    }
    
    console.log("\n\nLinting complete.");
    console.log(`Found ${totalErrors} total error(s) across ${fileReports.length} file(s).`);
    
    await generateReport(fileReports, mdFiles.length, reportPath);
    
    if (totalErrors > 0) {
      console.error("\n❌ Syntax errors were found. Please check the report.");
      process.exit(1);
    } else {
      console.log("\n✅ All Whiteboard Script blocks are valid!");
      process.exit(0);
    }
    
  } catch (err) {
    console.error("Error during linting:", err);
    process.exit(1);
  }
}
main();
