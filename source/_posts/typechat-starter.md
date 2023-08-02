---
title: TypeChat 入门指南
date: 2023-07-31 21:22:30
tags: 翻译
---


# 什么是 TypeChat

TypeChat 是一个革命性的库，它简化了使用 TypeScript 构建自然语言模型界面的过程。 传统模式下，创建自然语言模型界面是一项复杂的任务，通常依赖复杂的决策树来确定意图并收集行动所需的输入。 随着大型语言模型（LLM）的出现，这个过程变得更加容易，但它也带来了新的挑战，例如限制模型回复的安全性、构建响应以供进一步处理以及确保模型回复的有效性。

TypeChat 通过用 schema 工程取代 prompt 工程来应对这些挑战。它允许开发者定义代表其自然语言模型应用程序支持的意图的类型。这适用于从简单的情感分类到复杂的购物车或音乐应用场景。一旦定义了类型，TypeChat 就会处理剩下的事情，使用类型构建对 LLM 的 prompt，根据 schema 验证 LLM 响应，总结实例来确保与用户意图保持一致。

你可以在以下位置找到该项目的网站：<https://microsoft.github.io/TypeChat/>


![p1.webp](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/21cf69d9b066407e85295da8d6596a71~tplv-k3u1fbpfcp-watermark.image?)

该项目的源代码（包括示例）托管在 GitHub 上：<https://github.com/microsoft/TypeChat>


![p2.webp](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/857387debf49460a97a662d7be383660~tplv-k3u1fbpfcp-watermark.image?)

# TypeChat 的目的

TypeChat 的主要目的是抹平自然语言与应用程序可以使用的结构化数据之间的差距。 它的目的是让开发者更容易地将自然语言界面集成到他们的应用程序中。 通过提供具有 shema（某些类型）和请求的模型，开发者可以处理类型良好的结构化数据，从而使将自然语言集成到应用程序中的过程更加简化和高效。

# 构建 TypeChat 的分步指南

构建 TypeChat 的过程非常简单

1.  安装 Node.js：确保计算机上安装了 Node.js（18.16.0 LTS 或更高版本）。 可以从 [Node.js 官方网站下载](https://nodejs.org/en)

1.  克隆 TypeChat 仓库

    ```bash
    $ git clone https://github.com/microsoft/TypeChat
    ```

1.  进入 TypeChat 目录

    ```bash
    $ cd TypeChat
    ```

1.  安装依赖

    ```bash
    $ npm i
    ```

    
    ![p3.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/31c96e3e31674444a15ff092e81c5019~tplv-k3u1fbpfcp-watermark.image?)

1.  构建 TypeChat

    ```bash
    $ npm run build-all
    ```

    
    ![p4.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c252b6801b70407da289a3ff3d010a18~tplv-k3u1fbpfcp-watermark.image?)

1.  配置OpenAI环境变量：需要设置 OpenAI 环境变量。 可以通过在项目的根目录中创建 `.env` 文件并添加以下内容来完成此操作

    ```bash
    OPENAI_MODEL=gpt-3.5-turbo
    OPENAI_API_KEY=openAI 帐号的key
    ```

1.  运行示例，所有的示例代码都在 `example`s 目录中。要以互动的方式运行示例，请导航到 `examples` 下对应的目录并运行以下命令

    ```bash
    $ node ./dist/main.js
    ```

    你可以在出现提示时输入请求，然后键入 `quit` 或 `exit` 来结束会话

    比如在 `examples/calendar` 目录下

    
    ![p5.jpg](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/da947f2afb90471fb46d80981858473a~tplv-k3u1fbpfcp-watermark.image?)

    也可以直接使用项目自带的 `input` 文件，来运行

    ```bash
    $ node ./dist/main.js ./dist/input.txt
    ```

    你可以看到控制的输出是这样的

    
    ![p6.jpg](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a3d0e81af0a941b799483ba8b5776b26~tplv-k3u1fbpfcp-watermark.image?)

# TypeChat 的入门示例

要检验 TypeChat 代码的实际效果，让我们思考一个示例。 假设我们有一个咖啡店应用程序，我们希望将用户意图转换为咖啡订单项目列表。 我们可以为咖啡订单项目定义一个类型，并使用 TypeChat 处理自然语言输入并将其映射到经过验证的 JSON 作为输出。 通过这种方式，我们可以轻松地将用户的自然语言请求转换为我们的应用程序可以理解和处理的结构化数据。

以下是咖啡订单的 TypeScript 类型定义：

```typescript
interface CoffeeOrder {
  type: string;
  size: string;
  extras: string[];
}
```

要使用 TypeChat，我们可以创建一个新实例并将 `CoffeeOrder` 类型传递给它：

```typescript
import { TypeChat } from 'typechat';
const typeChat = new TypeChat<CoffeeOrder>();

// 用户输入
const userInput = "I would like a large cappuccino with extra foam and a shot of vanilla.";

// 使用 TypeChat 获取一个结构化的数据
const order = typeChat.process(userInput);
console.log(order);

// 输出: { type: 'cappuccino', size: 'large', extras: ['extra foam', 'shot of vanilla'] }
```

在此示例中，TypeChat 获取用户的自然语言输入并将其转换为我们的应用程序可以轻松处理的结构化数据 `CoffeeOrder`

# 总结

总之，TypeChat 是一个强大的工具，它利用 TypeScript 的强大功能来简化构建自然语言界面的过程。 它抹平了自然语言和结构化数据之间的差距，使开发人员更容易将自然语言界面集成到他们的应用程序中。 凭借其易于设置和使用的特点，TypeChat 将彻底改变我们与软件交互的方式，使其更加直观和用户友好。 因此，如果你是一名希望通过自然语言界面增强应用程序的开发人员，那么 TypeChat 绝对值得探索

# 后续
后面我会采用 `React` ,`Express`, `TypeChat` 等技术栈做一个全栈的项目，帮助大家对 TypeChat 有一个更加深刻的理解。欢迎关注我或者给我留言🌹

> 本文为翻译文，原文地址：https://medium.com/codingthesmartway-com-blog/building-typed-interfaces-for-large-language-models-with-typechat-a-comprehensive-guide-d5fccb29ed96