---
title: 你想要的 —— Vuex源码分析
date: 2017-07-17 14:34:00
tags: 源码
---


大家好，今天给大家带来的是vuex（2.3.1）源码分析，希望能够能跟大家进行交流，欢迎提意见，写的不好的地方欢迎拍砖
    
    
首先我们先来看看vuex是如何跟vue项目一起结合使用的，以下是官方demo中的一个简单例子
    
 （1）我们必须先创建一个store
    
```js
import Vue from 'vue'
import Vuex from 'vuex'
import { state, mutations } from './mutations'
import plugins from './plugins'

Vue.use(Vuex)

export default new Vuex.Store({
  state,
  mutations,
  plugins
})
```

 （2）将这个store传给vue的实例，这样我们就能够在vue中获取到这个store并且使用它的功能了
    
```js
import 'babel-polyfill'
import Vue from 'vue'
import store from './store'
import App from './components/App.vue'

new Vue({
  store, // inject store to all children
  el: '#app',
  render: h => h(App)
})

```

以上就是vuex的简单使用方法，然后接下来我们就开始来分析vuex的源码吧

 - 目录结构

    
![clipboard.png](/img/bVQXxj)
从目录结构可以看出，vuex是一个代码比较简洁的框架

 - index.js——入口文件

```js
import { Store, install } from './store'
import { mapState, mapMutations, mapGetters, mapActions, createNamespacedHelpers } from './helpers'

export default {
  Store,
  install,
  version: '__VERSION__',
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers
}
```

入口文件只做了一件事，就是导入了其他相关的文件，并且将vuex的功能export出去，相当于定义vuex对外使用的API

 - store.js——vuex的仓库，也是vuex中比较重要的一环
    这个文件比较长，我们可以一点一点来分析：
    总体来说，这个文件做了几件事，定义并导出了Store这个类和install方法，并执行了install这个方法，我们都知道，vue的所有插件都是通过install这个方法来安装的
```js
import applyMixin from './mixin'
import devtoolPlugin from './plugins/devtool'
import ModuleCollection from './module/module-collection'
import { forEachValue, isObject, isPromise, assert } from './util'
```
一开始导入相关的方法，后面会解释这些方法的用处

```
let Vue // 定义了变量Vue，为的是引用外部的vue构造函数，这样vuex框架就可以不用导入vue这个库了
```


**----------------------------------------------------------这是分割线----------------------------------------------------------------------------------------**


接下来是定义Store这个类，从图中可以看出这个vuex中的外store对外提供的能力，包括常用的commit,dispatch，watch等

![clipboard.png](/img/bVQXBK)

先看看构造函数吧：

```js
constructor (options = {}) {
    // 这个是在开发过程中的一些环节判断，vuex要求在创建vuex store实例之前必须先使用这个方法Vue.use(Vuex)来安装vuex，项目必须也得支持promise，store也必须通过new来创建实例
    
    if (process.env.NODE_ENV !== 'production') {
      assert(Vue, `must call Vue.use(Vuex) before creating a store instance.`)
      assert(typeof Promise !== 'undefined', `vuex requires a Promise polyfill in this browser.`)
      assert(this instanceof Store, `Store must be called with the new operator.`)
    }
    
    // 从参数options中结构出相关变量
    const {
      plugins = [],
      strict = false
    } = options

    let {
      state = {}
    } = options
    
    // 这个简单的，不解释
    if (typeof state === 'function') {
      state = state()
    }

    // store internal state
    // 初始化store内部状态，Object.create(null)可以创建一个干净的空对象
    this._committing = false
    this._actions = Object.create(null)
    this._mutations = Object.create(null)
    this._wrappedGetters = Object.create(null)
    // vuex支持模块，即将state通过key-value的形式拆分为多个模块
    // 模块的具体内容可以查看这里 ：https://vuex.vuejs.org/en/mutations.html
    this._modules = new ModuleCollection(options)
    this._modulesNamespaceMap = Object.create(null)
    // 监听队列，当执行commit时会执行队列中的函数
    this._subscribers = []
    // 创建一个vue实例，利用vue的watch的能力，可以监控state的改变，具体后续watch方法会介绍
    this._watcherVM = new Vue()

    // bind commit and dispatch to self
    
    const store = this
    // 缓存dispatch和commit方法
    const { dispatch, commit } = this
    // 定义dispatch方法
    this.dispatch = function boundDispatch (type, payload) {
      return dispatch.call(store, type, payload)
    }
    // 定义commit方法
    this.commit = function boundCommit (type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    // strict mode
    // 定义严格模式，不要在发布环境下启用严格模式！严格模式会深度监测状态树来检测不合规的状态变更——请确保在发布环境下关闭严格模式，以避免性能损失。
    // 具体后续enableStrictMode方法会提到
    this.strict = strict

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    // 这个作者的注释已经写得挺明白，就是初始化根模块，递归注册子模块，收集getter
    installModule(this, state, [], this._modules.root)

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    // 初始化store中的state,使得state变成响应式的，原理就是将state作为一个vue实例的data属性传入,具体在分析这个函数的时候会介绍
    resetStoreVM(this, state)

    // apply plugins
    // 执行插件，这个是一个数组，所以遍历他，然后执行每个插件的函数
    plugins.concat(devtoolPlugin).forEach(plugin => plugin(this))
  }
```
呼呼呼~ 至此，终于把store类全部读完了，休息五分钟，然后继续往下看哈。

