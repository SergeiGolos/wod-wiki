import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';

interface CommitGraphProps {
    text?: string;
    rows?: number;
    cols?: number;
    gap?: number;
    padding?: number;
    randomness?: boolean;
    fontScale?: number;
    fontWeight?: number;
    letterSpacing?: number;
    className?: string;
}

const PALETTES = {
    dark: ["#1e3a8a", "#2563eb", "#3b82f6", "#60a5fa"], // Blue Dark (Dark -> Bright)
    light: ["#bfdbfe", "#60a5fa", "#3b82f6", "#2563eb"], // Blue Light (Light -> Dark)
};

export const CommitGraph: React.FC<CommitGraphProps> = ({
    text = "WOD.WIKI++",
    rows = 5,
    cols = 70,
    gap = 1,
    padding = 2,
    randomness = true,
    fontScale = 0.8,
    fontWeight = 700,
    letterSpacing = 2,
    className = ""
}) => {
    const { theme } = useTheme();
    const [gridData, setGridData] = useState<Array<{ id: string; active: boolean; color: string }>>([]);

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

            const handler = (e: MediaQueryListEvent) => {
                setResolvedTheme(e.matches ? 'dark' : 'light');
            };
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            setResolvedTheme(theme as 'light' | 'dark');
        }
    }, [theme]);

    const colors = PALETTES[resolvedTheme];
    const backgroundColor = "transparent";

    useEffect(() => {
        const generateGrid = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (!ctx) return;

            canvas.width = cols;
            canvas.height = rows;

            // Clear
            ctx.clearRect(0, 0, cols, rows);

            // Draw text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${fontWeight} ${rows}px monospace`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';

            // @ts-ignore
            if (ctx.letterSpacing !== undefined) {
                // @ts-ignore
                ctx.letterSpacing = `${letterSpacing}px`;
            }

            // Draw text with scaling
            ctx.save();
            ctx.scale(fontScale, 1);
            ctx.fillText(text.toUpperCase(), (cols / 2) / fontScale, rows / 2 + (rows * 0.1));
            ctx.restore();

            const imageData = ctx.getImageData(0, 0, cols, rows);
            const data = imageData.data;
            const newGrid = [];

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const index = (y * cols + x) * 4;
                    const a = data[index + 3];
                    const isTextPixel = a > 100;

                    let cellColor = backgroundColor;
                    let active = false;

                    if (isTextPixel) {
                        const heavyIndex = colors.length - 1;
                        const secondHeavyIndex = colors.length - 2;

                        const colorIndex = Math.random() > 0.3 ? heavyIndex : secondHeavyIndex;
                        cellColor = colors[colorIndex];
                        active = true;
                    } else if (randomness) {
                        if (Math.random() < 0.05) {
                            const lightIndex = Math.floor(Math.random() * 2);
                            cellColor = colors[lightIndex];
                            active = true;
                        }
                    }

                    newGrid.push({
                        id: `${x}-${y}`,
                        active,
                        color: cellColor
                    });
                }
            }

            setGridData(newGrid);
        };

        generateGrid();
    }, [text, rows, cols, colors, backgroundColor, randomness, fontScale, fontWeight, letterSpacing]);

    const containerStyle = {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: `${gap}px`,
        padding: `${padding}px`,
        width: '100%',
        height: '100%',
        overflow: 'hidden'
    };

    return (
        <div style={containerStyle} className={`transition-colors duration-300 ${className}`}>
            {gridData.map((cell) => (
                <div
                    key={cell.id}
                    className="w-full h-full rounded-[1px] transition-all duration-500"
                    style={{ backgroundColor: cell.color }}
                />
            ))}
        </div>
    );
};
