---
title: 使用 Socket.io 和 React 开发一个聊天应用
date: 2022-12-27 17:13:00
tags: 翻译
---


# 这篇文章是关于什么的

相信大家对于 web 版的线上聊天室都不陌生，这篇文章主要讲的就是如何使用 [Socket.io](http://socket.io) 和 React 开发一下简单的线上聊天应用。

所谓线上聊天应用，就是你给一个人或者一个群发送一条消息，他们可以看到这条消息并且可以回复。既简单又复杂。

开发一个聊天室应用，你需要在新信息来到的时候及时的感知到。

通常来说，为了获得服务端的信息，我们需要发送一个 HTTP 请求。但是如果使用 websockets，服务端能够主动告知你有新的信息到来而不需要客户端发起请求。

在本文中，我们将利用 [Socket.io](http://Socket.io) 提供的实时通信来创建一个开放式聊天应用程序，允许用户在该应用程序上发送和接收来自多个用户的消息。同时你也将学习到如何检测用户是否在线以及用户什么时候在输入。

> 💡 为了更好的掌握这篇文章讲到的内容，你可能需要先掌握关于 React.js 和 Node.js 的基础知识

# 什么是 Socket.io

Socket.io 是一个十分流行的 JavaScript 库。它允许我们在浏览器和 Node.js 服务端之间创建一个实时的，双向的通信。它是一个高性能并且可靠的库，经过优化可以以最小的延迟处理大量数据。它遵循 WebSocket 协议并提供更好的功能，比如降级为 HTTP 长链接或者自动重连，这些功能可以协助我们构建一个高效的实时的应用。

# 如何通过 Socket.io 连接 React.js 应用到 Node.js 服务

在这个章节中，我们将开始为聊天室应用搭建项目环境。您还将学习如何将 Socket.io 添加到 React 和 Node.js 应用程序，并连接两个开发服务器以通过 Socket.io 进行实时通信。

创建项目目录，并创建两个子目录名为 client 和 server

```bash
$ mkdir chat-app
$ cd chat-app
$ mkdir client server
```

进入到 client 目录下，通过终端创建 React.js 项目

```bash
$ cd client
$ npx create-react-app ./
```

安装 Socket.io 客户端 API 以及 [React Router](https://reactrouter.com/docs/en/v6)

```bash
$ npm install socket.io-client react-router-dom
```

从 React 项目中删除冗余的文件像是 logo 和 测试文件，像下面一样更新 `App.js` 文件来显示 Hello World

```jsx
function App() {
  return (
    <div>
      <p>Hello World!</p>
    </div>
  );
}
```

接下来，进入 server 目录下，创建一个 `package.json` 文件

```bash
$ cd server
$ npm init -y
```

安装 [Express.js](https://expressjs.com/) , [CORS](https://www.npmjs.com/package/cors) , [Nodemon](https://www.npmjs.com/package/nodemon) , 和 [Socket.io](http://Socket.io) 服务端 API

```bash
$ npm install express cors nodemon socket.io
```

创建一个 index.js 文件，作为 web 服务器的入口文件

```bash
touch index.js
```

使用 Express 创建一个简单的 Node.js 服务。当我们在浏览器访问 `http://localhost:4000/api` 的时候，下面的代码会返回一个 JSON 对象

```js
//index.js
const express = require('express');
const app = express();
const PORT = 4000;

app.get('/api', (req, res) => {
  res.json({
    message: 'Hello world',
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
```

导入 HTTP 和 CORS 库，来让数据能够在客户端和服务端之间传递

```js
const express = require('express');
const app = express();
const PORT = 4000;

// 新导入的模块
const server = require('http').Server(app);
const cors = require('cors');

app.use(cors());

app.get('/api', (req, res) => {
  res.json({
    message: 'Hello world',
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
```

接下来，添加 Socket.io 到项目中去创建一个实时连接

```js
// 新导入
const { Server } = require("socket.io");

// 创建实时连接
const socketIO = new Server(server, {
    cors: {
        origin: "http://localhost:3000"
    }
});

// app.get 代码省略 ...

// 监听连接
socketIO.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} 用户已连接!`);
    socket.on('disconnect', () => {
        console.log('🔥: 一个用户已断开连接');
    });
});
```

从上面的代码中看到，每当用户访问页面的时候，`socket.io("connection")` 建立了与 React 应用的连接，然后为每个 socket 创建一个唯一的 ID ，然后将 ID 打印到控制台

当你刷新或者关闭页面，socket 会触发 disconnect 事件，显示一个用户已从 socket 断开链接。

接下来，通过在 `package.json` 中添加 scripts 启动来配置 Nodemon 。代码如下

```json
// 在 server/package.json

"scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "nodemon index.js"
 },
