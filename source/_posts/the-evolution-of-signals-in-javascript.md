---
title: JavaScript 中 Signals 的演变
date: 2023-03-06 19:26:00
tags: 翻译
---


最近，“ Signals ”一词在前端世界中引起了不小的讨论。 在看似很短的时间内，它们好像在很多前端框架中都有出现，从 [Preact](https://preactjs.com/guide/v10/signals/) 到 [Angular](https://github.com/angular/angular/discussions/49090)

但它并不是一个新事物。我们可以追溯到20世纪60年代末的研究。在其基础上，使第一个[电子表格](https://www.historyofinformation.com/detail.php?id=5478)和硬件描述语言（如 Verilog 和 VHDL ）得以实现的相同建模。

甚至在 JavaScript 中，自从声明式 JavaScript 框架诞生以来，我们就拥有了 Signal。随着时间的推移，它们已经有了不同的名字，并在这些年里不断地流行起来。但现在我们又来到了这里，现在是一个很好的时机，让我们对其产生的原因以及如何使用有更多的了解。

# 开端

有时我们会惊讶地发现，多个团队在完全相同的时间内达成了类似的解决方案。在声明式 JavaScript 框架的起步阶段，有 3 个方案在 3 个月内相继发布。[Knockout.js](https://knockoutjs.com/)（2010年7月）、[Backbone.js](https://backbonejs.org/)（2010年10月）、[Angular.js](https://angularjs.org/)（2010年10月）。

Angular 的「脏值检查」，Backbone 的 「模型驱动重复渲染」，Knockout 的「细粒度更新」。每个方案都有些许不同，但最终都成为了今天我们更新 state 和管理 DOM 的基础。

Knockout.js 对本文的主题特别重要，因为它的「细粒度更新」是建立在我们称之为 Signals 的基础上的。他们最初引入了两个概念：`observable`（状态）和 `computed`（副作用），并且在接下来的几年里在业界引入第三个概念 `pureComputed`（衍生状态）。

``` js
const count = ko.observable(0);

const doubleCount = ko.pureComputed(() => count() * 2);

// doubleCount 更新时执行 console.log
ko.computed(() => console.log(doubleCount()))
```

# 狂野大西部

![1.webp](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/44ced72628cd436881260cdca490d7a5~tplv-k3u1fbpfcp-watermark.image?)

这些模式是在服务端 MVC 开发和过去几年的 jQuery 中学到的混合模式。其中一个特别常见的模式叫做`数据绑定`，Angular.js 和 Knockout.js 都有，尽管实现方式略有不同。

`数据绑定` 是将部分状态（state）附加到视图树（view tree）某个特定部分的一个方法。可以做到的一个强大的事情是使其成为双向的。因此，我们可以让状态更新 DOM，反过来，DOM 事件自动更新状态，所有这些都是以一种简单的声明方式进行的。

然而，如果滥用这种能力，最终会搬起石头砸自己的脚。在 Angular 中，如果不知道有什么变化，就会对整个树进行肮脏的检查，向上传播可能会导致它发生多次。在 Knockout 中，由于你在树上来回走动，所以很难跟踪变化的路径，循环是很常见的。

# 无障碍

![2.webp](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5cfd599bbe124336888fa87737f5ae74~tplv-k3u1fbpfcp-watermark.image?)

随之而来的是 [React](https://reactjs.org/) 的大规模采用。一些人仍然喜欢响应式模型，而且由于 React 对状态管理没有太多的限制，所以很有可能将两者混合起来。

[Mobservable](https://mobx.js.org/)（2015）就是这种解决方案。但比起与 React 合作，它带来了新的东西。它强调一致性和无障碍传播。也就是说，对于任何给定的变化，系统的每一部分都只运行一次，而且是以适当的顺序同步运行。

它通过将先前方案中典型的基于 push 的响应式换成 push-pull 混合系统来做到这一点。变化的通知被推送出去，但派生状态的执行被推迟到读取它的地方。


![3.webp](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/37f428ecbff440debcbbbcf81de2b15a~tplv-k3u1fbpfcp-watermark.image?)

虽然这个细节在很大程度上被一个事实所掩盖，即无论如何 React 都会重新渲染读取变化的组件，但这为这些系统可调试性和一致性方面的提升迈出了重要一步。在接下来的几年里，随着算法的不断完善，我们会看到一个趋势在不断的完善。

# 征服泄漏的观察者


![4.jpeg](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3a173c73499246f5aed89a35338261af~tplv-k3u1fbpfcp-watermark.image?)

细粒度的响应性是 [观察者模式](https://baike.baidu.com/item/%E8%A7%82%E5%AF%9F%E8%80%85%E6%A8%A1%E5%BC%8F/5881786) 的一个变种。虽然这是一个强大的同步模式，但它也有一个典型的问题。一个 Signal 会保留对其订阅者的强引用，所以一个长时间存在的 Signal 会保留所有的订阅，除非是手动处理掉。

这种方式在大量使用时变得非常复杂，尤其是涉及嵌套的时候。在处理分支逻辑和树时，嵌套是很常见的，就像你在构建用户界面视图那样。

一个不太知名的库，[S.js](https://github.com/adamhaile/S)（2013），提供了答案。S.js 是独立于其他大多数解决方案而开发的，它更直接地以数字电路为模型，所有的状态变化都在时钟周期内进行。它将其状态基元称为 "Signals（信号）"。虽然不是第一次使用这个名字，但它是我们今天使用的术语的来源。

更重要的是，它引入了响应式所有权的概念。一个所有者将收集所有的子响应式作用域，并在所有者自己的 deposal 逻辑或在重新执行时管理它们的 deposal 逻辑。响应式视图将从一个根所有者开始，然后每个节点将作为其后代的所有者。这种所有者模式不仅对 deposal 很有用，而且是在响应式视图中建立 Provider / Consumer 上下文的一种机制。

# 调度

[Vue](https://vuejs.org/) (2014) 也为今天的发展提供了巨大的贡献。除了在优化一致性方面与 MobX 保持一致外，Vue从一开始就将「细粒度」的响应性作为其核心。

虽然 Vue 与 React 共享虚拟 DOM 的使用，但响应性是一流的，这意味着它首先作为一种内部机制与框架一起开发，以支持其 Options API，并在过去几年中，成为 Composition API 的核心 （2020）。

Vue 通过调度任务，将 pull / push 机制向前推进了一步。默认情况下，Vue 的修改不会立马被执行，而是要等到下一个微任务才会执行。

然而，这种调度也可以用来做一些其他的事情，比如 `keep-alive`（在没有计算成本的情况下保留屏幕外的图形），以及 `Suspense`。甚至像 [并发渲染](https://github.com/ryansolid/solid-sierpinski-triangle-demo) 这样的事情也可以用这种方法来实现，真正展示了如何获得基于 pull 和 push 的两种方法的最佳效果。

# **编译**

2019年，[Svelte 3](https://svelte.dev/blog/svelte-3-rethinking-reactivity) 向大家展示了我们可以用一个编译器做多少事情。事实上，他们把响应性完全编译掉了。这并非没有取舍，但更有趣的是，Svelte 向我们展示了一个编译器如何能抚平人体工程学的缺点。而这将继续成为前端的一个趋势。

响应性语言的特性：状态、派生状态和副作用；不仅为我们提供了描述用户界面等同步系统所需的一切，而且是可分析的。我们可以准确地知道什么地方发生了什么变化。可追溯性的潜力是深远的。

如果我们在编译时知道这一点，我们就可以少发一些 JavaScript 。我们可以在代码加载方面更加自由。这就是 [Qwik](https://www.builder.io/blog/hydration-is-pure-overhead) 和 [Marko](https://markojs.com/) 的可恢复性的基础。

# 通往未来的 Signals

> Signals 是新的 VDOM。
>
> 人们的兴趣大增：许多人正在尝试一些新的东西。这将让我们探索这个空间，尝试不同的策略，理解和优化。
>
> 不知道我们最终会确定什么，但这种集体探索是很好的! —— **Pawel Kozlowski**

鉴于这项技术有多老，说还有很多东西需要探索，可能会让人惊讶。这是因为它是一种解决方案的建模方式，而不是一种特定的技术。它所提供的是一种描述状态同步的语言，与你要让它执行的任何副作用无关。

那么，它被 Vue、Solid、Preact、Qwik 和 Angular 采用似乎也就不足为奇了。我们已经看到它进入了 Rust 的 Leptos 和 Sycamore，表明 DOM 上的 WASM 不一定很慢。它甚至被 React 考虑在引擎使用。

> 我们可能会在 React 中添加一个类似信号的基元，但我不认为这是编写 UI 代码的一个好方法。它对性能来说是很好的。但我更喜欢 React 的模式，在那里你假装每次都会重新创建整个东西。我们的计划是使用一个编译器来实现相当不错的性能提升。—— React 团队核心成员 **Andrew Clark**

也许这很合适，因为 React 的 虚拟DOM 始终只是一个实现细节。

Signals 和响应性语言似乎是事情的交汇点。但这在其第一次进入 JavaScript 的时候并不那么明显。也许这是因为 JavaScript 并不是最适合它的语言。

无论这一切的结局是什么，到目前为止都是一次相当不错的旅程。有这么多人关注 **Signals**，我迫不及待地想知道我们的下一步会是什么。

# 总结

以上简单介绍了 Javascript 中 Signals 的演变，希望对正在学习前端的你有所帮助。当然，这并不是所有的内容，后续我还会一直更新这篇文章，从更多方面去探讨前端中的 Signals。最后感谢大家对本文的支持～欢迎点赞收藏，在评论区留下你的高见 🌹🌹🌹

> 本文是翻译文，[原文地址](https://dev.to/this-is-learning/the-evolution-of-signals-in-javascript-8ob)

