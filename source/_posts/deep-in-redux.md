---
title: Redux 源码分析
date: 2017-07-23 14:34:00
tags: 源码
---

大家好，今天给大家带来的是redux（v3.6.0）的源码分析~


接下来我们看看redux在项目中的简单使用，一般我们都从最简单的开始入手哈

备注：例子中结合的是react进行使用，当然redux不仅仅能结合react，还能结合市面上其他大多数的框架，这也是它比较流弊的地方

首先是创建一个store

```js
import React from 'react'
import { render } from 'react-dom'
// 首先我们必须先导入redux中的createStore方法，用于创建store
// 导入applyMiddleware方法，用于使用中间件
import { createStore, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'
// 导入redux的中间件thunk
import thunk from 'redux-thunk'
// 导入redux的中间件createLogger
import { createLogger } from 'redux-logger'
// 我们还必须自己定义reducer函数，用于根据我们传入的action来访问新的state
import reducer from './reducers'
import App from './containers/App'

// 创建存放中间件数组
const middleware = [ thunk ]
if (process.env.NODE_ENV !== 'production') {
  middleware.push(createLogger())
}
// 调用createStore方法来创建store，传入的参数分别是reducer和运用中间件的函数
const store = createStore(
  reducer,
  applyMiddleware(...middleware)
)
// 将store作为属性传入，这样在每个子组件中就都可以获取这个store实例，然后使用store的方法
render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)

```
接下来我们看看reducer是怎么定义的

```js
// 首先我们导入redux中的combineReducers方法
import { combineReducers } from 'redux'
// 导入actions，这个非必须，但是推荐这么做
import {
  SELECT_REDDIT, INVALIDATE_REDDIT,
  REQUEST_POSTS, RECEIVE_POSTS
} from '../actions'

// 接下来这个两个方法selectedReddit，postsByReddit就是reducer方法
// reducer方法负责根据传入的action的类型，返回新的state，这里可以传入默认的state
const selectedReddit = (state = 'reactjs', action) => {
  switch (action.type) {
    case SELECT_REDDIT:
      return action.reddit
    default:
      return state
  }
}

const posts = (state = {
  isFetching: false,
  didInvalidate: false,
  items: []
}, action) => {
  switch (action.type) {
    case INVALIDATE_REDDIT:
      return {
        ...state,
        didInvalidate: true
      }
    case REQUEST_POSTS:
      return {
        ...state,
        isFetching: true,
        didInvalidate: false
      }
    case RECEIVE_POSTS:
      return {
        ...state,
        isFetching: false,
        didInvalidate: false,
        items: action.posts,
        lastUpdated: action.receivedAt
      }
    default:
      return state
  }
}

const postsByReddit = (state = { }, action) => {
  switch (action.type) {
    case INVALIDATE_REDDIT:
    case RECEIVE_POSTS:
    case REQUEST_POSTS:
      return {
        ...state,
        [action.reddit]: posts(state[action.reddit], action)
      }
    default:
      return state
  }
}

// 最后我们通过combineReducers这个方法，将所有的reducer方法合并成一个方法，也就是rootReducer方法
const rootReducer = combineReducers({
  postsByReddit,
  selectedReddit
})
// 导出这个rootReducer方法
export default rootReducer

```
接下来看看action的定义,其实action就是一个对象，对象中约定有一个必要的属性type，和一个非必要的属性payload；type代表了action的类型，指明了这个action对state修改的意图，而payload则是传入一些额外的数据供reducer使用

