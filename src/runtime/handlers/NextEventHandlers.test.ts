import { describe, it, expect, vi } from 'vitest';
import { EffortNextHandler } from './EffortNextHandler';
import { GroupNextHandler } from './GroupNextHandler';
import { NextEvent } from '../events/NextEvent';
import { PopBlockAction } from '../actions/PopBlockAction';
import { EffortBlock } from '../blocks/EffortBlock';
import { TimedGroupBlock } from '../blocks/TimedGroupBlock';
import { BlockKey } from '../../BlockKey';

describe('NextEvent Handlers', () => {
    describe('EffortNextHandler', () => {
        it('should return a PopBlockAction when it handles a NextEvent', () => {
            // Arrange
            const handler = new EffortNextHandler();
            const block = new EffortBlock(new BlockKey('effort'), []);
            const event = new NextEvent();
            event.runtime = { stack: { current: block } } as any;

            // Act
            const response = handler.handleEvent(event, block);

            // Assert
            expect(response.handled).toBe(true);
            expect(response.shouldContinue).toBe(false);
            expect(response.actions[0]).toBeInstanceOf(PopBlockAction);
        });
    });

    describe('GroupNextHandler', () => {
        it('should return an AdvanceToNextChildAction if there is a next child', () => {
            // Arrange
            const handler = new GroupNextHandler();
            const block = new TimedGroupBlock(new BlockKey('group'), []);
            vi.spyOn(block, 'hasNextChild').mockReturnValue(true);
            const event = new NextEvent();
            event.runtime = { stack: { current: block } } as any;

            // Act
            const response = handler.handleEvent(event, block);

            // Assert
            expect(response.handled).toBe(true);
            expect(response.shouldContinue).toBe(false);
            expect(response.actions[0].type).toBe('AdvanceToNextChild');
        });

        it('should return a PopBlockAction if there is no next child', () => {
            // Arrange
            const handler = new GroupNextHandler();
            const block = new TimedGroupBlock(new BlockKey('group'), []);
            vi.spyOn(block, 'hasNextChild').mockReturnValue(false);
            const event = new NextEvent();
            event.runtime = { stack: { current: block } } as any;

            // Act
            const response = handler.handleEvent(event, block);

            // Assert
            expect(response.handled).toBe(true);
            expect(response.shouldContinue).toBe(false);
            expect(response.actions[0]).toBeInstanceOf(PopBlockAction);
        });
    });
});
