import React, { useState } from 'react';
import { HistoryLayout } from '@/components/history/HistoryLayout';
import { CalendarWidget } from '@/components/history/CalendarWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const FeedPage: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    return (
        <HistoryLayout>
            <div className="p-6 h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Activity Feed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Coming Soon: A consolidated view of all your workouts, PRs, and notes in a calendar format.
                            </p>

                            <div className="flex justify-center border rounded-md p-4 bg-background w-fit mx-auto">
                                <CalendarWidget
                                    currentDate={currentDate}
                                    onDateChange={setCurrentDate}
                                    onDateSelect={(date) => setSelectedDate(date)}
                                    selectedDates={selectedDate ? new Set([selectedDate.toISOString().split('T')[0]]) : new Set()}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Placeholders for feed items */}
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="opacity-50">
                                <CardHeader>
                                    <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="h-3 w-full bg-muted rounded animate-pulse" />
                                        <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </HistoryLayout>
    );
};
