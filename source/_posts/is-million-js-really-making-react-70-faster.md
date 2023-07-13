---
title: Million.js 真的比 React 快 70% 吗
date: 2023-07-13 22:09:00
tags: 翻译
---

![cover.webp](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ad072d8f3e4d4ea1a6e953d72ac4bde7~tplv-k3u1fbpfcp-watermark.image?)

Aiden Bai 为 React 开发者发布了新版本的 Million 库。

这个项目并不新鲜。 它于 2021 年 6 月 13 日发布了 0.0.9 版本。

[最新版本](https://github.com/aidenybai/million) 编号为 2.4.4，并且表明了该项目现在相当稳定。

它带来了一些小的改进，但这不是最重要的。

由于首页上的声明：


![p1.webp](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8d5a168bed6d42358b57e919f28e3d61~tplv-k3u1fbpfcp-watermark.image?)

至少这是我所看到的在网速较慢的时候加载页面的情况 😅

一段时间后，可以看到计数器上升：


![p2.webp](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bccf4ef6220e49febdd052b92f9f06fc~tplv-k3u1fbpfcp-watermark.image?)

React 本身相当快， React + Vite 提供了很棒的开发体验

有什么办法可以让终端用户感受到 [页面变得更快](https://million.dev/) ？

为了回答这个问题，我浏览了技术文档，解释了 Million 如何改进 diff 和 reconciliation

如果你还不熟悉 React，这里有一个对其工作原理的简短回顾：

React 创建了一个称为 Virtual DOM 的结构 。React 不操作真正的 DOM，而是操作 VDOM。从历史上看，它很有用，因为 DOM 操作很慢。

当需要更新真实 DOM 时，React 会比较 DOM 和 VDOM 以将它们进行同步。

整个过程分为两部分。 一种称为 diff， 它是在寻找差异。 reconciliation 是决定 VDOM 更改是否应应用于 DOM 的过程。

总而言之，它像是一个专家，缓存和同步整个系统，来减少操作真实 DOM 的频率。

这个过程非常好，但也需要一些权衡。React 并不真正知道组件树中发生了什么变化。 所以它必须遍历树并找到发生变化的节点。

这意味着对于一个比较大的 DOM，比如一张表，一个小小的变化就会触发大量的计算，纯粹是为了弄清楚发生了什么变化。

假设你有一张表格，以表格形式显示你的兽医诊所患者。 你有 100 名患者，并注意到为新患者提供了错误的姓名。 你需要改变了一只猫的名字。

这个时候，React 可能需要检查 100 行和 10 列才能查看发生了什么变化才能更新 DOM。 这种行为是比较损耗性能的。

Million 不会将组件视为黑盒，只查看它将渲染的内容以及结果是否与之前的渲染不同


![p3.webp](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a401bacb88f64ac8a7461eb7b985cdb5~tplv-k3u1fbpfcp-watermark.image?)

Million 通过检查组件的状态来识别哪些组件会受到变化的 `树传播`的影响。 这意味着它能够更快地找出许多静态组件中必须更新的组件。

> “树传播”（tree propagation）在 React 中通常指的是组件之间通过虚拟 DOM 树进行的更新传递过程。当某个组件的状态发生变化时，React 会通过重新渲染虚拟 DOM 树来确定哪些组件需要更新，并将这些更新传播到整个组件树中受影响的组件。这个过程被称为树传播，因为更新从根组件开始，逐级向下传递到叶子组件。这种机制可以有效地减少不必要的重新渲染，提高性能

这种能力是 Million.js 库的核心。 官方网站上有一个交互式演示来说明结果：


![p4.webp](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d0fe8cedffe845bda291d5e868612b24~tplv-k3u1fbpfcp-watermark.image?)

单击 Million.js 时没有任何反应，单击 React 按钮会向我们显示红色的故障动画。

还有一个由 Stefan Krause 开发的 JS 框架速度基准的[链接](https://krausest.github.io/js-framework-benchmark/2023/table_chrome_112.0.5615.49.html)。

在比较 React 和 Million.js 之后，我们将看到这样的结果：


![p5.webp](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5ed2b6df14244030b41fb27e302674ab~tplv-k3u1fbpfcp-watermark.image?)

我们可以看到指标都有不错的提升。

「选择行（select row）」和「交换行（swap rows）」也相当快。 速度几乎和 vanilla JS 一样。 我们看到 Million.js 使 React 速度提高了 4-5 倍

Million.js 页面没有提供方法，因此很难重现 benchmark 中的 70% 数字

但可以肯定的是，benchmark 显示了一些重要的性能改进，而且我确信在某种情况下会达到这个数字。

我喜欢 Million.js 的一点是，你只能将它用于某些组件，这意味着根据需求将其引入更大的项目应该很容易，而且不会有灾难性的风险。

因此，如果仅更改 UI 的一部分并且你的 React 应用程序出现卡顿，Million.js 将帮助你修复它。

真是一个精美的工程作品。 我很喜欢！

本文为翻译文，原文地址 [在这里](https://medium.com/@tomaszs2/is-million-js-really-making-react-70-faster-255356f6c179)