接下来关于state的获取和设置

```js
  // 获取state,  直接返回内部data的$$state
  get state () {
    return this._vm._data.$$state
  }

  set state (v) {
    if (process.env.NODE_ENV !== 'production') {
      assert(false, `Use store.replaceState() to explicit replace store state.`)
    }
  }
```

commit是vuex中一个比较重要的操作，因为它可以触发mutation修改对state的修改，并且是同步执行的

```js
commit (_type, _payload, _options) {
    // check object-style commit
    // 首先统一传入参数的格式，主要是针对当type是个对象的情况，需要把这个对象解析出来
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options)
    
    // 缓存本次commit操作的类型和负荷，以供后续监听队列（this._subscribers）使用
    const mutation = { type, payload }
    // 获取相关的type的mutation函数，我们都知道，在vuex中都是通过commit一个类型然后触发相关的mutation函数来操作state的，所以在此必须获取相关的函数
    const entry = this._mutations[type]
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown mutation type: ${type}`)
      }
      return
    }
    // 在_withCommit中触发上面获取的mutation函数，简单粗暴使用数组的forEach执行哈哈，之所以要在外面包一层_withCommit，是表明操作的同步性
    this._withCommit(() => {
      entry.forEach(function commitIterator (handler) {
        handler(payload)
      })
    })
    // 这个就是之前说的监听队列，在每次执行commit函数时都会遍历执行一下这个队列
    this._subscribers.forEach(sub => sub(mutation, this.state))

    if (
      process.env.NODE_ENV !== 'production' &&
      options && options.silent
    ) {
      console.warn(
        `[vuex] mutation type: ${type}. Silent option has been removed. ` +
        'Use the filter functionality in the vue-devtools'
      )
    }
  }
