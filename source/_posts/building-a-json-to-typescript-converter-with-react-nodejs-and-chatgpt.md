---
title: 基于 ChatGPT 和 React 搭建 JSON 转 TS 的 Web 应用
date: 2023-03-15 20:32:00
tags: 翻译
---

在本文中，你将学习如何使用 ChatGPT API 构建一个将 JSON 对象转换为 Typescript interface 的 Web 应用

# 为什么你需要它？

许多网站为不同的场景提供 API

简单的解决方案是发送 JSON 并返回 Typescript 中的interface

你也可以使用 [JSON-to-typescript](https://www.npmjs.com/package/json-to-ts) 库来实现，但我将使用 ChatGPT 向你展示这一点，因为你知道，我喜欢魔法（AI） 🪄⭐️


![1.webp](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f59f7dee4f744d26bddadc8efc6df28e~tplv-k3u1fbpfcp-watermark.image?)


# 什么是 **ChatGPT ？**

ChatGPT 是一种由 [OpenAI](https://openai.com/) 训练的 AI 语言模型，可以生成文本并以类似人类的对话方式与用户进行交互。用户可以在短短几秒钟内提交请求并获得信息或从广泛的主题中获得问题的答案。

[ChatGPT](https://openai.com/blog/chatgpt) 还有助于编写、调试和解释代码片段。 值得一提的是，ChatGPT 及其 API 目前免费开放给公众使用。

因此在本文中，我们将使用它的 API 构建一个 JSON 到 Typescript 的转换器

# 项目设置

在这里，我们会为 Web 应用创建项目环境。 我们将在前端使用 React.js，在后端使用 Node.js

通过运行以下代码为 Web 应用创建项目文件夹：

```bash
mkdir json-to-typescript-cn
cd json-to-typescript-cn
```

## 设置 **Node.js** 服务端

进入 server 目录并创建一个 `package.json` 文件

```bash
mkdir server

cd server & npm init -y
```

安装 Express， Nodemon ， CORS， dotenv 包

```bash
npm install express cors nodemon dotenv
```

[ExpressJS](https://expressjs.com/) 是一个快速、极简的框架，它提供了多种用于在 Node.js 中构建 Web 应用程序的功能； [CORS](https://www.npmjs.com/package/cors) 是一个允许不同域之间通信的 Node.js 包，而 [Nodemon](https://www.npmjs.com/package/nodemon) 是一个在检测到文件更改后自动重启服务器的 Node.js 工具。[Dotenv](https://www.npmjs.com/package/dotenv) 是一个零依赖模块，它将环境变量从 .env 文件加载到 process.env 中。

创建一个 `index.js` 文件作为 Web 服务器的入口

```bash
touch index.js
```

使用 Express.js 设置 Node.js 服务器。 当浏览器访问 [](http://localhost:4000/api)<http://localhost:4000/api> 时，下面的代码片段会返回一个 JSON 对象

```js
//👇🏻index.js
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 4000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.get("/api", (req, res) => {
    res.json({
        message: "Hello world",
    });
});

app.listen(PORT, () => {
    console.log(`Node.js 服务正在监听 ${PORT} 端口 ...`);
});
```

通过将 start 命令添加到 `package.json` 文件中的 scripts 列表来配置 Nodemon。 下面的代码片段使用 Nodemon 启动服务器。

```bash
//在 server/package.json 文件中

"scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "nodemon index.js"
  },
```

恭喜！ 你现在可以使用以下命令启动服务器。

```bash
npm start
```

## 设置 React 应用

通过终端导航到根目录并创建一个新的 React.js 项目

```bash
npm create vite@latest

✔ Project name:  client
✔ Select a framework: › React
✔ Select a variant: › JavaScript

cd client 

npm i 
```

在 client 目录安装  [Monaco Editor for React](https://github.com/suren-atoyan/monaco-react) 和  [React Copy to Clipboard](https://www.npmjs.com/package/react-copy-to-clipboard) 库

```bash

npm install @monaco-editor/react react-copy-to-clipboard
```

[Monaco Editor for React](https://github.com/suren-atoyan/monaco-react) 是一个十分简单的包，用于将代码编辑器添加到 React 应用程序，而 [React Copy to Clipboard](https://www.npmjs.com/package/react-copy-to-clipboard) 包允许我们通过单击按钮复制和粘贴内容

从 React 应用程序中删除多余的文件，并更新 `App.jsx` 文件以显示 “Hello World” ，如下所示。

```jsx
function App() {
    return (
        <div>
            <p>Hello World!</p>
        </div>
    );
}
export default App;
```

如下所示，更新 `src/index.css` 样式文件

```css
@import url("<https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap>");

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: "Space Grotesk", sans-serif;
}
.app {
    width: 100%;
    min-height: 100vh;
}
.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
}
.header__container {
    width: 100%;
    display: flex;
    align-items: center;
    height: 10vh;
    background-color: #e0f2fe;
}
.header__right {
    display: flex;
    align-items: center;
}
.runBtn {
    padding: 10px 5px;
    width: 100px;
    margin-right: 10px;
    cursor: pointer;
    border: none;
    border-radius: 3px;
    box-shadow: 0 0 1px 1px #e0e0ea;
    background-color: #065f46;
    outline: none;
    color: #fff;
}
.header {
    border: 1px solid #ddd;
    padding: 10px 20px;
    border: 1px solid #e8e2e2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0.5;
    height: 100%;
}
.code__container {
    display: flex;
    height: 95vh;
    width: 100%;
    align-items: flex-start;
}
.minimap {
    display: none;
}
.editor {
    padding: 10px 0px;
    width: 100%;
}
.code,
.output {
    width: 50vw;
}
.deleteIcon {
    height: 25px;
    color: #cf0a0a;
    cursor: pointer;
}
.copyIcon {
    height: 25px;
    color: #3e54ac;
    cursor: pointer;
}
```

## 构建应用用户界面

在这里，我们将为 JSON 到 Typescript 转换器创建用户界面，使用户能够在屏幕左侧添加 JSON 对象，并在屏幕右侧查看 Typescript 中的结果。


![3.jpg](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/93175a0304a949a3bc558fad0ed01ee0~tplv-k3u1fbpfcp-watermark.image?)

首先，在 `client/src` 文件夹中创建一个 icons 文件夹。 icons 文件夹将包含上图中的删除和复制图标

```bash
cd client/src
mkdir icons
cd icons
touch Copy.jsx Delete.jsx
```

更新 `Copy.jsx` 文件以添加来自 [Heroicons](https://heroicons.com/) 的 SVG 图标

```jsx
import React from "react";

const Copy = () => {
    return (
        <svg
            xmlns='<http://www.w3.org/2000/svg>'
            viewBox='0 0 24 24'
            fill='currentColor'
            className='w-6 h-6 copyIcon'
        >
            <path d='M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 013.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0121 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 017.5 16.125V3.375z' />
            <path d='M15 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0017.25 7.5h-1.875A.375.375 0 0115 7.125V5.25zM4.875 6H6v10.125A3.375 3.375 0 009.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V7.875C3 6.839 3.84 6 4.875 6z' />
        </svg>
    );
};

export default Copy;
```

将下面的代码复制到 `Delete.jsx` 文件中。 它为删除按钮呈现一个 SVG 图标。

```jsx
import React from "react";

const Delete = () => {
    return (
        <svg
            xmlns='<http://www.w3.org/2000/svg>'
            viewBox='0 0 24 24'
            fill='currentColor'
            className='w-6 h-6 deleteIcon'
        >
            <path
                fillRule='evenodd'
                d='M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z'
                clipRule='evenodd'
            />
        </svg>
    );
};

export default Delete;
```

更新 `App.jsx` 文件来渲染 header 元素，如下所示

```jsx
import React from "react";
import Delete from "./icons/Delete";
import Copy from "./icons/Copy";

const App = () => {
    const handleSubmit = () => {
        console.log("运行按钮点击");
    };

    return (
        <main className='app'>
            <header className='header__container'>
                <div className='header'>
                    <h3>JSON</h3>
                    <div className='header__right'>
                        <button className='runBtn' onClick={handleSubmit}>
                            运行
                        </button>
                        <Delete />
                    </div>
                </div>

                <div className='header'>
                    <h3>Typescript</h3>
                    <Copy />
                </div>
            </header>

            <div className='code__container'></div>
        </main>
    );
};

export default App;
```

上面的代码片段显示了 Web 应用程序的 header 组件。 在接下来的部分中，我会说明如何将 Monaco 代码编辑器添加到 React 应用程序

## 添加 **Monaco 代码编辑器到 React**

Monaco Editor 是一款著名的基于 Web 技术的代码编辑器，为 VS Code 提供支持，它只需要一行集成即可支持多种编程语言。

我们已经在上一节中安装了库。 接下来，将其导入 `App.jsx` 文件，如下所示

```jsx
import React, { useState } from "react";
import Delete from "./icons/Delete";
import Copy from "./icons/Copy";
import Editor from "@monaco-editor/react";

const App = () => {
    const [value, setValue] = useState("");
    const [output, setOutput] = useState("");
    const handleSubmit = () => {
        console.log("Run Button Clicked");
    };

    return (
        <main className='app'>
            <header className='header__container'>
                <div className='header'>
                    <h3>JSON</h3>
                    <div className='header__right'>
                        <button className='runBtn' onClick={handleSubmit}>
                            RUN
                        </button>
                        <Delete />
                    </div>
                </div>

                <div>
                    <h3>Typescript</h3>
                    <Copy />
                </div>
            </header>

            <div className='code__container'>
                <div className='code'>
                    <Editor
                        height='90vh'
                        className='editor'
                        defaultLanguage='json'
                        defaultValue='{ }'
                        value={value}
                        onChange={(value) => setValue(value)}
                    />
                </div>
                <div className='output'>
                    <Editor
                        height='90vh'
                        className='editor'
                        defaultLanguage='typescript'
                        options={{
                            domReadOnly: true,
                            readOnly: true,
                        }}
                        defaultValue=''
                        value={output}
                        onChange={(value) => setOutput(value)}
                    />
                </div>
            </div>
        </main>
    );
};

export default App;
```

从上面的代码片段中，我从 Monaco Editor 包中导入了 `Editor` 组件。 第一个编辑器组件接受诸如 *height*、*value*、*defaultLanguage* 和 *onChange* 事件之类的 props 第二个编辑器组件接受与第一个相同的 props，但有一个名为 `options` 的附加 props，由于它是只读的，因此会禁止用户编辑它的值

# 如何在 Node.js 中与 ChatGPT 进行通信

在本节中，你将学习如何通过 Node.js 服务器中的 API 与 ChatGPT 进行通信。 我们会将用户提供的 JSON 代码发送到 API，以将代码转换为其等效的 Typescript。 要做到这一点：

通过运行以下代码安装 OpenAI API Node.js 库

```bash
npm install openai
```

在 [此处](https://platform.openai.com/overview) 登录或创建 OpenAI 帐户

单击导航栏上的 `Personal` 并从菜单栏中选择 `View API Keys` 以创建新的密钥。


![4.jpg](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/be17a6b5fd4540328bb15f87bb6d50c0~tplv-k3u1fbpfcp-watermark.image?)


![5.jpg](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eda7ed38f3194604951874cc6f92734d~tplv-k3u1fbpfcp-watermark.image?)

将 API 密钥复制到计算机上安全的地方； 我们很快就会用到它

通过将以下代码复制到 server/index.js 文件来配置 API。

```js
const { Configuration, OpenAIApi } = require("openai");
const dotenv = require('dotenv')

dotenv.config()
const GPT_API_KEY = process.env.GPT_API_KEY

if (!GPT_API_KEY) {
    console.log("请配置 ChatGPT API Key")
    return
}

const configuration = new Configuration({
    apiKey: GPT_API_KEY,
});

const openai = new OpenAIApi(configuration);
```

在 server 目录下创建 `.env` 文件， 将 `GPT_API_KEY` 的值替换为你的 API 密钥。

```bash
GPT_API_KEY="<你的 GPT API 密钥>"
```

在服务器上创建一个 `POST` 路由，它将接受来自前端的 JSON 代码并生成其等效的 Typescript

```js
// server/index.js 文件中

app.post("/convert", (req, res) => {
    console.log(req.body);
});
```

更新前端 `App.jsx` 文件中的 `handleSubmit` 函数，将用户输入的 JSON 对象发送到服务器上的 `/convert` 接口

```js
const handleSubmit = () => {
    fetch("http://localhost:4000/convert", {
        method: "POST",
        body: JSON.stringify({
            value,
        }),
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((res) => res.json())
        .then((data) => {
            setOutput(data.response);
        })
        .catch((err) => console.error(err));
};
```

更新 `/convert` 接口，如下所示

```js
app.post("/convert", async (req, res) => {
    //👇🏻 解构 JSON 对象
    let { value } = req.body;

    //👇🏻 向 ChatGPT 提问
    const prompt = `Convert the JSON object into Typescript interfaces \n ${value} Please, I need the only the code, I don't need any explanations.`;

    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
    });
    res.json({
        message: "Successful",
        response: completion.data.choices[0].message.content,
    });
});
```

上面的代码片段从 React 应用程序接受 JSON 对象，使用 JSON 代码创建提问，并将其发送到 ChatGPT API。 包含与请求的 JSON 等效的 Typescript 的响应被发送回客户端。

由于我们是从 Node.js 服务请求到响应，因此向应用程序添加 loading 状态用于在请求还没有返回时通知用户正在请求中。

首先，创建一个 `Loading.jsx` 文件并将以下代码复制到该文件中

```jsx
const Loading = () => {
    return (
        <div className='loading'>
            <h2>Loading...</h2>
        </div>
    );
};

export default Loading;
```

在 `App.jsx` 文件中添加 loading 状态

```js
const [loading, setLoading] = useState(false);
```

更新 `handleSubmit` 函数以在用户单击 “运行” 按钮或请求成功时更新加载状态

```js
const handleSubmit = () => {
      // 👇🏻 打开 loading
      setLoading(true);
      fetch("http://localhost:4000/convert", {
          method: "POST",
          body: JSON.stringify({
              value,
          }),
          headers: {
              "Content-Type": "application/json",
          },
      })
          .then((res) => res.json())
          .then((data) => {
              // 👇🏻 关闭 loading
              setLoading(false);
              setOutput(data.response);
          })
          .catch((err) => console.error(err));
  };
```

有条件地渲染第二个代码编辑器，如下所示

```jsx
return (
        <main className='app'>
           {/* -- 其他组件 --*/}

            <div className='code__container'>
              <div className='code'>
                    <Editor
                        height='90vh'
                        className='editor'
                        defaultLanguage='json'
                        defaultValue='{ }'
                        value={value}
                        onChange={(value) => setValue(value)}
                    />
                </div>
                <div className='output'>
                  {loading ? (
                      <Loading />
                  ) : (
                      <Editor
                          height='90vh'
                          className='editor'
                          defaultLanguage='typescript'
                          options={{
                              domReadOnly: true,
                              readOnly: true,
                          }}
                          defaultValue=''
                          value={output}
                          onChange={(value) => setOutput(value)}
                      />
                  )}
                </div>
            </div>
        </main>
    );
```

当用户提交一个 JSON 对象进行转换时，会立即显示 Loading 组件，直到请求成功，然后在代码编辑器上显示结果


![6.jpg](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9505b97c80ea41e0ad36b065015c28a9~tplv-k3u1fbpfcp-watermark.image?)

恭喜！🎊 应用就快要完成了。 接下来，让我们添加一些额外的功能，例如通过单击按钮复制所有 Typescript 代码以及通过单击按钮清除输入编辑器的所有内容的能力。

# 复制 Typescript 代码

在这里，你将学习如何使用 [React-copy-to-clipboard](https://www.npmjs.com/package/react-copy-to-clipboard) 库在单击按钮时复制和粘贴内容

我们已经在本教程开头安装了该包。 接下来，将其导入 `App.jsx` 文件，如下所示。

```js
import { CopyToClipboard } from "react-copy-to-clipboard";
```

在成功复制内容后运行的 App.jsx 文件中的一个函数

```js
const copyToClipBoard = () => alert(`已复制 ✅`);
```

编写 `CopyToClipboard` 组件，如下所示

```jsx
<CopyToClipboard text={output} onCopy={copyToClipBoard}>
    <span>
        <Copy />
    </span>
</CopyToClipboard>
```

`CopyToClipboard` 组件接收一个 text props（包含要复制的内容）和一个 onCopy 属性（一个在复制内容成功后运行的函数）

# 删除用户输入

如果要删除所有用户的输入，需要将 value 作为 prop 传递到 `<Delete/>` 组件中

```js
<Delete setValue={setValue} />
```

当用户单击删除图标时更新 value 状态

```js
const Delete = ({ setValue }) => {
    return (
        <svg
            xmlns='<http://www.w3.org/2000/svg>'
            viewBox='0 0 24 24'
            fill='currentColor'
            className='w-6 h-6 deleteIcon'
            onClick={() => setValue("{ }")}
        >
            <path
                fillRule='evenodd'
                d='M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z'
                clipRule='evenodd'
            />
        </svg>
    );
};

export default Delete;
```

# 总结

到目前为止，我们已经学习了

-   ChatGPT 是什么
-   如何在 React 应用程序中添加高效的代码编辑器
-   如何在 Node.js 中与 ChatGPT 通信
-   如何在 React 中单击按钮时复制与删除内容

本教程完成一个可以使用 ChatGPT API 构建的应用程序示例。 通过 API，你还可以创建功能强大的应用程序，在各个领域都有用，例如翻译、问答、代码解释或生成等。最后感谢大家对本文的支持～欢迎点赞收藏，在评论区留下你的高见 🌹🌹🌹


# 其他

-   本教程的源代码可在此处获得：[](https://github.com/zidanDirk/json-to-typescript-chatgpt-cn)<https://github.com/zidanDirk/json-to-typescript-chatgpt-cn>
-   本文为翻译文，[原文地址](https://dev.to/novu/building-a-json-to-typescript-converter-with-react-nodejs-and-chatgpt-46p2)
