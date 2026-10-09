import EventEmitter from 'events';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { EventBus } from '../domain/EventBus';
import { DomainEventSubscriber } from '../../../shared/domain/DomainEventSubscriber';

export class NodeJsEventBus extends EventEmitter implements EventBus {
  /**
   * Deliver each event to its subscribers and WAIT for them to finish.
   *
   * This used to call `this.emit(...)`. `EventEmitter.emit` invokes an async
   * listener and then discards the promise it returns, so `publish` resolved as
   * soon as every subscriber had been STARTED rather than completed. Two things
   * followed from that, and both are fixed here.
   *
   * Callers that await `publish` were not actually waiting for the work. The
   * upload path is the case that matters: `release.service` holds a per-path
   * guard while it awaits `TemporalFileUploader.run`, which awaits `publish`, so
   * the guard was released while the file's metadata write was still in flight
   * and a second save of the same file could overlap the first.
   *
   * A subscriber that rejected produced an unhandled rejection, because nothing
   * held the discarded promise. `allSettled` catches those and logs them.
   *
   * `publish` still NEVER REJECTS, which is deliberate and preserves the
   * contract callers already rely on. `FileCreator` publishes after the file has
   * been persisted, inside the try/catch that reports upload failures to the
   * user, so letting a subscriber's failure escape would report a file that was
   * created successfully as a failed upload. A subscriber failing is the
   * subscriber's problem, not the publisher's.
   *
   * The subscribers OF ONE EVENT run concurrently, which is what `emit` did.
   * Waiting for one event's subscribers before starting the next is a NEW and
   * STRONGER guarantee than `emit` gave: the old code started every listener of
   * every event without waiting in between, so it ordered their STARTS but not
   * their COMPLETIONS. Nothing in this tree depended on events overlapping.
   */
  async publish(events: Array<DomainEvent>): Promise<void> {
    for (const event of events) {
      // `rawListeners`, not `listeners`: for a listener registered with `once`,
      // `listeners` returns the unwrapped original, and calling that directly
      // would leave the listener registered forever. `rawListeners` returns the
      // wrapper, which removes itself and returns the listener's value.
      const subscribers = this.rawListeners(event.eventName) as Array<(event: DomainEvent) => unknown>;

      // eslint-disable-next-line no-await-in-loop
      const results = await Promise.allSettled(
        // Deferred rather than called straight inside `map`: a subscriber that
        // throws SYNCHRONOUSLY would escape `map` before `allSettled` ever saw
        // it, and reject `publish` in spite of the contract above. `call` because
        // `emit` invokes an ordinary listener with the emitter as its receiver,
        // and a plain call would silently drop it.
        subscribers.map((subscriber) => Promise.resolve().then(() => subscriber.call(this, event))),
      );

      results.forEach((result) => {
        if (result.status === 'rejected') {
          logger.error({
            msg: '[EventBus] A subscriber failed to handle an event',
            event: event.eventName,
            aggregateId: event.aggregateId,
            error: result.reason,
          });
        }
      });
    }
  }

  addSubscribers(subscribers: Array<DomainEventSubscriber<DomainEvent>>): void {
    subscribers.forEach((subscriber) => {
      subscriber.subscribedTo().forEach((event) => {
        this.on(`${event.EVENT_NAME}`, subscriber.on.bind(subscriber));
      });
    });
  }

  instance() {
    return this;
  }
}