```

你可以通过下面的命令来通过 Nodemon 启动服务

```bash
$ npm start
```

打开 client 目录下的 App.js 文件，把 React 应用连接到 Socket.io 服务

```jsx
import socketIO from 'socket.io-client';
const socket = socketIO.connect('http://localhost:4000')

function App() {
  return (
    <div>
      <p>Hello World!</p>
    </div>
  );
}
```

启动客户端 React.js 服务

```bash
// client 目录下运行

$ npm start
```

在客户端和服务端的服务都启动之后，React 应用的 ID 会显示在服务端的终端上。

恭喜 🥂，React 应用已经通过 Socket.io 成功连接到服务端

> 💡 对于本文的其余部分，我将引导你完成为聊天应用程序创建网页以及在 React 应用程序和 Node.js 服务器之间来回发送消息的过程。 我还将指导你如何在收到新消息时添加自动滚动功能以及如何在你的聊天应用程序中获取活跃用户

# 为聊天应用创建主页

在本章节中，我们将为聊天应用创建一个主页。主页会接收用户名并将其保存到本地存储以供识别

在 `client/src` 目录下创建一个名为 components 的目录。然后，创建主页的组件

```bash
$ cd src
$ mkdir components & cd components
$ touch Home.js
```

将下面的代码复制到 `Home.js` 文件中。 该代码片段显示一个表单输入，该表单输入接受用户名并将其存储在本地存储中。

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('userName', userName);
    navigate('/chat');
  };
  return (
    <form className="home__container" onSubmit={handleSubmit}>
      <h2 className="home__header">登录聊天</h2>
      <label htmlFor="username">用户名</label>
      <input
        type="text"
        minLength={6}
        name="username"
        id="username"
        className="username__input"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <button className="home__cta">登录</button>
    </form>
  );
};

export default Home;
```

接下来配置 React Router 来让聊天应用的不同页面可以相互跳转。对于这个应用来说，主页和聊天页就足够了

把下面的代码复制到 `src/App.js` 文件中

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import ChatPage from './components/ChatPage';
import socketIO from 'socket.io-client';

