// Range is used in type declarations but not imported directly
// import { Range } from 'monaco-editor';

export interface MediaBlock {
    line: number;
    type: 'image' | 'youtube';
    url: string;
    alt?: string;
    startColumn: number;
    endColumn: number;
    isWholeLine: boolean;
}

export class MediaParser {
    static parse(lines: string[]): MediaBlock[] {
        const blocks: MediaBlock[] = [];
        
        // Regex for Markdown Images: ![alt](url)
        const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
        
        // Regex for YouTube: https://www.youtube.com/watch?v=ID or https://youtu.be/ID
        // We look for these on their own line or as a link
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;

            // Check for Images
            let match;
            while ((match = imageRegex.exec(line)) !== null) {
                const alt = match[1];
                const url = match[2];
                const startColumn = match.index + 1;
                const endColumn = match.index + match[0].length + 1;
                const isWholeLine = line.trim() === match[0];

                blocks.push({
                    line: lineNum,
                    type: 'image',
                    url,
                    alt,
                    startColumn,
                    endColumn,
                    isWholeLine
                });
            }

            // Check for YouTube (only if line is mostly just the link)
            // We don't want to embed every youtube link mentioned in text
            const trimmed = line.trim();
            const ytMatch = trimmed.match(youtubeRegex);
            if (ytMatch && (trimmed === ytMatch[0] || trimmed === `<${ytMatch[0]}>`)) {
                // It's a standalone YouTube link
                const videoId = ytMatch[1];
                const embedUrl = `https://www.youtube.com/embed/${videoId}`;
                
                blocks.push({
                    line: lineNum,
                    type: 'youtube',
                    url: embedUrl,
                    startColumn: line.indexOf(ytMatch[0]) + 1,
                    endColumn: line.indexOf(ytMatch[0]) + ytMatch[0].length + 1,
                    isWholeLine: true // Treat as whole line for simplicity
                });
            }
        }

        return blocks;
    }
}
