---
title: 基于 React Flow 与 Web Audio API 的音频应用开发
date: 2023-05-09 16:06:00
tags: 翻译
---


今天我们来学习通过 React Flow 和 Web Audio API 来创建一个可交互的语音广场。我们将会从最小的场景开始，在学习 React Flow（包括：状态管理，实现自定义节点，添加交互能力） 之前，我们会先学习 Web Audio API。

这个教程会一步一步地带你完善这个应用，当然你也可以跳过中间的一些步骤。但如果你是一名新手，还是建议你从头到尾按顺序看完。

# Web Audio API

让我们来看一些 [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) 。以下的高亮是你需要知道的知识点：

-   Web Audio API 提供了许多不同的音频节点，包括：音频源（比如： [OscillatorNode](https://developer.mozilla.org/zh-CN/docs/Web/API/OscillatorNode) 和 [MediaElementAudioSourceNode](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaElementAudioSourceNode) ），音频效果（比如：[GainNode](https://developer.mozilla.org/zh-CN/docs/Web/API/GainNode)， [DelayNode](https://developer.mozilla.org/en-US/docs/Web/API/DelayNode) ， [ConvolverNode](https://developer.mozilla.org/zh-CN/docs/Web/API/ConvolverNode) ）输出（比如：[AudioDestinationNode](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioDestinationNode)）
-   音频节点可以互相连接在一起来形成一个「图」，我们一般称之为「音源处理图」或者「信号图」或者「信号链」
-   音频处理在原生代码中是在一个单独的进程中处理的，这就意味着即使主线程正在忙于处理其他的任务，我们也可以持续进行音频任务处理
-   [AudioContext](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext) 充当音频处理图的大脑。 我们可以使用它来创建新的音频节点并进行暂停或恢复音频处理。

## 你好，声音

让我们看看这些东西的一些实际应用并构建我们的第一个网络音频应用程序！我们暂时不会做太复杂的事情：我们将制作一个简单的鼠标[电子琴](http://www.thereminworld.com/Article/14232/what-s-a-theremin-)。我们将使用 React 来处理这些示例，并使用 `vite` 来打包和热更新

当然，你也可以使用其他的打包工具比如 parcel 或者 CRA ，也可以使用 Typescript 来替换 Javascript 。为了让应用足够的简单，我们暂时都不使用他们，但是 React Flow 是类型完整的（完全由 Typescript 编写）。

```bash
npm create vite@latest

// Project name: audio-hello
// Select a framework: › React
// Select a variant: › JavaScript
```

Vite 会为我们创建一个简单的 React 应用，但我们可以删掉一些不需要的资源。跳转到 `App.jsx` ，删掉默认创建的组件内容，创建一个新的 AudioContext 并将我们需要的节点放在一起。我们需要一个 OscillatorNode 来生成一些音调和一个 GainNode 来控制音量。

**`src/App.jsx`**

```js

// 创建音频处理图的大脑
const context = new AudioContext();

// 创建一个 oscillator 节点来生成音调
const osc = context.createOscillator();

// 创建一个 gain 节点来控制音量
const amp = context.createGain();

// 通过 gain 节点将 oscillator 的输出传递到扬声器
osc.connect(amp);
amp.connect(context.destination);

// 开始生成这些音调
osc.start();
```

> **OSCILLATOR 节点需要启动** 不要忘记调用 osc.start ，否则音调不会生成

对于我们的应用程序，我们将跟踪鼠标在屏幕上的位置并使用它来设置 oscillator（振荡器） 节点的音高和 gain（增益）节点的音量。

**`src/App.jsx`**

```jsx
import React from 'react';

const context = new AudioContext();
const osc = context.createOscillator();
const amp = context.createGain();

osc.connect(amp);
amp.connect(context.destination);

osc.start();

const updateValues = (e) => {
  const freq = (e.clientX / window.innerWidth) * 1000;
  const gain = e.clientY / window.innerHeight;

  osc.frequency.value = freq;
  amp.gain.value = gain;
};

export default function App() {
  return <div style={{ width: '100vw', height: '100vh' }} onMouseMove={updateValues} />;
}
```

> **`osc.frequency.value` `amp.gain.value`** Web Audio API 区分简单对象属性和音频节点*参数*。 这种区别以 `AudioParam` 的形式出现。 你可以在 [MDN 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/AudioParam)中阅读它们，但现在只需要知道使用 .value 来设置 AudioParam 的值而不是直接为属性分配值就足够了。

如果你现在尝试使用我们的应用，你会发现什么事情都没有发生。AudioContext 一直处于挂起的状态下启动，这样可以避免广告劫持我们的扬声器。我们可以在 `<div>` 元素上添加一个点击事件，判断如果当前 AudioContext 处于挂起状态就恢复它，这样就可以快速的修复上述问题。

```js
const toggleAudio = () => {
  if (context.state === 'suspended') {
    context.resume();
  } else {
    context.suspend();
  }
};

export default function App() {
  return (
    <div ...
      onClick={toggleAudio}
    />
  );
};
```

这就是我们开始使用 Web Audio API 制作声音所需的一切内容，让我们再整理一下代码，让它的可读性更高一点

**`src/App.jsx`**

```js
import { useState } from 'react'
import './App.css'

const context = new AudioContext();
const osc = context.createOscillator();
const amp = context.createGain();

osc.connect(amp);
amp.connect(context.destination);

osc.start();

const updateValues = (e) => {
  const freq = (e.clientX / window.innerWidth) * 1000;
  const gain = e.clientY / window.innerHeight;

  osc.frequency.value = freq;
  amp.gain.value = gain;
};

export default function App() {
  const [ isRunning, setIsRunning ] = useState(false)
  const toggleAudio = () => {
    if (context.state === 'suspended') {
      context.resume();
      setIsRunning(true)
    } else {
      context.suspend();
      setIsRunning(false)
    }
  };

  return <div
     style={{ width: '100vw', height: '100vh' }} 
     onMouseMove={updateValues} >
          <button onClick={toggleAudio}>{isRunning ? '🔊' : '🔇'}</button>
     </div>;
}
```

[项目代码仓库地址](https://github.com/zidanDirk/audio-hello/tree/master)

现在让我们把这些知识先抛到一边，看看如何从头开始构建一个 React Flow 项目。

# 搭建 React Flow 项目

稍后，我们将利用所了解的有关 Web Audio API、oscillators（振荡器）和gain（增益）节点的知识，并使用 React Flow 以交互方式构建音频处理图。 不过现在，我们需要组装一个空的 React Flow 应用程序

我们已经有一个基于 Vite 的 React 应用，我们将继续使用它。

我们需要在项目中额外安装三个依赖：使用 `reactflow` 来处理 UI ，使用 `zustand` 来进行状态管理，使用 `nanoid` 来生成 id

```bash
npm install reactflow zustand nanoid
```

我们将删除 Web Audio 章节的所有内容，并从头开始。 首先修改 `main.jsx` 以匹配以下内容：

**`src/main.jsx`**

```jsx
import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactFlowProvider } from 'reactflow';

// 👇 不要忘记导入样式文件
import 'reactflow/dist/style.css';
import './index.css';

const root = document.querySelector('#root');

// React flow 需要在一个已知高度和宽度的元素内才能工作

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>
    </div>
  </React.StrictMode>
);
```

这里有三个重要的事情要注意

1.  记得**导入** **React Flow CSS 样式**，来保证所有的功能可以正常运行
1.  React Flow 渲染器需要位于具有已知高度和宽度的元素内，因此我们将包含 <div /> 设置为占据整个屏幕
1.  要使用 React Flow 提供的一些 hook，你的组件需要位于 <ReactFlowProvider /> 内部或 <ReactFlow /> 组件本身内部，因此我们将整个应用程序包裹在 Provider 中以确保

接下来，跳转到 `App.jsx` 中并创建一个空流程

**`src/App.jsx`**

```jsx
import React from 'react';
import ReactFlow, { Background } from 'reactflow';

export default function App() {
  return (
    <ReactFlow>
      <Background />
    </ReactFlow>
  );
}
```

后续我们将扩展并添加到该组件。 现在我们添加了 React Flow 的一个插件 - `<Background />` - 来检查一切是否设置正确。 继续运行 `npm run dev` 并检查你的浏览器。 你应该可以看到一个空流程：


![1.jpg](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4eed068642fe47d5a8ce869cd90f2955~tplv-k3u1fbpfcp-watermark.image?)

让开发服务器保持运行。 然后继续我们的工作

## 1.Zustand 的状态管理

Zustand 的 store 将保存我们应用程序的所有 UI 状态。 实际上，这意味着它将保存我们的 React Flow 图的节点和连接线、一些其他状态以及一些更新该状态的 *actions*。

要获得一个基础的交互式 React Flow 图，我们需要做这三个步骤：

1.  `onNodesChange` 处理节点被移动或者删除
1.  `onEdgesChange` 处理 *连接线* 被移动或者删除
1.  `addEdge` 连接两个节点

接下来我们要创建一个文件 `store.js` ，并添加以下内容

**`src/store.js`**

```jsx
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { nanoid } from 'nanoid';
import { create } from 'zustand';

export const useStore = create((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange(changes) {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange(changes) {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  addEdge(data) {
    const id = nanoid(6);
    const edge = { id, ...data };

    set({ edges: [edge, ...get().edges] });
  },
}));
```

Zustand 非常容易使用。我们创建一个函数，它接收一个 `set` 和一个 `get` 函数，并返回一个具有初始状态的对象以及我们可以用来更新该状态的操作。

更新是不可变的，我们可以使用 `set` 函数来进行更新。 `get` 函数是我们读取当前状态的方式。仅此而已。

`onNodesChange` 和 `onEdgesChange` 中的 `changes` 参数表示节点或连接线被移动或删除等事件。幸运的是，React Flow 提供了一些[帮助函数](https://reactflow.dev/docs/api/graph-util-functions/#applynodechanges)来为我们处理这些变更。 我们只需要用新的节点数组更新 store。

只要两个节点连接，就会调用 `addEdge`。 `data` 参数几乎是一个有效的连接线，它只是缺少一个 id。 在这里，我们让 `nanoid` 生成一个 6 个字符的随机 id，然后将连接线添加到我们的图中

如果我们跳回 `<App />` 组件，我们可以将 React Flow 与我们的操作联系起来并让一些功能可以运行。

**`src/App.jsx`**

```jsx
import React from 'react';
import ReactFlow, { Background } from 'reactflow';
import { shallow } from 'zustand/shallow';

import { useStore } from './store';

const selector = (store) => ({
  nodes: store.nodes,
  edges: store.edges,
  onNodesChange: store.onNodesChange,
  onEdgesChange: store.onEdgesChange,
  addEdge: store.addEdge,
});

export default function App() {
  const store = useStore(selector, shallow);

  return (
    <ReactFlow
      nodes={store.nodes}
      edges={store.edges}
      onNodesChange={store.onNodesChange}
      onEdgesChange={store.onEdgesChange}
      onConnect={store.addEdge}
    >
      <Background />
    </ReactFlow>
  );
}
```

这个 `selector` 到底是什么呢？Zustand 让我们提供一个 selector 函数来从 store 中提取我们需要的 state。结合 `shallow` 对比函数，这意味着当我们不关心状态变更时，通常组件不会进行重新渲染。

现在我们的 store 很小，我们实际上需要它的所有内容来帮助渲染我们的 React Flow 图，但是当我们扩展它时，这个 `selector` 将确保我们不会一直重新渲染所有内容。

这就是我们创建交互式图形所需的一切：我们可以四处移动节点，将它们连接在一起，然后删除它们。 为了演示，暂时向 store 添加一些虚拟节点：

**`src/store.js`**

```js
const useStore = create((set, get) => ({
  nodes: [
    { id: 'a', data: { label: 'oscillator' }, position: { x: 0, y: 0 } },
    { id: 'b', data: { label: 'gain' }, position: { x: 150, y: 150 } },
    { id: 'c', data: { label: 'output' }, position: { x: 350, y: 200 } }
  ],
  ...
}));
```

![2.jpg](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d548b45f873a4f7685dd171a2b4e70fd~tplv-k3u1fbpfcp-watermark.image?)

## 2.自定义节点

非常好，我们现在已经有了一个可交互的 React Flow 实例，并且可以操作它。我们添加了一些虚拟的节点但它们现在仅仅是默认无样式的。在此步骤中，我们将添加三个带有交互式控件的自定义节点：

1.  一个振荡器（oscillator）节点和控制音高和波形类型。
1.  一个增益器（gain）节点和控制音量
1.  一个输出节点和一个用于打开和关闭音频处理的按钮。

让我们创建一个新文件夹 `nodes/`，并为我们要创建的每个自定义节点创建一个文件。 从振荡器开始，我们需要两个控件和一个源句柄来将振荡器的输出连接到其他节点。

**`src/nodes/Osc.jsx`**

```jsx
import React from 'react';
import { Handle } from 'reactflow';

import { useStore } from '../store';

export default function Osc({ id, data }) {
  return (
    <div>
      <div>
        <p>振荡器节点</p>

        <label>
          <span>频率</span>
          <input
            className="nodrag"
            type="range"
            min="10"
            max="1000"
            value={data.frequency} />
          <span>{data.frequency}赫兹</span>
        </label>

        <label>
          <span>波形</span>
          <select className="nodrag" value={data.type}>
            <option value="sine">正弦波</option>
            <option value="triangle">三角波</option>
            <option value="sawtooth">锯齿波</option>
            <option value="square">方波</option>
          </select>
          </label>
      </div>

      <Handle type="source" position="bottom" />
    </div>
  );
};
```

> “**NODRAG” 很重要** 注意添加到 `<input />` 和 `<select />` 元素的 `“nodrag”` 类。 记住添加这个类是非常重要的，否则你会发现 React Flow 拦截鼠标事件并且你将永远被困在拖动节点！

如果我们尝试渲染这个自定义节点，我们会发现输入没有做任何事情。 那是因为输入值由 `data.frequency` 和 `data.type` 固定，但我们没有监听变化的事件处理程序，也没有更新节点数据的机制！

为了解决这个问题，我们需要跳回我们的 store 并添加一个 `updateNode` 操作：

**`src/store.js`**

```js
export const useStore = create((set, get) => ({
  // ...

  updateNode(id, data) {
    set({
      nodes: get().nodes.map(node =>
        node.id === id
          ? { ...node, data: Object.assign(node.data, data) }
          : node
      )
    });
  },

  // ...
}));
```

这个动作将处理部分数据更新，例如，如果我们只想更新节点的频率，我们可以调用 `updateNode(id, { frequency: 220 }`。现在我们只需要将这个 action 带入我们的 `<Osc / >` 组件并在输入更改时调用它。

**`src/nodes/Osc.jsx`**

```jsx
import React from 'react';
import { Handle } from 'reactflow';
import { shallow } from 'zustand/shallow';

import { useStore } from '../store';

// 添加 selector
const selector = (id) => (store) => ({
    setFrequency: (e) => store.updateNode(id, { frequency: +e.target.value }),
    setType: (e) => store.updateNode(id, { type: e.target.value }),
});

export default function Osc({ id, data }) {
    // 使用 useStore
    const { setFrequency, setType } = useStore(selector(id), shallow);

    return (
        <div>
        <div>
            <p>振荡器节点</p>

            <label>
            <span>频率</span>
            <input
                className="nodrag"
                type="range"
                min="10"
                max="1000"
                value={data.frequency}
                // 添加 onChange 事件
                onChange={setFrequency}
            />
            <span>{data.frequency}赫兹</span>
            </label>

            <label>
            <span>波形</span>
            
            <select 
                className="nodrag" 
                value={data.type}  
                // 添加 onChange 事件
                onChange={setType}>
                <option value="sine">正弦波</option>
                <option value="triangle">三角波</option>
                <option value="sawtooth">锯齿波</option>
                <option value="square">方波</option>
            </select>
            </label>
        </div>

        <Handle type="source" position="bottom" />
        </div>
    );
};
```

嘿，我们又用到 selector 了！ 请注意这次我们如何使用它从一般的 `updateNode` 操作派生两个事件处理程序，`setFrequency` 和 `setType`。

最后一件事就是告诉 React Flow 如何渲染我们的自定义节点。 为此，我们需要创建一个 `nodeTypes` 对象：键应该对应于节点的类型，值将是要渲染的 React 组件。

> **避免不必要的渲染** 在 `<App>` 组件外部定义 `nodeTypes` （或者是用 React 的 [useMemo](https://react.dev/reference/react/useMemo)）是很重要的，这样可以避免每次渲染都会重复计算的问题

如果你的开发服务器正在运行，如果事情还没有改变，请不要惊慌！ 我们的临时节点还没有被赋予正确的类型，所以 React Flow 只是退回到渲染默认节点。 如果我们将其中一个节点更改为具有一些`频率`和`类型`初始值的 `osc`，我们应该会看到正在渲染我们的自定义节点。

**`src/store.js`**

```js
const useStore = create((set, get) => ({
  nodes: [
    { type: 'osc',
      id: 'a',
      data: { frequency: 220, type: 'square' },
      position: { x: 200, y: 0 }
    },
    ...
  ],
  ...
}));
```


![3.jpg](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dad847085c644a478faa40f49c81c36f~tplv-k3u1fbpfcp-watermark.image?)

> ⚠️  **纠结样式问题？** 如果你只是在继续执行这篇文章中的代码，你会发现自定义节点看起来不像上面预览中的节点。 为了让内容易于理解，我们在代码片段中省略了样式。
>
> 要了解如何设置自定义节点的样式，请查看 [React Flow 关于主题的文档](https://reactflow.dev/docs/guides/theming/)或使用 [Tailwind](https://reactflow.dev/docs/examples/styling/tailwind/) 的示例。
>
> 具体实例代码可以查看 [这里](https://github.com/zidanDirk/audio-react-flow-cn)

实现 gain 节点的过程几乎相同，因此我将把这个作为作业留给你。 相反，我们将注意力转向输出节点。该节点将没有参数控制，但我们确实想要打开和关闭信号处理。 现在我们还没有实现任何音频代码，我们只需要向我们的 store 添加一个标识和一个切换它的 action。

**`src/store.js`**

```js
const useStore = create((set, get) => ({
  ...

  isRunning: false,

  toggleAudio() {
    set({ isRunning: !get().isRunning });
  },

  ...
}));
```

自定义节点本身非常简单：

**`src/nodes/Out.jsx`**

```jsx
import React from 'react';
import { Handle } from 'reactflow';
import { tw } from 'twind';
import { shallow } from 'zustand/shallow';
import { useStore } from '../store';

const selector = (store) => ({
  isRunning: store.isRunning,
  toggleAudio: store.toggleAudio,
});

export default function Out({ id, data }) {
  const { isRunning, toggleAudio } = useStore(selector, shallow);
  return (
    <div className={tw('rounded-md bg-white shadow-xl px-4 py-2')}>
      <Handle className={tw('w-2 h-2')} type="target" position="top" />

      <div>
        <p>输出节点</p>

        <button onClick={toggleAudio}>
          {isRunning ? (
            <span role="img" aria-label="mute">
              🔈
            </span>
          ) : (
            <span role="img" aria-label="unmute">
              🔇
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
```

事情开始变得非常好！

![4.jpg](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a30782c198734c0eb7b5d24087cfb67b~tplv-k3u1fbpfcp-watermark.image?)

接下来我们看下一步

# 让它发声

现在我们有一个交互式图表，我们能够更新节点数据，现在让我们添加 Web Audio API 的相关内容。首先创建一个新文件 `audio.js`，然后创建一个新的音频上下文和一个空的 Map。

**`src/audio.js`**

```js
const context = new AudioContext();
const nodes = new Map();
```

我们管理音频图的方式是 hook 我们 store 中的不同 action。因此，我们可能会在调用 `addEdge` 操作时连接两个音频节点，或者在调用 `updateNode` 时更新音频节点的属性，等等。

> 🔥 **硬编码节点** 我们在这篇文章的前面对 store 中的几个节点进行了硬编码，但我们的音频图对它们一无所知！ 对于完成的项目，我们可以取消所有这些硬编码，但现在我们还需要对一些音频节点进行硬编码，**这非常重要**。 我们会这么做：
>
> ```js
> const context = new AudioContext();
> const nodes = new Map();
>
> const osc = context.createOscillator();
> osc.frequency.value = 220;
> osc.type = 'square';
> osc.start();
>
> const amp = context.createGain();
> amp.gain.value = 0.5;
>
> const out = context.destination;
>
> nodes.set('a', osc);
> nodes.set('b', amp);
> nodes.set('c', out);
> ```

## 1.节点变更

现在，我们的图中可能发生两种类型的节点变更，我们需要对其做出响应：更新节点的数据，以及从图中删除节点。 我们已经对前者有了一个 action ，所以让我们先处理它。

在 `audio.js` 中，我们将定义一个函数 `updateAudioNode`，我们将使用节点的 ID 和部分数据对象调用该函数，并使用它来更新 Map 中的现有节点：

**`src/audio.js`**

```js
export function updateAudioNode(id, data) {
  const node = nodes.get(id);

  for (const [key, val] of Object.entries(data)) {
    if (node[key] instanceof AudioParam) {
      node[key].value = val;
    } else {
      node[key] = val;
    }
  }
}
```

> **提醒** 请记住，音频节点上的属性可能是特殊的 `AudioParams`，必须以不同的方式更新为常规对象属性。

现在我们要更新 store 中的 updateNode 操作以调用此函数作为更新的一部分：

**`src/store.js`**

```js
import { updateAudioNode } from './audio';

export const useStore = create((set, get) => ({
  ...

  updateNode(id, data) {
    updateAudioNode(id, data);
    set({ nodes: ... });
  },

  ...
}));
```

我们需要处理的下一个更改是从图中删除一个节点。 如果你在图中选择一个节点并按退格键，React Flow 会将其删除。 这是通过我们连接的 `onNodesChange` 操作为我们隐式处理的，但现在我们需要一些额外的处理，我们需要将一个新操作连接到 React Flow 的 `onNodesDelete` 事件。

**`src/audio.js`**

```js
export function removeAudioNode(id) {
  const node = nodes.get(id);

  node.disconnect();
  node.stop?.();

  nodes.delete(id);
}
```

**`src/store.js`**

```js
import { ..., removeAudioNode } from './audio';

export const useStore = create((set, get) => ({
  ...

  removeNodes(nodes) {
    for (const { id } of nodes) {
      removeAudioNode(id)
    }
  },

  ...
}));
```

`src/App.jsx`

```
const selector = store => ({
  ...,
  onNodesDelete: store.removeNodes
});

export default function App() {
  const store = useStore(selector, shallow);

  return (
    <ReactFlow
      onNodesDelete={store.onNodesDelete}
      ...
    >
      <Background />
    </ReactFlow>
  )
};
```

唯一需要注意的是，`onNodesDelete` 会调用提供的回调函数，其中包含*一组* 已删除的节点，因为有可能一次删除多个节点！

## 2.连接线变更

我们离真正发出一些声音越来越近了！ 剩下的就是处理图形连接线的变更。 与节点变更一样，我们已经有一个操作来处理创建新的连接线，我们还在 `onEdgesChange` 中隐式处理删除的连接线。

要处理新连接，我们只需要在 `addEdge` 操作中创建的连接线的源 ID 以及目标 ID。 然后我们可以在我们的 `Map` 中查找两个节点并将它们连接起来。

**`src/audio.js`**

```js
export function connect(sourceId, targetId) {
  const source = nodes.get(sourceId);
  const target = nodes.get(targetId);

  source.connect(target);
}
```

**`src/store.js`**

```js
import { ..., connect } from './audio';

export const useStore = create((set, get) => ({
  ...

  addEdge(data) {
    ...

    connect(data.source, data.target);
  },

  ...
}));
```

我们看到 React Flow 能够接收了一个 `onNodesDelete` 回调函数，还有一个 `onEdgesDelete` 回调函数！我们用来实现断开连接并将其关联到我们的 store 和 React Flow 实例的方法与之前的做法几乎相同，所以我们也将把它留给你！

## 3.打开扬声器

你应该还记得我们的 `AudioContext` 是以挂起的状态启动的，以防止那些令人讨厌的自动播放问题。我们已经为 store 中的 `<Out />` 组件 mock 了所需的数据和操作，现在我们只需要用真实上下文状态和恢复与暂停的方法替换它们。

**`src/audio.js`**

```js
export function isRunning() {
  return context.state === 'running';
}

export function toggleAudio() {
  return isRunning() ? context.suspend() : context.resume();
}
```

虽然到目前为止我们还没有从 `audio` 函数返回任何东西，但我们需要从 `toggleAudio` 返回，因为这些方法是异步的，我们不想过早地更新 store

```js
import { ..., isRunning, toggleAudio } from './audio'

export const useStore = create((set, get) => ({
  ...

  isRunning: isRunning(),

  toggleAudio() {
    toggleAudio().then(() => {
      set({ isRunning: isRunning() });
    });
  }
}));
```

我们做到了！ 我们现在已经把足够多的东西组合在一起，可以真正*发出声音*了！ 让我们看看我们的成果。

## 4.创建新节点

到目前为止，我们一直在处理图中的一组硬编码的节点。 这对于原型设计来说很好，但为了让它真正有用，我们需要一种方法来动态地将新节点添加到图形中。 我们的最终任务是添加此功能：我们将从音频代码开始动手，最后创建一个基本工具栏。

实现 `createAudioNode` 函数将非常简单。 我们只需要新节点的 ID、要创建的节点类型及其初始数据：

**`src/audio.js`**

```js
export function createAudioNode(id, type, data) {
  switch (type) {
    case 'osc': {
      const node = context.createOscillator();
      node.frequency.value = data.frequency;
      node.type = data.type;
      node.start();

      nodes.set(id, node);
      break;
    }

    case 'amp': {
      const node = context.createGain();
      node.gain.value = data.gain;

      nodes.set(id, node);
      break;
    }
  }
}
```

接下来，我们的 store 中需要一个 `createNode` 函数。 节点 ID 将由 `nanoid` 生成，我们将为每种节点类型硬编码一些初始数据，因此我们唯一需要传入的是要创建的节点类型：

**`src/store.js`**

```js
import { ..., createAudioNode } from './audio';

export const useStore = create((set, get) => ({
  ...

  createNode(type) {
    const id = nanoid();

    switch(type) {
      case 'osc': {
        const data = { frequency: 440, type: 'sine' };
        const position = { x: 0, y: 0 };

        createAudioNode(id, type, data);
        set({ nodes: [...get().nodes, { id, type, data, position }] });

        break;
      }

      case 'amp': {
        const data = { gain: 0.5 };
        const position = { x: 0, y: 0 };

        createAudioNode(id, type, data);
        set({ nodes: [...get().nodes, { id, type, data, position }] });

        break;
      }
    }
  }
}));
```

我们可以更智能地计算新节点的位置，但为了简单起见，我们暂时将其硬编码为 `{ x: 0, y: 0 }`。

最后是创建一个可以触发 `createNode` 操作的工具栏组件。 为此，我们将跳回 `App.jsx` 并使用 `<Panel />` 组件。

**`src/App.jsx`**

```js
...
import ReactFlow, { Panel } from 'reactflow';
...

const selector = (store) => ({
  ...,
  createNode: store.createNode,
});

export default function App() {
  const store = useStore(selector, shallow);

  return (
    <ReactFlow>
      <Panel position="top-right">
        ...
      </Panel>
      <Background />
    </ReactFlow>
  );
};
```

我们在这里不需要任何花哨的东西，只需要几个按钮来触发 `createNode` 操作：

**`src/App.jsx`**

```jsx
<Panel className={tw('space-x-4')}  position="top-right">
  <button className={tw('px-2 py-1 rounded bg-white shadow')}  onClick={() => store.createNode('osc')}>添加 osc</button>
  <button className={tw('px-2 py-1 rounded bg-white shadow')}  onClick={() => store.createNode('amp')}>添加 amp</button>
</Panel>
```

![5.jpg](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d7c940e909a04fc585e381399297cdf1~tplv-k3u1fbpfcp-watermark.image?)

那就是本文所有的内容啦！ 我们现在拥有一个功能齐全的音频图编辑器，它可以：

-   创建新的音频节点
-   通过 UI 更新节点数据
-   进行节点连接
-   删除节点和连接
-   启动和停止音频处理

# 最后的想法

这是一个漫长的过程，但我们做到了！ 因为我们的努力，有了一个有趣的小型交互式音频游乐场，一路上学习了一些关于 Web Audio API 的知识，并且对「运行」 React Flow 图有了更好的认识。

有很多方法可以继续扩展这个项目。 如果你想继续努力，这里有一些想法：

-   添加更多节点类型
-   允许节点连接到其他节点上的 AudioParams
-   使用 [AnalyserNode](https://developer.mozilla.org/zh-CN/docs/Web/API/AnalyserNode) 可视化节点或信号的输出
-   其他你能想到的所有事情

你可以使用 [完整的源代码](https://github.com/zidanDirk/audio-react-flow-cn) 作为起点，也可以在我们今天所做的基础上继续构建。最后感谢大家对本文的支持～欢迎点赞收藏，在评论区留下你的高见 🌹🌹🌹

> 本文为翻译文，[原文地址](https://reactflow.dev/blog/react-flow-and-the-web-audio-api/#3-switching-the-speakers-on) && [代码仓库地址](https://github.com/zidanDirk/audio-react-flow-cn)