const socket = socketIO.connect('http://localhost:4000');
function App() {
  return (
    <BrowserRouter>
      <div>
        <Routes>
          <Route path="/" element={<Home socket={socket} />}></Route>
          <Route path="/chat" element={<ChatPage socket={socket} />}></Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

该代码片段使用 React Router v6 为应用程序的主页和聊天页面分配不同的路由并且将 socket.io 库传到组件中。我们将在接下来的章节中创建聊天页面。

跳到 `src/index.css` 文件，复制下面的代码。它包含了这个项目所需要用到的所有 CSS

```css
@import url('<https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap>');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Poppins', sans-serif;
}
.home__container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.home__container > * {
  margin-bottom: 10px;
}
.home__header {
  margin-bottom: 30px;
}
.username__input {
  padding: 10px;
  width: 50%;
}
.home__cta {
  width: 200px;
  padding: 10px;
  font-size: 16px;
  cursor: pointer;
  background-color: #607eaa;
  color: #f9f5eb;
  outline: none;
  border: none;
  border-radius: 5px;
}
.chat {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
}
.chat__sidebar {
  height: 100%;
  background-color: #f9f5eb;
  flex: 0.2;
  padding: 20px;
  border-right: 1px solid #fdfdfd;
}
.chat__main {
  height: 100%;
  flex: 0.8;
}
.chat__header {
  margin: 30px 0 20px 0;
}
.chat__users > * {
  margin-bottom: 10px;
  color: #607eaa;
  font-size: 14px;
}
.online__users > * {
  margin-bottom: 10px;
  color: rgb(238, 102, 102);
  font-style: italic;
}
.chat__mainHeader {
  width: 100%;
  height: 10vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background-color: #f9f5eb;
}
.leaveChat__btn {
  padding: 10px;
  width: 150px;
  border: none;
  outline: none;
  background-color: #d1512d;
  cursor: pointer;
  color: #eae3d2;
}
.message__container {
  width: 100%;
  height: 80vh;
  background-color: #fff;
  padding: 20px;
  overflow-y: scroll;
}

.message__container > * {
  margin-bottom: 10px;
}
.chat__footer {
  padding: 10px;
  background-color: #f9f5eb;
  height: 10vh;
}
.form {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.message {
  width: 80%;
  height: 100%;
  border-radius: 10px;
  border: 1px solid #ddd;
  outline: none;
  padding: 15px;
}
.sendBtn {
  width: 150px;
  background-color: green;
  padding: 10px;
  border: none;
  outline: none;
  color: #eae3d2;
  cursor: pointer;
}
.sendBtn:hover {
  background-color: rgb(129, 201, 129);
}
.message__recipient {
  background-color: #f5ccc2;
  width: 300px;
  padding: 10px;
  border-radius: 10px;
  font-size: 15px;
}
.message__sender {
  background-color: rgb(194, 243, 194);
  max-width: 300px;
  padding: 10px;
  border-radius: 10px;
  margin-left: auto;
  font-size: 15px;
}
.message__chats > p {
  font-size: 13px;
}
.sender__name {
  text-align: right;
}
.message__status {
  position: fixed;
  bottom: 50px;
  font-size: 13px;
  font-style: italic;
}
```

我们已经创建了主页，接下来我们开始设计聊天页面的样式和交互

# 为应用创建聊天页

在这个章节，我们将创建聊天界面，允许我们发送消息和看到在线用户


![1.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f25366d6636042d8b4478a0f7d4c7689~tplv-k3u1fbpfcp-watermark.image?)

从上面的图片可以看到，聊天页面被分成三个部分：ChatBar（侧边栏显示活跃的用户）；ChatBody （包含发送的消息和头部）；ChatFooter （包含发送输入框和发送按钮）

既然我们已经定义了聊天页面的布局，现在可以创建一个这样布局的组件

创建 `ChatPage.js` 文件，复制下面的代码。你需要组建 ChatBar，ChatBody 和 ChatFooter

```jsx
import React from 'react';
import ChatBar from './ChatBar';
import ChatBody from './ChatBody';
import ChatFooter from './ChatFooter';

const ChatPage = ({ socket }) => {
  return (
    <div className="chat">
      <ChatBar />
      <div className="chat__main">
        <ChatBody />
        <ChatFooter />
      </div>
    </div>
  );
};

export default ChatPage;
```

# Char Bar 组件

复制下面的代码到 `ChatBar.js` 文件中

```jsx
import React from 'react';

const ChatBar = () => {
  return (
    <div className="chat__sidebar">
      <h2>自由聊天</h2>

      <div>
        <h4 className="chat__header">在线用户</h4>
        <div className="chat__users">
          <p>User 1</p>
          <p>User 2</p>
          <p>User 3</p>
          <p>User 4</p>
        </div>
      </div>
    </div>
  );
};

export default ChatBar;
```

# **Chat Body 组件**

这里我们创建一个组件来显示已经发送的消息和标题

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChatBody = () => {
  const navigate = useNavigate();

  const handleLeaveChat = () => {
    localStorage.removeItem('userName');
    navigate('/');
    window.location.reload();
  };

  return (
    <>
      <header className="chat__mainHeader">
        <p>Hangout with Colleagues</p>
        <button className="leaveChat__btn" onClick={handleLeaveChat}>
          LEAVE CHAT
        </button>
      </header>

      {/* 显示你发送消息的内容 */}
      <div className="message__container">
        <div className="message__chats">
          <p className="sender__name">You</p>
          <div className="message__sender">
            <p>Hello there</p>
          </div>
        </div>

        {/*显示你接收消息的内容*/}
        <div className="message__chats">
          <p>Other</p>
          <div className="message__recipient">
            <p>Hey, I'm good, you?</p>
          </div>
        </div>

        {/* 当有用户正在输入，则被触发 */}
        <div className="message__status">
          <p>Someone is typing...</p>
        </div>
      </div>
    </>
  );
};

export default ChatBody;
```

# **Chat Footer 组件**

在这里，我们将在聊天页面底部创建输入和发送按钮。 提交表单后，消息和用户名出现在控制台中。

```jsx
import React, { useState } from 'react';

const ChatFooter = () => {
  const [message, setMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    console.log({ userName: localStorage.getItem('userName'), message });
    setMessage('');
  };
  return (
    <div className="chat__footer">
      <form className="form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="编写消息"
          className="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="sendBtn">发送</button>
      </form>
    </div>
  );
};

export default ChatFooter;
```

# 在 React 应用和 Socket.io 服务之间发送消息

在本节中，您将学习如何通过 Socket.io 将消息从 React 应用程序发送到 Node.js 服务器，反之亦然。 要将消息发送到服务器，我们需要将 Socket.io 库传递到 ChatFooter - 发送消息的组件

更新 `ChatPage.js` 文件以将 Socket.io 库传递到 ChatFooter 组件中

```jsx
import React from 'react';
import ChatBar from './ChatBar';
import ChatBody from './ChatBody';
import ChatFooter from './ChatFooter';

const ChatPage = ({ socket }) => {
  return (
    <div className="chat">
      <ChatBar />
      <div className="chat__main">
        <ChatBody />
        <ChatFooter socket={socket} />
      </div>
    </div>
  );
};

export default ChatPage;
```

更新 ChatFooter 组件中的 handleSendMessage 函数以将消息发送到 Node.js 服务器

```jsx
import React, { useState } from 'react';

const ChatFooter = ({ socket }) => {
  const [message, setMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && localStorage.getItem('userName')) {
      socket.emit('message', {
        text: message,
        name: localStorage.getItem('userName'),
        id: `${socket.id}${Math.random()}`,
        socketID: socket.id,
      });
    }
    setMessage('');
  };
  return <div className="chat__footer">...</div>;
};

export default ChatFooter;
```

handleSendMessage 函数在发送包含用户输入、用户名、生成的消息 ID 以及 socket 或客户端的消息事件之前检查文本字段是否为空以及用户名是否存在于本地存储（从主页登录） Node.js 服务器的 ID。

打开服务器的 `index.js` 文件，更新 Socket.io 相关代码以监听来自 React 应用程序客户端的消息事件，并将消息打印到服务器的终端

```jsx
socketIO.on('connection', (socket) => {
	console.log(`⚡: ${socket.id} 用户已连接!`);

  // 监听和在控制台打印消
  socket.on('message', (data) => {
    console.log(data);
  });

  socket.on('disconnect', () => {
    console.log('🔥: 一个用户已断开连接');
  });
});
```

我们已经能够在服务器上检索消息； 因此，让我们将消息发送给所有连接的客户端。

```jsx

socketIO.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} 用户已连接!`);

	// 发送信息给到所有在线的用户
  socket.on('message', (data) => {
    socketIO.emit('messageResponse', data);
  });

  socket.on('disconnect', () => {
    console.log('🔥: 一个用户已断开连接');
  });
});
```

