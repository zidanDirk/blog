---
title: 深入探索 Next.js 中的流式渲染和分块传输编码
date: 2023-12-31 20:12:30
tags: 翻译
---

> 温馨提示：如果你还是个 Next.js 新手，建议先阅读这篇 [Next.js 最佳实践](https://zhangzidan.com/2023/01/30/how-to-build-scalable-architecture-for-your-nextjs/)，照着这篇文章先把代码敲一遍


![cover.webp](/imgs/post/efficient-and-elegant-web-development-with-next-js/cover.webp)

# 简述

在本篇文章中，我们将深入探索组件流式（stream）渲染和分块（chunk）传输编码，探索 Next.js 如何运用这些技术来优化页面内容传输以及提升用户体验。我们还将研究 HTTP 传输的细微差别以及 Next.js 如何与 Web 浏览器的实现情况保持一致。看完本篇文章，我们将对如何使用Next.js 创建一个高效且优雅的 web 应用有一个更好的认识。让我们马上开始吧！🚀

# 什么是流

在我们探索「组件流」之前，我们先了解概念「流」这个概念本身的意思。当你的浏览器发送一个 HTTP 请求到服务器时，服务器响应的内容大概是这样的

```jsx
HTTP/1.1 200 OK␍␊
Date: Sat 18 Nov 2023 12:28:53 GMT␍␊
Content-Length: 12␍␊
Content-Type: text/plain␍␊
␍␊
Hello World!
```

服务器响应的第一行，`HTTP/1.1 200 OK` 表示服务器已响应 200 OK，这意味着一切正常。然后在这后面，有三行响应头信息。在这个例子中，这些头分别是 Date，Content-Length 以及 Content-Type。我们可以认为他们是一些键值对，这些键和值是通过冒号来进行分隔的

在这些头信息后面， 有一个空行来分隔响应头和响应体。响应体的信息就在这个空行后面。根据响应头的信息，我们的浏览器知道了两个事情：

1. 它需要下载 12 字节的内容（`Hello World!` 仅包含 12 个字符）
2. 一旦下载完成，它可以显示这些内容或者把这些内容返回给到一个 `fetch` 请求的回调函数中

换而言之，我们可以总结到，响应体内容就是在空行后面读取 12 个字符之后就结束了

但是如果我们的响应头没有包含 `Content-Length`  会发生什么事情呢？在这种情况下，很多 HTTP 服务器会自动为响应头添加一个 `Transfer-Encoding: chunked` 这样的响应头信息。这个响应可以理解为：「我是服务器的响应，我并不清楚响应体中有多少内容，所以我会分块（chunk）发送数据」

```jsx
HTTP/1.1 200 OK␍␊
Date: Sat, 18 Nov 2023 12:28:53 GMT␍␊
Transfer-Encoding: chunked␍␊
Content-Type: text/plain␍␊
␍␊
5␍␊
Hello␍␊
```

在这个时候，我们仅仅接收了信息的前 5 个字节。值得注意的是，响应体的格式与相应头不同。首先，chunk 的体积大小被发送，然后紧跟着的是 chunk 本身的内容。在每个 chunk 后面，服务器都会添加一个 `␍␊`  序列

现在让我们接收第二个 chunk

怎么会出现这样的情况呢？

```jsx
HTTP/1.1 200 OK␍␊
Date: Sat, 18 Nov 2023 12:28:53 GMT␍␊
Transfer-Encoding: chunked␍␊
Content-Type: text/plain␍␊
␍␊
5␍␊
Hello␍␊
7␍␊
 World!␍␊
```

我们收到了额外的 7 个字节的响应。那么在 `Hello␍␊`  和 `7␍␊` 之间发生了什么事情呢？在这个间隔期间这个响应会如何处理呢？我们假设一下，如果在  `7␍␊`  发送之前服务器需要有 10 秒的处理时间。如果你在处理期间查看浏览器开发人员工具的「网络」选项卡，会看到服务器的响应已开始，并在这 10 秒内保持「进行中」状态。这个是因为服务器还没有发送响应已经结束的指示。

那么当服务器已经发送「完毕」了，浏览器将如何检测呢？答案是有一个约定。服务器需要发送 `0␍␊␍␊`  这个序列。简单来说就是，「我发送一个长度为 0 的 chunk 给你，表明已经没有其他内容需要发送了」。在「网络」选项卡，这个序列将会被标记为请求结束的时机。

```jsx
HTTP/1.1 200 OK␍␊
Date: Sat, 18 Nov 2023 12:28:53 GMT␍␊
Transfer-Encoding: chunked␍␊
Content-Type: text/plain␍␊
␍␊
5␍␊
Hello␍␊
7␍␊
 World!␍␊
0␍␊
␍␊
```

# 了解 HTTP 传输

在 HTTP 头信息中，了解 `Content-Length:<number>`  和 `Transfer-Encoding: chunked` 的区别很重要。看到的第一眼，我们可能觉得 `Content-Length:<number>`  是表明响应体的数据不是流式的，但这不完全准确。虽然此响应头指示要接收的数据的总长度，但这并不意味着数据作为单个大 chunk 来进行传输。在 HTTP 层之下，TCP/IP 等协议规定了实际的传输机制，这本质上涉及将数据分解为更小的数据包。

所以，虽然 `Content-Length` 表明系统一旦积累了指定数量的数据就已准备好进行渲染，但实际的数据传输是在较低层级增量执行的。一些现代浏览器利用这种内在的分包机制，甚至在接收到整个数据之前就启动渲染过程。这对于用于渐进式渲染的特定数据格式特别有利。另一方面，`Transfer-Encoding: chunked` 对 HTTP 层的数据流提供了更明确的控制，在发送时标记每个数据块（chunk）。这提供了更大的灵活性，特别是对于动态生成的内容或一开始就未知完整内容长度的情况。

# ****<Suspense />****

现在我们已经介绍了一个对于 Next.js 中的组件流式渲染至关重要的基本概念，在深入探讨 <Suspense /> 之前，让我们首先定义它要解决的问题。

现在让我们为例子创建一个帮助函数

```jsx
export function wait<T>(ms: number, data: T) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), ms);
  });
}
```

这个函数帮助我们创建一个长耗时的模拟请求。

使用 `npx create-next-app@least`  初始化一个 Next.js 应用

清除掉一些不需要的文件和代码，复制下面的代码到 `app/page.tsx` 这个文件中：

```jsx
import { wait } from "@/helpers/wait";

const MyComponent = async () => {
  const data = await wait(10000, { name: "zidan" });
  return <p>{data.name}</p>;
};

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <>
      <p>网页静态信息</p>
      <MyComponent />
    </>
 );
```

该结构由一个包含 「网页静态信息」 的 p 标签和一个在输出数据之前需要等待 10 秒的组件。

为了看到效果，执行 `npm run build && npm run start` ，然后在浏览器打开 `http://localhost:3000`

接下来会发生什么事情呢？

在收到整个页面内容（包括「网页静态信息」和“zidan”）之前，你会需要等待 10 秒的延迟。这意味着当 <MyComponent /> 获取其数据时，用户将无法查看「网页静态信息」内容。这远非理想状态； 页面会一直显示正在加载的白屏状态，然后在 10 秒之后向用户展示内容。

然而如果在组件外面套一个 `<Suspense />` 然后再重新尝试一下，我们可以马上就看到内容。让我们来深挖一下这个方法。

我们把组件包裹在 `<Suspense />` 里面并且给 `fallback` 赋一个值为 `“数据正在加载，请稍等...”`  这样的文案。

```jsx
export default async function Home() {
  return (
    <>
      <p>网页静态信息</p>
      <Suspense fallback={"数据正在加载，请稍等..."}>
        <MyComponent />
      </Suspense>
    </>
  );
}
```

现在我们打开浏览器

![p1.png](/imgs/post/efficient-and-elegant-web-development-with-next-js/p1.png)

现在，我们观察到作为 `<Suspense />` 的 `fallback` 属性提供的字符串（数据正在加载，请稍等...）暂时代表 `<MyComponent />` 先显示出来。然后在 10 秒之后，真正组件的内容再显示出来

让我们查看一下收到的 HTML 响应。

```jsx
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Omitted -->
</head>
<body class="__className_20951f">
    <p>网页静态信息</p><!--$?-->
    <template id="B:0"></template>
    数据正在加载，请稍等...<!--/$-->
    <script src="/_next/static/chunks/webpack-f0069ae2f14f3de1.js" async=""></script>
    <script>(self.__next_f = self.__next_f || []).push([0])</script>
    <script>self.__next_f.push(/* Omitted */)</script>
    <script>self.__next_f.push(/* Omitted */)</script>
    <script>self.__next_f.push(/* Omitted */)</script>
    <script>self.__next_f.push(/* 还没有一个关闭的 script 标签...
```

虽然我们还没有收到完整的页面，但我们已经可以在浏览器中查看其内容了。这是怎么做到的？这种行为是由于现代浏览器的 **容错能力** 造成的。考虑这样一个场景：你访问一个网站，但由于开发人员忘记关闭标签，该网站无法正确显示。尽管浏览器开发人员可以强制执行严格的无错误 HTML，但这样的决定会降低用户体验。作为用户，我们希望网页能够加载并显示其内容，无论底层代码中是否存在小错误。为了确保这一点，浏览器在底层实现了多种机制来弥补此类问题。例如，如果有一个打开的 `<body>` 标签尚未关闭，浏览器将自动“关闭”它。这样做是为了提供最佳的用户体验，即使面对不完美的 HTML 也是如此。

很明显，Next 在实现组件流式渲染时利用了这种固有的浏览器行为。通过推送可用的内容块，并利用浏览器能过解析和渲染部分甚至稍微畸形的内容的能力，Next.js 可确保更快的加载时间并增强用户体验。这种方法的优点在于它符合网络浏览的实际情况。 用户通常更喜欢即时反馈，即使是增量反馈，也不愿等待整个页面加载。Next.js 会将准备好的内容进行分块传输，所以很好的满足了用户的这种浏览偏好。

现在，观察这个片段

```jsx
<!--$?-->
  <template id="B:0"></template>
  数据正在加载，请稍等...
<!--/$-->
```

我们可以发现占位符文本与带有 `B:0` id 的空 `<template>` 标签相邻。此外，我们可以看出来自 `localhost:3000` 的响应仍在进行中。后面的 script 标签保持未关闭状态。 Next.js 使用占位符模板为即将填充下一个 chunk 的 HTML 腾出空间。

下一个 chunkl 到达之后，我们就有了以下这个标签内容 …

> `$RC`是 `completeBoundary` 函数，可以在 [此处](https://github.com/facebook/react/blob/b9be4537c2459f8fc0312b796570003620bc8600/packages/react-dom-bindings/src/server/fizz-instruction-set/ReactDOMFizzInstructionSetShared.js?ref=hackernoon.com#L46) 找到带注释的版本
> 

```html
<p>网页静态信息</p>

<!--$?-->
<template id="B:0"></template>
数据正在加载，请稍等...
<!--/$-->

<!-- <script> tags omitted -->

<div hidden id="S:0">
  <p>zidan</p>
</div>

<script>
  $RC = function (b, c, e) {
    c = document.getElementById(c);
    c.parentNode.removeChild(c);
    var a = document.getElementById(b);
    if (a) {
      b = a.previousSibling;
      if (e)
        b.data = "$!",
          a.setAttribute("data-dgst", e);
      else {
        e = b.parentNode;
        a = b.nextSibling;
        var f = 0;
        do {
          if (a && 8 === a.nodeType) {
            var d = a.data;
            if ("/$" === d)
              if (0 === f)
                break;
              else
                f--;
            else
              "$" !== d && "$?" !== d && "$!" !== d || f++
          }
          d = a.nextSibling;
          e.removeChild(a);
          a = d
        } while (a);
        for (; c.firstChild;)
          e.insertBefore(c.firstChild, a);
        b.data = "$"
      }
      b._reactRetry && b._reactRetry()
    }
  }
  ;
  $RC("B:0", "S:0")
</script>
```

我们收到一个隐藏的 `<div>`，其 `id="S:0"`。 这包含 `<MyComponent />` 的 HTML 内容。 除此之外，我们还看到了一个有趣的脚本，它定义了一个全局变量 `$RC`。 此变量指向一个使用 `getElementById` 和 `insertBefore` 执行某些操作的函数。

脚本中的最后语句 `$RC("B:0", "S:0")` 调用上述函数并使用 `“B:0”`和`“S:0”`作为参数。 正如我们所推断的，`B:0` 对应于之前保留我们后备的模板的 ID。 同时，`S:0`是新获取的`<div>`的 ID。 为了提取此信息，`$RC` 函数本质上指出：“从 `S:0` div 中获取标签并将其放置在 `B:0` 模板所在的位置。”

以下是该段落的简单总结，为了更加清晰的表达，我对内容进行分段：

1. **启动分段（chunked）传输：**Next.js 设置了 `Transfer-Encoding:chunked` 响应头信息，告诉浏览器响应的内容长度在这个阶段暂时是不确定的。
2. **页面执行：**当页面执行时，不会遇到任何等待操作。 这意味着没有数据获取会阻止立即发送响应
3. **处理 Suspense：**处理到 `<Suspense />` 标签后，Next.js 使用 fallback 的值立即渲染，同时插入占位符 `<template />` 标签。 稍后一旦准备好，将使用它来插入实际的 HTML。
4. **对浏览器的初始响应：**需要渲染的内容将发送到浏览器。 然而只要 `0␍␊␍␊`  这个终止序列尚未发送，就表明浏览器应该需要准备接收更多数据的到来。
5. **组件数据请求：**`<MyComponent />`  与服务器进行通信，请求需要的数据，相当于在说：“我们需要你的内容，当你准备好时请告诉我们。”
6. **组件渲染：**`<MyComponent />` 获取数据后，会渲染并生成相应的 HTML
7. **发送组件的 HTML：**然后该 HTML 作为新 chunk 发送到浏览器
8. **JavaScript 执行：**然后浏览器的 JavaScript 会将这个新的 HTML 块添加到之前在步骤3中生成的 `<template />` 标签的位置。
9. **终止序列**：最后服务器发送终止序列 `0␍␊␍␊`  ，表示响应结束。

# 深入探索多个 <Suspense />

处理单个 `<Suspense />` 标签很简单，但如果页面有多个这样的标签怎么办呢？ Next.js 如何应对这种情况呢？ 有趣的是，核心方法并没有太大偏差。 以下是管理多个 `<Suspense />` 标签时会发生的一些事情：

1. **Fallback 相关：**每个 `<Suspense />` 标签都设置了自己的 `fallback` 值。 在渲染阶段，同时利用所有这些 `fallback` 值，确保每个 `<Suspense />` 组件为用户提供临时的内容。 这是我们之前列出的第三点的延伸。
2. **统一内容请求：**就像单个 `<Suspense />` 一样，Next.js 向 `<Suspense />` 标签中包含的所有组件发出统一的调用。 它本质上是广播，一旦组件准备好就响应对应的内容。
3. **等待所有的组件：**终止序列至关重要，它表示响应的结束。 在具有多个 `<Suspense />` 标签的情况下，直到每个组件都发送其内容后终止序列才会被发送。 这确保浏览器可以呈现所有组件的内容，从而为用户提供完整的页面视图。

# 总结

本篇文章的所有内容就是这样了！ 希望你能够喜欢这次的内容。通过利用浏览器的原生行为并优化内容传输，Next.js 可确保用户等待时间最短并尽快看到内容。 作为开发人员，了解这些细微差别不仅使我们的技术更加出色，而且使我们能够为用户更加丝滑的用户体验。与往常一样，如果你有任何疑问，请随时与我联系或发表评论。 祝你编程愉快！

> 本文为翻译文，原文地址：https://medium.com/@momendaoud/efficient-and-elegant-web-development-with-next-js-6087b3fd86e1