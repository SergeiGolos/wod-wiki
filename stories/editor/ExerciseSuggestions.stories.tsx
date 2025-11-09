import type { Meta, StoryObj } from '@storybook/react';
import { WodWiki } from '../../src/editor/WodWiki';
import { useState } from 'react';
import { IScript } from '../../src/WodScript';

/**
 * Exercise Suggestions Story Component
 * 
 * Demonstrates the intelligent exercise typeahead system with:
 * - Real-time suggestions as you type
 * - Equipment, muscle, and difficulty metadata with icons
 * - Hover documentation with rich exercise details
 * - Debounced search (150ms delay)
 * - Minimum 2-character query requirement
 */
const ExerciseSuggestionsStory = ({ initialText, instructions }: { initialText: string; instructions: string }) => {
  const [script, setScript] = useState<IScript | undefined>(undefined);

  const handleValueChange = (newScript?: IScript) => {
    setScript(newScript);
  };

  return (
    <div className="p-6 font-sans max-w-4xl mx-auto">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 How to Test Exercise Suggestions</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>{instructions}</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Suggestions:</strong> Type 2+ characters (e.g., "barb", "push", "squat")</li>
            <li><strong>Icons:</strong> 🏋️ Equipment • 💪 Muscles • ⭐ Difficulty</li>
            <li><strong>Hover:</strong> Hover over exercise names for full details</li>
            <li><strong>Selection:</strong> Click or press Enter to insert exercise name</li>
          </ul>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg shadow-md overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <h4 className="text-sm font-semibold text-gray-700">Workout Editor</h4>
        </div>
        <div className="bg-white" style={{ minHeight: '300px' }}>
          <WodWiki 
            id="exercise-suggestions-editor" 
            code={initialText} 
            onValueChange={handleValueChange} 
          />
        </div>
      </div>

      {script && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Parsed Workout</h4>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(script, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const meta: Meta<typeof ExerciseSuggestionsStory> = {
  title: 'Editor/Exercise Suggestions',
  component: ExerciseSuggestionsStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Exercise Suggestion System

The exercise suggestion system provides intelligent typeahead completions for 873+ exercises with rich metadata and hover documentation.

## Features

- **Real-time Search**: Debounced search (150ms) across exercise names and search terms
- **Rich Metadata**: Equipment 🏋️, muscles 💪, difficulty ⭐ displayed inline
- **Hover Documentation**: Full exercise details on hover (muscles, equipment, instructions)
- **Smart Ranking**: Exact matches ranked higher than partial matches
- **LRU Caching**: 100-exercise cache for fast repeat access
- **Performance**: Search < 100ms, index load < 500ms

## How It Works

1. **Type 2+ characters** to trigger suggestions
2. **Wait 150ms** for debounced search to execute
3. **Browse suggestions** with arrow keys
4. **Hover** over suggestions to see full exercise details
5. **Select** with click or Enter to insert exercise name

## Architecture

- **ExerciseIndexManager**: Singleton managing 873 exercises, localStorage cache
- **ExerciseSearchEngine**: Debounced search with equipment/muscle/difficulty filtering
- **ExerciseSuggestionProvider**: Monaco CompletionItemProvider integration
- **ExerciseHoverProvider**: Monaco HoverProvider for rich documentation
        `
      }
    }
  },
  argTypes: {
    initialText: {
      description: 'Initial text in the editor',
      control: 'text'
    },
    instructions: {
      description: 'Instructions for this specific story',
      control: 'text'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ExerciseSuggestionsStory>;

/**
 * Basic Example: Empty editor ready for suggestions
 * Try typing "barbell", "push", "squat", or "deadlift"
 */
export const BasicSuggestions: Story = {
  args: {
    initialText: '',
    instructions: 'Start typing an exercise name in the editor below. Try "barb" for barbell exercises, "push" for push-ups, or "squat" for squat variations.'
  }
};

/**
 * Barbell Exercises: Pre-filled with partial barbell query
 * Demonstrates suggestions for barbell equipment
 */
export const BarbellExercises: Story = {
  args: {
    initialText: 'barb',
    instructions: 'The editor is pre-filled with "barb". Wait a moment for suggestions to appear, showing barbell exercises with equipment icons 🏋️.'
  }
};

/**
 * Push-Up Variations: Search for bodyweight push exercises
 * Shows how bodyweight exercises are indicated
 */
export const PushUpVariations: Story = {
  args: {
    initialText: 'push',
    instructions: 'Pre-filled with "push". Suggestions will show various push-up variations with bodyweight indicator 🧍.'
  }
};

/**
 * Squat Exercises: Multiple equipment types
 * Demonstrates filtering and ranking
 */
export const SquatExercises: Story = {
  args: {
    initialText: 'squat',
    instructions: 'Pre-filled with "squat". Notice how exact matches (Squat, Air Squat) rank higher than partial matches (Bulgarian Split Squat).'
  }
};

/**
 * Workout Context: Exercise suggestions within a workout script
 * Shows suggestions work in realistic workout scenarios
 */
export const WorkoutContext: Story = {
  args: {
    initialText: `AMRAP 20:00
  5 
  10 Push-Ups
  15 Air Squats`,
    instructions: 'A workout script with exercises. Click after "5 " on line 2 and start typing an exercise name to see suggestions in context.'
  }
};

/**
 * Hover Documentation: Demonstrates rich hover cards
 * Pre-filled with complete exercise names to test hovering
 */
export const HoverDocumentation: Story = {
  args: {
    initialText: `Barbell Squat
Deadlift
Push-Up
Pull-Up`,
    instructions: 'Hover over any exercise name to see rich documentation including muscles, equipment, difficulty, and instructions. Full exercise data loads on demand.'
  }
};

/**
 * Equipment Filtering: Cable machine exercises
 * Shows equipment-specific icon usage
 */
export const CableMachineExercises: Story = {
  args: {
    initialText: 'cable',
    instructions: 'Pre-filled with "cable". Suggestions show cable machine exercises with 🔗 icon. Try also: "machine", "dumbbell", "kettlebell".'
  }
};

/**
 * Muscle-Specific Search: Chest exercises
 * Demonstrates muscle group filtering
 */
export const ChestExercises: Story = {
  args: {
    initialText: 'chest',
    instructions: 'Pre-filled with "chest". Suggestions show exercises targeting chest muscles with 💪 indicator and muscle group metadata.'
  }
};

/**
 * Difficulty Levels: Beginner exercises
 * Shows difficulty icons and filtering
 */
export const BeginnerExercises: Story = {
  args: {
    initialText: 'beginner',
    instructions: 'Pre-filled with "beginner". Suggestions show beginner-level exercises with ⭐ icon (1 star = beginner, 2 = intermediate, 3 = advanced).'
  }
};

/**
 * Performance Test: Rapid typing simulation
 * Tests debouncing and performance
 */
export const PerformanceTest: Story = {
  args: {
    initialText: '',
    instructions: 'Type rapidly (e.g., "barbellsquat" all at once). Debouncing ensures only one search executes after you stop typing (150ms delay).'
  }
};

/**
 * No Results: Invalid query
 * Shows behavior when no exercises match
 */
export const NoResults: Story = {
  args: {
    initialText: 'xyzabc123',
    instructions: 'Pre-filled with gibberish text. No suggestions appear because no exercises match. Try replacing with a real exercise name.'
  }
};

/**
 * Short Query: 1-character query
 * Demonstrates minimum 2-character requirement
 */
export const ShortQuery: Story = {
  args: {
    initialText: 'p',
    instructions: 'Pre-filled with single character "p". No suggestions appear (minimum 2 characters required). Add another character to trigger suggestions.'
  }
};
