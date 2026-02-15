import React, { useMemo } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useTutorialStore, TutorialType } from '@/hooks/useTutorialStore';
import { useTheme } from '@/components/theme/ThemeProvider';

export const HelpTutorial: React.FC = () => {
    const { activeTutorial, run, stopTutorial } = useTutorialStore();
    const { theme } = useTheme();

    const steps = useMemo<Record<TutorialType, Step[]>>(() => ({
        history: [
            {
                target: '#tutorial-header',
                content: 'Welcome to WOD.WIKI! This is the History view where you can see all your workouts.',
                placement: 'bottom',
                disableBeacon: true,
            },
            {
                target: '#tutorial-filters',
                content: 'Use the sidebar to filter your workouts by date or notebook.',
                placement: 'right',
            },
            {
                target: '#tutorial-new-workout',
                content: 'Ready to start? Click here to create a new workout entry.',
                placement: 'bottom',
            }
        ],
        plan: [
            {
                target: '#tutorial-header',
                content: 'This is the Plan view. Here you can write and edit your workout definitions.',
                placement: 'bottom',
                disableBeacon: true,
            },
            {
                target: '#tutorial-editor',
                content: 'Use the block editor to structure your workout. It understands special syntax for exercises and timers.',
                placement: 'right',
            },
            {
                target: '#tutorial-view-mode-track',
                content: 'Once your plan is ready, switch to Track mode to start the workout.',
                placement: 'bottom',
            }
        ],
        track: [
            {
                target: '#tutorial-header',
                content: 'Time to sweat! The Track view helps you execute your workout.',
                placement: 'bottom',
                disableBeacon: true,
            },
            {
                target: '#tutorial-track-visual',
                content: 'The visualizer shows your progress through the workout sections and upcoming movements.',
                placement: 'right',
            },
            {
                target: '#tutorial-track-clock',
                content: 'Here is the clock and controls. Start, pause, or skip through segments as you work out.',
                placement: 'left',
            },
            {
                target: '#tutorial-view-mode-review',
                content: 'Finished your workout? Head over to Review to see your performance.',
                placement: 'bottom',
            }
        ],
        review: [
            {
                target: '#tutorial-header',
                content: 'Great job! Analyze your performance in the Review view.',
                placement: 'bottom',
                disableBeacon: true,
            },
            {
                target: '#tutorial-review-grid',
                content: 'This grid shows a detailed breakdown of your workout stats and comparisons.',
                placement: 'top',
            },
            {
                target: '#tutorial-details',
                content: 'You can always check the note details and tags from here.',
                placement: 'left',
            }
        ]
    }), []);

    const activeSteps = activeTutorial ? steps[activeTutorial] : [];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            stopTutorial();
        }
    };

    if (!activeTutorial) return null;

    const isDark = theme === 'dark';

    return (
        <Joyride
            steps={activeSteps}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#3b82f6', // blue-500
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    textColor: isDark ? '#f3f4f6' : '#1f2937',
                    arrowColor: isDark ? '#1f2937' : '#ffffff',
                },
                tooltip: {
                    borderRadius: '8px',
                    fontSize: '14px',
                },
                buttonNext: {
                    borderRadius: '4px',
                },
                buttonBack: {
                    marginRight: '8px',
                }
            }}
        />
    );
};