更新 `ChatPage.js` 文件以监听来自服务器的消息并将其显示给所有用户

```jsx
import React, { useEffect, useState } from 'react';
import ChatBar from './ChatBar';
import ChatBody from './ChatBody';
import ChatFooter from './ChatFooter';

const ChatPage = ({ socket }) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on('messageResponse', (data) => setMessages([...messages, data]));
  }, [socket, messages]);

  return (
    <div className="chat">
      <ChatBar socket={socket} />
      <div className="chat__main">
        <ChatBody messages={messages} />
        <ChatFooter socket={socket} />
      </div>
    </div>
  );
};

export default ChatPage;
```

从上面的代码片段中，Socket.io 监听通过 messageResponse 事件发送的消息并将数据传到消息数组中。 消息数组被传递到 ChatBody 组件以显示在 UI 上

更新 ChatBody.js 文件来渲染消息数组中的数据

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChatBody = ({ messages }) => {
  const navigate = useNavigate();

  const handleLeaveChat = () => {
    localStorage.removeItem('userName');
    navigate('/');
    window.location.reload();
  };

  return (
    <>
      <header className="chat__mainHeader">
        <p>与朋友聚会</p>
        <button className="leaveChat__btn" onClick={handleLeaveChat}>
          离开聊天
        </button>
      </header>

      <div className="message__container">
        {messages.map((message) =>
          message.name === localStorage.getItem('userName') ? (
            <div className="message__chats" key={message.id}>
              <p className="sender__name">You</p>
              <div className="message__sender">
                <p>{message.text}</p>
              </div>
            </div>
          ) : (
            <div className="message__chats" key={message.id}>
              <p>{message.name}</p>
              <div className="message__recipient">
                <p>{message.text}</p>
              </div>
            </div>
          )
        )}

        <div className="message__status">
          <p>有用户正在输入...</p>
        </div>
      </div>
    </>
  );
};