```

dispatch是跟commit有点相似的函数，但是commit必须是同步的，而dispatch是异步的，内部还是必须通过commit来操作state

```js
dispatch (_type, _payload) {
    // check object-style dispatch
    // 同上面commit，不解释
    const {
      type,
      payload
    } = unifyObjectStyle(_type, _payload)
    
    // 因为dispatch触发的是actions中的函数，所以这里获取actions相关函数，过程类似commit
    const entry = this._actions[type]
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown action type: ${type}`)
      }
      return
    }
    // 因为dispatch支持异步，所以这里作者使用Promise.all来执行异步函数并且判断所有异步函数是否都已经执行完成，所以在文件最开始判断了当前环境必须支持promise就是这个原因
    return entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload)
  }
```
subscribe函数，这是pub/sub模式在vuex中的一个运用，用户可以通过subscribe函数来监听state的变化，函数返回一个取消监听的函数，便于用户在合适的时机取消订阅

```js
subscribe (fn) {
    const subs = this._subscribers
    if (subs.indexOf(fn) < 0) {
      subs.push(fn)
    }
    // 返回取消订阅的函数，通过函数额splice方法，来清除函数中不需要的项
    return () => {
      const i = subs.indexOf(fn)
      if (i > -1) {
        subs.splice(i, 1)
      }
    }
  }
```

watch函数，响应式地监测一个 getter 方法的返回值，当值改变时调用回调函数，原理其实就是利用vue中的watch方法

```js
watch (getter, cb, options) {
    if (process.env.NODE_ENV !== 'production') {
      assert(typeof getter === 'function', `store.watch only accepts a function.`)
    }
    // 在上面构造函数中，我们看到this._watcherVM就是一个vue的实例，所以可以利用它的watch来实现vuex的watch，原理都一样，当监听的值或者函数的返回值发送改变的时候，就触发相应的回调函数，也就是我们传入的cb参数，options则可以来让监听立即执行&深度监听对象
    return this._watcherVM.$watch(() => getter(this.state, this.getters), cb, options)
  }
```
replaceState，根据名字就可知道，是替换当前的state

```js
replaceState (state) {
    this._withCommit(() => {
      this._vm._data.$$state = state
    })
  }
```

registerModule函数，可以使用 store.registerModule 方法注册模块

```js
registerModule (path, rawModule) {
    if (typeof path === 'string') path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
      assert(path.length > 0, 'cannot register the root module by using registerModule.')
    }
    //其实内部时候通过,register方法，递归寻找路径，然后将新的模块注册root模块上，具体后续介绍到module的时候会详细分析
    this._modules.register(path, rawModule)
    //安装模块，因为每个模块都有他自身的getters,actions, modules等，所以，每次注册模块都必须把这些都注册上，后续介绍installModule的时候，会详细介绍到
    installModule(this, this.state, path, this._modules.get(path))
    // reset store to update getters...
    // 重置VM
    resetStoreVM(this, this.state)
  }
```
unregisterModule函数，上述registerModule函数的相反操作，具体在module的时候会介绍到，在此了解个大概，先不纠结细节
```
unregisterModule (path) {
    if (typeof path === 'string') path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
    }

    this._modules.unregister(path)
    this._withCommit(() => {
      const parentState = getNestedState(this.state, path.slice(0, -1))
      // 利用vue.delete方法，确保模块在被删除的时候，视图能监听到变化
      Vue.delete(parentState, path[path.length - 1])
    })
    resetStore(this)
  }
```

hotUpdate函数，Vuex 支持在开发过程中热重载 mutation、modules、actions、和getters

```js
hotUpdate (newOptions) {
    this._modules.update(newOptions)
    resetStore(this, true)
  }
```

_withCommit函数，从函数名可以看出这是一个内部方法，作用就是保证commit过程中执行的方法都是同步的

```js
_withCommit (fn) {
    // 保存原来的committing的状态
    const committing = this._committing
    //将想在的committing状态设置为true
    this._committing = true
    //执行函数
    fn()
    //将committing状态设置为原来的状态
    this._committing = committing
  }
```
到目前为止，我们已经看完了Store这个类的所有代码~慢慢消化，然后继续往下

**----------------------------------------------------------这又是分割线----------------------------------------------------------------------------------------**

接下来，我们分析一下，一些其他的辅助方法，跟上面store的一些内容会有相关。ready? Go

resetStore函数，用于重置整个vuex中的store,从代码中可以看出，这个函数主要的功能，就是将传入的store实例的_actions，_mutations，_wrappedGetters，_modulesNamespaceMap置为空，然后重新安装模块和重置VM，此方法在上述热更新和注销模块的时候会使用到

```js
function resetStore (store, hot) {
  store._actions = Object.create(null)
  store._mutations = Object.create(null)
  store._wrappedGetters = Object.create(null)
  store._modulesNamespaceMap = Object.create(null)
  const state = store.state
  // init all modules
  installModule(store, state, [], store._modules.root, true)
  // reset vm
  resetStoreVM(store, state, hot)
}
```

resetStoreVM函数，这个用于重置store中的vm,所谓vm，指的就是视图模型，也就是常见mvvm中的vm，在此指的是将state作为data中$$state属性的一个vue实例

```js
function resetStoreVM (store, state, hot) {
   // 保存原有store的_vm
  const oldVm = store._vm
    
  // bind store public getters
  store.getters = {}
  // store的_wrappedGetters缓存了当前store中所有的getter
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  //遍历这个对象，获取每个getter的key和对应的方法
  forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    // 将getter以key-value的形式缓存在变量computed中，其实后面就是将getter作为vue实例中的计算属性
    computed[key] = () => fn(store)
    // 当用户获取getter时，相当于获取vue实例中的计算属性，使用es5的这个Object.defineProperty方法做一层代理
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  const silent = Vue.config.silent
  // silent设置为true，则取消了所有的警告和日志，眼不见为净
  Vue.config.silent = true
  
  // 将传入的state，作为vue实例中的data的$$state属性，将刚刚使用computed变量搜集的getter，作为实例的计算属性，所以当state和getter都变成了响应式的了
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent

  // enable strict mode for new vm
    
  if (store.strict) {
    //如果设置了严格模式则，不允许用户在使用mutation以外的方式去修改state
    enableStrictMode(store)
  }

  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      store._withCommit(() => {
        // 将原有的vm中的state设置为空，所以原有的getter都会重新计算一遍，利用的就是vue中的响应式，getter作为computed属性，只有他的依赖改变了，才会重新计算，而现在把state设置为null，所以计算属性重新计算
        oldVm._data.$$state = null
      })
    }
    // 在下一次周期销毁实例
    Vue.nextTick(() => oldVm.$destroy())
  }
}
```
installModule函数，用于安装模块，注册相应的mutation,action,getter和子模块等

```js
function installModule (store, rootState, path, module, hot) {
   //判断是否为根模块
  const isRoot = !path.length
   //根据路径生成相应的命名空间
  const namespace = store._modules.getNamespace(path)

  // register in namespace map
  if (module.namespaced) {
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  if (!isRoot && !hot) {
    // 将模块的state设置为响应式
    const parentState = getNestedState(rootState, path.slice(0, -1))
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      Vue.set(parentState, moduleName, module.state)
    })
  }
  //设置本地上下文，主要是针对模块的命名空间，对dispatch,commit,getters和state进行修改，后面讲到makeLocalContext的时候会详细分析，现在只需要知道，这个操作让用户能够直接获取到对象子模块下的对象就可以了
  const local = module.context = makeLocalContext(store, namespace, path)
 
  //将mutation注册到模块上
  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })
  //将action注册到模块上  
  module.forEachAction((action, key) => {
    const namespacedType = namespace + key
    registerAction(store, namespacedType, action, local)
  })
  //将getter注册到模块上
  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })
  //递归安装子模块  
  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}
```
makeLocalContext函数，就是installModule中设置本地上下文的具体实现

```js
function makeLocalContext (store, namespace, path) {
   //如果没有命名空间，则是使用全局store上的属性，否则对store上的属性进行本地化处理
  const noNamespace = namespace === ''

  const local = {
    dispatch: noNamespace ? store.dispatch : (_type, _payload, _options) => {
      //dispatch的本地化处理，就是修改type
      const args = unifyObjectStyle(_type, _payload, _options)
      const { payload, options } = args
      let { type } = args

      if (!options || !options.root) {
         //在type前面加上命名空间
        type = namespace + type
        if (process.env.NODE_ENV !== 'production' && !store._actions[type]) {
          console.error(`[vuex] unknown local action type: ${args.type}, global type: ${type}`)
          return
        }
      }
        //调用store上的dispatch方法
      return store.dispatch(type, payload)
    },

    commit: noNamespace ? store.commit : (_type, _payload, _options) => {
    // commit的本地化修改跟dispatch相似，也是只是修改了type，然后调用store上面的commit
      const args = unifyObjectStyle(_type, _payload, _options)
      const { payload, options } = args
      let { type } = args

      if (!options || !options.root) {
        type = namespace + type
        if (process.env.NODE_ENV !== 'production' && !store._mutations[type]) {
          console.error(`[vuex] unknown local mutation type: ${args.type}, global type: ${type}`)
          return
        }
      }

      store.commit(type, payload, options)
    }
  }

  // getters and state object must be gotten lazily
  // because they will be changed by vm update
   //gettters和state的修改，则依赖于makeLocalGetters函数和getNestedState函数，后面会分析
  Object.defineProperties(local, {
    getters: {
      get: noNamespace
        ? () => store.getters
        : () => makeLocalGetters(store, namespace)
    },
    state: {
      get: () => getNestedState(store.state, path)
    }
  })

  return local
}
```
makeLocalGetters函数，则是对getter进行本地化处理

```js
function makeLocalGetters (store, namespace) {
  const gettersProxy = {}

  const splitPos = namespace.length
  Object.keys(store.getters).forEach(type => {
    //这里获取的每个type都是一个有命名空间+本地type的字符串，例如: type的值可能为 “m1/m2/”+"typeName"
    // skip if the target getter is not match this namespace
    if (type.slice(0, splitPos) !== namespace) return

    // extract local getter type
    const localType = type.slice(splitPos)

    // Add a port to the getters proxy.
    // Define as getter property because
    // we do not want to evaluate the getters in this time.
    //相当于做了一层代理，将子模块的localType映射到store上的type
    Object.defineProperty(gettersProxy, localType, {
      get: () => store.getters[type],
      enumerable: true
    })
  })

  return gettersProxy
}
```

 registerMutation函数,就是注册mutation的过程，将相应type的mutation推到store._mutations[type]的队列中，当commit这个type的时候就触发执行队列中的函数

```js
function registerMutation (store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler (payload) {
    handler(local.state, payload)
  })
}
```
registerAction函数，注册action的过程，原理类似于registerMutation，不同点在于action支持异步，所以必须用promise进行包装

```js
function registerAction (store, type, handler, local) {
  const entry = store._actions[type] || (store._actions[type] = [])
  entry.push(function wrappedActionHandler (payload, cb) {
    let res = handler({
      dispatch: local.dispatch,
      commit: local.commit,
      getters: local.getters,
      state: local.state,
      rootGetters: store.getters,
      rootState: store.state
    }, payload, cb)
    if (!isPromise(res)) {
      res = Promise.resolve(res)
    }
    if (store._devtoolHook) {
      return res.catch(err => {
        store._devtoolHook.emit('vuex:error', err)
        throw err
      })
    } else {
      return res
    }
  })
}
```

registerGetters函数,根据type，将getter方法挂载在store._wrappedGetters[type]下面

```js
function registerGetter (store, type, rawGetter, local) {
  if (store._wrappedGetters[type]) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] duplicate getter key: ${type}`)
    }
    return
  }
  store._wrappedGetters[type] = function wrappedGetter (store) {
    // 为子模块的getter提供了这个四个参数，方便用户获取，如果是根模块，则local跟store取出来的state和getters相同
    return rawGetter(
      local.state, // local state
      local.getters, // local getters
      store.state, // root state
      store.getters // root getters
    )
  }
}
```
enableStrictMode函数则是在严格模式下，不允许state被除mutation之外的其他操作修改，代码比较简单，利用vue的$watch方法实现的

```js
function enableStrictMode (store) {
  store._vm.$watch(function () { return this._data.$$state }, () => {
    if (process.env.NODE_ENV !== 'production') {
      assert(store._committing, `Do not mutate vuex store state outside mutation handlers.`)
    }
  }, { deep: true, sync: true })
}
```
getNestedState函数，获取对应路径下的state
```js
function getNestedState (state, path) {
  return path.length
    ? path.reduce((state, key) => state[key], state)
    : state
}
```

unifyObjectStyle函数，作用是调整参数，主要是当type是一个对象的时候，对参数进行调整

```js
function unifyObjectStyle (type, payload, options) {
  if (isObject(type) && type.type) {
    options = payload
    payload = type
    type = type.type
  }

  if (process.env.NODE_ENV !== 'production') {
    assert(typeof type === 'string', `Expects string as the type, but found ${typeof type}.`)
  }

  return { type, payload, options }
}
```
以上是相关辅助函数的全部内容，你看明白了么~

**----------------------------------------------------------这依然是分割线------------------------------------------------------------------------------------**

文件的最后，就是定义了install函数，然后自动执行了这个函数，让vuex能够在项目中运作起来
```js
export function install (_Vue) {
  if (Vue) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  //在vue的生命周期中初始化vuex，具体实现后面讲到mixin.js这个文件时会说明
  applyMixin(Vue)
}

