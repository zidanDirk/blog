---
title: 如何构建全栈 AI 应用
date: 2023-05-19 17:54:00
tags: 翻译
---


人工智能 (AI) 最近掀起了波澜，ChatGPT 通过 [chat completion](https://platform.openai.com/docs/guides/chat) 功能彻底改变了互联网。

你可以用它做很多事情：起草电子邮件或其他文章、回答文档相关的问题、创建会话代理、为你的软件提供自然语言界面、辅导各种科目、翻译语言等等。

本文将教会你使用 [chat completion](https://platform.openai.com/docs/guides/chat) 功能构建聊天应用程序的基础知识，让每个程序员都能轻松上手。 它并不像看起来那么难。

你将学到以下内容：

-   如何仅使用 Node.js 创建 CLI 聊天应用程序
-   如何仅使用 React 构建聊天应用程序
-   如何结合 React 和 Node.js 来创建更好的聊天 AI 软件

本文的内容将基于 [gpt-3.5-turbo](<https://platform.openai.com/docs/models/gpt-3-5>) 模型

# 所需知识

本教程需要 JavaScript、CSS、React 和 Node.js 的基本知识。

你还需要在 chatGPT 的 OpenAI 平台上拥有一个帐户。 你可以在[这里](https://platform.openai.com/overview)创建一个

# 如何使用 Node.js 创建 CLI 聊天 AI 应用程序

本节将重点介绍如何使用 Node.js 创建一个仅在终端上运行的聊天应用程序

首先为项目创建一个目录：

```bash
mkdir nodejs-chatgpt-tutorial
```

进入目录

```bash
cd nodejs-chatgpt-tutorial
```

初始化项目

```bash
npm init -y
```

这将创建一个 `package.json` 文件来跟踪项目详细信息

将以下代码行添加到文件中：

```bash
"type": "module"
```

这将使你能够使用 ES6 模块导入语句

使用下面的命令来安装 [OpenAI](https://openai.com/)

```bash
npm i openai
```

创建一个包含所有代码的文件。 将其命名为 `index.js`

```bash
touch index.js
```

从 OpenAI 导入 `Configuration` 和 `OpenAIApi` ，以及从 [Readline](https://nodejs.org/api/readline.html) 导入 `readline`

```js
import { Configuration, OpenAIApi } from "openai";
import readline from "readline";
```

像这样构建 OpenAI 配置：

```js
const configuration = new Configuration({
  organization: "org-0nmrFWw6wSm6xIJXSbx4FpTw",
  apiKey: "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",
});
```

此代码创建 `Configuration` 对象的新实例。 在其中，你将为 `organization` 和 `apiKey` 输入值。你可以在[设置](https://platform.openai.com/account/org-settings)中找到你的组织的详细信息，在 [API keys](https://platform.openai.com/account/api-keys) 中找到你的 apiKey 信息。 如果你没有现有的 API Key，您可以创建它。

配置后输入以下代码，创建一个新的 OpenAI API 实例：

```js
const openai = new OpenAIApi(configuration);
```

你将在整个项目中使用它

键入以下代码来测试 `createChatCompletion` 函数：

```js
openai
  .createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Hello" }],
  })
  .then((res) => {
    console.log(res.data.choices[0].message.content);
  })
  .catch((e) => {
    console.log(e);
  });
```

此代码调用触发接口 ([](https://api.openai.com/v1/chat/completions)<https://api.openai.com/v1/chat/completions>) 的 `createChatCompletion` 函数。 该函数接受一个参数对象（正在使用的 chatGPT `模型` 和用户与 AI 之间的 `messages` 数组。我们将在下一章中了解如何使用 `messages` 数组来保存聊天记录并改进应用程序）。

每条消息都是一个对象，包含 `role`（即谁发送了消息。当消息来自人时，这个值为 `user` ；如果它来自 AI，则该值可以是 `assistant`）和 `content`（发送的信息）

最后，代码打印来自 AI 的响应内容(`res.data.choices[0].message.content`)，使用以下命令在终端中运行文件：

```bash
node index
```

这将在几秒钟后返回 AI 的响应

这就是创建聊天机器人所需的一切！

但是，为了使应用程序更具交互性，我们需要让程序可以接收用户输入消息而不是将消息内容硬编码到代码中。 [readline](https://nodejs.org/api/readline.html) 模块将在这方面帮助我们。

要使其具有交互性，请删除输入的最后一个代码并添加以下内容：

```js
const userInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
```

此代码在终端中创建一个 UI，允许用户输入他们的问题。

接下来，使用以下代码提示用户输入消息：

```js
userInterface.prompt();
```

最后，输入下面的代码

```js
userInterface.on("line", async (input) => {
  await openai
    .createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: input }],
    })
    .then((res) => {
      console.log(res.data.choices[0].message.content);
      userInterface.prompt();
    })
    .catch((e) => {
      console.log(e);
    });
});
```

在上面的代码中：

-   当用户键入内容并按下 Enter 键时，上面的代码会触发一个回调函数。
-   它将传递用户的输入`input`到接口
-   `input` 现在用作 `content`
-   显示 AI 的响应后，将提示用户在 `then`中输入另一条消息

添加 `dotenv`

```bash
npm i dotenv
```

根目录创建 `.env` 文件，在文件中编写以下环境变量（你自己的账号的 `Configuration` 信息）

```bash
ORG = "org-xxx"
API_KEY = "sk-xxx"
```

修改 `index.js` 文件

```js
...
...
import * as dotenv from 'dotenv'

dotenv.config()

const configuration = new Configuration({
    organization: process.env.ORG,
    apiKey: process.env.API_KEY,
})
```

最后记得创建项目的 `.gitignore` 文件，添加下面的内容

```bash
node_modules
.DS_Store
.env
```

你可以在这里看到所有的代码

[](https://github.com/zidanDirk/nodejs-chatgpt-tutorial-cn/)<https://github.com/zidanDirk/nodejs-chatgpt-tutorial-cn/>

运行文件并与 AI 对话。 它将如下图所示：


![1.jpg](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/598097ec0ef348b3871103335bb09947~tplv-k3u1fbpfcp-watermark.image?)

非常好！ 这是一个交互式 CLI 聊天工具。

这对少数人（如工程师）有用，但它具有良好的安全性，因为它可以运行在服务器端

但是其他可能不了解如何使用 CLI 应用程序的人呢？ 他们将需要更易于使用、具有更友好的用户界面 (UI) 和用户体验 (UX) 的东西。 下一节将重点介绍如何使用 React 构建此类应用程序。

# 如何使用 React 创建一个聊天程序

本节旨在帮助前端开发人员加快使用 ChatGPT API 的速度，以创建聊天应用程序并构建更好的用户界面，从而为用户提供更好的体验。 你可以将在这里获得的知识应用到其他前端框架或库中。

首先要做的是设置一个基本的 React 模版。 为此，我将使用 Vite。 你可以使用 Vite 作为搭建任何现代 JavaScript 前端项目的脚手架。 使用以下命令：

```bash
npm create vite@latest

✔ Project name: react-chatgpt-tutorial-cn
✔ Select a framework: › React
✔ Select a variant: › JavaScript
```

此命令将提示你为项目创建名称和文件夹，并选择框架或库（本教程使用 React）。 之后，你将进入到该文件夹并运行以下命令：

```bash
npm install
npm run dev
```

这些命令将安装必要的依赖项并在端口 `5173` 上启动本地服务器

接下来，使用以下命令安装 OpenAI：

```bash
npm i openai
```

这个模块可以访问我们创建聊天应用程序所需的一切。

现在我们准备开始编写代码了！

定位到 `src/App.jsx` 文件并删除它所有的内容。添加下面的导入语句

```js
import { useState } from "react";
import { Configuration, OpenAIApi } from "openai";
```

上面的代码导入了用于设置配置值的 `Configuration` 和 `OpenAIApi`，使我们能够访问 chat completion 功能。

之后，像这样构建配置：

```js
const configuration = new Configuration({
  organization: "org-xxxx",
  apiKey: "sk-xxxx",
});
```

此代码创建 `Configuration` 对象的新实例。 在其中，你将为 `organization` 和 `apiKey` 输入值。你可以在[设置](https://platform.openai.com/account/org-settings)中找到你的组织的详细信息，在 [API keys](https://platform.openai.com/account/api-keys) 中找到你的 apiKey 信息。 如果你没有现有的 API Key，您可以创建它。

配置后输入以下代码，创建一个新的OpenAI API实例：

```js
const openai = new OpenAIApi(configuration);
```

我们将在整个项目中使用它。

创建并导出默认函数：

```jsx
function App() {
  return <main>
        <h1>对话 AI 教程</h1>
      </main>
}
```

在 `return` 之前设置下面的 state

```js
const [message, setMessage] = useState("");
const [chats, setChats] = useState([]);
const [isTyping, setIsTyping] = useState(false);
```

-   `message` 将保存从应用程序发送到 AI 的信息。
-   `chats` 数组将跟踪双方（用户和 AI）发送的所有消息。
-   `isTyping` 变量将通知用户当前机器人是否正在输入。

在 h1 标签下键入以下代码行

```jsx
<div className={isTyping ? "" : "hide"}>
  <p>
    <i>{isTyping ? "正在输入..." : ""}</i>
  </p>
</div>
```

每当用户等待 AI 的响应时，上面的代码将显示 `正在输入...`

通过将以下代码添加到 `main` 元素中，创建一个用户可以在其中键入消息的表单：

```jsx
<form action="" onSubmit={(e) => chat(e, message)}>
  <input
    type="text"
    name="message"
    value={message}
    placeholder="在这里输入消息并按下回车键..."
    onChange={(e) => setMessage(e.target.value)}
  />
</form>
```

此代码创建一个具有一个输入项的表单。 每当通过按 `回车` 键提交表单时，它都会触发 `chat` 回调函数。

`chat` 回调函数将会接受两个参数（`e` 和 `message`），像这样：

```js
const chat = async (e, message) => {

}
```

函数的内容是这样的：

```js
const chat = async (e, message) => {
      e.preventDefault();
      
      if (!message) return;
      setIsTyping(true);
 }
```

上面的代码阻止表单重新刷新网页，检查在提交之前是否键入了消息，并将 `isTyping` 设置为 `true` 来告知应用程序已开始处理用户的输入。

ChatGPT 响应的消息的格式采用以下模式：

```js
{role: user | assistant, content: message to be sent }
```

每条消息（content）都必须显示发送者。 当聊天来自 AI 时，`role` 是 `assitant`，但如果是来自人类，则 `role` 是`user`。 因此，在发送消息之前，请务必正确格式化并将其添加到数组（chats）中，如下所示：

```js
let msgs = chats;
msgs.push({ role: "user", content: message });
setChats(msgs);

setMessage("");
```

现在我们将通过使用以下代码触发 `createChatCompletion` 函数来调用 `createChatCompletion` 接口：

```js
await openai
      .createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "你现在是 EbereGPT。 你可以帮助完成图形设计任务",
          },
          ...chats,
        ],
      })
```

`createChatCompletion` 函数至少需要 2 个参数（`model` 和 `messages`）：

-   `model` 指定了正在使用的 chatGPT 版本
-   `messages` 是到目前为止用户和 AI 之间的所有消息的列表，以及让 AI 了解它可以提供什么样的帮助的系统消息。

```js
{
    role: "system",
    content: "你现在是 EbereGPT。 你可以帮助完成图形设计任务",
}
```

你可以将 content 更改为适合你的任何内容

`messages` 不必是数组并且包含多个对象。 它可以只是一条消息。 但是当它是一个数组时，它提供了 AI 可以依赖的消息历史记录，以便在未来提供更好的回复，并且它可以减少用户的输入，因为可以不需要一直进行过度描述。

`createChatCompletion` 函数返回的是一个 promise 对象，所以需要使用 `then` 和 `catch` 来获取响应

```js
			.then((res) => {
        msgs.push(res.data.choices[0].message);
        setChats(msgs);
        setIsTyping(false);
      })
      .catch((error) => {
        console.log(error);
      });
```

此代码将 AI 返回的消息添加到 `chats` 数组并将 `isTyping` 设置为 false，表示 AI 已完成回复。

现在应该在每次发送消息时收到反馈（`Typing`）：


![2.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/40e945ae437643b6920baddbf746a139~tplv-k3u1fbpfcp-watermark.image?)

是时候显示聊天记录供用户查看了

在 `h1` 标签下方输入以下代码：

```jsx
<section>
        {chats && chats.length
          ? chats.map((chat, index) => (
              <p key={index} className={chat.role === "user" ? "user_msg" : ""}>
                <span>
                  <b>{chat.role.toUpperCase()}</b>
                </span>
                <span>:</span>
                <span>{chat.content}</span>
              </p>
            ))
          : ""}
      </section>
```

上面的代码遍历 `chats` 并将它们一个接一个地显示给用户。 它并排输出 `role` 和消息的`content`

输出应该如下所示：


![2-2.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0d07126fb252469fb28c7e88f0e4fbef~tplv-k3u1fbpfcp-watermark.image?)

这简直泰裤辣

如果你是一步一步按照我上述的教程编码，那你还需要在这个时候添加你的样式，让你的应用更加美观。用下面的代码替换 `src/index.css` 文件的内容

```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}
h1 {
  font-size: 3.2em;
  line-height: 1.1;
  text-align: center;
  position: sticky;
  top: 0;
  background-color: #242424;
}
main{
  max-width: 500px;
  margin: auto;
}
p{
  background-color: darkslategray;
  max-width: 70%;
  padding: 15px;
  border-radius: 50px;
}
p span{
  margin: 5px;
}
p span:first-child{
  margin-right: 0;
}
.user_msg{
  text-align: right;
  margin-left: 30%;
  display: flex;
}
.hide {
  visibility: hidden;
  display: none;
}
form{
  text-align: center;
  position: sticky;
  bottom: 0;
}
input{
  width: 100%;
  height: 40px;
  border: none;
  padding: 10px;
  font-size: 1.2rem;
}
input:focus{
  outline: none;
}
```

使用 React 和 ChatGPT 创建聊天机器人的过程到此结束。 它并不像听起来那么难。

但是像这样的前端应用程序最适合演示，而不是生产。 以这种方式创建应用程序的问题是前端将 API 密钥暴露给网络攻击。

要解决这个问题，明智的做法是将 API Key 和 Organisation Id 保存在云中安全的某个地方并引用它，或者为您的应用程序构建一个安全性更高的后端。

本章的代码你可以在 [这里](https://github.com/zidanDirk/react-chatgpt-tutorial-cn) 获得

下一节将解决这个问题。

# 如何结合 React 和 Node.js 制作全栈聊天 AI 软件

本部分现在将结合前面部分的功能来构建更安全的应用程序，同时展示更好的 UI 和 UX

我们将通过使用服务器来改进 Node 部分，为前端的调用暴露一个接口，并简化前端与后端的交互，而不是直接调用 [OpenAI](https://openai.com/)

## 如何搭建项目

这部分将创建项目所需的文件夹和文件。

创建项目目录：

```bash
mkdir react-nodejs-chatgpt-tutorial-cn
```

进入目录

```bash
cd react-nodejs-chatgpt-tutorial-cn
```

使用 Vite 创建 React 项目，命名为 `frontend` ，使用以下命令

```bash
npm create vite@latest
```

接着我们进入目录进行安装和运行

```bash
npm install

npm run dev
```

这些命令将安装必要的依赖项并在端口 `5173` 上启动本地服务器

创建后端目录：

```bash
mkdir backend
```

现在进入到后端文件夹并使用以下命令初始化项目：

```bash
cd backend
npm init -y
```

这将创建一个 `package.json` 文件来跟踪项目详细信息

将以下代码行添加到文件中：

```
"type": "module"
```

这将使你能够使用 ES6 模块导入语句

使用下面的命令来安装 [OpenAI](https://openai.com/) 和其他依赖项

```bash
npm i openai body-parser cors express dotenv
```

创建一个包含所有代码的文件。 将其命名为 `index.js`

```bash
touch index.js
```

这样就完成了项目设置。 现在有两个文件夹（ `frontend` 和 `backend`）

## 如何创建一个服务器

这部分将重点创建一个本地服务器来监听 `8000` 端口

首先要做的是像这样导入必要的模块：

```js
import { Configuration, OpenAIApi } from "openai";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as dotenv from 'dotenv'
dotenv.config()
```

接下来，设置 `express`、要监听的`端口`、用于接收输入的 `body-parser` 以及允许前端和后端之间跨域通信的 `cors` ，设置环境变量的 `dotenv` ，使用以下代码：

```js
const app = express();
const port = 8000;
app.use(bodyParser.json());
app.use(cors());
```

最后输入下面的代码

```js
app.listen(port, () => {
  console.log(`正在监听端口 ${port} ...`);
});
```

这样就完成了服务器设置。

当你运行 `index.js` 时，应该得到以下输出：

```
正在监听端口 8000 ...
```

## 如何创建一个接口

在这一部分中，我们将构建一个接口，该接口将从前端接收消息并将响应返回给调用者。

像我们在前几节中所做的那样，首先建立配置参数：

```js
const configuration = new Configuration({
    organization: process.env.organization,
    apiKey: process.env.apiKey,
});
const openai = new OpenAIApi(configuration);
```

创建 `backend/.env` 文件，在 `.env` 文件中配置 `organization` 和 `apiKey`

```js
organization = "xxxx"
apiKey="xxx"
```

接下来，使用以下代码创建异步 POST 路由：

```js
app.post("/", async (request, response) => {
  
});
```

将使用 [](http://localhost:8000/)<http://localhost:8000/> 调用此接口

在回调函数中，输入以下代码以接收从请求体（`request.body`）输入的聊天信息：

```js
const { chats } = request.body;
```

现在像我们在 React 部分中所做的那样调用 `createChatCompletion` 方法：

```js
const result = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你现在是 EbereGPT。 你可以帮助完成图形设计任务",
          },
          ...chats,
        ],
    });
```

这里的区别在于，我们没有使用 `then...catch...` 块，而是将其分配给一个变量（`result`）并使用 `response.json()` 返回响应，如以下代码所示：

```js
response.json({
    output: result.data.choices[0].message,
  });
```

你可以在这里查询到相关的[代码](https://github.com/zidanDirk/react-nodejs-chatgpt-tutorial-cn)

## 如何在前端连接后端服务

这部分将我们带到前端，我们将在其中创建一个表单。 表单将通过 API 接口向后端发送消息，并通过相同的方式接收响应。

导航到 `frontend/src/App.jsx` 文件并键入以下代码：

```js
import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const chat = async (e, message) => {
    e.preventDefault();

    if (!message) return;
    setIsTyping(true);

    let msgs = chats;
    msgs.push({ role: "user", content: message });
    setChats(msgs);

    setMessage("");

    alert(message);
  };

  return (
    <main>
      <h1>全栈 AI 聊天程序</h1>

      <section>
        {chats && chats.length
          ? chats.map((chat, index) => (
              <p key={index} className={chat.role === "user" ? "user_msg" : ""}>
                <span>
                  <b>{chat.role.toUpperCase()}</b>
                </span>
                <span>:</span>
                <span>{chat.content}</span>
              </p>
            ))
          : ""}
      </section>

      <div className={isTyping ? "" : "hide"}>
        <p>
          <i>{isTyping ? "正在输入..." : ""}</i>
        </p>
      </div>

      <form action="" onSubmit={(e) => chat(e, message)}>
        <input
          type="text"
          name="message"
          value={message}
          placeholder="在这里输入消息并按下回车键..."
          onChange={(e) => setMessage(e.target.value)}
        />
      </form>
    </main>
  );
}
export default App;
```

此代码类似于上一节中的代码。 但是我们删除了 OpenAI 配置，因为在本节中我们将不再需要它们。

此时，每当提交表单时都会弹出警报。 这将在一瞬间改变。

在聊天功能中，去掉警告消息并输入以下内容：

```js
fetch("http://localhost:8000", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chats,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        msgs.push(data.output);
        setChats(msgs);
        setIsTyping(false);
      })
      .catch((error) => {
        console.log(error);
      });
```

上面的代码调用我们创建的接口并传入 `chats` 数组以供其处理。 然后它会返回一个响应，该响应被添加到 `chats` 中并显示在 UI 中

如果将以下样式添加到 `frontend/src/index.css` 文件，UI 会看起来更好：

```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

html, body{
  scroll-behavior: smooth;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
  text-align: center;
  position: sticky;
  top: 0;
  background-color: #242424;
}

main{
  max-width: 800px;
  margin: auto;
}

p{
  background-color: darkslategray;
  max-width: 70%;
  padding: 15px;
  border-radius: 50px;
}

p span{
  margin: 5px;
}

p span:first-child{
  margin-right: 0;
}

.user_msg{
  text-align: right;
  margin-left: 30%;
  display: flex;
}

.hide {
  visibility: hidden;
  display: none;
}

form{
  text-align: center;
  position: sticky;
  bottom: 0;
}

input{
  width: 100%;
  height: 40px;
  border: none;
  padding: 10px;
  font-size: 1.2rem;
  background-color: rgb(28, 23, 23);
  color: white;
}

input:focus{
  outline: none;
}
```

以下就是目前的 UI


![3.jpg](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f9d07eb8b82a45ea8848d91bc62794fb~tplv-k3u1fbpfcp-watermark.image?)

恭喜你完成了这个项目！

全栈聊天机器人的工作量更大，但它帮助我们分离关注点，构建更安全、更有吸引力的应用程序，并为用户提供更好的体验。 所以这些努力是值得的。

你可以在这里找到[这个章节的代码](https://github.com/zidanDirk/react-nodejs-chatgpt-tutorial-cn)

# 总结

本教程希望向你展示任何具有基本编程知识的人都可以构建 AI 驱动的软件。 学习了如何使用 React 和 Nodejs 构建聊天机器人，我们讨论了每种技术的优缺点。 最后，我们构建了一个既实用、安全又美观的解决方案。

阅读本教程后，你现在可以探索 AI 的更多功能，例如图像处理和音频交互。 花点时间阅读[文档](https://platform.openai.com/docs/introduction/next-steps)，看看如何扩展我们在这里介绍的内容。最后感谢大家对本文的支持～欢迎点赞收藏，在评论区留下你的高见 🌹🌹🌹

# 其他

-   本文是翻译文，[原文地址](https://www.freecodecamp.org/news/how-to-build-a-chatbot-with-openai-chatgpt-nodejs-and-react/)

-   代码仓库

    -   [](https://github.com/zidanDirk/react-nodejs-chatgpt-tutorial-cn)<https://github.com/zidanDirk/react-nodejs-chatgpt-tutorial-cn>
    -   [](https://github.com/zidanDirk/react-chatgpt-tutorial-cn)<https://github.com/zidanDirk/react-chatgpt-tutorial-cn>
    -   [](https://github.com/zidanDirk/nodejs-chatgpt-tutorial-cn)<https://github.com/zidanDirk/nodejs-chatgpt-tutorial-cn>
