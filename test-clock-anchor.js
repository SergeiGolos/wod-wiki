#!/usr/bin/env node

// Test script for ClockAnchor component with provided RuntimeSpan data
const testData = {
    "blockId": "tq7f9meksko",
    "blockKey": "0(0)",
    "index": 0,
    "timeSpans": [
        {
            "start": {
                "name": "block_started",
                "timestamp": "2025-06-01T22:39:10.071Z"
            }
        }
    ],
    "metrics": [
        {
            "sourceId": "0",
            "effort": "KB Swings",
            "values": [
                {
                    "type": "repetitions",
                    "value": 100,
                    "unit": "reps"
                },
                {
                    "type": "resistance",
                    "value": 70,
                    "unit": "lb"
                }
            ]
        }
    ],
    "leaf": true
};

// Test the calculation logic
function calculateDuration(span) {
    if (!span?.timeSpans || span.timeSpans.length === 0) return undefined;
    
    const totalMs = span.timeSpans.reduce((total, timeSpan) => {
        const startTime = timeSpan.start?.timestamp;
        if (!startTime) return total;
        
        // Calculate elapsed time from timeSpans
        const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
        const stopTime = timeSpan.stop?.timestamp;
        const stopDate = stopTime 
            ? (typeof stopTime === 'string' ? new Date(stopTime) : stopTime)
            : new Date();
        
        return total + (stopDate.getTime() - startDate.getTime());
    }, 0);
    
    // Convert milliseconds to Duration-like object
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = totalMs % 1000;
    
    return {
        days: 0,
        hours,
        minutes,
        seconds,
        milliseconds
    };
}

// Test extraction of effort
function extractEffort(span, showEffort = true) {
    return showEffort ? span?.metrics?.[0]?.effort : undefined;
}

console.log('=== Testing ClockAnchor with provided data ===');
console.log('Start time:', testData.timeSpans[0].start.timestamp);
console.log('Current time:', new Date().toISOString());

const duration = calculateDuration(testData);
console.log('Calculated duration:', JSON.stringify(duration, null, 2));

const effort = extractEffort(testData, true);
console.log('Extracted effort:', effort);

// Simulate elapsed time
const startTime = new Date(testData.timeSpans[0].start.timestamp);
const currentTime = new Date();
const elapsedMs = currentTime.getTime() - startTime.getTime();
console.log('Elapsed milliseconds:', elapsedMs);
console.log('Elapsed seconds:', Math.floor(elapsedMs / 1000));

console.log('=== Test completed ===');
