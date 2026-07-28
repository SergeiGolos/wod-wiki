import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StartHereShelf, type StartHereWorkout } from './StartHereShelf';

const WORKOUTS: StartHereWorkout[] = [
  {
    id: 'fran',
    name: 'Fran',
    description: 'Sprint benchmark.',
    category: 'crossfit-girls',
    categoryLabel: 'Crossfit Girls',
    content: '```wod\n(21-15-9)\n  Thrusters\n  Pullups\n```',
  },
  {
    id: 'cindy',
    name: 'Cindy',
    description: 'Bodyweight endurance.',
    category: 'crossfit-girls',
    categoryLabel: 'Crossfit Girls',
    content: '```wod\n20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats\n```',
  },
  {
    id: 'annie',
    name: 'Annie',
    description: 'Double-under skill.',
    category: 'crossfit-girls',
    categoryLabel: 'Crossfit Girls',
    content: '```wod\n(50-40-30-20-10)\n  Double-Unders\n  Situps\n```',
  },
];

describe('StartHereShelf', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders heading and three workout cards', () => {
    render(<StartHereShelf workouts={WORKOUTS} onPlay={() => {}} />);

    expect(screen.getByRole('heading', { name: /start here/i })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /play/i })).toHaveLength(3);

    for (const workout of WORKOUTS) {
      expect(screen.getByText(workout.name)).toBeTruthy();
      expect(screen.getByText(workout.description)).toBeTruthy();
    }
  });

  it('fires onPlay with the selected workout', () => {
    const onPlay = mock(() => {});
    render(<StartHereShelf workouts={WORKOUTS} onPlay={onPlay} />);

    const franButton = screen.getAllByRole('button', { name: /play/i })[0];
    fireEvent.click(franButton);

    expect(onPlay).toHaveBeenCalledWith(WORKOUTS[0]);
  });

  it('disables Play when a workout has no runnable block', () => {
    const onPlay = mock(() => {});
    const broken = [{ ...WORKOUTS[0], content: 'No wod block here.' }];
    render(<StartHereShelf workouts={broken} onPlay={onPlay} />);

    const button = screen.getByRole('button', { name: /play/i });
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
