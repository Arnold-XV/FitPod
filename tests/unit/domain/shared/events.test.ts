import { describe, it, expect } from 'vitest';
import { EventBus, eventBus } from '../events';

describe('EventBus', () => {
  it('should register and emit events', () => {
    const handler = vi.fn();
    eventBus.on('test-event', handler);
    eventBus.emit('test-event', { data: 'test' });
    expect(handler).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should handle multiple handlers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    eventBus.on('multi-event', handler1);
    eventBus.on('multi-event', handler2);
    eventBus.emit('multi-event', 'data');
    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');
  });
});