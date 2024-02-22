---
title: Node.js 应用集成谷歌生成式AI Gemini
date: 2024-02-21 16:00:30
tags: 翻译
---

# 介绍

在过去一年， 生成式 AI  已经成为技术圈最热门的话题。每个人都是用它来构建项目。Google 也拥有自己的生成式 AI，叫做 Gemini。

最近，Google 已经为开发者发布了 Gemini 的 API。它包含了一些库和框架，开发者可以将其集成到自己的应用中去。

在本篇文章中，我们将构建一个简单的 Node.js 应用并将 Google Gemni 集成进来。我们将通过 **[Google Gemini SDK](https://www.npmjs.com/package/@google/generative-ai) 来实现。**

让我们马上开始吧！

# 什么是 Gemini ?

![p1](/imgs/post/how-to-use-google-gemini-with-nodejs-app/p1.webp)

Google Gemini 是 Google 团队开发的一个强大且多面的 AI 模型。Gemini 不仅仅可以处理文字，还可以理解和处理多种格式比如：代码，音频，图片和视频。这为你的 Node.js 项目带来了无限的可能性。

# 项目创建

1. 创建 Node.js 项目
    
    我们需要先创建 Node.js 环境来开始我们的项目。所以，让我们先创建一个 node 项目。在终端运行下面的命令
    
    ```bash
    npm init
    ```
    
    这个将会初始化一个新的 Node.js 项目
    
2. 安装依赖
    
    现在，我们将安装项目必要的依赖
    
    ```bash
    npm install express body-parser @google/generative-ai dotenv
    ```
    
    这个将会安装以下的依赖包：
    
    - express: 一个流行的 Node.js Web 应用框架
    - body-parser: 解析请求体的中间件
    - **[@google](https://hashnode.com/@google)**/generative-ai:  对接 Gemini 模型能力
    - dotenv: 从 .env 文件加载环境变量
3. 设置环境变量
    
    接下来，我们将创建一个 .env 文件来存放我们的敏感信息，比如 API 凭证信息。
    
    ```bash
    // .env
    API_KEY=YOUR_API_KEY
    PORT=3000
    ```
    
4. 获取 API Key
    
    在使用 Gemini 之前，我们需要从 Google 开发者控制台创建 API 凭证。为此，你需要登录 Google 账号并创建一个 API key
    
    一旦你登录成功，跳转到 **https://makersuite.google.com/app/apikey** 我们将看到类似这样的内容
    
    ![p2](/imgs/post/how-to-use-google-gemini-with-nodejs-app/p2.jpg)
    
    然后我们点击「Create API key」按钮，这就可以生成一个唯一的 API key。我们将使用这个 API key 来跟 Google Generative AI API 进行权限认证
    
    > 你可以使用 Curl 命令来测试你的 API
    > 
    
    ```bash
    curl \
      -H 'Content-Type: application/json' \
      -d '{"contents":[{"parts":[{"text":"Write a story about a magic backpack"}]}]}' \
      -X POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY
    ```
    
    ![p3](/imgs/post/how-to-use-google-gemini-with-nodejs-app/p3.jpg)
    
    将 *YOUR_API_KEY* 替换成你真实生成的 API Key。同时我们将生成的 API key 更新到 `.env` 文件中。
    
5. 创建 Express 服务
我们在根目录下创建一个 `index.js`  文件并设置一个基础的 express 服务。看看下面的代码
    
    ```jsx
    const express = require("express");
    const dotenv = require("dotenv");
    
    dotenv.config();
    
    const app = express();
    const port = process.env.PORT;
    
    app.get("/", (req, res) => {
      res.send("Hello World");
    });
    
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
    ```
    
    这里，我们使用 “dotenv” 这个包来通过 `.env`  文件访问 PORT 端口号
    
    在文件的最顶部，我们使用 `dotenv.config()` 来加载环境变量，使得我们可以在这个文件中访问到这些变量
    
6. 运行项目
    
    在这一步，我们需要在项目中添加 `package.json` 文件，然后在改文件中添加下面的内容
    
    ```jsx
    "scripts": {
      "start": "node index.js"
    }
    ```
    
    `package.json` 文件 看起来应该像下面这样
    
    ![p4](/imgs/post/how-to-use-google-gemini-with-nodejs-app/p4.jpg)
    
    在检查一切都没问题之后，我们可以使用下面的命令来运行项目
    
    ```bash
    npm run start
    ```
    
    这个将会启动 Express 服务。现在如果我们访问 URL **http://localhost:3000/ ，则可以看到**
    
    ![p5](/imgs/post/how-to-use-google-gemini-with-nodejs-app/p5.jpg)
    
    非常好！这个项目已经正常运行起来了。在下一章节，我们将把 Gemini 集成到我们的项目中去。
    
    # 添加 Google Gemini
    
    1. 添加路由和中间件
        
        我们将在项目中创建一个 `/generate` 路由来与 Gemini AI 进行通信
        
        对此我们需要在 `index.js` 文件中添加下面的内容
        
        ```jsx
        const bodyParser = require("body-parser");
        const { generateResponse } = require("./controllers/index.js");
        
        // 将请求体内容解析为JSON的中间件
        app.use(bodyParser.json());
        
        app.post("/generate", generateResponse);
        ```
        
        这里我们使用 `body-parser` 中间件将请求体的内容格式化为 JSON
        
    2. 配置 Google 生成式 AI
        
        我们创建一个名为 `controller` 的目录，在目录里面创建一个 `index.js` 文件。接下来我们将创建一个新的 controller 函数来处理上面代码声明的 `generated` 路由
        
        ```jsx
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const dotenv = require("dotenv");
        
        dotenv.config();
        
        // GoogleGenerativeAI 配置
        const configuration = new GoogleGenerativeAI(process.env.API_KEY);
        
        // 模型初始化
        const modelId = "gemini-pro";
        const model = configuration.getGenerativeModel({ model: modelId });
        ```
        
        这里我们为 Google Generative AI API 创建一个配置对象，并且将环境变量中的 API Key 传给这个对象。
        
        然后，我们通过向配置对象的 `getGenerativeModel` 方法提供模型 ID（“gemini-pro”）来初始化模型。
        
        > **模型配置**
        我们也可以根据自己的需求配置模型参数。
        这些参数值控制模型如何生成响应。
        例如：
        > 
        > 
        > ```jsx
        > const generationConfig = {
        >   stopSequences: ["red"],
        >   maxOutputTokens: 200,
        >   temperature: 0.9,
        >   topP: 0.1,
        >   topK: 16,
        > };
        > 
        > const model = configuration.getGenerativeModel({ model: modelId, generationConfig });
        > ```
        > 
        > **安全设置**
        > 我们可以使用安全设置来防止出现有害的响应。 默认情况下，安全设置配置为阻止在各个维度上具有中等到高可能性不安全的内容。
        > 
        > 例如
        > 
        > ```jsx
        > const { HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
        > 
        > const safetySettings = [
        >   {
        >     category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        >     threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        >   },
        >   {
        >     category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        >     threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        >   },
        > ];
        > 
        > const model = genAI.getGenerativeModel({ model: "MODEL_NAME", safetySettings });
        > ```
        > 
        > 通过这些安全设置，我们可以最大限度地减少有害内容生成的可能性，以此来增强安全性。
        > 
    3. 管理历史对话
        
        为了追踪历史对话记录，我们创建一个 `history` 数组并导出它
        
        ```jsx
        const history = []
        
        exports.history = history;
        ```
        
    4. 实现 Controller 函数
        
        现在，我们将编写一个Controller 函数`generateResponse` 来处理生成路由（/generate）并生成对用户请求的响应。
        
        ```jsx
        /**
         * 基于给定的提示生成响应。
         * @param {Object} req - 请求对象.
         * @param {Object} res - 响应对象.
         * @returns {Promise}
         */
        const generateResponse = async (req, res) => {
            try {
              const { prompt } = req.body;
          
              const result = await model.generateContent(prompt);
              const response = await result.response;
              const text = response.text();
              console.log(text);
          
              history.push(text);
              console.log(history);
          
              res.send({ response: text });
            } catch (err) {
              console.error(err);
              res.status(500).json({ message: "Internal server error" });
            }
          };
        
        exports.generateResponse = generateResponse;
        ```
        
        在这里，我们从请求体中获取 prompt，并使用 `model.generateContent` 方法根据 prompt 生成响应。
        
        为了跟踪响应，我们将响应 push 到 `history` 数组。
        
    5. 检查响应历史
        
        我们将创建一个路由来检查我们的响应历史记录。 这个端点返回历史数组。
        
        在 `index.js` 文件中添加下面这些代码
        
        ```jsx
        app.get("/generate", (req, res) => {
          res.send(history);
        });
        ```
        
    6. 运行项目
        
        现在我们检查一下我们的项目是否能正常工作！
        
        让我们使用以下命令来运行项目：
        
        ```bash
        npm run start
        ```
        
        ![p6](/imgs/post/how-to-use-google-gemini-with-nodejs-app/p6.jpg)
        
        运行正常！
        
    7. 功能检查
        
        接下来，我们将使用 Postman 发出 Post 请求来验证我们的功能。
        
        我们将使用以下的参数给 **http://localhost:3000/generate** 发送一个 post 请求
        
        ```json
        {
          "prompt": "Write 3 Javascript Tips for Beginners"
        }
        ```
        
        ![p7](/imgs/post/how-to-use-google-gemini-with-nodejs-app/p7.jpg)
        
        我们可以得到下面的响应内容
        
        ```json
        {
            "response": "1. **从基础开始：**花时间透彻地了解变量、数据类型、运算符和控制流等核心概念。奠定坚实的基础将使你更容易理解更高级的主题。\n\n2. **实践、实践、再实践：**编程是一种实践性技能。通过编写大量的代码并解决问题，你会提高你的熟练程度和解决问题的能力。在在线平台上查找练习、代码挑战和项目。\n\n3. **寻求帮助和反馈：**不要害怕向他人寻求帮助。加入在线社区、参加研讨会或与导师联系。获得反馈和建议将帮助你识别改进领域并提高你的技能。"
        }
        ```
        
        ![p8](/imgs/post/how-to-use-google-gemini-with-nodejs-app/p8.jpg)
        
        非常完美！ 我们的 Gemini AI 集成正在按预期工作！
        
        此外，我们可以访问 http://localhost:3000/generate  这个路由来查看对话历史记录
        
        这样，我们就将 Gemini AI 集成到了 Node.js 应用程序中。 在接下来的文章中，我们将探索 Gemini AI 的更多用例。
        
        请持续关注吧！
        
        # 总结
        
        如果你发现这篇博文有帮助，欢迎与其他人分享。 你还可以关注我，了解有关 Javascript、React 和其他 Web 开发主题的更多内容。与往常一样，如果你有任何疑问，请随时与我联系或发表评论。 祝你编程愉快！
        
        > 本文为翻译文，原文地址：https://arindam1729.hashnode.dev/how-to-use-google-gemini-with-nodejs-app
        >