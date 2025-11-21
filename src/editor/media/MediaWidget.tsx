import React from 'react';

interface MediaWidgetProps {
    type: 'image' | 'youtube';
    url: string;
    alt?: string;
    onEdit?: () => void;
}

export const MediaWidget: React.FC<MediaWidgetProps> = ({ type, url, alt, onEdit }) => {
    const EditButton = () => (
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
            }}
            className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 bg-background/90 text-foreground px-2 py-1 rounded text-xs border border-border hover:bg-accent transition-opacity shadow-sm"
            title="Edit Markdown"
        >
            Edit
        </button>
    );

    if (type === 'youtube') {
        return (
            <div className="media-widget-youtube my-4 rounded-md overflow-hidden shadow-sm border border-border bg-black max-w-2xl mx-auto group relative">
                <EditButton />
                <div className="relative pb-[56.25%] h-0">
                    <iframe 
                        className="absolute top-0 left-0 w-full h-full"
                        src={url} 
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        );
    }

    return (
        <div className="media-widget-image my-2 flex flex-col items-center group relative">
            <EditButton />
            <img 
                src={url} 
                alt={alt || 'Markdown Image'} 
                className="max-w-full max-h-[500px] h-auto rounded-md shadow-sm border border-border"
                onError={(e) => {
                    // Show a placeholder or error state
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.insertAdjacentHTML('beforeend', `<span class="text-destructive text-sm">Failed to load image: ${url}</span>`);
                }}
            />
            {alt && <span className="text-xs text-muted-foreground mt-1">{alt}</span>}
        </div>
    );
};
