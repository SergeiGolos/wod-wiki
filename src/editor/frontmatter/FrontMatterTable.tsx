import React from 'react';

interface FrontMatterTableProps {
    properties: Record<string, string>;
    onEdit?: () => void;
}

export const FrontMatterTable: React.FC<FrontMatterTableProps> = ({ properties, onEdit }) => {
    return (
        <div 
            className="front-matter-table my-2 rounded-md border border-border bg-card p-2 shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={onEdit}
            title="Click to edit front matter"
        >
            <table className="w-full text-sm pointer-events-none">
                <tbody>
                    {Object.entries(properties).map(([key, value]) => (
                        <tr key={key} className="border-b border-border last:border-0">
                            <td className="py-1 pr-4 font-semibold text-muted-foreground">{key}</td>
                            <td className="py-1 text-foreground">{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
