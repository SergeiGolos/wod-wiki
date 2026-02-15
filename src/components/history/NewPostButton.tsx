
import React, { useState } from 'react';
import { Plus, ChevronDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { cn } from '@/lib/utils';

interface NewPostButtonProps {
    onCreate: (date?: Date) => Promise<void>;
    className?: string;
}

export const NewPostButton: React.FC<NewPostButtonProps> = ({
    onCreate,
    className,
}) => {
    const [open, setOpen] = useState(false);

    // Handle direct click on the main "New" button (create for today)
    const handleMainClick = async () => {
        await onCreate();
    };

    // Handle date selection from calendar
    const handleDateSelect = async (date: Date) => {
        // Set to noon to avoid timezone edge cases, similar to CloneDateDropdown
        date.setHours(12, 0, 0, 0);
        setOpen(false);
        await onCreate(date);
    };

    return (
        <div className={cn("flex items-center", className)}>
            <Button
                variant="default"
                size="sm"
                onClick={handleMainClick}
                className="rounded-r-none gap-2 px-3 border-r border-primary-foreground/20"
            >
                <Plus className="h-4 w-4" />
                New
            </Button>

            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="default"
                        size="sm"
                        className="rounded-l-none px-2"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
                    <div className="p-2">
                        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Create on Date
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <CalendarDatePicker
                            onDateSelect={handleDateSelect}
                        // We could pass entryDates here if we want to show existing entries
                        // For now, let's keep it simple as requested
                        />
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