```js
export const REQUEST_POSTS = 'REQUEST_POSTS'
export const RECEIVE_POSTS = 'RECEIVE_POSTS'
export const SELECT_REDDIT = 'SELECT_REDDIT'
export const INVALIDATE_REDDIT = 'INVALIDATE_REDDIT'

export const selectReddit = reddit => ({
  type: SELECT_REDDIT,
  reddit
})
export const invalidateReddit = reddit => ({
  type: INVALIDATE_REDDIT,
  reddit
})

export const requestPosts = reddit => ({
  type: REQUEST_POSTS,
  reddit
})

export const receivePosts = (reddit, json) => ({
  type: RECEIVE_POSTS,
  reddit,
  posts: json.data.children.map(child => child.data),
  receivedAt: Date.now()
})

const fetchPosts = reddit => dispatch => {
  dispatch(requestPosts(reddit))
  return fetch(`https://www.reddit.com/r/${reddit}.json`)
    .then(response => response.json())
    .then(json => dispatch(receivePosts(reddit, json)))
}

const shouldFetchPosts = (state, reddit) => {
  const posts = state.postsByReddit[reddit]
  if (!posts) {
    return true
  }
  if (posts.isFetching) {
    return false
  }
  return posts.didInvalidate
}

export const fetchPostsIfNeeded = reddit => (dispatch, getState) => {
  if (shouldFetchPosts(getState(), reddit)) {
    return dispatch(fetchPosts(reddit))
  }
}

```
以上就是redux最简单的用法，接下来我们就来看看redux源码里面具体是怎么实现的吧

首先我们看看整个redux项目的目录结构，从目录中我们可以看出，redux的项目源码其实比较简单

![图片描述][2]

接下来就从入口文件index.js开始看吧，这个文件其实没有实现什么实质性的功能，只是导出了redux所提供的能力

```js
// 入口文件
// 首先引入相应的模块，具体模块的内容后续会详细分析
import createStore from './createStore'
import combineReducers from './combineReducers'
import bindActionCreators from './bindActionCreators'
import applyMiddleware from './applyMiddleware'
import compose from './compose'
import warning from './utils/warning'

/*
* This is a dummy function to check if the function name has been altered by minification.
* If the function has been minified and NODE_ENV !== 'production', warn the user.
*/
function isCrushed() {}

if (
  process.env.NODE_ENV !== 'production' &&
  typeof isCrushed.name === 'string' &&
  isCrushed.name !== 'isCrushed'
) {
  warning(
    'You are currently using minified code outside of NODE_ENV === \'production\'. ' +
    'This means that you are running a slower development build of Redux. ' +
    'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' +
    'or DefinePlugin for webpack (http://stackoverflow.com/questions/30030031) ' +
    'to ensure you have the correct code for your production build.'
  )
}
// 导出相应的功能
export {
  createStore,
  combineReducers,
  bindActionCreators,
  applyMiddleware,
  compose
}

```

紧接着，我们就来看看redux中一个重要的文件，createStore.js。这个文件用于创建store

```js
// 创建store的文件，提供了redux中store的所有内置的功能，也是redux中比较重要的一个文件

// 首先引入相应的模块
import isPlainObject from 'lodash/isPlainObject'
import $$observable from 'symbol-observable'

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */

 // 定义了有个内部使用的ActionType
export const ActionTypes = {
  INIT: '@@redux/INIT'
}

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */

