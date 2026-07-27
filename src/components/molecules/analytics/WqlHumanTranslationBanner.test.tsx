import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WqlHumanTranslationBanner } from './WqlHumanTranslationBanner';

afterEach(cleanup);

describe('WqlHumanTranslationBanner', () => {
  it('renders translation text and query code', () => {
    render(
      <WqlHumanTranslationBanner
        translation="Calculating total sum of volume for strength workouts."
        query="sum:totalVolume{discipline:strength}"
      />,
    );

    expect(screen.getByText('Human Translation')).toBeTruthy();
    expect(
      screen.getByText('Calculating total sum of volume for strength workouts.'),
    ).toBeTruthy();
    expect(screen.getByText('sum:totalVolume{discipline:strength}')).toBeTruthy();
  });

  it('triggers clipboard copy when copy button is clicked', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <WqlHumanTranslationBanner
        translation="Calculating average time in motion."
        query="avg:tis{}"
      />,
    );

    const copyBtn = screen.getByRole('button', { name: /copy wql query/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('avg:tis{}');
  });
});
