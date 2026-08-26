import { Glob } from 'bun';
import { parseDocumentSections } from '@/components/Editor/utils/sectionParser';
import type { Section } from '@/components/Editor/types/section';
import type { BlockIndexRow, SegmentDataType } from '@/types/storage';
import { fileToDisplayName } from '@/repositories/script-groupings';
import { feedDateToCreatedAt } from '@/services/content/staticBlockIndex';
import fs from 'fs';
import path from 'path';

function toSegmentDataType(section: Pick<Section, 'type' | 'level'>): SegmentDataType {
    switch (section.type) {
        case 'wod': return 'wod';
        case 'title': {
            const l = section.level ?? 1;
            return `h${Math.min(Math.max(l, 1), 6)}` as SegmentDataType;
        }
        case 'frontmatter': return 'frontmatter';
        case 'markdown':
        case 'widget':
        case 'embed':
        case 'code':
            return 'markdown';
        default:
            return 'markdown';
    }
}

const index: BlockIndexRow[] = [];

// createdAt semantics (#853): feed rows carry their path date so `last <n>w`
// windows filter them truthfully; collection rows are undated (0) — excluded
// from dated windows, present in unbounded queries, matching the Library's
// "Static, undated" treatment.

// Process Collections
const collectionsGlob = new Glob('markdown/collections/**/*.md');
for (const file of collectionsGlob.scanSync('.')) {
    const parts = file.split('/');
    // markdown/collections/{dirName}/{fileName}.md
    if (parts.length < 4) continue; // ignore root readmes if any
    const dirName = parts[parts.length - 2];
    const fileNameExt = parts[parts.length - 1];
    if (fileNameExt.toLowerCase() === 'readme.md') continue;
    
    const fileName = fileNameExt.replace(/\.md$/, '');
    const noteId = `${dirName}/${fileName}`;
    const noteTitle = fileToDisplayName(fileNameExt);
    const content = fs.readFileSync(file, 'utf8');
    
    const sections = parseDocumentSections(content);
    let position = 0;
    for (const section of sections) {
        const blockContentId = section.scriptBlock?.contentId ?? undefined;
        index.push({
            id: `static:${noteId}:${section.id}:1`,
            noteId,
            segmentId: section.id,
            segmentVersion: 1,
            position: position++,
            dataType: toSegmentDataType(section),
            blockContentId,
            rawContent: section.displayContent,
            noteTitle,
            createdAt: 0,
            isStatic: true,
            sourceId: `collection:${noteId}`
        });
    }
}

// Process Feeds
const feedsGlob = new Glob('markdown/feeds/**/*.md');
for (const file of feedsGlob.scanSync('.')) {
    const parts = file.split('/');
    // markdown/feeds/{dirName}/{dateKey}/{fileName}.md
    if (parts.length < 5) continue;
    const dirName = parts[parts.length - 3];
    const dateKey = parts[parts.length - 2];
    const fileNameExt = parts[parts.length - 1];
    if (fileNameExt.toLowerCase() === 'readme.md') continue;
    
    const fileName = fileNameExt.replace(/\.md$/, '');
    const noteId = `feeds/${dirName}/${dateKey}/${fileName}`;
    const noteTitle = fileToDisplayName(fileNameExt);
    const content = fs.readFileSync(file, 'utf8');
    
    const sections = parseDocumentSections(content);
    let position = 0;
    for (const section of sections) {
        const blockContentId = section.scriptBlock?.contentId ?? undefined;
        index.push({
            id: `static:${noteId}:${section.id}:1`,
            noteId,
            segmentId: section.id,
            segmentVersion: 1,
            position: position++,
            dataType: toSegmentDataType(section),
            blockContentId,
            rawContent: section.displayContent,
            noteTitle,
            createdAt: feedDateToCreatedAt(dateKey),
            isStatic: true,
            sourceId: `feed:${noteId}`
        });
    }
}

const outDir = 'apps/playground/src/generated';
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'static-block-index.json'), JSON.stringify(index));
console.log(`Generated static-block-index.json with ${index.length} blocks.`);