// 导出创建store的方法
// 这个方法接收三个参数，分别是 reducer,预先加载的state,以及功能增强函数enhancer
export default function createStore(reducer, preloadedState, enhancer) {
  // 调整参数，如果没有传入预先加载的state，并且第二个参数是一个函数的话，则把第二个参数为功能增强函数enhancer
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }
  // 判断enhancer必须是一个函数
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }
    // 这是一个很重要的处理，它将createStore方法作为参数传入enhancer函数，并且执行enhancer
    // 这里主要是提供给redux中间件的使用，以此来达到增强整个redux流程的效果
    // 通过这个函数，也给redux提供了无限多的可能性
    return enhancer(createStore)(reducer, preloadedState)
  }
  // reducer必须是一个函数，否则报错
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }
  // 将传入的reducer缓存到currentReducer变量中
  let currentReducer = reducer
  // 将传入的preloadedState缓存到currentState变量中
  let currentState = preloadedState
  // 定义当前的监听者队列
  let currentListeners = []
  // 定义下一个循环的监听者队列
  let nextListeners = currentListeners
  // 定义一个判断是否在dispatch的标志位
  let isDispatching = false

  // 判断是否能执行下一次监听队列
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      // 这里是将当前监听队列通过拷贝的形式赋值给下次监听队列，这样做是为了防止在当前队列执行的时候会影响到自身，所以拷贝了一份副本
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
   // 获取当前的state
  function getState() {
    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */

  // 往监听队列里面去添加监听者
  function subscribe(listener) {
    // 监听者必须是一个函数
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }
    // 声明一个变量来标记是否已经subscribed，通过闭包的形式被缓存
    let isSubscribed = true
    // 创建一个当前currentListeners的副本，赋值给nextListeners
    ensureCanMutateNextListeners()
    // 将监听者函数push到nextListeners中
    nextListeners.push(listener)
    // 返回一个取消监听的函数
    // 原理很简单就是从将当前函数从数组中删除，使用的是数组的splice方法
    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */

  // redux中通过dispatch一个action，来触发对store中的state的修改
  // 参数就是一个action
  function dispatch(action) {
    // 这里判断一下action是否是一个纯对象，如果不是则抛出错误
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
        'Use custom middleware for async actions.'
      )
    }
    // action中必须要有type属性，否则抛出错误
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
        'Have you misspelled a constant?'
      )
    }
    // 如果上一次dispatch还没结束，则不能继续dispatch下一次
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      // 将isDispatching设置为true，表示当次dispatch开始
      isDispatching = true
      // 利用传入的reducer函数处理state和action，返回新的state
      // 推荐不直接修改原有的currentState
      currentState = currentReducer(currentState, action)
    } finally {
      // 当次的dispatch结束
      isDispatching = false
    }
    // 每次dispatch结束之后，就执行监听队列中的监听函数
    // 将nextListeners赋值给currentListeners，保证下一次执行ensureCanMutateNextListeners方法的时候会重新拷贝一个新的副本
    // 简单粗暴的使用for循环执行
    const listeners = currentListeners = nextListeners
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }
    // 最后返回action
    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  // replaceReducer方法，顾名思义就是替换当前的reducer处理函数
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    dispatch({ type: ActionTypes.INIT })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  // 这个函数一般来说用不到，他是配合其他特点的框架或编程思想来使用的如rx.js，感兴趣的朋友可以自行学习
  // 这里就不多做介绍
  function observable() {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.

  // dispatch一个初始化的action
  dispatch({ type: ActionTypes.INIT })

  // 最后返回这个store的所有能力
  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}


```

接下来我们看看combineReducers.js这个文件，通常我们会用它来合并我们的reducer方法

这个文件用于合并多个reducer，然后返回一个根reducer

因为store中只允许有一个reducer函数，所以当我们需要进行模块拆分的时候，就必须要用到这个方法



```js
// 一开始先导入相应的函数
import { ActionTypes } from './createStore'
import isPlainObject from 'lodash/isPlainObject'
import warning from './utils/warning'

