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
    createReactor({ reactors, runIdle, idleInterval, quietPeriod, dev }) {

        const aCache = safeMemoryCache({ maxTTL: quietPeriod || 1000 });
        const cancelQuietPeriod = () => aCache.clear();
        const cancelQuietPeriodOnAction = (action) => {
            if (!aCache.get(action.type)) {
                cancelQuietPeriod()
                return true
            }
        }
        const uniqueInTime = (str) => {
            if (!aCache.get(str)) {
                aCache.set(str, true);
                return true;
            }
            if (dev) { console.log('human-redux-reactor: stopped ' + str + ' from repeating.') }
        }

        let triggerReactors = () => { throw Error('must call addToStore first') }
        const addToStore = (store) => {
            if (runIdle) {
                const idler = debounce(() => store.dispatch({ type: "@@IDLE" }), idleInterval || 30000);
                store.subscribe(idler);
            }

            triggerReactors = () => {
                const currentState = store.getState();
                let result;
                const found = reactors.some(reactor => {
                    result = reactor(currentState);
                    return !!result && result.hasOwnProperty('type') && uniqueInTime(result.type);
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
            store.subscribe(triggerReactors);

        }

        return {
            addToStore,
            triggerReactors: () => triggerReactors(),
            cancelQuietPeriod,
            cancelQuietPeriodOnAction
        }
    }
};
