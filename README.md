# human-redux-reactor

An implementation of reactor pattern from Henrik Joreteg's book ["Human Redux"](https://reduxbook.com/) <- all credit for this goes to Henrik.

## Install

```
npm install human-redux-reactor
```

## Setup

```js
import { addReactorsToStore } from "human-redux-reactor";
// or
const addReactorsToStore = require('human-redux-reactor').addReactorsToStore
```

If you're supporting older browsers and can afford it in your bundle size budget (that's likely) you should also install a [`requestIdleCallback`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback) polyfill.

```
npm install ric
```
```js
import "ric";
// or
require('ric')
```

If you don't do that, human-redux-reactor will still work, but run reactors in a `setTimeout` instead of `requestIdleCallback`

## Use

```js
addReactorsToStore(options)
```

Options:
|||
|---|---|
|store|your redux store reference|
|reactors|an array of reactor functions returning an action object or undefined |
|runIdle | boolean - if true, `{ type: "@@IDLE" }` action is dispatched every 30 seconds unless other actions are happening|


```js
import { addReactorsToStore } from "human-redux-reactor";
import { createSelector } from "reselect";

const store = createStore(combineReducers({
    appTime: Date.now,
    // other
}))

const refresh = createSelector([state => (state.appTime - state.data.lastFetch > 60000)],
    (timeToFetch) => {
        if (timeToFetch) {
            return fetchDataAction()
        }

    })

addReactorsToStore({
    store: store,
    reactors: [ refresh ],
    runIdle: true
})
```

### Infinite loop blocking

From the book:
> So,	as	you	can	imagine,	using	this	approach	makes	it	pretty	simple	to	create	a	scenario	where	your
application	is	constantly	reacting	to	the	same	state.	Since	a	specific	state	causes	these	actions	to	be	dispatched,
you'll	be	stuck	in	a	loop	unless	the	dispatch	immediately	removes	this	state.

It's hard to trust yourself to never start an infinite loop, so to prevent the most obvious cases, this library throttles the dispatches by action type.

If an action with the same type gets returned from your reactor within a second (configurable) of the previous dispatch, it gets ignored.

## MIT License