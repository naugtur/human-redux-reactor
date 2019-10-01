const safeMemoryCache = require("safe-memory-cache/map");

function debounce(func, delay) {
    let timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(() => {
            clearTimeout(timer);
            func.apply(this, arguments);
        }, delay);
    };
}

const requestIdleCallback =
    window.requestIdleCallback || (f => setTimeout(f, 0));

module.exports = {
    addReactorsToStore({ store, reactors, runIdle, idleInterval, throttle, unthrottleOnUserInteraction, dev }) {

        const aCache = safeMemoryCache({ maxTTL: throttle || 1000 });
        if (unthrottleOnUserInteraction) {
            document.addEventListener('mousedown', () => aCache.clear())
        }

        const uniqueInTime = (str) => {
            if (!aCache.get(str)) {
                aCache.set(str, true);
                return true;
            }
            if (dev) { console.log('human-redux-reactor: stopped ' + str + ' from repeating.') }
        }

        if (runIdle) {
            const idler = debounce(() => store.dispatch({ type: "@@IDLE" }), idleInterval || 30000);
            store.subscribe(idler);
        }
        const subscription = () => {
            const currentState = store.getState();
            let result;
            const found = reactors.some(reactor => {
                result = reactor(currentState);
                return !!result && uniqueInTime(result.type);
            });
            if (found) {
                requestAnimationFrame(() =>
                    requestIdleCallback(
                        () => {
                            store.dispatch(result);
                        },
                        { timeout: 500 }
                    )
                );
            }
        }
        store.subscribe(subscription);

        return {
            triggerReactors: () => subscription,
            destroy: () => store.unsubscribe(subscription)
        }
    }
};
