---
title: 现代前端框架的重要概念
date: 2023-01-01 19:13:00
tags: 翻译
---


许多初学者经常会问 “我需要学习哪个框架 ？” 以及 “学习框架前需要掌握多少 JS 或者 TS ？” 无数带有主观色彩的文章都在宣传作者首选框架或库的优势，而不是向读者展示其背后的概念以做出更明智的决定。所以让我们先解决第二个问题

# 学习框架前需要掌握多少 JS 或者 TS

尽可能多地去学以让更好的你理解它们所基于的概念。你将需要了解基本数据类型、函数、基本运算符和文档对象模型 ( DOM )，这是 HTML 和 CSS 在 JS 中的表示。除此之外的一切也都 OK，但并不严格要求某个精通框架或库。

如果你是一个完完全全的新手，[JS for cats](http://jsforcats.com/) 应该是一个不错的入门资料。持续学习，直到你感到自信为止，然后继续前进，直到你再次感到自信为止。当掌握了足够的 JS / TS 知识后，你就可以开始学习框架。其他的知识你可以并行学习。

# 哪些重要概念

-   State （状态）
-   Effects （副作用）
-   Memoization （记忆化）
-   Templating and rendering （模板与渲染）

所有现代框架都从这些概念中派生出它们的功能

## state
State 只是为你的应用程序提供动力的数据。它可能在全局级别，适用于应用程序的大部分组件，或适用于单个组件。让我们写一个计数器的简单例子来说明一下。它保留的计数是 state 。我们可以读取 state 或者写入 state 以增加计数

最简单的表示通常是一个变量，其中包含我们的状态所包含的数据：
```js
let count = 0; 
const increment = () => { count++; }; 
const button = document.createElement('button'); 
button.textContent = count; 
button.addEventListener('click', increment); 
document.body.appendChild(button);
```
但这个代码有个问题：类似调用 `increment` 方法一样去修改 `count` 的值 ，并不会自动修改 button 的文案。我们需要手动去更新所有的内容，但这样的做法在复杂场景下代码的可维护性 & 扩展性都不是很好。

让 `count` 自动更新依赖它的使用方的能力称之为 ***reactivity（响应式）***。这是通过订阅并重新运行应用程序的订阅部分来更新的。

几乎所有的现代前端框架和库都拥有让 state 变成 reactivity 的能力。基本上可以分为 3 种解决方案，采用其中至少一种或者多种混用来实现这个能力：

-   Observables / Signals （可观察的 / 信号）
-   Reconciliation of immutable updates （协调不可变的更新）
-   Transpilation （转译）

这些概念还是直接用英文表达比较贴切 🤣

### Observables / Signals （可观察的 / 信号）

Observables 基本上是在读取 state 的时候通过一个订阅方法来收集依赖，然后在更新的时候触发依赖的更新
``` js
const state = (initialValue) => ({
  _value: initialValue,
  get: function() {
    /* 订阅 */;
    return this._value; 
  },
  set: function(value) {
    this._value = value;
    /* 触发更新 */;
  }
});
```

[knockout](https://knockoutjs.com/) 是最早使用这个概念的框架之一，它使用带有 / 不带参数的相同函数进行写/读访问

这种模式最近有开始有框架通过 signals 来实现，比如 [Solid.js](https://www.solidjs.com/docs/latest/api#createsignal) 和 [preact signals](https://preactjs.com/guide/v10/signals/) ；相同的模式也在 [Vue](https://vuejs.org/) 和 [Svelte](https://svelte.dev/) 中使用到。RxJS 为 Angular 的 reactive 层提供底层能力，是这一模式的延伸，超越了简单状态。[Solid.js](https://www.solidjs.com/) 用 Stores（一些通过 setter 方法来操作的对象）的方式进一步抽象了 signals

### Reconciliation of immutable states（协调不可变的更新）
不可变意味着如果对象的某个属性发生改变，那么整个对象的引用就会发生改变。所以协调器做的事情就包括通过简单的引用对比就判断出对象是否发生了改变

```js
const state1 = {
  todos: [{ text: 'understand immutability', complete: false }],
  currentText: ''
};
// 更新 currentText 属性
const state2 = {
  todos: state1.todos,
  currentText: 'understand reconciliation'
};
// 添加一个 todo
const state3 = {
  todos: [
    state1.todos[0],
    { text: 'understand reconciliation', complete: true }
  ],
  currentText: ''
};

// 由于不可变性，这里将会报错
state3.currentText = 'I am not immutable!';
```

如你所见，未变更项目的引用被重新使用。如果协调器检测到不同的对象引用，那么它将重新运行所有的组件，让所有的组件的 state （props, memos, effects, context） 都使用最新的这个对象。由于读取访问是被动的，所以需要手动指定对响应值的依赖。

很显然，你不会用上面这种方式定义 state 。要么你是从一个已经存在的属性构造 state ，要么你会使用 `reducer` 来构造 state。一个 reducer 函数就是接收一个 state 对象然后返回一个新的 state 对象。

[react](https://reactjs.org/) 和 [preact](https://preactjs.com/) 就使用这种模式。它适合与 vDOM 一起使用，我们将在稍后描述模板时探讨它。

并不是所有的框架都借助 vDOM 将 state 变成完成响应式。例如 [Mithril.JS](https://mithril.js.org/components.html#state) 要不是在 state 修改后触发对应的生命周期事件，要不是手动调用 `m.redraw()` 方法，才能够触发更新


### Transpilation（转译）
Transpilation 是在构建阶段，重写我们的代码让代码可以在旧的浏览器运行或者赋予代码其他的能力；在这种情况下，转译则是被用于把一个简单的变量修改成响应式系统的一部分。

[Svelte](https://svelte.dev/) 就是基于转译器，该转译器还通过看似简单的变量声明和访问为他们的响应式系统提供能力

另外，[Solid.js](https://solidjs.com/) 也是使用 Transpilation ，但 Transpilation 只使用到模版上，没有使用到 state 上

## Effects
大部分情况下，我们需要做的更多是操作响应式的 state，而很少需要操作基于 state 的 DOM 渲染。我们需要管理好副作用，这些副作用是由于视图更新之外的状态变化而发生的所有事情（虽然有些框架把视图更新也当作是副作用，例如 [Solid.js](https://solidjs.com/) ）

记得之前 state 的例子中，我们故意把订阅操作的代码留空。现在让我们把这些留空补齐来处理副作用，让程序能够响应更新

``` js
const context = [];

const state = (initialValue) => ({
  _subscribers: new Set(),
  _value: initialValue,
  get: function() {
    const current = context.at(-1);
    if (current) { this._subscribers.add(current); }
    return this._value;
  },
  set: function(value) {
    if (this._value === value) { return; }
    this._value = value;
    this._subscribers.forEach(sub => sub());
  }
});

const effect = (fn) => {
  const execute = () => {
    context.push(execute);
    try { fn(); } finally { context.pop(); }
  };
  execute();
};
```

上面代码基本上是对 [preact signals](https://preactjs.com/guide/v10/signals/) 或者 [Solid.js](https://solidjs.com/) 响应式 state 的简化版本，它不包含错误处理和复杂状态处理（使用一个函数接收之前的状态值，返回下一个状态值），但这些都是很容易就可以加上的

这允许我们使前面的示例具有响应性：

``` js
const count = state(0);
const increment = () => count.set(count.get() + 1);
const button = document.createElement('button');
effect(() => {
  button.textContent = count.get();
});
button.addEventListener('click', increment);
document.body.appendChild(button);
```

> ☝ 可以尝试运行一下上面 Effect 的两个代码块的例子，源代码地址在 [这里](https://github.com/zidanDirk/concepts-behind-modern-frameworks/tree/master/effects)

在大多数情况下，框架允许在不同生命周期，让 Effect 在渲染 DOM 之前、期间或之后运行。

## Memoization
Memoization 意味着缓存 state 值的计算结果，并且在结果的依赖发生改变的时候进行更新。它基本上是一种返回派生（derived） state 的 Effect

在某些会重新运行其组件函数的框架中，如 react 和 preact，允许在它所依赖的状态没有改变时避免这部分组件重新渲染

对于其他框架，情况恰恰相反：它允许你选择部分组件进行响应式更新，同时缓存之前的计算

对于我们简单的响应系统，memo 大概是这样实现

```js
const memo = (fn) => {
  let memoized;
  effect(() => {
    if (memoized) {
      memoized.set(fn());
    } else {
      memoized = state(fn());
    }
  });
  return memoized.get;
};
```

## Templating and rendering

现在有了原始的、派生的和缓存形式的 state，我们想把它展示给用户。在我们的例子中，我们直接操作 DOM 来添加按钮和更新按钮的内容文案。

为了提升开发体验，几乎所有的现代框架都支持 [DSL](https://baike.baidu.com/item/%E9%A2%86%E5%9F%9F%E7%89%B9%E5%AE%9A%E8%AF%AD%E8%A8%80/2826893) 来在代码中编写类似于所需输出的内容。虽然有不同的风格，比如 `.jsx` ，`.vue` ，`.svelte` 文件，但这一切都归结为用类似于 HTML 的代码来表示 DOM。所以基本上是

``` jsx
<div>Hello, World</div>

// 在你的 JS 代码中
// 变成你的 HTML:

<div>Hello, World</div>
```

你可以能会问：“在哪里放置我的 state ?”。非常好的问题，大部分的情况 下，`{}` 用于在属性和节点中表达动态内容。

最常用的 JS 模板语言扩展无疑是 JSX。在 react 中，它被编译为存粹的 JavaScript 语言，允许创建对于 DOM 的虚拟表示，也就是经常被提到的「虚拟文档对象」或者简称为 vDOM。

这是基于创建 JS 对象比访问 DOM 快得多的前提，所以如果你可以用创建 JS 对象替换访问 DOM，那么你就可以节省时间

然而，如果你的项目在任何情况下都没有大量的 DOM 修改或者只是创建不需要修改的对象；那么上面这个方案的优点就会变成缺点，那这个时候就需要使用 memoization 来将缺点的影响降到最小。

```js
// 1. 源代码
<div>Hello, {name}</div>

// 2. 转译成 js 代码
createElement("div", null, "Hello, ", name);

// 3. 执行 js 后返回的对象
{
  "$$typeof": Symbol(react.element),
  "type": "div",
  "key": null,
  "ref": null,
  "props": {
    "children": "Hello, World"
  },
  "_owner": null
}

// 4. 渲染 vdom
/* HTMLDivElement */<div>Hello, World</div>
```

JSX 不仅仅用在 react，也用在了 Solid.js。例如，使用 Solid 转译器更彻底地改变代码

``` jsx
// 1. 源代码
<div>Hello, {name()}</div>

// 2. 转译成 js 代码
const _tmpl$ = /*#__PURE__*/_$template(`<div>Hello, </div>`, 2);
(() => {
  const _el$ = _tmpl$.cloneNode(true),
    _el$2 = _el$.firstChild;
  _$insert(_el$, name, null);
  return _el$;
})();

// 3. 渲染 vdom
/* HTMLDivElement */<div>Hello, World</div>
```

虽然转译之后的代码一开始看到会觉得挺吓人，但它更容易解释其中代码的逻辑。首先，模版的静态部分被创建出来；然后，创建出来的对象被克隆并创建一个新的实例，新的实例包含被添加的动态部分，以及将动态部分的更新与 state 的更新关联起来。

Svelte 在转译的时候做的工作更多，不仅仅处理了模版，还处理了 state

``` js
// 1. 源代码
<script>
let name = 'World';
setTimeout(() => { name = 'you'; }, 1000);
</script>

<div>Hello, {name}</div>

// 2. 转译成 js 代码
/* 生成自 Svelte v3.55.0 版本 */
import {
        SvelteComponent,
        append,
        detach,
        element,
        init,
        insert,
        noop,
        safe_not_equal,
        set_data,
        text
} from "svelte/internal";

function create_fragment(ctx) {
        let div;
        let t0;
        let t1;

        return {
                c() {
                        div = element("div");
                        t0 = text("Hello, ");
                        t1 = text(/*name*/ ctx[0]);
                },
                m(target, anchor) {
                        insert(target, div, anchor);
                        append(div, t0);
                        append(div, t1);
                },
                p(ctx, [dirty]) {
                        if (dirty & /*name*/ 1) set_data(t1, /*name*/ ctx[0]);
                },
                i: noop,
                o: noop,
                d(detaching) {
                        if (detaching) detach(div);
                }
        };
}

function instance($$self, $$props, $$invalidate) {
        let name = 'World';

        setTimeout(
                () => {
                        $$invalidate(0, name = 'you');
                },
                1000
        );

        return [name];
}

class Component extends SvelteComponent {
        constructor(options) {
                super();
                init(this, options, instance, create_fragment, safe_not_equal, {});
        }
}

export default Component;

// 3. 执行 JS 代码
/* HTMLDivElement */<div>Hello, World</div>
```

当然也有例外，在 [Mithril.js](https://mithril.js.org/) 中，虽然可以使用 JSX，但鼓励你编写 JS 代码

```js
// 1. 源代码
const Hello = {
  name: 'World',
  oninit: () => setTimeout(() => {
    Hello.name = 'you';
    m.redraw();
  }, 1000),
  view: () => m('div', 'Hello, ' + Hello.name + '!')
};

// 2. 执行 JS 代码
/* HTMLDivElement */<div>Hello, World</div>
```

有的人会觉得这样做的开发体验不太好，但有的人更希望对自己的代码有更多的控制权。这取决于他们想要解决的是哪一类的问题，缺少 transpilation 这个步骤也可能成为优点。

许多其他框架也允许在不进行 transpilation 的情况下使用，尽管很少有人这样推荐。

# “现在我应该学习什么框架或者库？”

我有一些好消息和一些坏消息要告诉你

坏消息是：没有银弹。没有任何一个框架是在所有层面都优于其他框架的。任何一个框架都有它的优点和妥协。React 有它的 hook 规则，Angular 缺乏简单的 signals，Vue 的向后兼容性问题，Svelte 的伸缩性不太好，Solid.js 禁止解构，Mithril.js 不是真正的响应式，等等

好消息是：没有错误选择 —— 除非项目的要求确实受到限制，无论是在捆绑包大小还是性能方面。每个框架都可以完成工作。有些人可能需要解决他们的设计决策，这可能会使你的速度变慢，但无论如何你都能够获得可行的结果。

话虽这么说，没有框架也可能是一个可行的选择。许多项目都被过度使用 JavaScript 破坏了，而带有一些交互性的静态页面也可以完成这项工作。

现在你已经了解了这些框架和库所应用的概念，请选择最适合你当前任务的方案。不要为下个项目的框架选型而感到担心。你不需要学习所有的内容。

如果你尝试一个新的框架，我发现最有帮助的事情之一就是关注它的社区，无论是在社交媒体、Discord、github 还是其他地方。他们可以告诉你哪些方法适合他们的框架，这将帮助你更快地获得更好的解决方案。

# 冲吧，你可以有个人喜好！

如果你的主要目标是就业，我建议学习 React 或者 Vue。 如果你想要轻松的获取性能和控制体验，请尝试 Solid.js

但请记住，所有其他选择都同样有效。 你不应该因为我这么说就选择一个框架，而应该使用最适合你的框架。

如果你看完了整篇文章，感谢你的耐心等待。 希望对你有所帮助。 在这里发表你的评论，祝你有美好的一天 🌹

> 本文原文地址：https://dev.to/lexlohr/concepts-behind-modern-frameworks-4m1g

参考文章

-   [](https://github.com/zidanDirk/concepts-behind-modern-frameworks/)<https://github.com/zidanDirk/concepts-behind-modern-frameworks/>

