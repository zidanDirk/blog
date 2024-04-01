---
title: 通过 RAIL 模型让网页性能原地起飞
date: 2024-04-01 18:18:00
---

# 什么是任务

在浏览器中，任何一个单独的工作项都被视为一个任务。这涵盖了多个方面，如页面渲染、HTML 与CSS 的解析处理、执行开发者编写的 JavaScript 代码，以及其他一些可能超出直接控制范围的操作。网页上的 JavaScript 代码是引发浏览器进行这些任务处理的重要因素。

![p1.webp](/imgs/post/optimizing-web-performance-keeping-long-tasks-under-50ms-with-the-rail-model/p1.webp)

(在 Chrome DevTools 的性能分析工具中，可以看到一个任务是如何被点击事件回调函数触发的)

# 理解长任务

在探讨浏览器性能时，我们会遇到所谓的“长任务”，它们指的是那些占用大量时间和资源的操作，有时会造成网页交互的卡顿。

造成这种现象的原因众多，包括但不限于 JavaScript 的编译过程、HTML 和 CSS 的解析、页面渲染，或者是我们自己编写的 JavaScript 代码无意中引发的性能瓶颈。

为了确保用户体验流畅且反应迅速，找出并优化这些耗时的长任务至关重要。

一个行之有效的策略是尽量控制任务执行时间在 50 毫秒内。如果某个任务执行时间超过了这个界限，那么在下一次尝试时，应将剩余部分转为异步执行，这样做可以为网页的响应和更新留出必要的时间。

可能你会好奇，为何是 50 毫秒？

这个数值并非凭空而来，而是基于 Google 员工开发的 **RAIL** 模型。这个模型专注于提升用户体验，而 50 毫秒正是为了保持用户界面的流畅交互而精心选定的时间阈值。

# 什么是 **RAIL** 模型

