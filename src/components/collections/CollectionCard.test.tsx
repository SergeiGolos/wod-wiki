import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { CollectionCard } from './CollectionCard';
import type { WodCollectionItem } from '@/repositories/wod-collections';

describe('CollectionCard', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const mockItem: WodCollectionItem = {
    id: 'test-id',
    name: 'Test Workout',
    content: '---\nDifficulty: beginner\nCategory: Cardio\n---\n## Description\nA great workout for beginners.',
  };

  describe('Basic rendering', () => {
    it('renders workout name as title', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      render(<CollectionCard item={mockItem} collectionName="Cardio" collectionId="cardio" onClick={onClick} />);

      expect(screen.getByText('Test Workout')).toBeDefined();
    });

    it('renders collection name with Tag icon', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const { container } = render(
        <CollectionCard item={mockItem} collectionName="Cardio" collectionId="cardio" onClick={onClick} />
      );

      // Find the collection name in the specific container (not in badges)
      const collectionLabel = container.querySelector('.text-muted-foreground\\/70');
      expect(collectionLabel?.textContent).toContain('Cardio');

      const tagIcon = container.querySelector('.lucide-tag');
      expect(tagIcon).toBeTruthy();
    });

    it('renders ChevronRight icon', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const { container } = render(
        <CollectionCard item={mockItem} collectionName="Cardio" collectionId="cardio" onClick={onClick} />
      );

      const chevron = container.querySelector('.lucide-chevron-right');
      expect(chevron).toBeTruthy();
    });
  });

  describe('Frontmatter parsing', () => {
    it('extracts difficulty from frontmatter', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemWithDifficulty: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: advanced\n---\nContent here',
      };

      render(<CollectionCard item={itemWithDifficulty} collectionName="Test" collectionId="test" onClick={onClick} />);

      expect(screen.getByText('advanced')).toBeDefined();
    });

    it('extracts category from frontmatter', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemWithCategory: WodCollectionItem = {
        ...mockItem,
        content: '---\nCategory: Strength\n---\nContent here',
      };

      render(<CollectionCard item={itemWithCategory} collectionName="Test" collectionId="test" onClick={onClick} />);

      expect(screen.getByText('Strength')).toBeDefined();
    });

    it('extracts type from frontmatter', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemWithType: WodCollectionItem = {
        ...mockItem,
        content: '---\nType: AMRAP\n---\nContent here',
      };

      render(<CollectionCard item={itemWithType} collectionName="Test" collectionId="test" onClick={onClick} />);

      expect(screen.getByText('AMRAP')).toBeDefined();
    });

    it('handles lowercase frontmatter keys', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemLowercase: WodCollectionItem = {
        ...mockItem,
        content: '---\ndifficulty: intermediate\ncategory: flexibility\n---\nContent here',
      };

      render(<CollectionCard item={itemLowercase} collectionName="Test" collectionId="test" onClick={onClick} />);

      expect(screen.getByText('intermediate')).toBeDefined();
      expect(screen.getByText('flexibility')).toBeDefined();
    });

    it('handles mixed case frontmatter keys', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemMixedCase: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: elite\ncategory: Gymnastics\n---\nContent here',
      };

      render(<CollectionCard item={itemMixedCase} collectionName="Test" collectionId="test" onClick={onClick} />);

      expect(screen.getByText('elite')).toBeDefined();
      expect(screen.getByText('Gymnastics')).toBeDefined();
    });

    it('handles content without frontmatter', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemNoFrontmatter: WodCollectionItem = {
        ...mockItem,
        content: 'Just plain content without frontmatter',
      };

      const { container } = render(
        <CollectionCard item={itemNoFrontmatter} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      // Should still render the card
      expect(screen.getByText('Test Workout')).toBeDefined();

      // Should not render metadata badges
      const badges = container.querySelectorAll('.rounded-full');
      expect(badges.length).toBe(0);
    });
  });

  describe('Description extraction', () => {
    it('extracts description from ## Description section', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemWithDescription: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: beginner\n---\n## Description\nThis is a detailed description of the workout.\nIt spans multiple lines.',
      };

      render(<CollectionCard item={itemWithDescription} collectionName="Test" collectionId="test" onClick={onClick} />);

      expect(screen.getByText(/This is a detailed description/)).toBeDefined();
    });

    it('truncates description to 160 characters', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const longDescription = 'A'.repeat(200);
      const itemWithLongDescription: WodCollectionItem = {
        ...mockItem,
        content: `---\nDifficulty: beginner\n---\n## Description\n${longDescription}`,
      };

      const { container } = render(
        <CollectionCard item={itemWithLongDescription} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const descriptionElement = container.querySelector('.line-clamp-2');
      expect(descriptionElement?.textContent?.length).toBeLessThanOrEqual(160);
    });

    it('extracts first non-header line when no Description section', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemWithoutDescriptionSection: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: beginner\n---\nSome content here\nMore content',
      };

      render(
        <CollectionCard item={itemWithoutDescriptionSection} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      expect(screen.getByText('Some content here')).toBeDefined();
    });

    it('does not render description when content is empty', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemEmptyContent: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: beginner\n---',
      };

      const { container } = render(
        <CollectionCard item={itemEmptyContent} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const descriptionElement = container.querySelector('.line-clamp-2');
      expect(descriptionElement).toBeNull();
    });
  });

  describe('Difficulty color mapping', () => {
    it('applies green color for beginner difficulty', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemBeginner: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: beginner\n---\nContent',
      };

      const { container } = render(
        <CollectionCard item={itemBeginner} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const difficultyBadge = screen.getByText('beginner');
      expect(difficultyBadge.className).toContain('bg-green-100');
      expect(difficultyBadge.className).toContain('text-green-700');
    });

    it('applies yellow color for intermediate difficulty', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemIntermediate: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: intermediate\n---\nContent',
      };

      const { container } = render(
        <CollectionCard item={itemIntermediate} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const difficultyBadge = screen.getByText('intermediate');
      expect(difficultyBadge.className).toContain('bg-yellow-100');
      expect(difficultyBadge.className).toContain('text-yellow-700');
    });

    it('applies red color for advanced difficulty', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemAdvanced: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: advanced\n---\nContent',
      };

      const { container } = render(
        <CollectionCard item={itemAdvanced} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const difficultyBadge = screen.getByText('advanced');
      expect(difficultyBadge.className).toContain('bg-red-100');
      expect(difficultyBadge.className).toContain('text-red-700');
    });

    it('applies purple color for elite difficulty', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemElite: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: elite\n---\nContent',
      };

      const { container } = render(
        <CollectionCard item={itemElite} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const difficultyBadge = screen.getByText('elite');
      expect(difficultyBadge.className).toContain('bg-purple-100');
      expect(difficultyBadge.className).toContain('text-purple-700');
    });

    it('applies default color for unknown difficulty', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemUnknown: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: unknown-level\n---\nContent',
      };

      const { container } = render(
        <CollectionCard item={itemUnknown} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const difficultyBadge = screen.getByText('unknown-level');
      expect(difficultyBadge.className).toContain('bg-muted');
      expect(difficultyBadge.className).toContain('text-muted-foreground');
    });
  });

  describe('Metadata badges', () => {
    it('renders category badge with correct styling', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemWithCategory: WodCollectionItem = {
        ...mockItem,
        content: '---\nCategory: Cardio\n---\nContent',
      };

      const { container } = render(
        <CollectionCard item={itemWithCategory} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const categoryBadge = screen.getByText('Cardio');
      expect(categoryBadge.className).toContain('bg-primary/10');
      expect(categoryBadge.className).toContain('text-primary');
    });

    it('renders type badge with correct styling', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemWithType: WodCollectionItem = {
        ...mockItem,
        content: '---\nType: HIIT\n---\nContent',
      };

      const { container } = render(
        <CollectionCard item={itemWithType} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const typeBadge = screen.getByText('HIIT');
      expect(typeBadge.className).toContain('bg-secondary');
      expect(typeBadge.className).toContain('text-secondary-foreground');
    });

    it('renders multiple metadata badges', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemWithMultiple: WodCollectionItem = {
        ...mockItem,
        content: '---\nCategory: Strength\nType: AMRAP\nDifficulty: advanced\n---\nContent',
      };

      render(<CollectionCard item={itemWithMultiple} collectionName="Test" collectionId="test" onClick={onClick} />);

      expect(screen.getByText('Strength')).toBeDefined();
      expect(screen.getByText('AMRAP')).toBeDefined();
      expect(screen.getByText('advanced')).toBeDefined();
    });
  });

  describe('Click handling', () => {
    it('calls onClick when card is clicked', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const { container } = render(
        <CollectionCard item={mockItem} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const cardButton = container.querySelector('button');
      expect(cardButton).toBeTruthy();

      fireEvent.click(cardButton!);

      expect(clicked).toBe(true);
    });

    it('is clickable as a button element', () => {
      let clicked = false;

      const onClick = () => {
        clicked = true;
      };

      const { container } = render(
        <CollectionCard item={mockItem} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const cardButton = container.querySelector('button');
      expect(cardButton).toBeTruthy();

      fireEvent.click(cardButton!);

      expect(clicked).toBe(true);
    });
  });

  describe('Styling and layout', () => {
    it('applies custom className', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const { container } = render(
        <CollectionCard item={mockItem} collectionName="Test" collectionId="test" onClick={onClick} className="custom-class" />
      );

      const cardButton = container.querySelector('.custom-class');
      expect(cardButton).toBeTruthy();
    });

    it('applies hover effects', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const { container } = render(
        <CollectionCard item={mockItem} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const cardButton = container.querySelector('button');
      expect(cardButton?.className).toContain('hover:border-primary/50');
      expect(cardButton?.className).toContain('hover:shadow-sm');
    });

    it('applies transition classes', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const { container } = render(
        <CollectionCard item={mockItem} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const cardButton = container.querySelector('button');
      expect(cardButton?.className).toContain('transition-all');
    });

    it('animates chevron on hover', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const { container } = render(
        <CollectionCard item={mockItem} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      const chevron = container.querySelector('.lucide-chevron-right');
      // For SVG elements, getAttribute returns the actual class string
      const chevronClasses = chevron?.getAttribute('class') || '';
      expect(chevronClasses).toMatch(/group-hover:translate-x-0\.5/);
    });
  });

  describe('Edge cases', () => {
    it('handles content with empty frontmatter', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemEmptyFrontmatter: WodCollectionItem = {
        ...mockItem,
        content: '---\n---\nContent here',
      };

      const { container } = render(
        <CollectionCard item={itemEmptyFrontmatter} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      // Should still render
      expect(screen.getByText('Test Workout')).toBeDefined();
    });

    it('handles content with only frontmatter and no description', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemOnlyFrontmatter: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: beginner\n---',
      };

      const { container } = render(
        <CollectionCard item={itemOnlyFrontmatter} collectionName="Test" collectionId="test" onClick={onClick} />
      );

      // Should render without description
      expect(screen.getByText('Test Workout')).toBeDefined();
      const descriptionElement = container.querySelector('.line-clamp-2');
      expect(descriptionElement).toBeNull();
    });

    it('handles special characters in content', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const itemWithSpecialChars: WodCollectionItem = {
        ...mockItem,
        content: '---\nDifficulty: beginner\n---\n## Description\nWorkout with **bold** and *italic* text.',
      };

      render(<CollectionCard item={itemWithSpecialChars} collectionName="Test" collectionId="test" onClick={onClick} />);

      // Should strip markdown and render text
      expect(screen.getByText(/Workout with bold and italic text/)).toBeDefined();
    });

    it('handles very long workout names', () => {
      let clicked = false;
      const onClick = () => {
        clicked = true;
      };

      const longName = 'A'.repeat(200);
      const itemWithLongName: WodCollectionItem = {
        ...mockItem,
        name: longName,
        content: '---\nDifficulty: beginner\n---\nContent',
      };

      render(<CollectionCard item={itemWithLongName} collectionName="Test" collectionId="test" onClick={onClick} />);

      // Should still render the full name
      expect(screen.getByText(longName)).toBeDefined();
    });
  });
});