export default ChatBody;
```

上面的代码片段根据是你或是其他用户发送了消息来显示消息。 绿色的消息是你发送的消息，红色的是来自其他用户的消息。

恭喜 🥂，聊天应用现在可以正常使用了。 你可以打开多个 Tab 并将消息从一个 Tab 发送到另一个 Tab

# 如何从 Socket.io 获取活跃用户

在本节中，你将学习如何获取所有活跃用户并将他们显示在聊天应用程序的聊天栏上。


![2.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9cb49134a53a4377b3aabb307698e5b0~tplv-k3u1fbpfcp-watermark.image?)

打开 `src/Home.js` 并创建一个在用户登录时监听的事件。更新 handleSubmit 函数如下：

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = ({ socket }) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('userName', userName);
		// 发送用户名和 socket ID 到 Node.js 服务器
    socket.emit('newUser', { userName, socketID: socket.id });
    navigate('/chat');
  };
  return (...)
  ...
```

创建一个事件监听器，每当用户加入或离开聊天应用时，它就会更新 Node.js 服务器上的 users 数组。

```jsx
let users = [];

socketIO.on('connection', (socket) => {
	console.log(`⚡: ${socket.id} 用户已连接!`);
  socket.on('message', (data) => {
    socketIO.emit('messageResponse', data);
  });

  // 监听新用户的加入
  socket.on('newUser', (data) => {
    // 添加新用户到 users 中
    users.push(data);
    // console.log(users);
    // 发送用户列表到客户端
    socketIO.emit('newUserResponse', users);
  });

  socket.on('disconnect', () => {
		console.log('🔥: 一个用户已断开连接');
    // 当用户下线的时候更新用户列表
    users = users.filter((user) => user.socketID !== socket.id);
    // console.log(users);
    // 发送用户列表到客户端
    socketIO.emit('newUserResponse', users);
    socket.disconnect();
  });
});
```

