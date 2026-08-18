export interface RuntimeButton {
    id: string;
    label?: string;
    icon?: 'play' | 'pause' | 'stop' | 'next' | 'check' | 'analytics' | 'x';
    action: string; // Event name to emit
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
    color?: string; // specific color class if needed (e.g. 'bg-green-600')
    disabled?: boolean;
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export interface RuntimeControls {
    buttons: RuntimeButton[];
    displayMode?: 'timer' | 'clock';
}
