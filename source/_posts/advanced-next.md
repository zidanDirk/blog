---
title: Next.js 超实用进阶技巧
date: 2023-11-14 20:12:30
tags: 翻译
---


> 温馨提示：如果你还是个 Next.js 新手，建议先阅读这篇 [Next.js 最佳实践](https://zhangzidan.com/2023/01/30/how-to-build-scalable-architecture-for-your-nextjs/)，照着这篇文章先把代码敲一遍


![cover.png](/imgs/post/advanced-next/cover.png)

Next.js 是一个强大的框架，用于构建服务端渲染的 React 应用程序。 它提供了许多开箱即用的功能，例如：自动代码分割、静态站点生成和服务端渲染。 但是，主流教程中并未提及一些高级 Next.js 技巧。 在本文中，我们将介绍其中一些技巧，这些技巧将使你的应用程序更上一层楼。

## 对第三方库使用动态导入

Next.js 会自动对你的应用程序进行代码分割，这意味着它仅加载当前页面所需的代码。 然而，这对于没有考虑到代码分割的第三方库来说并不总是有效的

为了可以将第三方库进行代码分割，你可以使用动态导入。动态导入允许你按需加载模块，这有助于减少应用程序的初始包大小。

例如，不要 像这样导入第三方库

```js
import moment from 'moment';
```

你可以像这样使用动态导入

```js
const moment = dynamic(() => import('moment'));
```

这将按需加载 moment 库，这有助于减少应用程序的初始包大小

## 把静态资源发布到 CDN

Next.js 会自动优化图片和其他静态资源，但把这些静态资源发布到快速可靠的内容分发网络 (CDN) 仍然很重要。

你可以使用阿里云，腾讯云，Amazon，Cloudflare 等厂商提供的 CDN 服务。这有助于提高性能并减少服务器的负载。

要为静态资源配置 CDN，可以在 next.config.js 文件中使用 assetPrefix 选项：

```js
module.exports = { 
    ... 
    assetPrefix: 'https://yourcdn.com/',
    ... 
 };
```

这样配置之后，会在你的静态资源 URL 前面加上 CDN 的 URL

## 使用服务端缓存处理耗性能的数据操作

如果你的应用程序有十分损耗性能的数据操作，例如复杂的数据库查询或 API 请求，那么在服务器端缓存结果来提高性能就非常重要。

Next.js 提供了内置的缓存 API，可用于在服务器端缓存数据。 缓存 API 是一个简单的键值存储，可用于存储和检索数据。

例如，你可以像这样缓存数据库查询的结果：

```js
import { cache } from 'next/cache'; 
async function getPosts() { 
    const cachedPosts = await cache.get('posts'); 
    if (cachedPosts) { return cachedPosts; } 
    const posts = await fetch('/api/posts'); 
    await cache.set('posts', posts); 
    return posts; 
 }

```

以上检查数据库查询的结果是否已缓存，如果已经缓存了，则从缓存中返回数据。 否则，它从数据库中获取结果，然后缓存它们，最后返回它们。

通过在服务器端缓存耗性能的数据操作，你可以减少数据库和 API 服务器的负载，并提高应用程序的性能。

> 注意：缓存敏感数据时要小心。 一个好的经验法则是仅缓存公共数据（不要缓存需要身份鉴权的数据）

## 对动态网页使用 ISR（增量静态再生成）

Next.js 提供了一项名为增量静态再生成 (ISR) 的强大功能，允许生成具有动态内容的静态页面。 这意味着可以创建快速且动态的页面，而无需牺牲性能。

使用 ISR，你可以生成页面的静态版本，稍后使用新的数据更新该页面。 举个例子，你可以使用 ISR 生成包含初始内容的静态博客文章页面，后续如果有新的新评论或其他动态内容进入时动态更新该页面。

要使用 ISR，需要在 getStaticProps 函数中定义 revalidate 选项。 此选项指定 Next.js 使用新数据重新生成页面的频率。

```js
export async function getStaticProps() {
    const data = await fetch('https://example.com/api/data'); 
    const posts = await data.json(); 
    return { 
        props: { posts }, 
        revalidate: 60 // 每 60 秒重新生成页面 
     } 
 }

```

在此示例中，页面将每 60 秒使用来自 API 的新数据重新生成一次。 这意味着即使页面是静态的，你的用户也将始终看到最新的内容。

通过使用 ISR，可以创建性能绝佳的快速动态页面。 此功能对于经常添加新内容的「内容密集型」网站（例如博客或新闻网站）特别有用。

## 使用自定义服务来支持 WebSockets

Next.js 提供了适合大多数需求场景的内置服务器。 但是，如果有 WebSocket 或自定义身份验证等更加高阶的需求，则可能需要使用自定义服务。

可以通过在项目根目录创建 server.js 文件来将自定义服务与 Next.js 结合使用。 该文件导出一个创建 HTTP 服务并处理请求的函数。

例如，以下是创建处理 WebSocket 的自定义服务的方法：

```js
const http = require('http'); 
const WebSocket = require('ws'); 
const next = require('next'); 
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev }); 
const handle = app.getRequestHandler(); 
const server = http.createServer((req, res) => { 
        // // 处理 HTTP 请求
        handle(req, res); 
}); 
 const wss = new WebSocket.Server({ server }); 
 wss.on('connection', (ws) => { 
        // 处理 websocket 建连 
 }); 
 server.listen(3000, () => { console.log('Ready on http://localhost:3000'); 
 });

```

这将创建一个 HTTP 服务器和一个监听端口 3000 的 WebSocket 服务器

> 注意：使用自定义服务器会使站点放弃自动静态优化，并从阻止你部署到 Vercel

## 总结

通过使用 ISR 等高级 Next.js 功能，可以创建快速、可扩展且针对性能进行优化的 Web 应用程序。 这些技巧可以帮助你将 Next.js 应用程序提升到一个新的水平，并为你的站点用户提供最佳用户体验。

以上就是目前的全部内容，后续还会 持续更新更多技巧和案例 。 与往常一样，如果你有任何疑问，请随时与我联系或发表评论。 祝你愉快！

