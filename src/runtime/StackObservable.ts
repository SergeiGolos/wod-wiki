import { IRuntimeBlock } from './IRuntimeBlock';

export type StackEventType = 'push' | 'pop' | 'clear';

export interface StackEvent {
    type: StackEventType;
    block?: IRuntimeBlock;
    stackDepth: number;
    timestamp: number;
}

export type StackSubscription = (event: StackEvent) => void;

export class StackObservable {
    private subscribers: Set<StackSubscription> = new Set();

    subscribe(callback: StackSubscription): () => void {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    notify(event: StackEvent): void {
        this.subscribers.forEach(sub => {
            try {
                sub(event);
            } catch (e) {
                console.error('Error in stack subscriber:', e);
            }
        });
    }
}