// auto install in dist mode
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}
```
以上就是store.js的所有内容啦~


**----------------------------------------------------------严肃分割线------------------------------------------------------------------------------------**

接下来讲解有关module目录下的内容，该目录有两个文件分别是module-collection.js和module.js，这两个文件主要是有关于vuex中模块的内容；
首先我们看看module-collection.js,这个文件主要导出一个ModuleCollection类:
构造函数

```js
constructor (rawRootModule) {
    // register root module (Vuex.Store options)
    //主要是注册根模块，我们在之前store的构造函数中曾经使用到 this._modules = new ModuleCollection(options)，注册一个根模块然后缓存在this._module中
    this.register([], rawRootModule, false)
  }
```
紧接着看看下面register函数，它用于注册模块

```js
register (path, rawModule, runtime = true) {
    if (process.env.NODE_ENV !== 'production') {
      assertRawModule(path, rawModule)
    }
    // 创建一个新模块，具体会在后面讲到Module的时候分析
    const newModule = new Module(rawModule, runtime)
    // 判读是否为根模块
    if (path.length === 0) {
      this.root = newModule
    } else {
      //根据path路径，利用get方法获取父模块  
      const parent = this.get(path.slice(0, -1))
      //为父模块添加子模块
      parent.addChild(path[path.length - 1], newModule)
    }

    // register nested modules
    // 如果当前模块里面有子模块，则递归的去注册子模块
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }
```
相反，unregister函数则是移除一个模块

```js
unregister (path) {
    // 通过get方法获取父模块
    const parent = this.get(path.slice(0, -1))
    //获取需要删除的模块的名称，即他的key
    const key = path[path.length - 1]
    if (!parent.getChild(key).runtime) return
    //利用module中removeChild方法删除该模块，其实就是delete了对象上的一个key
    parent.removeChild(key)
  }
