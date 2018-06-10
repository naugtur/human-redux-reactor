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
    addReactorsToStore({ store, reactors, runIdle, throttle}) {

        const aCache = safeMemoryCache({ maxTTL: throttle || 1000 });
        function uniqueInTime(str) {
            if (!aCache.get(str)) {
                aCache.set(str, true);
                return true;
            }
        }

        if (runIdle) {
            const idler = debounce(() => store.dispatch({ type: "@@IDLE" }), 30000);
            store.subscribe(idler);
        }
        store.subscribe(() => {
            const currentState = store.getState();
            let result;
            reactors.some(reactor => {
                result = reactor(currentState);
                return !!result && uniqueInTime(result.type);
            });
            if (result) {
                requestAnimationFrame(() =>
                    requestIdleCallback(
                        () => {
                            store.dispatch(result);
                        },
                        { timeout: 500 }
                    )
                );
            }
        });
    }
};