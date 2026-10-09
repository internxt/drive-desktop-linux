import { logger } from '@internxt/drive-desktop-core/build/backend';
import { DomainEvent, DomainEventClass } from '../../../shared/domain/DomainEvent';
import { DomainEventSubscriber } from '../../../shared/domain/DomainEventSubscriber';
import { NodeJsEventBus } from './NodeJsEventBus';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';

class TestEvent extends DomainEvent {
  static readonly EVENT_NAME = 'test.event';

  constructor(aggregateId: string) {
    super({ eventName: TestEvent.EVENT_NAME, aggregateId });
  }

  toPrimitives() {
    return {};
  }
}

/** A subscriber whose `on` resolves only when the test says so. */
function subscriberThat(behaviour: (event: DomainEvent) => Promise<void>): DomainEventSubscriber<DomainEvent> {
  return {
    subscribedTo(): DomainEventClass[] {
      return [TestEvent as unknown as DomainEventClass];
    },
    on: behaviour,
  } as unknown as DomainEventSubscriber<DomainEvent>;
}

describe('NodeJsEventBus', () => {
  it('waits for its subscribers before resolving', async () => {
    const bus = new NodeJsEventBus();

    let release: () => void = () => undefined;
    let finished = false;

    bus.addSubscribers([
      subscriberThat(async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        finished = true;
      }),
    ]);

    const published = bus.publish([new TestEvent('aggregate-1')]);

    // The subscriber is still running, so publish must NOT have resolved. Without
    // this the test would pass against an implementation that never waits.
    let resolvedEarly = false;
    void published.then(() => {
      resolvedEarly = !finished;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(finished).toBe(false);

    release();
    await published;

    expect(finished).toBe(true);
    expect(resolvedEarly).toBe(false);
  });

  it('does not reject when a subscriber fails, and logs it instead', async () => {
    const bus = new NodeJsEventBus();
    const loggerError = partialSpyOn(logger, 'error');
    const failure = new Error('subscriber exploded');

    bus.addSubscribers([subscriberThat(async () => Promise.reject(failure))]);

    // publish must stay a non-throwing contract: FileCreator publishes AFTER the
    // file is persisted, inside the try/catch that reports upload failures, so a
    // rejection here would report a created file as a failed upload.
    await expect(bus.publish([new TestEvent('aggregate-2')])).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith(expect.objectContaining({ error: failure }));
  });

  it('still delivers one event to every subscriber of it', async () => {
    const bus = new NodeJsEventBus();
    const seen: Array<string> = [];

    bus.addSubscribers([
      subscriberThat(async () => {
        seen.push('first');
      }),
      subscriberThat(async () => {
        seen.push('second');
      }),
    ]);

    await bus.publish([new TestEvent('aggregate-3')]);

    expect(seen).toStrictEqual(['first', 'second']);
  });

  it('delivers several events in the order they were published', async () => {
    const bus = new NodeJsEventBus();
    const seen: Array<string> = [];

    bus.addSubscribers([
      subscriberThat(async (event: DomainEvent) => {
        await new Promise((resolve) => setImmediate(resolve));
        seen.push(event.aggregateId);
      }),
    ]);

    await bus.publish([new TestEvent('one'), new TestEvent('two'), new TestEvent('three')]);

    expect(seen).toStrictEqual(['one', 'two', 'three']);
  });

  it('does not reject when a subscriber throws synchronously', async () => {
    const bus = new NodeJsEventBus();
    const loggerError = partialSpyOn(logger, 'error');
    const failure = new Error('thrown, not rejected');

    // A synchronous throw is the case that escapes `map` if the subscribers are
    // invoked inside it rather than deferred, and it would reject `publish`.
    bus.addSubscribers([
      subscriberThat((() => {
        throw failure;
      }) as unknown as (event: DomainEvent) => Promise<void>),
    ]);

    await expect(bus.publish([new TestEvent('aggregate-4')])).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith(expect.objectContaining({ error: failure }));
  });

  it('runs the other subscribers of an event when one of them fails', async () => {
    const bus = new NodeJsEventBus();
    partialSpyOn(logger, 'error');
    const seen: Array<string> = [];

    bus.addSubscribers([
      subscriberThat(async () => Promise.reject(new Error('first exploded'))),
      subscriberThat(async () => {
        seen.push('second ran');
      }),
    ]);

    await bus.publish([new TestEvent('aggregate-5')]);

    expect(seen).toStrictEqual(['second ran']);
  });

  it('resolves for an event nobody subscribes to, and for no events at all', async () => {
    const bus = new NodeJsEventBus();

    await expect(bus.publish([new TestEvent('aggregate-6')])).resolves.toBeUndefined();
    await expect(bus.publish([])).resolves.toBeUndefined();
  });

  it('honours a listener registered with the inherited once()', async () => {
    const bus = new NodeJsEventBus();
    const seen: Array<string> = [];

    // `NodeJsEventBus` extends EventEmitter publicly, so `once` is part of its
    // surface. Reading `listeners()` instead of `rawListeners()` would hand back
    // the unwrapped listener, which never removes itself.
    bus.once(TestEvent.EVENT_NAME, async () => {
      seen.push('called');
    });

    await bus.publish([new TestEvent('aggregate-7')]);
    await bus.publish([new TestEvent('aggregate-7')]);

    expect(seen).toStrictEqual(['called']);
    expect(bus.listenerCount(TestEvent.EVENT_NAME)).toBe(0);
  });

  it('invokes an ordinary listener with the bus as its receiver, as emit does', async () => {
    const bus = new NodeJsEventBus();
    let receiverWasTheBus = false;

    // Not an arrow function: `emit` calls an ordinary listener with the emitter
    // as `this`, and reading the listeners and calling them plainly would drop
    // it. Our own subscribers are bound in `addSubscribers` and so are immune,
    // which is exactly why this needs its own test.
    //
    // The comparison happens inside the listener and the RESULT is asserted
    // outside it, deliberately: `publish` swallows a subscriber's rejection by
    // design, so an `expect` in here would fail invisibly.
    bus.on(TestEvent.EVENT_NAME, async function (this: unknown) {
      receiverWasTheBus = this === bus;
    });

    await bus.publish([new TestEvent('aggregate-8')]);

    expect(receiverWasTheBus).toBe(true);
  });
});