当有新用户加入聊天应用，`socket.on("newUser")` 就会被触发。用户的详细信息（Socket ID 和用户名）保存到 users 数组中，并在名为 `newUserResponse` 的新事件中发送回 React 应用程序

在 `socket.io("disconnect")` 中，当用户离开聊天应用程序时更新 `user` 数组，并触发 `newUserReponse` 事件以将更新的用户列表发送到客户端。

接下来，让我们更新用户界面 `ChatBar.js` ，来显示活跃用户列表

```jsx
import React, { useState, useEffect } from 'react';

const ChatBar = ({ socket }) => {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        socket.on('newUserResponse', (data) => setUsers(data));
    }, [socket, users]);
    
    return (
        <div className="chat__sidebar">
        <h2>自由聊天</h2>

        <div>
            <h4 className="chat__header">在线用户</h4>
            <div className="chat__users">
                {users.map((user) => (
                    <p key={user.socketID}>{user.userName}</p>
                ))}
            </div>
        </div>
        </div>
    );
};

export default ChatBar;
```

useEffect hook 监听从 Node.js 服务器发送的响应并收集活跃用户列表。 该列表被映射到视图中并实时更新

恭喜 💃🏻，我们已经能够从 Socket.io 中获取活跃用户列表。 接下来，让我们学习如何向聊天应用添加一些很酷的功能

# 可选：自动滚动和通知有用户正在输入

在本节中，您将了解如何在收到新消息时添加自动滚动功能以及标识用户正在键入的功能


![3.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/62ac5d1085734fafb152e765688aa00e~tplv-k3u1fbpfcp-watermark.image?)

像下方代码一样更新 `ChatPage.js`

```jsx
import React, { useEffect, useState, useRef } from 'react';
import ChatBar from './ChatBar';
import ChatBody from './ChatBody';
import ChatFooter from './ChatFooter';

const ChatPage = ({ socket }) => {
    const [messages, setMessages] = useState([]);
    const [typingStatus, setTypingStatus] = useState('');
    const lastMessageRef = useRef(null);

    useEffect(() => {
        socket.on('messageResponse', (data) => setMessages([...messages, data]));
    }, [socket, messages]);

    useEffect(() => {
        // 👇️ 每当消息文字变动，都会往下滚动
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        socket.on('typingResponse', (data) => setTypingStatus(data));
      }, [socket]);

    return (
        <div className="chat">
        <ChatBar socket={socket}  />
        <div className="chat__main">
            <ChatBody 
                messages={messages} 
                typingStatus={typingStatus}
                lastMessageRef={lastMessageRef}  />
            <ChatFooter socket={socket} />
        </div>
        </div>
    );
};

export default ChatPage;
```

更新 `ChatBody` 组件来包含一个带有 `lastMessageRef` 的元素

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChatBody = ({ messages, lastMessageRef }) => {
  const navigate = useNavigate();

  const handleLeaveChat = () => {
    localStorage.removeItem('userName');
    navigate('/');
    window.location.reload();
  };

  return (
    <>
      <div>
        ......
        {/* --- 在 JSX 代码的最底部 ----*/}
        <div ref={lastMessageRef} />
      </div>
    </>
  );
};

export default ChatBody;
```

从上面的代码片段来看，lastMessageRef 附加到消息底部的一个 div 标签，它的 useEffect 有一个依赖项，即 messages 数组。 因此，当消息更改时，lastMessageRef 的 useEffect 会重新渲染。

# 通知其他人有用户正在输入

为了在用户输入时通知其他用户，我们将在输入框上使用 JavaScript onKeyDown 事件监听器，它会触发一个向 Socket.io 发送消息的函数，如下所示：

```jsx
import React, { useState } from 'react';

