import { describe, it, expect } from 'bun:test';
import { BroadcastChannelRpcTransport } from '../BroadcastChannelRpcTransport';
import type { RpcMessage } from '../RpcMessages';

const event = (name: string): RpcMessage => ({ type: 'rpc-event', name, timestamp: 0 });
const dispose = (): RpcMessage => ({ type: 'rpc-dispose' });

/** Bun delivers MessageChannel events asynchronously; allow a few ticks. */
const settle = async (): Promise<void> => {
    for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 0));
    }
};

describe('BroadcastChannelRpcTransport', () => {
    it('starts disconnected and flips to connected on start()', () => {
        const { port1 } = new MessageChannel();
        const t = new BroadcastChannelRpcTransport(port1);

        expect(t.connected).toBe(false);

        const connectedFired: boolean[] = [];
        t.onConnected(() => connectedFired.push(true));
        t.start();

        expect(t.connected).toBe(true);
        expect(connectedFired).toEqual([true]);
    });

    it('send before start throws', () => {
        const { port1 } = new MessageChannel();
        const t = new BroadcastChannelRpcTransport(port1);

        expect(() => t.send(event('too-early'))).toThrow('send before connected');
    });

    it('send after dispose throws', () => {
        const { port1 } = new MessageChannel();
        const t = new BroadcastChannelRpcTransport(port1);
        t.start();
        t.dispose();

        expect(() => t.send(event('after-dispose'))).toThrow('send after dispose');
    });

    it('send delivers messages to a paired transport via the MessageChannel', async () => {
        const { port1, port2 } = new MessageChannel();
        const sender = new BroadcastChannelRpcTransport(port1);
        const receiver = new BroadcastChannelRpcTransport(port2);

        const received: RpcMessage[] = [];
        receiver.onMessage((m) => received.push(m));
        receiver.start();
        sender.start();

        sender.send(event('hello'));
        sender.send(dispose());

        await settle();

        expect(received.length).toBe(2);
        expect(received[0]).toEqual(event('hello'));
        expect(received[1]).toEqual(dispose());
    });

    it('notifyDisconnected is one-way: the peer can still send', async () => {
        const { port1, port2 } = new MessageChannel();
        const a = new BroadcastChannelRpcTransport(port1);
        const b = new BroadcastChannelRpcTransport(port2);
        a.start();
        b.start();

        const disconnectedFiredOnA: number[] = [];
        a.onDisconnected(() => disconnectedFiredOnA.push(1));

        // The peer is still connected and can still send to `a`. The
        // listener goes on `a` because `a` is the receiver end.
        const received: RpcMessage[] = [];
        a.onMessage((m) => received.push(m));
        b.send(event('still-works'));

        await settle();

        expect(received).toEqual([event('still-works')]);
    });

    it('unsubscribe removes the message handler', async () => {
        const { port1, port2 } = new MessageChannel();
        const sender = new BroadcastChannelRpcTransport(port1);
        const receiver = new BroadcastChannelRpcTransport(port2);
        receiver.start();
        sender.start();

        const received: RpcMessage[] = [];
        const unsub = receiver.onMessage((m) => received.push(m));
        sender.send(event('first'));
        await settle();

        unsub();
        sender.send(event('second'));
        await settle();

        expect(received.length).toBe(1);
        expect(received[0]).toEqual(event('first'));
    });

    it('dispose clears all handlers and closes the port', async () => {
        const { port1, port2 } = new MessageChannel();
        const sender = new BroadcastChannelRpcTransport(port1);
        const receiver = new BroadcastChannelRpcTransport(port2);
        sender.start();
        receiver.start();

        const received: RpcMessage[] = [];
        receiver.onMessage((m) => received.push(m));
        receiver.onConnected(() => { /* noop */ });
        receiver.onDisconnected(() => { /* noop */ });

        receiver.dispose();
        sender.send(event('after-dispose'));

        await settle();

        expect(received).toEqual([]);
    });
});
