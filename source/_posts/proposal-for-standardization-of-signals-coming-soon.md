---
title: 【未来已来】Signal 让状态管理成为标准 ？！
date: 2024-04-23 19:43:00
tags: 翻译
---

在前端开发的世界里,状态管理一直是一个热门话题。随着 Web 应用变得越来越复杂,对高效可靠的状态管理解决方案的需求也在不断增长。在 2022 年,JavaScript 世界出现了一个新概念:Signals。这个想法曾一度被炒作为前端状态管理的未来。

最近,*Rob Eisenberg* 和 *Daniel Ehrenberg* 正式发布了 Signals 的 TC39 标准草案。目前处于 Stage 0 阶段。他们还推出了一个兼容的 polyfill。

![https://github.com/proposal-signals/proposal-signals](/imgs/post/proposal-for-standardization-of-signals-coming-soon/p1.jpg)

https://github.com/proposal-signals/proposal-signals

# 我们为什么需要 Signals

Signal 是一种用于 JavaScript 应用程序的响应式状态管理机制。旨在简化和优化数据更新。Signal就像一个数据容器。当数据发生变化时,依赖于 Signal 的计算或副作用可以自动更新。

每个 Signal 都是一个值的来源。当值发生变化时，Signal 会确保所有依赖的状态(或其他 Signal )都得到通知和更新。这形成了一个依赖关系图。这种状态管理方法很清晰，因为数据是单向流动的,并且是可追踪的。

在现代 Web 应用程序中,我们经常需要根据数据变化同步更新 UI 。传统的解决方案，如事件监听器和回调，在大型应用程序中是难以维护的。React 等框架提供了一些解决方案。但每个框架都有自己的状态管理模式，在项目之间共享或切换时可能会造成不可预知的问题。

另一个问题是不同状态管理系统之间难以协同工作。标准化的 Signal 机制可以提供一个框架无关的标准。无论使用何种库或框架，状态管理都将遵循相同的模式来运行。

因此,如果 Signal 真正实现标准化,它将统一各个框架的状态管理。这将是非常有意义的事情。

# Signals 的优势

- 更加简化的响应式编程：使用 Signal，开发者无需深入理解复杂的响应式系统，就能更直观地创建和管理状态。
- 自动化状态追踪和更新：当你更新一个 Signal 时，所有依赖的函数和表达式都会自动重新计算。无需手动调用更新函数。
- **高性能：Signal 通常采用惰性求值和记忆化。这意味着只在数据被使用时才进行计算。如果依赖没有变化，就不会重复计算，减少了不必要的计算量。**
- 跨框架的统一: Signal 的目标是创建一个通用标准。这将有助于不同前端框架之间的兼容,提高协同开发效率。

# Signals 简易用法

Signals 的 API 设计是非常简单易懂的。我们创建一个简单例子看看

```jsx
const counter = new Signal.State(0);
```

给 Signal 的值赋值

```jsx
// 读取 Signal 的值
console.log(counter.get()); // 输出: 0

// 修改 Signal 的值
counter.set(1);
console.log(counter.get()); // 输出: 1
```

以上代码使用 `get()` 和 `set()` 方法来访问和修改 Signal 的值。
你也可以创建计算型 Signal，称为 `Signal.Computed`，它依赖于其他 Signal 的状态。这些 Signal 会跟踪其他 Signal 的状态，并提供一个新的计算值。

```jsx
// 基于上面的 counter Signal， 创建一个计算型的 Signal
const isEven = new Signal.Computed(() => (counter.get() & 1) === 0);
```

计算型 Signals 不需要手动设置新值，因为它们会根据其他 Signals 的状态动态计算自己的值。
Signals 使用所谓的"拉-推"(pull-push)模型:在"推"阶段,当一个 Signal 变"脏"(它的值发生了变化)时,它会递归地将"脏"状态传递给所有依赖的 Signals , 所有潜在的重新计算都会被推迟,直到获取到一个明确的 Signals 值。

```jsx
// 更新counter Signal 并同时更新依赖的计算型 Signal。
counter.set(17);
console.log(isEven.get()); // 输出: false
```

每次调用 `get()` 方法时,如果 Signal 的状态是“脏”的, 它会在内部检查所有的依赖项。如果任何依赖项发生了变化,它会自动重新计算并返回新的值。这种惰性求值和缓存的结合带来了几个主要优势:

- 自动跟踪:消除了手动更新的复杂性,增强了响应式编程能力。
- 性能优化:只在必要时进行计算,避免不必要的计算和更新。
- 一致性:确保状态在相应的 UI 渲染或任何依赖项中保持同步更新。
- 易于集成: Signal 可以轻松集成到各种 JavaScript 库和框架中。

我们也可以基于 Signal 编写更加复杂的功能

```jsx
const parity = new Signal.Computed(() => isEven.get() ? "even" : "odd");

counter.set(17);
console.log(parity.get()); // 输出: odd
```

当状态值改变时，我们通知 UI 进行重新渲染

```jsx
effect(() => element.innerText = parity.get());
```

# Signals 标准化提案

这是最新公开的 Signals TC39 提案的类型提示。它提供了整体 API 设计的一部分。然而,这个提案仍处于早期阶段,未来 API 可能会有明显的变化。

```jsx
interface Signal<T> {
  // 获取 Signal 的值
  get(): T;
}

namespace Signal {
    // 一个可读可写的 signal
    class State<T> implements Signal<T> {
        // 创建一个带初始值的 signal
        constructor(t: T, options?: SignalOptions<T>);

        // 设置 signal 的值为 t
        set(t: T): void;
    }

    // 一个基于其他 signal 的 signal
    class Computed<T> implements Signal<T> {
        // 创建一个基于回调函数返回值的 signal
        // 回调函数内部的 ‘this’ 会指向 signal 本身
        constructor(cb: (this: Computed<T>) => T, options?: SignalOptions<T>);
    }

    // 此命名空间包含一些“高级”功能，通常是留给框架作者而不是应用程序开发人员。
    // 类似于 `crypto.subtle`
    namespace subtle {
        // 执行一个回调函数并让所有的内部跟踪都失效
        function untrack<T>(cb: () => T): T;

        // 如果存在，则获取正在跟踪任何 Signal 读数的当前Signal
        function currentComputed(): Computed | null;

        // 返回一个有序列表，其中包含 Signal 在最后一次计算中引用的其他 Signal。
        // 对于一个 Watcher 对象,列出它正在 watch 的 Signal 集合:
        function introspectSources(s: Computed | Watcher): (State | Computed)[];

        // 返回包含此 Signal 的 Watcher 对象,以及读取此 Signal 的任何 Signal
        // (如果 Signal 正在被(递归地) watch)
        function introspectSinks(s: State | Computed): (Computed | Watcher)[];

        // 如果这个 Signal 是"活跃的"，即它正在被一个 Watcher 对象 watch，
        // 或者正在被一个（递归）活跃的 Signal 读取。
        function hasSinks(s: State | Computed): boolean;

        // 如果这个 Signal 是"响应式"的,也就是说,它依赖于其他一些信号。
				// 如果一个 Signal 没有源 Signal(即 hasSources 为false),它总是返回相同的常量。
        function hasSources(s: Computed | Watcher): boolean;

        class Watcher {
            // 当 Watcher 的一个(递归) Signal 被写入时,
						// 如果自上次调用 watch 以来还没有调用过此回调函数,则调用此回调函数。
						// 在通知期间,不允许进行 Signal 读取或写入。
            constructor(notify: (this: Watcher) => void);

            // 将这些 Signal 添加到 Watcher 的集合中，设置 Watcher 在其集合（或其依赖项）中的任何 Signal 发生变化时运行其通知回调函数。
						// 它也可以在不带参数的情况下被调用，只是为了重置 "notified" 状态，以便通知回调函数可以再次被触发。
            watch(...s: Signal[]): void;

            // 从观察集合中移除这些 Signal(例如,对于已经处理过的效果)。
            unwatch(...s: Signal[]): void;

						// 返回 Watcher 集合中仍然为"dirty"的源 Signal 集合，
						// 或者是带有"dirty"或待处理且尚未重新评估的源Signal的Signal。
            getPending(): Signal[];
        }

        // 开始和停止 watch 监听的钩子
        var watched: Symbol;
        var unwatched: Symbol;
    }

    interface Options<T> {
				// 自定义比较函数，用于比较新旧值是否相同。默认为 Object.is。
				// Signal 对象本身会作为 this 值传递，以提供上下文。
        equals?: (this: Signal<T>, t: T, t2: T) => boolean;

        // 当 isWatched 变为 true 时的回调函数（之前为 false）
        [Signal.subtle.watched]?: (this: Signal<T>) => void;

        // 当 isWatched 变为 false 时的回调函数（之前为 true）
        [Signal.subtle.unwatched]?: (this: Signal<T>) => void;
    }
}
```

# Signals 在实际开发中的使用

目前,许多流行的组件库和渲染框架都在使用 Signals。假设你是一个开发者,想要创建一个基于 Signals 的库,或者在这些原始能力之上构建一个应用程序状态层。代码会是什么样子呢?

我们之前通过 `Signal.State()` 解释了 Signals 的基础原理，并从中学习到一些知识。如果不依赖第三方框架的 API ，那么 `Signal.Computed()` 和 `Signal.State()` 是开发人员需要经常使用到的两个主要 API。它们可以用来表示独立的响应式状态和计算,或者与其他 JavaScript 结构(如类)结合使用。下面是一个使用 Signals 来表示其内部状态的 `Counter` 类的示例:

```jsx
class Counter {
  // 通过 Signal state 来初始化 count 的值
  count = new Signal.State(0);

  // 获取当前 count 的值
  getCount() {
    return this.count.get();
  }

  // 让 count 的值加 1
  increment() {
    this.count.set(this.count.get() + 1);
  }

  // 让 count 的值减 1
  decrement() {
    this.count.set(this.count.get() - 1);
  }

  // 一个计算型 Signal ，它的值取决于 count 是否是偶数
  isEven = new Signal.Computed(() => (this.count.get() % 2) === 0);

  // 一个计算型 Signal ，它的值取决于 isEven 为 true 还是 false 来返回对应的字符串
  parity = new Signal.Computed(() => this.isEven.get() ? "even" : "odd");
}

// 使用
const counterInstance = new Counter();
console.log(counterInstance.getCount()); // 输出: 0

counterInstance.increment();
console.log(counterInstance.getCount()); // 输出: 1
console.log(counterInstance.parity.get()); // 输出: "odd"

counterInstance.increment();
console.log(counterInstance.getCount()); // 输出: 2
console.log(counterInstance.isEven.get()); // 输出: true
```

Signals 与装饰器(decorators)一起使用也非常方便。我们可以创建一个 `@signal` 装饰器,将 `getters` 和 `setters` 转换为 Signals,如下所示:

```jsx
export function signal(target) {
  const { get } = target;

  return {
    get() {
      return get.call(this).get();
    },

    set(value) {
      get.call(this).set(value);
    },

    init(value) {
      return new Signal.State(value);
    },
  };
}
```

然后我们通过装饰器来减少不必要的模版代码并提升 `Counter` 类的可读性，具体如下

```jsx
class Counter {
  @signal
  count = 0; // 这个会自动转换为一个 Signal 的值

  // 让 count 的值加 1
  increment() {
    this.count++; // 会在背后更新 Signal 的值
  }

  // 让 count 的值减 1
  decrement() {
    this.count--; // 同样，也会更新 Signal 的值
  }

  // 检查 count 是否为偶数的计算属性
  @signal
  get isEven() {
    return this.count % 2 === 0;
  }

  // 检查 isEven 是否为 true 并返回的相应字符串的计算属性
  @signal
  get parity() {
    return this.isEven ? "even" : "odd";
  }
}

// 使用
const myCounter = new Counter();
console.log(myCounter.count); // 输出: 0

myCounter.increment();
console.log(myCounter.count); // 输出: 1
console.log(myCounter.parity); // 输出: "odd"

myCounter.increment();
console.log(myCounter.count); // 输出: 2
console.log(myCounter.isEven); // 输出: true
```

这些是 Signals 的基本示例，它利用了两个最简单的 API。当然， Signals 的使用方式还有很多，每个人都可以做进一步的探索。

# **Signals 的常见问题**

该提案还描述了开发者对 Signals 的一系列问题。以下是我挑选的一些热门问题：

问：由于 Signals 在2022年才开始流行，现在就对 Signals 的相关内容进行标准化是不是有点仓促？我们是否应该给它们更多的时间来发展？

答：目前 Web 框架中 Signals 的状态是十多年持续发展的结果。近年来，几乎所有的 Web 框架都在向一个非常相似的 Signals 核心模型聚拢。这个提案是多个 Web 框架核心贡献者共享设计的结果，如果没有来自各种环境领域专家的验证，是不会仓促进行标准化的。

问: Signal API 是给应用开发者直接使用还是由框架封装后使用？
答: 虽然应用开发者可以直接使用这个 API（至少是 `Signal.subtle` 命名空间之外的部分），但 API 的设计更侧重于满足库/框架作者的需求。实际上，通过框架使用 Signal 通常是最佳选择。框架内部会专注于更复杂的功能（例如 Watcher、untrack），以及管理所有权和销毁（例如决定何时向 Watcher 添加或删除 Signal）并安排渲染到 DOM。

问: Signal 是与虚拟 DOM (VDOM) 配合使用，还是直接与底层的 HTML DOM 交互？
答: Signal 独立于渲染技术。使用类似 Signal 结构的现有 JavaScript 框架已经与虚拟 DOM（例如 React）、原生 DOM（例如 Solid）以及两者的组合（例如 Vue）集成。内置的 Signal 也将能够做到这一点。

问: Signal 是否适用于 SSR、Hydration 和 Resumability？
答: 是的，Qwik 已经成功使用 Signal 提供了这些特性，其他框架也根据不同的权衡和考虑因素开发出成熟的方法来处理 Hydration。我们相信 State 和 Computed signal Hook 可以一起使用来模拟 Qwik 的 Resumability Signal，我们将在未来提供相关的示例代码。

问: Signal 是否支持像 React 那样的单向数据流？
答: 是的，Signal 是单向数据流的机制。基于 Signal 的 UI 框架允许你将视图表示为模型（包含 Signal）的函数。构建时，由 state 和 computed Signal 形成的图结构是非循环的。在 Signal 中复制与 React 相同的模式也是有可能的！例如，在 useEffect 中使用 setState 类似于在 Signal 中使用 Watcher 来调度对 State signal 的写入。

问: Signal 与 Redux 等状态管理系统有什么关系？Signal 是否鼓励非结构化状态？
答: Signal 可以高效地成为状态管理 store 的抽象基础能力。在许多框架中，常见的做法是使用 Proxy 对象，内部属性由 Signal 表示，如 Vue 的响应式系统或 Solid 框架中的 store。

问: Signals 可以实现哪些 Proxy 无法处理的功能？
答: Proxy 必须包装一个对象。它们无法拦截对数字、字符串或符号等原始数据类型的属性的访问/赋值。下面是一个 Signals 可以做到而 Proxy 无法做到的例子

```jsx
new Proxy(0, { ... }) // ❌ TypeError: Cannot create a proxy with a non-object as target or handler

new Signal.State(0); // ✅
```

# **Signals Polyfill**

如果你迫不及待地想在项目中尝试 Signals，可以先看看这个 polyfill 

https://github.com/proposal-signals/proposal-signals/tree/main/packages/signal-polyfill

> 由于该提案仍处于早期阶段,并且 API 设计在未来可能会发生变化,因此 **不建议** 在生产环境中使用它
> 

# 总结

Signal 是 JavaScript 状态管理中十分重要且不断发展的一部分。它们提供了一种新的方式来创建响应式和高效的 Web 应用程序。虽然 Signal  提案仍在完善中,但 polyfill 为前端开发的未来提供了一个新的开端。与任何新技术一样,谨慎行事并关注官方进展至关重要。现在就开始进行尝试吧，让我们期待 Signal 为 Web 应用带来更加创新和高效的解决方案!

如果你发现这篇博文有帮助，欢迎与其他人分享。 你还可以关注我，了解有关 AI、 Javascript、React 和其他 Web 开发主题的更多内容。与往常一样，如果你有任何疑问，请随时与我联系或发表评论。如果大家遇到任何问题，欢迎 [联系我](https://juejin.cn/user/1275089217142663/pins) 或者直接微信添加 superZidan41。祝你编程愉快！