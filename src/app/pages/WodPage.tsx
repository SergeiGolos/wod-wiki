import React from 'react';
import { useParams } from 'react-router-dom';
import { Workbench } from '@/components/layout/Workbench';
import { getWodContent } from '../wod-loader';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { WodNavigationStrategy } from '@/components/command-palette/strategies/WodNavigationStrategy';

export const WodPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const commandStrategy = useMemo(() => new WodNavigationStrategy(navigate), [navigate]);

    const content = id ? getWodContent(id) : undefined;

    if (!content) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p className="text-xl">WOD "{id}" not found.</p>
                </div>
            </div>
        );
    }

    return (
        <Workbench
            initialContent={content}
            mode="static"
            commandStrategy={commandStrategy}
        />
    );
};