[RAIL](https://web.dev/articles/rail?hl=zh-cn) 模型是一个围绕用户体验来构建的性能分析框架，它帮助开发者通过划分用户操作的关键环节（如点击、滚动、页面加载等）来设定各个环节的性能优化目标。

RAIL 代表了 Web 应用生命周期中的四个核心阶段：响应（Response）、动画（Animation）、空闲（Idle）和加载（Load）。针对用户在这些不同阶段的期待，模型提出了相应的性能优化目标，旨在根据具体情境来明确性能提升的方向和目标。

![p2.webp](/imgs/post/optimizing-web-performance-keeping-long-tasks-under-50ms-with-the-rail-model/p2.webp)

人机交互领域的研究历史悠久。[雅各布·尼尔森](https://www.nngroup.com/articles/response-times-3-important-limits/) 在其关于响应时间界限的研究中，提出了三个关键的时间阈值：

- **100毫秒** 是系统给予用户即时反馈的理想时间界限，在这个时间内，系统的反应对用户来说几乎是瞬间的，通常无需额外的反馈，直接展示结果即可。
- **1秒** 是维持用户思考流畅的最长时间，超过这个时间，用户将察觉到延迟。在 0.1 秒至 1 秒的延迟中，一般不需要提供额外反馈，尽管如此，用户会感觉不再是直接与数据交互。
- **10秒** 是保持用户对话注意力的上限。超过这个时间，用户往往会选择做别的事情等待，因此系统应提供反馈，告知预计完成时间。如果响应时间变化大，提供反馈就显得尤为重要，因为这时用户无法预知等待时间。

随着现代机器性能的不断提升，RAIL 模型新增了一个指标：

- **0至16毫秒**：用户对于动作追踪极为敏感，对不流畅的动画反应敏锐。只要确保每秒能渲染 60 帧新画面，用户就会感觉动画流畅。这意味着每帧有 16 毫秒的时间，包括浏览器渲染并显示新帧的时间，实际上应用有约 10 毫秒时间来生成一帧画面。

鉴于我们关注的是长任务对响应时间的影响，因此 RAIL 模型特别强调在 100 毫秒内提供可见反馈的重要性。

# **50 毫秒内处理事件**

RAIL 的目标是在 100 毫秒内对用户的输入进行反应，让用户感觉到操作的即时性。

虽然目标设置为 100 毫秒，但实际上页面在运行时还需要处理其他任务，并非仅仅响应用户输入。这意味着，要在有限的时间内实现对输入的快速响应，一些时间就会被其他任务所占用。

因此，RAIL 提出的建议是：为了保证用户能在 100 毫秒内看到操作的响应，应该在 50 毫秒内完成对用户输入的处理

> 为了让用户能在 100 毫秒内看到响应，我们需要在 50 毫秒内处理用户的输入动作。这个原则适用于大部分用户操作，比如点击按钮、切换表单选项或启动动画效果。但是，对于手指的拖拽操作或页面滚动这类特殊输入，这一准则则不适用
> 

除了响应时间的要求，RAIL 框架还为应用的其他关键生命周期环节提出了明确的指导原则：

- **响应**：应在 50 毫秒内处理用户事件，以保证流畅的用户体验。
- **动画**：应在 10 毫秒内生成一帧，以实现流畅的动画效果。
- **空闲**：应最大化利用系统空闲时间，以提高应用性能。
- **加载**：应在 5 秒内完成内容的加载并允许用户进行交互，以确保快速访问。

通过自主学习和研究，你可以深入了解这些目标和指导原则是如何被考虑和制定的，以及它们背后的思想和策略。

# 优化长任务

在网页加载的时候，如果有一些耗时较长的操作占据了主线程，那么这会导致网页对用户的操作反应迟钝（即便从外观上看网页似乎已经加载完毕）。用户的点击或触摸动作往往无法产生预期的效果，这是因为相应的事件监听器或点击事件处理器还没有被正确加载和设置。

根据我们之前提到的 RAIL 模型，任何在主 UI 线程连续运行超过 50 毫秒的任务，都可以被视为是一个“长任务”。

实际上，Chrome 浏览器的性能面板就是用这种方式来识别和定义长任务的。在我们使用【性能】记录功能时，如果主线程上有任务的执行时间同步超过了 50 毫秒，那么这个任务就会在【性能】面板上被标记为红色，以提醒开发者注意这可能是造成页面性能问题的原因

![p3](/imgs/post/optimizing-web-performance-keeping-long-tasks-under-50ms-with-the-rail-model/p3-new.png)

![p4](/imgs/post/optimizing-web-performance-keeping-long-tasks-under-50ms-with-the-rail-model/p4-new.png)

## 识别长任务

在前端开发中，一些典型的耗时较长的任务包括：

- 加载大量的 JavaScript 代码
- 解析 HTML 和 CSS 文件
- 进行 DOM 查询或 DOM 操作
- 执行包含复杂计算的 JavaScript 脚本

### 使用 Chrome 开发者工具

开发者可以利用 Chrome 开发者工具中的【性能】记录功能来手动寻找执行时间超过 50 毫秒的脚本，这些脚本在【性能】记录面板中会以“长红/黄色块”的形式出现。通过进一步分析这些任务块的具体内容，我们可以确定哪些是长任务。

为了深入分析这些长任务，开发者可以使用 “自底向上”（**Bottom-Up**） 和“ 按活动分组”（**Group by Activity**） 的面板进行查看。例如，分析结果可能显示出一系列因为查询 DOM 而导致的高成本操作，这就提示了性能优化的潜在方向。

![p5](/imgs/post/optimizing-web-performance-keeping-long-tasks-under-50ms-with-the-rail-model/p5-new.png)

### 使用长任务 API

我们还可以使用 Long Tasks API 来识别导致交互卡顿的任务

```jsx
new PerformanceObserver(function (list) {
  const perfEntries = list.getEntries();
  for (let i = 0; i < perfEntries.length; i++) {
    // 分析长任务
  }
}).observe({ entryTypes: ["longtask"] });
```

## 识别大型脚本

大型的 JavaScript 脚本经常是导致长任务出现的根本原因。为了有效识别这些耗时的脚本，我们有多种方法可以采用。

除了之前提到的利用 Chrome 开发者工具进行性能记录和分析之外，我们还可以借助 PerformanceObserver 这一工具来进行识别。PerformanceObserver 允许开发者实时监控和分析网页的性能数据，通过这种方式，我们可以更加精确地发现那些导致长任务的大型脚本，从而针对性地进行优化

```jsx
new PerformanceObserver((resource) => {
    const entries = resource.getEntries();

    entries.forEach((entry) => {
        // 获取 JavaScript 资源
        if (entry.initiatorType !== 'script') return;
        const startTime = new Date().getTime();
        
        window.requestAnimationFrame(() => {
          // JavaScript 资源已经加载完成
          const endTime = new Date().getTime();
          // 如果超过 50 毫秒, 则它是一个长任务
          const isLongTask = endTime - startTime > 50;
        });
    });
}).observe({entryTypes: ['resource']});
```

利用这个方法，我们可以通过 **`entry.name`** 这个属性来识别网页加载的具体资源，并且可以针对这些资源进行专门的处理。

## 自定义性能指标

此外，我们可以通过在代码中设置特定的标记来追踪执行时间，这样就能够在一些可以预测的情况下识别出长任务了：

```jsx
// 任务开始的时候打个标记
performance.mark('bigTask:start');
await doBigTask();
// 任务结束的时候打个标记
performance.mark('bigTask:end');

// 测量当前的任务
performance.measure('bigTask', 'bigTask:start', 'bigTask:end');
```

接下来，通过结合使用 PerformanceObserver，我们能够捕获到这些标记点的具体性能数据。如果从开始到结束的执行时间超过了 50 毫秒，那么这个任务就可以被认为是一个长任务。

一旦我们识别出了这些长任务，就可以进一步探索优化的路径。优化的方法可能包括代码分割，延迟非关键任务的执行，或是改进资源加载策略等，目的都是为了缩短这些任务的执行时间，提升用户体验。

## 大型 javascript 脚本

大型的 JavaScript 脚本是造成长任务的常见原因之一，尤其在网页首屏加载时，尽量避免加载那些非必需的代码变得尤为重要。

为此，我们可以采取以下策略来分割这些脚本：

- 在网页首次加载时，仅仅加载那些绝对必要的最小量 JavaScript 代码。
- 把剩余的 JavaScript 代码进行模块化处理，以便可以按需进行分割加载。
- 利用预加载和空闲加载技术，按顺序完成对其他模块代码的加载。

这样的脚本分割策略意味着，当用户访问网页时，系统只会加载当前路由必需的代码。通过减少需要立即解析和编译的代码量，我们不仅能缩短网页的加载时间，还能显著改善 [FID](https://web.dev/articles/fid?hl=zh-cn) 和 [INP](https://web.dev/articles/inp?hl=zh-cn) 的性能指标。

幸运的是，我们有多种工具可以帮助执行这些操作，包括：

- webpack
- Parcel
- Rollup
- … …

这些广受欢迎的模块打包工具都支持脚本的动态加载和分割。我们还可以设定每个模块大小的上限，避免任一模块的脚本体积过大。关于这些工具的具体使用方法，你可以自行上网查找，以获取更多的实操指导。

## 长时间的 JavaScript 任务执行

因为 [主线程](https://developer.chrome.com/docs/lighthouse/performance/mainthread-work-breakdown?hl=zh-cn) 在任何给定的时刻只能执行一个任务，当某个任务的执行时间超出了特定的阈值（确切地说是 50 毫秒），它就会被定义为一个“长任务”。

面对这类长时间执行的任务，有一个相对简单直接的优化策略：即将单个长任务拆分成多个短任务。具体的拆分策略表现为：

![p6](/imgs/post/optimizing-web-performance-keeping-long-tasks-under-50ms-with-the-rail-model/p6-new.png)

当任务过长时，浏览器无法足够快速地响应交互。分解任务可以让这些交互更快地发生。

通常，任务分割可以分为两种类型：

- 串行执行的不同任务
- 单个过大的执行任务

对于串行执行的任务，我们可以将不同任务的调用从同步改为异步。例如，正如文章[《优化耗时较长的任务》](https://web.dev/articles/optimize-long-tasks?hl=zh-cn)中详细描述的：

`saveSettings()` 函数调用五个函数来完成特定任务：

```jsx
function saveSettings() {
  validateForm();
  showSpinner();
  saveToDatabase();
  updateUI();
  sendAnalytics();
}
```

![p7](/imgs/post/optimizing-web-performance-keeping-long-tasks-under-50ms-with-the-rail-model/p7-new.png)

为了提升性能，我们可以将这些任务分割成若干异步执行的部分，确保每一部分的执行时间都不会超过 50 毫秒的标准。通过这种方式，我们可以让每个任务单独执行，避免了它们长时间占用主线程，从而减少对用户操作响应的延迟。

具体来说，分割串行任务的策略包括：

- 采用 **`setTimeout()`** 或 **`postTask()`** 方法将任务排入异步执行队列。
- 设计一个任务管理器来控制串行任务的执行流程。这个管理器负责在每个任务完成后释放主线线程，并根据任务的优先级安排下一个任务的执行。

例如，我们可以设计一个简单的任务管理器，它会按顺序处理一系列任务，并确保每个任务的执行都不会阻塞主线程超过 50 毫秒。这样的实现既保证了应用的流畅性，也优化了用户的交互体验。

```jsx
function saveSettings () {
  // 影响用户操作使用的关键任务:
  validateForm();
  showSpinner();
  updateUI();

  // 把不影响用户体验的操作延迟处理:
  setTimeout(() => {
    saveToDatabase();
    sendAnalytics();
  }, 0);
}
```

理想的优化效果应该是：

![p8](/imgs/post/optimizing-web-performance-keeping-long-tasks-under-50ms-with-the-rail-model/p8-new.png)

`saveSettings()` 函数现在将其子函数作为单独的任务来执行

## 分割单个过大的任务

处理一个工作量巨大的任务时——比如说，处理上百万条数据——我们可以将这个庞大的任务拆解成多个小批次来处理。

在进行任务拆分的时候，有几个要点需要注意：

- 努力确保每一个被拆分出来的小任务的执行时间都控制在大约 50 毫秒左右。
- 当我们开始分批执行这些大型任务时，它们的执行方式会从原来的同步执行转变为异步执行。在这个过程中，需要考虑到执行过程中可能出现的中间状态，比如是否会插入新的任务，或者某些任务是否会被重复执行。

例如，假设你手头上有一个需要处理大量数据的函数，你可以通过将这个函数改造成一次只处理一小部分数据，并利用 **`requestAnimationFrame()`** 或者设定了延迟的 **`setTimeout()`** 函数来将数据处理工作分散到多个帧或者事件中去完成。这样做不仅可以避免长时间占用主线程，还能有效提升应用的响应速度和用户体验。

```jsx
function processLargeData(data, chunkSize) {
  let index = 0;

  function processChunk() {
    const chunkEnd = Math.min(index + chunkSize, data.length);
    for (let i = index; i < chunkEnd; i++) {
      // process data[i]
    }
    index += chunkSize;
    if (index < data.length) {
      requestAnimationFrame(processChunk);
    }
  }

  processChunk();
}
```

采取这种分割任务的方法，可以确保每一个任务的执行单元都足够小，从而不会影响到浏览器的响应速度。这样一来，浏览器既可以顺畅地处理用户的交互请求，也能有效地执行其他的任务。这种策略有效地保障了用户体验，避免了因执行大量计算任务而导致的界面卡顿或延迟响应的问题。

总之，提升网页的性能对于确保用户能享受到流畅体验是至关重要的。遵循 RAIL 模型的原则，我们能够有效控制长时间执行的任务不超过 50 毫秒，从而保证我们的网络应用既能迅速响应用户操作，又能保持高效运行。