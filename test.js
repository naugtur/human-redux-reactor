const assert = require('assert')
global.window = global
window.requestAnimationFrame = cb => setTimeout(cb, 0)

function getStoreMock() {
    const storeMock = {
        state: {},
        _: { recentAction: null, dt: 0, t0: Date.now(), dispatchCount: 0, subscriptions: [] },
        dispatch: (action) => {
            console.log(`dispatch`, action)
            if (storeMock._.t0) {
                storeMock._.dt = ~~((Date.now() - storeMock._.t0) / 100) * 100
            }
            storeMock._.dispatchCount++
            storeMock._.recentAction = action
            setTimeout(() => storeMock._.subscriptions.map(sub => sub()), 1)

        },
        subscribe: (cb) => storeMock._.subscriptions.push(cb),
        getState: () => storeMock.state
    }
    return storeMock
}

const { createReactor } = require('./index')

console.log('Test if a reaction is dispatched and does not loop on its own, but can be dispatched again after the throttling period')

const storeMock1 = getStoreMock()
const neverReactor = () => (undefined)
const naiveReactor = () => ({ type: '@@TEST' })
const couldBeStarvedReactor = () => ({ type: '@@IAMAFTER' })

const reactorAPI = createReactor({
    reactors: [neverReactor, naiveReactor, couldBeStarvedReactor],
    runIdle: true,
    idleInterval: 300,
    quietPeriod: 200,
    dev: true
})

reactorAPI.addToStore(storeMock1)

storeMock1.subscribe(trackAndAssert)
storeMock1.dispatch({ type: '@@INIT' })

setTimeout(() => {
    reactorAPI.cancelQuietPeriodOnAction({ type: '@@TEST' })
}, 100)

setTimeout(() => {
    reactorAPI.cancelQuietPeriod()
    reactorAPI.triggerReactors()
}, 400)

const storeSequence = []
function trackAndAssert() {
    storeSequence.push([
        storeMock1._.dispatchCount,
        storeMock1._.recentAction.type,
        storeMock1._.dt
    ])
    console.log(storeSequence.length)

    if (storeSequence.length >= 8) {
        console.log(storeSequence)
        assert.deepEqual((storeSequence), (
            [[1, '@@INIT', 0],
            [2, '@@TEST', 0],
            [3, '@@IAMAFTER', 0],
            [4, '@@IDLE', 300],
            [5, '@@TEST', 300],
            [6, '@@IAMAFTER', 300],
            [7, '@@TEST', 400],
            [8, '@@IAMAFTER', 400]]
        ))
        console.log('pass')
        process.exit(0)
    }
}
