const assert = require('assert')
global.window = global
window.requestAnimationFrame = cb => setTimeout(cb, 0)

function getStoreMock() {
    const storeMock = {
        state: {},
        _: { recentAction: null, dt: 0, t0: 0, dispatchCount: 0, subscriptions: [] },
        dispatch: (action) => {
            console.log(`dispatch`, action)
            if (storeMock._.t0) {
                storeMock._.dt = ~~((Date.now() - storeMock._.t0) / 100) * 100
            }
            storeMock._.t0 = Date.now()
            storeMock._.dispatchCount++
            storeMock._.recentAction = action
            setTimeout(() => storeMock._.subscriptions.map(sub => sub()), 1)

        },
        subscribe: (cb) => storeMock._.subscriptions.push(cb),
        getState: () => storeMock.state
    }
    return storeMock
}

const addReactorsToStore = require('./index').addReactorsToStore

console.log('Test if a reaction is dispatched and does not loop on its own, but can be dispatched again in a second')

const storeMock1 = getStoreMock()
const neverReactor = () => (undefined)
const naiveReactor = () => ({ type: '@@TEST' })
const couldBeStarvedReactor = () => ({ type: '@@IAMAFTER' })

addReactorsToStore({
    store: storeMock1,
    reactors: [neverReactor, naiveReactor, couldBeStarvedReactor],
    runIdle: true,
    idleInterval: 300,
    throttle: 200,
    dev: true
})

storeMock1.subscribe(trackAndAssert)
storeMock1.dispatch({ type: '@@INIT' })

const storeSequence = []
function trackAndAssert() {
    storeSequence.push([
        storeMock1._.dispatchCount,
        storeMock1._.recentAction.type,
        storeMock1._.dt
    ])
    if (storeSequence.length >= 6) {
        console.log(storeSequence)
        assert.deepEqual((storeSequence), (
            [[1, '@@INIT', 0],
            [2, '@@TEST', 0],
            [3, '@@IAMAFTER', 0],
            [4, '@@IDLE', 300],
            [5, '@@TEST', 0],
            [6, '@@IAMAFTER', 0]]
        ))
        console.log('pass')
        process.exit(0)
    }
}
