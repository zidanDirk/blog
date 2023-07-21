---
title: React 18 如何提升应用性能
date: 2023-07-21 09:47:30
tags: 翻译
---

React 18 引入了并发功能，从根本上改变了 React 应用程序的渲染方式。 我们将探讨这些最新功能如何影响和提高应用程序的性能

首先，让我们退一步来了解长任务的基础知识和相应的性能测量

# 主线程和长任务

当我们在浏览器运行 JavaScript 时，JavaScript 引擎会在一个单进程环境中运行代码，而这个进程一般被称之为主进程。主线程除了负责运行代码还要处理其他的任务，比如处理用户操作（鼠标点击和键盘输入），处理网络事件，定时器管理，更新动画，管理浏览器的回流和重绘

![p1.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6a5788ad11bf40c095ed27eb372d6f6c~tplv-k3u1fbpfcp-watermark.image?)
*[主线程负责将任务一一处理]*


当一个任务正在处理的时候，其他任务就必须等待。所以如果遇到短任务，浏览器可以平滑地处理并且提供丝滑的用户体验；如果遇到长任务，浏览器会在执行的过程中卡住其他的任务，导致用户体验不佳。

任何运行时间超过 50 毫秒的任务会被任务是[「长任务」](https://web.dev/long-tasks-devtools/#what-are-long-tasks)


![p2.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4d127e91ff1549e6988541e02f0eedbe~tplv-k3u1fbpfcp-watermark.image?)

「50 毫秒基准」是由于：终端设备必须每 16 毫秒 (60 fps) 创建一个新帧才能保持流畅的视觉体验。然而，设备还必须执行其他任务，例如响应用户输入和执行 JavaScript。

「50毫秒 基准」测试允许设备将资源分配给渲染帧和执行其他任务，并为设备提供约 33.33毫秒 的额外时间来执行其他任务，同时保持流畅的视觉体验。你可以阅读[这篇文章](https://web.dev/rail/#response-process-events-in-under-50ms)来了解更多关于「50毫秒基准」的相关内容

* * *

为了保证用户体验，就必须减少长任务的数量。为了衡量网站的性能，有两个指标可以衡量长任务对应用程序性能的影响：总阻塞时间(TBT) 和 下次渲染所需等待时间 INP（Interaction to Next Paint）

TBT 是一个重要的指标来衡量 [FCP](https://web.dev/i18n/zh/fcp/) 和 [TTI](https://web.dev/i18n/zh/tti/) 之间的时间。TBT 是执行时间超过 50 毫秒的任务耗时的总和，这会对用户体验产生重大影响


![p3.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/47d3b3492eb84826b94c846285b49025~tplv-k3u1fbpfcp-watermark.image?)
*[TBT 为 45ms，因为我们有两个任务在 TTI 之前花费了超过 50ms 的时间，分别超出了 50ms 阈值 30ms 和 15ms。 TBT 是这些值的累加：30ms + 15ms = 45ms]*


INP 测量网页响应用户交互所花费的时间，从用户开始交互（比如点击了页面的按钮）到在屏幕上绘制下一帧的那一刻。这个指标对于具有很多用户交互的站点来说十分重要，比如电商网站和社交媒体平台。它是通过累积用户当前访问期间的所有 INP 测量值并返回最差分数来衡量的。


![p4.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f0713eb87d5b4e3a8d46467923ac557e~tplv-k3u1fbpfcp-watermark.image?)
*[INP 是 250 毫秒，因为最高的视觉延时是 250 毫秒]*


要了解 React18 如何针对这些测量指标进行优化从而改善用户体验，要先了解一下传统 React 的工作原理

* * *

# 传统的 React 渲染

一个视觉的更新在 react 中会被分成两个阶段：**渲染阶段（Render Phase**和 **提交阶段（Commit Phase）**。React 渲染阶段是一个纯粹的计算过程，React 元素会跟已有的 DOM 进行协调（对比）。在这个阶段中会涉及到创建一个新的 React 组件树，就是我们经常听到的 “虚拟 DOM”，它是一个轻量级的内存对象，用来表示真实的 DOM。

在渲染阶段，React 计算当前的 DOM 和新的 React 组件树的差异，并且准备必要的更新。


![p5.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c31fff4991bd4302b52b513b35faf1c5~tplv-k3u1fbpfcp-watermark.image?)

在渲染阶段之后就是提交阶段。在这个阶段中，React 会把渲染阶段计算出来的更新应用到真实的 DOM 中。这个阶段包含了创建，更新和删除 DOM 节点，以此来跟新的 React 组件树保持镜像同步。

* * *

在传统的同步更新中，React 会赋予组件树中所有的元素一个相同的优先级。当组件树被渲染，不管是初始化渲染还是状态更新，React 都会一股脑的运行，在一个不能被打断的任务中渲染这棵树，直到 commit 阶段完成，组件树的修改都被更新到可视的 DOM 树上为止。


![p6.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bd8f1b7674254d36aef2436ba282e9aa~tplv-k3u1fbpfcp-watermark.image?)

同步渲染是一种 “全有或全无” 的操作，它保证开始渲染的组件总是会完成。根据组件的复杂性，渲染阶段可能需要一段时间才能完成。主线程在这段时间内会被阻塞，这意味着如果用户在这段时间跟应用程序进行交互，那么用户需要等到 React 完成整个渲染阶段和提交阶段，真实 DOM 更新完成，否则就得不到响应。

* * *

你可以在下面的例子中看到这种情况的发生。 我们有一个文本输入框和一个很大的城市列表，它们根据文本输入的当前值进行过滤。在同步渲染中，React 将在每次输入时重新渲染 `CitiesList` 组件。这是一个相当耗费性能的计算，因为该列表包含数以万计的城市，因此在用户输入和展示过滤列表之间存在明显的视觉反馈延迟，也就是卡顿现象。

`index.js`

```js
import { StrictMode } from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

ReactDOM.render(<StrictMode><App /></StrictMode>,  rootElement);
```

`App.js`

```js
import React, { useState } from "react";
import CityList from "./CityList";

export default function SearchCities() {
  const [text, setText] = useState("Am");

   return (    
      <main>      
          <h1>Traditional Rendering</h1>      
          <input type="text" onChange={(e) => setText(e.target.value) }   />      
          <CityList searchQuery={text} />    
      </main>  
     );
};
```

`CityList.js`

```js
import cities from "cities-list";
import React, { useEffect, useState } from "react";
const citiesList = Object.keys(cities);

const CityList = React.memo(({ searchQuery }) => {
  const [filteredCities, setCities] = useState([]);

  useEffect(() => {
    if (!searchQuery) return;

    setCities(() =>
      citiesList.filter((x) =>
         x.toLowerCase().startsWith(searchQuery.toLowerCase())
      )
    );
   }, [searchQuery]);

  return (
     <ul>
       {filteredCities.map((city) => (
         <li key={city}>
           {city}
        </li>
       ))}
    </ul>
    )
});

export default CityList;
```

`style.css`

```css
* {  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,    Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;  -webkit-font-smoothing: antialiased;  -moz-osx-font-smoothing: grayscale;}
:root {  --foreground-rgb: 0, 0, 0;  --background-rgb: 244, 244, 245;  --border-rgb: 228, 228, 231;}
@media (prefers-color-scheme: dark) {  :root {    --foreground-rgb: 255, 255, 255;    --background-rgb: 0, 0, 0;    --border-rgb: 39, 39, 42;    --input-background-rgb: 28, 28, 28;  }}
body {  color: rgb(var(--foreground-rgb));  background: rgb(var(--background-rgb));}
h1 {  margin-bottom: 2em;  font-size: 1.5em;}
input {  border: 1px solid rgb(var(--border-rgb));  border-radius: 3px;  padding: 1em 2em;  font-size: 1.1em;  background-color: rgb(var(--input-background-rgb));  color: rgb(var(--foreground-rgb));  outline: none;  min-width: 70vw;}
code {  font-family: Menlo;  font-size: 90%;  background: rgb(var(--border-rgb));  padding: 0.3em 0.5em;  border-radius: 3px;}
main {  padding: 1em 3em;  display: flex;  flex-direction: column;  align-items: center;}
ul {  overflow: scroll;  padding: 0;  min-width: 70vw;}
li {  list-style-type: none;  padding: 1em;  border-bottom: 1px solid rgb(var(--border-rgb));}
```

> 如果你使用的是类似 Macbook 这样的高性能设备，可能需要限制 CPU 4x 来模拟低端设备。可以在 `Devtools > Performance > ⚙️ > CPU` 中看到此设置。

当我们查看性能选项卡时，可以看到每次输入都会发生很长的任务，这是不太好的


![p7.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f1c149960ad740df994305b0cbae9239~tplv-k3u1fbpfcp-watermark.image?)

标有红角的任务被视为“长任务”。 请注意总阻塞时间( TBT ) 为 4425.40ms

在这种情况下，React 开发人员经常会使用 `debounce` 等第三方库来延迟渲染，但没有内置的解决方案

* * *

React 18 引入了一个在幕后运行的新并发渲染器。 该渲染器为我们提供了一些将某些渲染标记为非紧急的方法。


![p8.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6557a743d25b4801a2c089fcf772e462~tplv-k3u1fbpfcp-watermark.image?)
*[当渲染低优先级组件（粉色组件）时，React 会返回主线程检查更重要的任务]*


在这个例子中, React 会每隔 5 毫秒就回到主线程检查一下是否有更重要的任务需要优先执行。比如用户的输入或者渲染在这一时刻对于用户体验来说更重要的 React 组件。通过不断的回到主进程，React 做到了可以「非阻塞」渲染，优先执行更加重要的任务。


![p9.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7dcf94d078ad4718844be21302185d38~tplv-k3u1fbpfcp-watermark.image?)
*[并发渲染器不再是为每个渲染执行一个不可中断的任务，而是在低优先级组件的渲染期间以 5 毫秒的间隔将控制权交还给主线程。]*


此外，并发渲染器能够在后台“同时”渲染组件树的多个版本，而无需立即提交结果。

同步渲染是一种 “全有或全无” 的计算，而并发渲染器允许 React 暂停和恢复一个或多个组件树的渲染，以实现最佳的用户体验。


![p10.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/91b3533b05b944a1a3df3515d7711cd1~tplv-k3u1fbpfcp-watermark.image?)
*[React 根据用户交互暂停当前渲染，迫使其优先渲染另一个更新]*

使用并发功能，React 可以根据外部事件比如用户交互，来暂停或者恢复组件的渲染。当用户在与 `componentTwo` 进行交互的时候，React 可以暂停当前的渲染，提升`componentTwo` 的优先级并渲染 `componentTwo`，渲染结束后再恢复渲染 `componentOne`，我们还会在 **Suspense** 这一章节再讨论这个特性。

* * *

# **Transitions**

我们可以通过 `useTransition` 这个 hook 来获得 `startTransition` 这个函数，将某些更新标记为「不紧急」。

这是一个强大的新功能，允许我们将某些状态更新标记为 “transitions”，表明它们可能会导致视觉变化，如果同步渲染，可能会影响用户体验。

通过把一个 state 的更新包裹在 `startTransition` 函数里面，我们可以告诉 React 我们可以推迟或中断渲染，以优先处理更重要的任务，以保持当前用户界面的可交互性。

```js
import { useTransition } from "react";

function Button() {
  const [isPending, startTransition] = useTransition();

  return (
    <button 
      onClick={() => {
        urgentUpdate();
				// 这里
        startTransition(() => {
          nonUrgentUpdate()
        })
      }}
    >...</button>
  )
}
```

当这个 transition 开始执行，并发渲染器会开始在后台准备一颗新的树。一旦完成渲染，它将把结果保存在内存中，直到 React 调度器可以高效地更新 DOM 以显示新状态。这个时间点可能是当浏览器空闲并且没有待处理的更高优先级的任务（例如用户交互）。


![p11.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6dce58bd776f441fad882c2298821968~tplv-k3u1fbpfcp-watermark.image?)

在 `CitiesList` 这个例子中，使用 transition 是更好的选择。而不是在每次击键时直接调用 setCities - 这反过来会导致每次击键时同步渲染调用 - 我们可以将状态更新包裹在 startTransition 中。这告诉 React 状态更新可能会导致视觉变化，从而对用户造成干扰，因此 React 应尝试保持当前 UI 交互，同时在后台准备新状态，而不立即提交更新。

`index.js`

```js
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

root.render(<StrictMode><App /></StrictMode>);
```

`App.js`

```js
import React, { useState } from "react";
import CityList from "./CityList";

export default function SearchCities() {
  const [text, setText] = useState("Am");

   return (    
      <main>      
          <h1><code>startTransition</code></h1>      
          <input  type="text" onChange={(e) => setText(e.target.value) }   />      
          <CityList searchQuery={text} />    
      </main>  
     );
};
```

`CityList`

```js
import cities from "cities-list";
import React, { useEffect, useState, useTransition } from "react";
const citiesList = Object.keys(cities);

const CityList = React.memo(({ searchQuery }) => {
  const [filteredCities, setCities] = useState([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!searchQuery) return;

    startTransition(() => {
      setCities(() =>
        citiesList.filter((x) =>
           x.toLowerCase().startsWith(searchQuery.toLowerCase())
        )
      );
    });
   }, [searchQuery]);

  return (
     <ul>
       {filteredCities.map((city) => (
         <li key={city} style={isPending ? { opacity: 0.2 } : null}>
           {city}
        </li>
       ))}
    </ul>
    )
});

export default CityList;
```

`style.css`

```css
* {  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,    Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;  -webkit-font-smoothing: antialiased;  -moz-osx-font-smoothing: grayscale;}
:root {  --foreground-rgb: 0, 0, 0;  --background-rgb: 244, 244, 245;  --border-rgb: 228, 228, 231;}
@media (prefers-color-scheme: dark) {  :root {    --foreground-rgb: 255, 255, 255;    --background-rgb: 0, 0, 0;    --border-rgb: 39, 39, 42;    --input-background-rgb: 28, 28, 28;  }}
body {  color: rgb(var(--foreground-rgb));  background: rgb(var(--background-rgb));}
h1 {  margin-bottom: 2em;  font-size: 1.5em;}
input {  border: 1px solid rgb(var(--border-rgb));  border-radius: 3px;  padding: 1em 2em;  font-size: 1.1em;  background-color: rgb(var(--input-background-rgb));  color: rgb(var(--foreground-rgb));  outline: none;  min-width: 70vw;}
code {  font-family: Menlo;  font-size: 90%;  background: rgb(var(--border-rgb));  padding: 0.3em 0.5em;  border-radius: 3px;}
main {  padding: 1em 3em;  display: flex;  flex-direction: column;  align-items: center;}
ul {  overflow: scroll;  padding: 0;  min-width: 70vw;}
li {  list-style-type: none;  padding: 1em;  border-bottom: 1px solid rgb(var(--border-rgb));}
```

现在，当我们在输入字段中输入内容时，用户输入保持流畅，输入之间没有任何视觉延迟。发生这种情况是因为 `text` 状态仍然同步更新，输入框将这个 text 作为它的 `value`。

在后台，在每次用户输入的时候 React 都会渲染新的树。但这并不是一个“全有或全无”的同步任务，React 开始在内存中准备新版本的组件树，同时当前 UI（显示“旧”的状态）仍然能够响应用户的后续输入。

查看性能选项卡，与不使用 transitions 的实现的性能图进行相比，将状态变更包裹在 `startTransition` 中明显减少了长任务的数量和总阻塞时间（TBT）


![p12.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0fe2d00a2edd409bb96ceb565d296f69~tplv-k3u1fbpfcp-watermark.image?)
*[性能选项卡显示，长任务数量和总阻塞时间明显减少]*


Transitions 是 React 渲染模型根本性转变的一部分，它允许 React 并发渲染多个版本的 UI ，同时在不同的任务中管理不同的优先级。它使得应用在处理高频率更新或者 CPU 密集型渲染时能过保持用户体验更顺滑且界面更快响应

* * *

# **React Server Components**

React Server Components 是 React 18 中的一项**实验性**功能，但已准备好提供给到框架使用。在我们深入研究 Next.js 之前了解这一点很重要

传统上，React 提供了几种方式来渲染我们的应用程序。要么我们把所有的渲染工作都放在客户端（CSR），要么我们将整个组件树在服务端渲染成静态 HTML 并包含一个 JavaScript 包一起返回给客户端，在客户端对组件进行注水（SSR）


![p13.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/90e75f9ac3454d3e8ceddcff0f6ecbd2~tplv-k3u1fbpfcp-watermark.image?)

这两种方法都需要「同步 React 渲染器」使用附带的 JavaScript 包在客户端重建组件树，即使该组件树已经在服务端上是可用的了。

* * *


![p14.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d9c4a81b180c48a7a508e6a1e37edce8~tplv-k3u1fbpfcp-watermark.image?)


我们可以结合 **`react-server-dom-webpack/server`** 的 **`renderToPipeableStream`** 方法 和 **`react-dom/client`**  的 **`createRoot`** 方法来使用新的渲染模式

```
// server/index.js
import App from '../src/App.js'
app.get('/rsc', async function(req, res) {  
  const {pipe} = renderToPipeableStream(React.createElement(App));
  return pipe(res);
});

---
// src/index.js
import { createRoot } from 'react-dom/client';
import { createFromFetch } from 'react-server-dom-webpack/client';
export function Index() {
  ...
  return createFromFetch(fetch('/rsc'));
}
const root = createRoot(document.getElementById('root'));
root.render(<Index />);
```

[点击这里查看完整例子](https://github.com/zidanDirk/rsc-minimal-cn/)，在下一章中我们将覆盖更复杂的场景

* * *

默认情况下，React 不会给 React Server Components 进行注水操作（hydrate）。 这些组件不应该与客户端有任何交互（例如访问 window 对象）或使用 `useState` 或 `useEffect` 等 hook。

要将组件及其依赖添加至发送到客户端的 JavaScript 包中，从而使组件具有交互性，那么你可以使用文件顶部的 [“use client”](https://react.dev/reference/react/use-client) 构建器指令。它告诉构建器在打客户端的包的时候添加这个**组件及其依赖** 并且告诉 React 在客户端渲染的时候给这个组件注水，以让这个组件具备可交互能力。此类组件称为「客户端组件」


![p15.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/255c0bbf6dc54f278d6564fc91b4a7ab~tplv-k3u1fbpfcp-watermark.image?)
*[注意：框架实现可能会有所不同。 例如，Next.js 将在服务器上将「客户端组件」预渲染为 HTML，类似于传统的 SSR 方法。 然而，默认情况下，「客户端组件」的呈现方式与 CSR 方法类似。]*


在使用「客户端组件」时，开发人员需要优化构建包的大小。 开发人员可以通过以下方式做到这一点：

-   确保只有交互组件的最末端叶子节点（leaf-most node）定义了“use client”指令。 这可能需要一些组件解耦。
-   使用 props 的方式传入组件而不是直接 import 组件。这允许 React 将 `children` 渲染为 React Server Component，而无需将它们添加到客户端的包中。

* * *

# suspense

另一个重要的并非特性是 suspense。虽然这个特性不是很新，它在 React 16 的 `React.lazy` 中就已经被应用于代码分割功能了。React 18 通过扩展了`suspense` 的新能力，用于数据获取方面。

使用 `suspense` ，我们可以延迟组件的渲染，直到满足某些特定条件，例如从远程数据源完成数据的加载。比如在加载数据的期间，我们可以渲染一个兜底的组件，以显示该组件仍在加载。通过声明性地定义加载状态，我们减少了条件渲染逻辑。将 `Suspense` 与 React Server Components 结合使用，让我们可以直接访问服务器端数据源，而不需要单独的 API 接口（例如，让接口读取数据库或文件系统的数据并返回给客户端）

```js
async function BlogPosts() {
  const posts = await db.posts.findAll();
  return '...';
}
 
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <BlogPosts />
    </Suspense>
  )
}
```

`Suspense` 的真正强大的地方来自于它与 React 「并发特性」的深度集成。 当组件被挂起时，例如因为它仍在等待数据加载，React 不会只是阻塞或闲置直到组件收到数据。 相反，React 会暂停组件的渲染并将其焦点转移到其他任务上。


![p16.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/96db5d4369b2447f8fd7286631bcc1f4~tplv-k3u1fbpfcp-watermark.image?)

在此期间，我们可以告诉 React 渲染一个兜底的 UI 以显示该组件仍在加载。一旦等待的数据可用（加载完成），React 就无缝地恢复先前挂起的组件的渲染，而且这个渲染也是可中断的，就像我们之前看到的 transitions 一样。

React 还可以根据用户的交互重新调整组件的优先级。 例如，当用户与当前未渲染的被挂起组件进行交互时，React 会挂起正在进行的渲染，并且优先考虑正在与用户交互的组件。


![p17.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2d9402cf959c4776a791aa11e78d5a47~tplv-k3u1fbpfcp-watermark.image?)

一旦准备就绪，React 会将其 commit 到 DOM，并恢复之前的渲染。 这确保了用户交互的优先级，并且保持 UI 可响应，同时也能根据用户输入保持最新状态。

`Suspense` 与 React Server Component 的流式结合，允许 React 的高优先级更新在准备好后立即发送到客户端，而无需等待低优先级渲染任务完成。 这使客户端能够更快地开始处理数据，并通过渐进且非阻塞的方式显示内容，来提供更流畅的用户体验。

这种可中断的渲染机制与 `Suspense` 处理异步操作的能力相结合，提供了更流畅、更以用户为中心的体验，特别是在具有大量数据获取需求的复杂应用程序中，这种效果会更加明显。

* * *

# 数据获取

除了渲染更新之外，React 18 还引入了一个新的 API 来有效地获取数据并缓存住对应的结果。

React 18 项目的 rfcs 有提到一个 [缓存函数](https://github.com/acdlite/rfcs/blob/first-class-promises/text/0000-first-class-support-for-promises.md)，可以记住包裹函数调用的结果。 如果在同一次渲染中使用相同的参数调用相同的函数，它将使用缓存的值，而无需再次执行该函数。（ 类似于 useMemo ）

```js
import { cache } from 'react'
 
export const getUser = cache(async (id) => {
  const user = await db.user.findUnique({ id })
  return user;
})

getUser(1)
getUser(1) // 返回缓存的值
```

在 fetch 调用中，React 18 现在默认包含类似的缓存机制，而无需使用缓存函数。 这有助于减少单个渲染过程中的网络请求数量，从而提高应用程序性能并降低 API 成本。

> 特别声明：截至 2023 年 7 月，本人没有找到 React 18 对 fetch 的缓存功能，但我们可以借鉴这种思路，使用第三方类似 [react-query](https://tanstack.com/query/latest) 这样的库对请求的内容进行缓存，效果是一样的。

```js
export const fetchPost = (id) => {
  const res = await fetch(`https://.../posts/${id}`);
  const data = await res.json();
  return { post: data.post } 
}

fetchPost(1)
fetchPost(1) // 返回缓存的值
```

这些功能在使用 React Server Component 时非常有用。因为它们无法访问 Context API，所以自动缓存行为允许开发者从全局模块导出一个用于请求的函数并在整个应用程序中复用它。


![p18.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2a7eaf55076c46028b2b4dd098de805d~tplv-k3u1fbpfcp-watermark.image?)

```js
// 导出一个用于请求的函数 fetchBlogPost
async function fetchBlogPost(id) {
  const res = await fetch(`/api/posts/${id}`);
  return res.json();
} 

async function BlogPostLayout() {
  const post = await fetchBlogPost('123');
  return '...'
}
async function BlogPostContent() {
  const post = await fetchBlogPost('123'); // 使用自动缓存的值
  return '...'
}

export default function Page() {
  return (
    <BlogPostLayout>
      <BlogPostContent />
    </BlogPostLayout>
  )
}
```

# 结论

总而言之，React 18 的最新功能在很多方面提升了性能。

-   使用 **Concurrent React**，渲染过程可以暂停并在稍后恢复，甚至放弃。 这意味着即使正在进行大型渲染任务，UI 也可以立即响应用户的输入
-   **Transitions API** 允许在数据获取或界面更新期间实现更平滑的转换，而不会阻止用户输入
-   **React Server Components** 允许开发人员构建可在服务器和客户端上运行的组件，将客户端应用程序的交互性与传统服务器渲染的性能相结合，而减少了注水（hydration）的成本。
-   扩展的 **Suspense** 功能允许应用程序的某些部分优先于其他可能需要更长时间获取数据的部分进行渲染，从而提高了加载性能

> 本文是翻译文，[原文地址](https://vercel.com/blog/how-react-18-improves-application-performance)