// 获取UndefinedState的错误信息
function getUndefinedStateErrorMessage(key, action) {
  const actionType = action && action.type
  const actionName = (actionType && `"${actionType.toString()}"`) || 'an action'

  return (
    `Given action ${actionName}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state. ` +
    `If you want this reducer to hold no value, you can return null instead of undefined.`
  )
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  // 获取reducers的所有key
  const reducerKeys = Object.keys(reducers)
  const argumentName = action && action.type === ActionTypes.INIT ?
    'preloadedState argument passed to createStore' :
    'previous state received by the reducer'
  // 当reducers对象是一个空对象的话，返回警告文案
  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }
  // state必须是一个对象
  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }
  // 判断state中是否有reducer没有的key，因为redux对state分模块的时候,是依据reducer来划分的
  const unexpectedKeys = Object.keys(inputState).filter(key =>
    !reducers.hasOwnProperty(key) &&
    !unexpectedKeyCache[key]
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}
// assertReducerShape函数，检测当遇到位置action的时候，reducer是否会返回一个undefined,如果是的话则抛出错误
// 接受一个reducers对象
function assertReducerShape(reducers) {
  // 遍历这个reducers对象
  Object.keys(reducers).forEach(key => {
    const reducer = reducers[key]
    // 获取reducer函数在处理当state是undefined，actionType为初始默认type的时候返回的值
    const initialState = reducer(undefined, { type: ActionTypes.INIT })
    // 如果这个值是undefined，则抛出错误，因为初始state不应该是undefined
    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
        `If the state passed to the reducer is undefined, you must ` +
        `explicitly return the initial state. The initial state may ` +
        `not be undefined. If you don't want to set a value for this reducer, ` +
        `you can use null instead of undefined.`
      )
    }
    // 当遇到一个不知道的action的时候，reducer也不能返回undefined，否则也会抛出报错
    const type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.')
    if (typeof reducer(undefined, { type }) === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
        `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
        `namespace. They are considered private. Instead, you must return the ` +
        `current state for any unknown actions, unless it is undefined, ` +
        `in which case you must return the initial state, regardless of the ` +
        `action type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */

// 导出combineReducers方法，接受一个参数reducers对象
export default function combineReducers(reducers) {
  // 获取reducers对象的key值
  const reducerKeys = Object.keys(reducers)
  // 定义一个最终要返回的reducers对象
  const finalReducers = {}
  // 遍历这个reducers对象的key
  for (let i = 0; i < reducerKeys.length; i++) {
    // 缓存每个key值
    const key = reducerKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }
    // 相应key的值是个函数，则将改函数缓存到finalReducers中
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  // 获取finalReducers的所有的key值，缓存到变量finalReducerKeys中
  const finalReducerKeys = Object.keys(finalReducers)

  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }
  // 定义一个变量，用于缓存错误对象
  let shapeAssertionError
  try {
    // 做错误处理，详情看后面assertReducerShape方法
    // 主要就是检测，
    assertReducerShape(finalReducers)
  } catch (e) {
    shapeAssertionError = e
  }

  return function combination(state = {}, action) {
    // 如果有错误，则抛出错误
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') {
      // 获取警告提示
      const warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache)
      if (warningMessage) {
        warning(warningMessage)
      }
    }
    // 定义一个变量来表示state是否已经被改变
    let hasChanged = false
    // 定义一个变量，来缓存改变后的state
    const nextState = {}
    // 开始遍历finalReducerKeys
    for (let i = 0; i < finalReducerKeys.length; i++) {
      // 获取有效的reducer的key值
      const key = finalReducerKeys[i]
      // 根据key值获取对应的reducer函数
      const reducer = finalReducers[key]
      // 根据key值获取对应的state模块
      const previousStateForKey = state[key]
      // 执行reducer函数，获取相应模块的state
      const nextStateForKey = reducer(previousStateForKey, action)
      // 如果获取的state是undefined,则抛出错误
      if (typeof nextStateForKey === 'undefined') {
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      // 将获取到的新的state赋值给新的state对应的模块，key则为当前reducer的key
      nextState[key] = nextStateForKey
      // 判读state是否发生改变
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    // 如果state发生改变则返回新的state，否则返回原来的state
    return hasChanged ? nextState : state
  }
}


```

接下来我们在看看bindActionCreators.js这个文件

首先先认识actionCreators,简单来说就是创建action的方法，redux的action是一个对象，而我们经常使用一些函数来创建这些对象，则这些函数就是actionCreators

而这个文件实现的功能，是根据绑定的actionCreator，来实现自动dispatch的功能


```js

import warning from './utils/warning'
// 对于每个actionCreator方法，执行之后都会得到一个action
// 这个bindActionCreator方法，会返回一个能够自动执行dispatch的方法
function bindActionCreator(actionCreator, dispatch) {
  return (...args) => dispatch(actionCreator(...args))
}

/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass a single function as the first argument,
 * and get a function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */
// 对外暴露这个bindActionCreators方法
export default function bindActionCreators(actionCreators, dispatch) {
  // 如果传入的actionCreators参数是个函数，则直接调用bindActionCreator方法
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }
  // 错误处理
  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${actionCreators === null ? 'null' : typeof actionCreators}. ` +
      `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }
  // 如果actionCreators是一个对象，则获取对象中的key
  const keys = Object.keys(actionCreators)
  // 定义一个缓存对象
  const boundActionCreators = {}
  // 遍历actionCreators的每个key
  for (let i = 0; i < keys.length; i++) {
    // 获取每个key
    const key = keys[i]
    // 根据每个key获取特定的actionCreator方法
    const actionCreator = actionCreators[key]
    // 如果actionCreator是一个函数，则直接调用bindActionCreator方法，将返回的匿名函数缓存到boundActionCreators对象中
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    } else {
      warning(`bindActionCreators expected a function actionCreator for key '${key}', instead received type '${typeof actionCreator}'.`)
    }
  }
  // 最后返回boundActionCreators对象
  // 用户获取到这个对象后，可拿出对象中的每个key的对应的值，也就是各个匿名函数，执行匿名函数就可以实现dispatch功能
  return boundActionCreators
}


