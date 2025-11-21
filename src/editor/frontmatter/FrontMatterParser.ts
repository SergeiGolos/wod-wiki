export interface FrontMatterBlock {
    startLine: number;
    endLine: number;
    properties: Record<string, string>;
}

export class FrontMatterParser {
    static parse(lines: string[]): FrontMatterBlock[] {
        const blocks: FrontMatterBlock[] = [];
        let currentBlockStart = -1;
        let currentProperties: Record<string, string> = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line === '---') {
                if (currentBlockStart === -1) {
                    // Start of a block
                    currentBlockStart = i + 1; // 1-based line number
                    currentProperties = {};
                } else {
                    // End of a block
                    blocks.push({
                        startLine: currentBlockStart,
                        endLine: i + 1, // 1-based line number
                        properties: currentProperties
                    });
                    currentBlockStart = -1;
                }
            } else if (currentBlockStart !== -1) {
                // Inside a block
                const match = line.match(/^([^:]+):\s*(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim();
                    currentProperties[key] = value;
                }
            }
        }

        return blocks;
    }
}
