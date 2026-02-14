import { useNavigate } from 'react-router-dom';
import { Command, CommandStrategy } from '../types';
import { getAllWodIds } from '@/app/wod-loader';
import { planPath } from '@/lib/routes';

export class WodNavigationStrategy implements CommandStrategy {
    id = 'wod-navigation';
    placeholder = 'Search for a workout...';

    constructor(private navigate: ReturnType<typeof useNavigate>) { }

    getCommands(): Command[] {
        const wodIds = getAllWodIds();

        const notebookCommand: Command = {
            id: 'nav-notes',
            label: 'Go to My Notebook (History)',
            action: () => this.navigate('/'),
            group: 'Navigation',
            keywords: ['notebook', 'journal', 'log', 'daily', 'history'],
            shortcut: ['g', 'n']
        };

        const playgroundCommand: Command = {
            id: 'nav-home',
            label: 'Go to Playground',
            action: () => this.navigate('/playground'),
            group: 'Navigation',
            keywords: ['home', 'playground', 'root'],
            shortcut: ['g', 'h']
        };

        const wodCommands: Command[] = wodIds.map(id => ({
            id: `nav-wod-${id}`,
            label: `WOD: ${id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
            action: () => this.navigate(planPath(id)),
            group: 'Example Workouts',
            keywords: ['wod', 'workout', id]
        }));

        return [notebookCommand, playgroundCommand, ...wodCommands];
    }

    // No specialized input handling needed, standard filtering works fine
}