```

接下来我们看看applyMiddleware.js这个文件，这个文件让redux有着无限多的可能性。为什么这么说呢，你往下看就知道了


```js
// 这个文件的代码逻辑其实很简单
// 首先导入compose函数，等一下我们会详细分析这个compose函数
import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
 // 接下来导出applyMiddleware这个方法，这个方法也是我们经常用来作为createStore中enhance参数的一个方法
export default function applyMiddleware(...middlewares) {
  // 首先先返回一个匿名函数，有没有发现这个函数跟createStore很相似啊
  // 没错其实他就是我们的之前看到的createStore
  return (createStore) => (reducer, preloadedState, enhancer) => {
    // 首先用原来的createStore创建一个store，并把它缓存起来
    const store = createStore(reducer, preloadedState, enhancer)
    // 获取store中原始的dispatch方法
    let dispatch = store.dispatch
    // 定一个执行链数组
    let chain = []
    // 缓存原有store中getState和dispatch方法
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action) => dispatch(action)
    }
    // 执行每个中间件函数，并将middlewareAPI作为参数传入，获得一个执行链数组
    chain = middlewares.map(middleware => middleware(middlewareAPI))
    // 将执行链数组传入compose方法中，并立即执行返回的方法获得最后包装过后的dispatch
    // 这个过程简单来说就是，每个中间件都会接受一个store.dispatch方法，然后基于这个方法进行包装，然后返回一个新的dispatch
    // 这个新的dispatch又作为参数传入下一个中间件函数，然后有进行包装。。。一直循环这个过程，直到最后得到一个最终的dispatch
    dispatch = compose(...chain)(store.dispatch)
    // 返回一个store对象，并将新的dispatch方法覆盖原有的dispatch方法
    return {
      ...store,
      dispatch
    }
  }
}


```
看到这里，其实你已经看完了大部分redux的内容，最后我们看看上述文件中使用到的compose方法是如何实现的。

打开compose.js，我们发现其实实现方式就是利用es5中数组的reduce方法来实现这种效果的

```js
/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

export default function compose(...funcs) {
  // 判断函数数组是否为空
  if (funcs.length === 0) {
    return arg => arg
  }
  // 如果函数数组只有一个元素，则直接执行
  if (funcs.length === 1) {
    return funcs[0]
  }

  // 否则，就利用reduce方法执行每个中间件函数，并将上一个函数的返回作为下一个函数的参数
  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}

```

哈哈，以上就是今天给大家分享的redux源码分析~希望大家能够喜欢