```
get函数，其实就是利用es5中数组reduce方法，从根模块开始根据传入的path来获取相应的子模块

```js
get (path) {
    return path.reduce((module, key) => {
      return module.getChild(key)
    }, this.root)
  }
```
getNamespace函数，利用传入的参数path，生成相应的命名空间，实现的原理跟上述的get方法类似

```js
getNamespace (path) {
    let module = this.root
    return path.reduce((namespace, key) => {
      module = module.getChild(key)
      return namespace + (module.namespaced ? key + '/' : '')
    }, '')
  }
```
upate方法，就是更新模块，具体看下面update方法的实现

```js
update (rawRootModule) {
    update([], this.root, rawRootModule)
  }
```
以上就是整个ModuleCollection类的实现

接下来讲解一下function update的实现

```js
function update (path, targetModule, newModule) {
  if (process.env.NODE_ENV !== 'production') {
    assertRawModule(path, newModule)
  }

  // update target module
  //目标模块更新为新模块，具体实现是将原有模块的namespaced，actions，mutations，getters替换为新模块的namespaced，actions，mutations，getters
  // 具体会在Module类中update方法讲解
  targetModule.update(newModule)

  // update nested modules
  // 如果新的模块有子模块，则递归更新子模块
  if (newModule.modules) {
    for (const key in newModule.modules) {
      if (!targetModule.getChild(key)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[vuex] trying to add a new module '${key}' on hot reloading, ` +
            'manual reload is needed'
          )
        }
        return
      }
      update(
        path.concat(key),
        targetModule.getChild(key),
        newModule.modules[key]
      )
    }
  }
}
```
至于assertRawModule方法和makeAssertionMessage方法，就是一些简单的校验和提示，不影响主流程&代码比较简单，这里不做赘述

以上就是整个module-collection.js文件的所有内容

接下来就应该分析目录中的另一个文件module.js，这个文件主要导出一个Module类，这个类主要描述了vuex中模块的功能

构造函数，主要做了一些模块初始化的事情

```js
//构造函数，主要做了一些模块初始化的事情
  constructor (rawModule, runtime) {
    //缓存运行时的标志
    this.runtime = runtime
    //创建一个空对象来保存子模块
    this._children = Object.create(null)
    //缓存传入的模块
    this._rawModule = rawModule
    //缓存传入模块的state，如果state是一个函数，则执行这个函数
    const rawState = rawModule.state
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {}
  }
```
namespaced函数是主要就是获取当前模块是否是命名模块，vuex支持命名模块和匿名模块

```js
get namespaced () {
    return !!this._rawModule.namespaced
  }
```
addChild,removeChild,getChild这三个函数就分别是添加，删除，获取子模块，内容比较简单，不赘述

update方法，将原有缓存模块的namespaced，actions，mutations，getters替换成新传入模块的namespaced，actions，mutations，getters

```js
update (rawModule) {
    this._rawModule.namespaced = rawModule.namespaced
    if (rawModule.actions) {
      this._rawModule.actions = rawModule.actions
    }
    if (rawModule.mutations) {
      this._rawModule.mutations = rawModule.mutations
    }
    if (rawModule.getters) {
      this._rawModule.getters = rawModule.getters
    }
  }
```
forEachChild函数，利用util中forEachValue方法，变量每个子模块，将每个子模块作为传入的回调函数参数，然后执行回调函数

```js
forEachChild (fn) {
    forEachValue(this._children, fn)
  }
```
forEachGetter，forEachAction，forEachMutation代码逻辑跟上述forEachChild十分类似，不在赘述

以上就是module.js文件的所有内容，至此我们也已经全部分析完module目录下的所有代码了

**---------------------------------------------------一本正经分割线--------------------------------------------------------------------------------**
接下来，我们再看看help.js这个文件，这个文件主要是提供了一些帮助性的方法，使得用户在使用vuex的过程中体验更好，更加方便

首先我们先看看文件后面三个函数：normalizeMap，normalizeNamespace，getModuleByNamespace

normalizeMap函数，这个方法的作用是格式化传入的对象

```js
function normalizeMap (map) {
  // 如果传入的对象是数组，则放回一个每一项都是key-val对象的数组，其中key和val的值相同
  // 如果出入的是一个对象,则变量这个对象，放回一个每一项都是key-val数组，其中key对应对象的key,val对应相应key的值
  return Array.isArray(map)
    ? map.map(key => ({ key, val: key }))
    : Object.keys(map).map(key => ({ key, val: map[key] }))
}
```
normalizeNamespace函数，调整参数，格式化命名空间

```js
function normalizeNamespace (fn) {
  return (namespace, map) => {
    //如果没传入命名空间，或者传入的命名空间不是一个字符串，则丢弃该参数
    if (typeof namespace !== 'string') {
      map = namespace
      namespace = ''
    } else if (namespace.charAt(namespace.length - 1) !== '/') {
      //否则判断命名空间后面是否有加上‘/’，如果没有则加上
      namespace += '/'
    }
    //最后执行传入的回调函数
    return fn(namespace, map)
  }
}
```
getModuleByNamespace函数，通过命名空间来获取模块

```js
function getModuleByNamespace (store, helper, namespace) {
  // 返回store._modulesNamespaceMap缓存的模块
  const module = store._modulesNamespaceMap[namespace]
  if (process.env.NODE_ENV !== 'production' && !module) {
    console.error(`[vuex] module namespace not found in ${helper}(): ${namespace}`)
  }
  return module
}
```

mapState函数，我们可以通过这个方法将state解构到vue项目中去，使其变成vue实例中的计算属性

```js
export const mapState = normalizeNamespace((namespace, states) => {
  //定义一个空对象
  const res = {}
  normalizeMap(states).forEach(({ key, val }) => {
    //收集states的所有key,对应key的值，改变成一个mappedState方法，符合计算属性的特点
    res[key] = function mappedState () {
      //获取store的state和getters
      let state = this.$store.state
      let getters = this.$store.getters
      //如果存在命名空间，则将命名空间下子模块的state和getters覆盖原来store的state和getters
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapState', namespace)
        if (!module) {
          return
        }
        state = module.context.state
        getters = module.context.getters
      }
      //如果对应的val是函数则执行，否则返回state下的值
      return typeof val === 'function'
        ? val.call(this, state, getters)
        : state[val]
    }
    // mark vuex getter for devtools
    res[key].vuex = true
  })
  //返回这个包装过state的对象，这个对象可以结构成vue中的计算属性
  return res
})
```
mapMutations函数，则是将mutation解构到vue实例中的methods中，使得用户可以直接调用methods中的方法来执行store.commit

```js
export const mapMutations = normalizeNamespace((namespace, mutations) => {
  //定义一个空对象
  const res = {}
  normalizeMap(mutations).forEach(({ key, val }) => {
    val = namespace + val
    res[key] = function mappedMutation (...args) {
      if (namespace && !getModuleByNamespace(this.$store, 'mapMutations', namespace)) {
        return
      }
      //调用了store中的commit方法，触发相应的mutation函数的执行
      return this.$store.commit.apply(this.$store, [val].concat(args))
    }
  })
  return res
})
```
mapGetters的逻辑跟mapState类似，mapActions的逻辑跟mapMutations类似，这里不再赘述

自此，我们把help.js的内容也分析完了

**---------------------------------------------------一本正经分割线--------------------------------------------------------------------------------**
接下来我们看看mixin.js文件
还记得之前store.js里面有个install方法么，这个方法就用到了mixin.js文件提供的内容

```js
// 这个文件其实就导出了一个方法，供vuex在被引入的时候，能够顺利安装到项目中
export default function (Vue) {
  // 首先，判断vue版本,不同的vue版本，生命周期不同，所以需要做差异处理
  const version = Number(Vue.version.split('.')[0])

  if (version >= 2) {
    // 如果版本是2.0以上的，则在vue的beforeCreate生命周期中，触发vuex的初始化
    // 利用的是vue中全局混入的形式
    Vue.mixin({ beforeCreate: vuexInit })
  } else {
    // override init and inject vuex init procedure
    // for 1.x backwards compatibility.
    // 如果是1.x版本的话，就改写原有Vue原型上的_init方法
    // 先将原来的函数保存在常量_init中
    const _init = Vue.prototype._init
    Vue.prototype._init = function (options = {}) {
      options.init = options.init
        ? [vuexInit].concat(options.init)
        : vuexInit
        // 将初始化方法作为原有init的参数传入，所以在vue初始化的时候就会执行vuexInit方法来初始化vuex
      _init.call(this, options)
    }
  }

  /**
   * Vuex init hook, injected into each instances init hooks list.
   */
  // vuex的初始化钩子 
  function vuexInit () {
    const options = this.$options
    // store injection
    // 注入store
    if (options.store) {
      this.$store = typeof options.store === 'function'
        ? options.store()
        : options.store
    } else if (options.parent && options.parent.$store) {
      this.$store = options.parent.$store
    }
  }
}

```
plugins文件夹中，主要是关于插件相关的内容

devtool.js，是关于是当用户开启vue-devtools时，触发了一些操作

```js
// 通过全局变量__VUE_DEVTOOLS_GLOBAL_HOOK__，判断是否开启vue-devtools
const devtoolHook =
  typeof window !== 'undefined' &&
  window.__VUE_DEVTOOLS_GLOBAL_HOOK__

export default function devtoolPlugin (store) {
  if (!devtoolHook) return

  store._devtoolHook = devtoolHook
  // vue-devtool自身实现了一套事件机制，有兴趣可以看看其中的实现
  devtoolHook.emit('vuex:init', store)

  devtoolHook.on('vuex:travel-to-state', targetState => {
    //用targetState替换当前的state
    store.replaceState(targetState)
  })
  // 当触发commit的时候执行这个方法
  store.subscribe((mutation, state) => {
    // devtoolHook会emit一个vuex:mutation事件
    devtoolHook.emit('vuex:mutation', mutation, state)
  })
}
```
logger.js是在开发过程中记录日志的插件

```js
// Credits: borrowed code from fcomb/redux-logger
// 引入深拷贝方法
import { deepCopy } from '../util'

export default function createLogger ({
  collapsed = true,
  filter = (mutation, stateBefore, stateAfter) => true,
  transformer = state => state,
  mutationTransformer = mut => mut
} = {}) {
  return store => {
    // 保存原有的state
    let prevState = deepCopy(store.state)
    // 监听state的变化
    store.subscribe((mutation, state) => {
      if (typeof console === 'undefined') {
        return
      }
      //深拷贝并且获取新的state
      const nextState = deepCopy(state)

      if (filter(mutation, prevState, nextState)) {
        // 获取当前时间
        const time = new Date()
        // 格式化时间
        const formattedTime = ` @ ${pad(time.getHours(), 2)}:${pad(time.getMinutes(), 2)}:${pad(time.getSeconds(), 2)}.${pad(time.getMilliseconds(), 3)}`
        // 格式化mutation
        const formattedMutation = mutationTransformer(mutation)
        // 获取输出的信息
        const message = `mutation ${mutation.type}${formattedTime}`
        // 在 Web控制台上创建一个新的分组.随后输出到控制台上的内容都会被添加一个缩进
        const startMessage = collapsed
          ? console.groupCollapsed
          : console.group

        // render
        try {
          // 输出日志
          startMessage.call(console, message)
        } catch (e) {
          console.log(message)
        }

        console.log('%c prev state', 'color: #9E9E9E; font-weight: bold', transformer(prevState))
        console.log('%c mutation', 'color: #03A9F4; font-weight: bold', formattedMutation)
        console.log('%c next state', 'color: #4CAF50; font-weight: bold', transformer(nextState))

        try {
          console.groupEnd()
        } catch (e) {
          console.log('—— log end ——')
        }
      }
      // 替换state
      prevState = nextState
    })
  }
}
```

至于util.js,内部提供一些简单的工具方法，不再赘述啦~可自行研究
**---------------------------------------------------最后的分割线--------------------------------------------------------------------------------**

以上，便是vuex源码的所有内容。。不管写的怎么样，你都看到这里啦，对此**深表感谢**~

