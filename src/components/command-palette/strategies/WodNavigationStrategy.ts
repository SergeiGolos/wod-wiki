import { useNavigate } from 'react-router-dom';
import { Command, CommandStrategy } from '../types';
import { getAllWodIds } from '@/app/wod-loader';

export class WodNavigationStrategy implements CommandStrategy {
    id = 'wod-navigation';
    placeholder = 'Search for a workout...';

    constructor(private navigate: ReturnType<typeof useNavigate>) { }

    getCommands(): Command[] {
        const wodIds = getAllWodIds();

        const notebookCommand: Command = {
            id: 'nav-notes',
            label: 'Go to My Notebook (Daily Log)',
            action: () => this.navigate('/notes'),
            group: 'Navigation',
            keywords: ['notebook', 'journal', 'log', 'daily'],
            shortcut: ['g', 'n']
        };

        const playgroundCommand: Command = {
            id: 'nav-home',
            label: 'Go to Playground',
            action: () => this.navigate('/'),
            group: 'Navigation',
            keywords: ['home', 'playground', 'root'],
            shortcut: ['g', 'h']
        };

        const wodCommands: Command[] = wodIds.map(id => ({
            id: `nav-wod-${id}`,
            label: `WOD: ${id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
            action: () => this.navigate(`/note/${id}`),
            group: 'Example Workouts',
            keywords: ['wod', 'workout', id]
        }));

        return [notebookCommand, playgroundCommand, ...wodCommands];
    }

    // No specialized input handling needed, standard filtering works fine
    handleInput = async (text: string) => {
        // If the user clicks enter or we trigger this, we might want to check if the text matches a command exactly?
        // Actually, CommandPalette handles selection via onSelect. 
        // handleInput is usually for *consuming* the input as data (like "rename file to X").
        // For navigation, we just want standard filtering + selection.
        // So return false to let the palette stay open? Or true to close?
        // If we want "text input" to do something, we implement this.
        // But for navigation, we don't need to handle raw text input as an action.
        return false;
    };
}
