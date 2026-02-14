import React from 'react';
import { Plus, AlignLeft, ListTodo, ScrollText, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NewSectionType } from './SectionAddBar';

export interface SectionSeparatorProps {
    /** Called when the user picks a section type to add */
    onAdd: (type: NewSectionType) => void;
    /** Additional CSS classes */
    className?: string;
}

interface BubbleButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    colorClass?: string;
}

const BubbleButton: React.FC<BubbleButtonProps> = ({ icon, label, onClick, colorClass }) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border shadow-sm",
            "hover:bg-accent hover:border-primary/40 hover:scale-110 active:scale-95 transition-all",
            "text-[10px] font-medium text-muted-foreground hover:text-foreground",
            "whitespace-nowrap",
            "cursor-pointer"
        )}
        title={`Add ${label}`}
    >
        <span className={cn("w-3.5 h-3.5", colorClass)}>{icon}</span>
        <span>{label}</span>
    </button>
);

export const SectionSeparator: React.FC<SectionSeparatorProps> = ({
    onAdd,
    className,
}) => {
    return (
        <div
            className={cn(
                "group flex items-center justify-center relative h-4 overflow-visible transition-all duration-300 z-10 cursor-default",
                className
            )}
        >
            {/* Left Line */}
            <div className="flex-1 h-px bg-border/20 group-hover:bg-primary/30 transition-colors" />

            {/* Content Container */}
            <div className="relative flex items-center justify-center mx-2 min-w-[24px]">
                {/* Plus Icon (shown when not hovered) */}
                <div className={cn(
                    "w-6 h-6 rounded-full border border-border bg-background shadow-xs flex items-center justify-center",
                    "transition-all duration-300 absolute",
                    "group-hover:scale-0 group-hover:opacity-0 opacity-40 hover:opacity-100",
                    "pointer-events-auto cursor-pointer"
                )}>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                {/* Bubble Options (shown on hover) */}
                <div className={cn(
                    "flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto",
                    "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300",
                    "whitespace-nowrap h-8"
                )}>
                    <BubbleButton
                        icon={<AlignLeft className="w-full h-full" />}
                        label="Text"
                        onClick={() => onAdd('markdown')}
                    />
                    <BubbleButton
                        icon={<ListTodo className="w-full h-full" />}
                        label="WOD"
                        colorClass="text-blue-500"
                        onClick={() => onAdd('wod')}
                    />
                    <BubbleButton
                        icon={<ScrollText className="w-full h-full" />}
                        label="Log"
                        colorClass="text-emerald-500"
                        onClick={() => onAdd('log')}
                    />
                    <BubbleButton
                        icon={<ClipboardList className="w-full h-full" />}
                        label="Plan"
                        colorClass="text-purple-500"
                        onClick={() => onAdd('plan')}
                    />
                </div>
            </div>

            {/* Right Line */}
            <div className="flex-1 h-px bg-border/20 group-hover:bg-primary/30 transition-colors" />
        </div>
    );
};
