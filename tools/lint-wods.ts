import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { whiteboardScriptLanguage } from "../src/parser/whiteboard-script-language";

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
function extractWhiteboardScriptBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const regex = /```wod\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

/**
 * Parses Whiteboard Script content and finds any syntax errors using the Lezer tree
 */
function lintWhiteboardScript(content: string, blockIndex: number): LintError[] {
  if (!content.trim()) return [];

  const doc = content.endsWith("\n") ? content : content + "\n";
  const tempState = EditorState.create({
    doc,
    extensions: [whiteboardScriptLanguage],
  });

  const tree = syntaxTree(tempState);
  const errors: LintError[] = [];

  tree.iterate({
    enter(node) {
      if (node.type.isError) {
        // Extract the code snippet around the error for context
        const startLineOffset = doc.lastIndexOf("\n", node.from - 1) + 1;
        let endLineOffset = doc.indexOf("\n", node.to);
        if (endLineOffset === -1) endLineOffset = doc.length;
        
        const codeSnippet = doc.slice(startLineOffset, endLineOffset).trim();

        errors.push({
          blockIndex,
          from: node.from,
          to: node.to,
          codeSnippet: codeSnippet || "<empty line or invisible error>",
        });
      }
    },
  });

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
  const whiteboardScriptDir = join(process.cwd(), "wod");
  const reportPath = join(process.cwd(), "wod-lint-report.md");
  
  console.log(`Scanning directory: ${whiteboardScriptDir}`);
  
  try {
    const mdFiles = await findMarkdownFiles(whiteboardScriptDir);
    console.log(`Found ${mdFiles.length} markdown file(s). Linting...`);
    
    const fileReports: FileReport[] = [];
    let totalErrors = 0;

    for (const filePath of mdFiles) {
      const content = await readFile(filePath, "utf-8");
      const whiteboardScriptBlocks = extractWhiteboardScriptBlocks(content);
      
      let fileErrors: LintError[] = [];
      
      whiteboardScriptBlocks.forEach((blockContent, index) => {
        const errors = lintWhiteboardScript(blockContent, index);
        if (errors.length > 0) {
          fileErrors.push(...errors);
          totalErrors += errors.length;
        }
      });
      
      // Calculate relative path for cleaner report
      const relativePath = filePath.replace(process.cwd() + "/", "");
      
      if (fileErrors.length > 0) {
        fileReports.push({
          filePath: relativePath,
          errors: fileErrors,
        });
        process.stdout.write("x"); // Progress indicator (error)
      } else {
        process.stdout.write("."); // Progress indicator (success)
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
