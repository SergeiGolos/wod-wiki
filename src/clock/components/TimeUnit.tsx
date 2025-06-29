import React from 'react';

interface TimeUnitProps {
    value: string;
    label: string;
}

export const TimeUnit: React.FC<TimeUnitProps> = ({ value, label }) => {
    return (
        <div className="flex flex-1 flex-col items-center gap-1 md:gap-2">
            <div className="flex h-12 w-12 md:h-20 md:w-20 flex-shrink-0 w-full items-center justify-center rounded-2xl bg-white shadow-lg">
                <p className="text-gray-900 text-2xl md:text-5xl font-bold ">{value}</p>
            </div>
            <p className="text-gray-600 text-xs font-medium leading-normal">{label}</p>
        </div>
    );
};
