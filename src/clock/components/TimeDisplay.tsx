import React, { FC } from "react";
import { TimeUnit } from "./TimeUnit";

export interface TimeValue {
    value: string;
    label: string;
}

interface TimeDisplayProps {
    timeUnits: TimeValue[];
}

export const TimeDisplay: FC<TimeDisplayProps> = ({ timeUnits }) => {
    return (
        <div className="flex gap-4 w-full max-w-xs">
            {timeUnits.map((unit, index) => (
                <React.Fragment key={index}>
                    <TimeUnit value={unit.value} label={unit.label} />
                    {index < timeUnits.length - 1 && (
                        <div className="flex items-center justify-center text-gray-400 text-4xl font-light -mt-5">:</div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};
