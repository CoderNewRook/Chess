import { contains, remove } from './ArrayUtilities';

interface EventHandler<T> {
    (eventData: T) : void;
}

class Action<T> {
    private owner: object;
    private handlers: EventHandler<T>[] = [];
    private onceHandlers: EventHandler<T>[] = [];

    constructor(owner: object) {
        this.owner = owner;
    }

    subscribe(handler: EventHandler<T>) {
        if (contains(this.handlers, handler)) console.log("Warning: handler already subscribed");
        this.handlers.push(handler);
    }

    unsubscribe(handler: EventHandler<T>) {
        if (contains(this.handlers, handler)) {
            remove(this.handlers, handler);
        }
    }

    dispatch(eventData: T) {
        console.log("we are dispatching: " + [this.handlers.length, this.onceHandlers.length])
        this.onceHandlers.slice(0).forEach(handler => { handler(eventData); this.unsubscribeOnce(handler)});
        this.handlers.slice(0).forEach(handler => handler(eventData));
    }

    subscribeOnce(handler: EventHandler<T>) {
        if (contains(this.onceHandlers, handler)) console.log("Warning: once handler already subscribed");
        this.onceHandlers.push(handler);
    }

    unsubscribeOnce(handler: EventHandler<T>) {
        if (contains(this.onceHandlers, handler)) {
            remove(this.onceHandlers, handler);
        }
    }

    unsubscribeAll() {
        this.handlers = [];
        this.onceHandlers = [];
    }
}

export { Action };
