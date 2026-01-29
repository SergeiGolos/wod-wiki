/**
 * IdleConfig - Configuration for idle blocks.
 * Preserved during behavior migration.
 */
export interface IdleConfig {
    id: string;
    label: string;
    popOnNext: boolean;
    popOnEvents: string[];
    buttonLabel: string;
    buttonAction: string;
}

// Stub class to prevent import errors if missed reference
export class IdleInjectionBehavior { }