const ChatFooter = ({socket}) => {
  const [message, setMessage] = useState('');

  const handleTyping = () =>
    socket.emit('typing', `${localStorage.getItem('userName')} 正在输入`);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && localStorage.getItem('userName')) {
        socket.emit('message', {
          text: message,
          name: localStorage.getItem('userName'),
          id: `${socket.id}${Math.random()}`,
          socketID: socket.id,
        });
      }
    setMessage('');
  };
  return (
    <div className="chat__footer">
      <form className="form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="编写消息"
          className="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleTyping}

        />
        <button className="sendBtn">发送</button>
      </form>
    </div>
  );
};

export default ChatFooter;
```

在上面的代码片段中，handleTyping 函数会在用户使用 input 输入框键入时触发键入事件。 然后，我们可以在服务器上监听 typing 事件，并通过另一个名为 `typingResponse` 的事件向其他用户发送包含数据的响应

```jsx
socketIO.on('connection', (socket) => {
 //   console.log(`⚡: ${socket.id} 用户已连接!`);

    // 监听和在控制台打印消息
   // socket.on('message', (data) => {
   //     console.log(data);
   //     socketIO.emit('messageResponse', data);
   //  });

    socket.on('typing', (data) => socket.broadcast.emit('typingResponse', data));

    // 监听新用户的加入
    // socket.on('newUser', (data) => {
        // 添加新用户到 users 中
    //    users.push(data);
        // console.log(users);

        // 发送用户列表到客户端
    //    socketIO.emit('newUserResponse', users);
    // });

    // ...
});
```

接下来监听 `ChatPage.js` 文件中的 `typingResponse` 事件，将数据传入 `ChatBody.js` 文件进行显示

```jsx
import React, { useEffect, useState, useRef } from 'react';
import ChatBar from './ChatBar';
import ChatBody from './ChatBody';
import ChatFooter from './ChatFooter';

const ChatPage = ({ socket }) => {
    // const [messages, setMessages] = useState([]);
    // const [typingStatus, setTypingStatus] = useState('');
    // const lastMessageRef = useRef(null);

    // useEffect(() => {
    //     socket.on('messageResponse', (data) => setMessages([...messages, data]));
    // }, [socket, messages]);

    useEffect(() => {
        // 👇️ 每当消息文字变动，都会往下滚动
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        socket.on('typingResponse', (data) => setTypingStatus(data));
      }, [socket]);

    return (
        <div className="chat">
        <ChatBar socket={socket}  />
        <div className="chat__main">
            <ChatBody 
                messages={messages} 
                typingStatus={typingStatus}
                lastMessageRef={lastMessageRef}  />
            <ChatFooter socket={socket} />
        </div>
        </div>
    );
};

export default ChatPage;
```

更新 `ChatBody.js` 文件去给用户显示输入状态

```jsx
<div className="message__status">
  <p>{typingStatus}</p>
</div>
```

恭喜，您创建了一个聊天应用程序！💃🏻

通过添加允许用户创建 [私人聊天室](https://socket.io/docs/v3/rooms/) 和 [直接消息传递](https://socket.io/get-started/private-messaging-part-1/) 的 [Socket.io](http://Socket.io) 私人消息传递功能，使用用于用户授权和身份验证的身份验证库以及用于存储的实时数据库，随意改进应用程序。

# 总结

[Socket.io](http://Socket.io) 是一个非常棒的工具，具有出色的功能，使我们能够构建高效的实时应用程序，例如体育网站、拍卖和外汇交易应用程序，当然还有通过在 Web 浏览器和 Node.js 服务器之间创建持久连接的聊天应用程序

如果你期待在 Node.js 中构建聊天应用程序，Socket.io 可能是一个很好的选择

你可以在此处找到本教程的源代码：[](https://github.com/zidanDirk/socket-react-chat-app)<https://github.com/zidanDirk/socket-react-chat-app>

> 本文原文地址：https://dev.to/novu/building-a-chat-app-with-socketio-and-react-2edj

参考文章：

-   [socket.io](https://socket.io/)
