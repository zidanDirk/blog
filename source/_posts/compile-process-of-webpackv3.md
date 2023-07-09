---
title: webpack 构建过程分析
date: 2017-10-21 20:50:00
tags: 源码
---

说起 webpack，相信对于前端工程师们而言早已经不是什么新鲜的事物。但是由于webpack有着较为复杂和灵活的配置项，所以给人的第一感觉是难以完全掌握。

这次就跟大家分享一下有关webpack构建过程的相关知识，希望对大家进一步理解webpack有所帮助。

本次分析的对象是 webpack(v3.6.0)，这是 github 地址 [摸我](https://github.com/webpack/webpack)

由于webpack的内容实在太多，一下子讲太多东西容易懵逼，我们这次就从最最最简单的例子开始讲起。

以下是我写的一个炒鸡简单的例子：
```js

// webpack.config.js

var path = require("path");
module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "bundle.js"
  }
}

```

假设我们的工作目录下有一个这样的webpack.config.js文件，那么当我们执行webpack命令的时候【前提是你已经安装了webpack】，那么首先会执行的是 /bin 目录下的webpack.js

OK，作为入口文件，我们首先要分析的就是： **/bin/webpack.js**

这个文件主要做了以下几件事：

- 引入yargs模块，对命令行参数进行注释和重命名等工作
- 添加处理默认参数(比如当我们没有指定--config参数的时候，默认去找当前目录下的 webpack.config.js文件作为配置文件)
- 处理完参数相关的内容之后，就引入lib目录下的webpack.js文件，得到编译对象compiler，然后进行编译（compiler.run()）


```js
var webpack = require("../lib/webpack.js");
...
...
try {
    // 这里的options就是转换之后的参数，convert-argv文件主要负责这些工作
    // 得到compiler对象
    compiler = webpack(options);
}catch(e) {
    ...
    ...
}
...
...
// 执行编译
compiler.run(compilerCallback)
```


由于这里讲的例子比较简单，不涉及到其他参数相关的内容，感兴趣的同学可以进一步了解参数处理的部分，这里就不多做解释了。重点我们还是看一下这个编译的过程。

作为complier的入口文件，我们接下来看一下： **/lib/webpack.js**

- 这个文件首先调用validateSchema方法对传入的options进行格式校验

- 然后又调用了WebpackOptionsDefaulter实例的process方法对options进一步的处理（保存了两个实例属性 default={} , config= {},分别往这两个对象上面挂属性，然后再挂载到options上）

- 然后实例化Compiler类，由于这个类继承自Tapable类，所以他具有父类上实现插件的一套机制（applyPlugin,plugin等方法，后面会具体分析这两个类），得到compiler对象

- 然后执行NodeEnvironmentPlugin插件，主要是使用enhanced-resolve模块修饰compiler对象，注册“before-run”回调方法

- 然后调用complier的apply方法，内部其实调用插件的apply方法，相当于注册各种插件的回调方法

- 触发“environment” 和 “after-environment” 回调方法

- 实例化WebpackOptionsApply类，调用process方法；后面我们会展开分析这个方法

- 往webpack这个方法上挂一下静态属性（各种插件方法）

- 导出webpack这个方法


接下来我们先分析WebpackOptionsApply类：**/lib/WebpackOptionsApply.js**

从上面看到，在编译之前，webpack会先实例化WebpackOptionsApply类，然后调用其process方法
我们看到process方法其实就是注册了N多个插件，然后触发了某些插件的回调函数

- 首先判断options.target，如果值为“web”的话(这种情况是最常见的，其他情况的逻辑也是类似的)，则注册插件JsonpTemplatePlugin【注册“this-compilation”回调】，FunctionModulePlugin【注册“compilation”回调】，NodeSourcePlugin【注册“compilation” & “after-resolver”回调】，LoaderTargetPlugin【注册“compilation”回调】。
    
- 注册插件LibraryTemplatePlugin【注册“compilation”回调】，ExternalsPlugin【注册“compile”回调】
- 注册插件EntryOptionPlugin【注册“entry-option”回调】
- 触发“entry-option”回调，所以进入了EntryOptionPlugin插件的回调函数
- EntryOptionPlugin类中，通过itemToPlugin方法判断单入口还是多入口文件，这里以单入口为例，所以进入了SingleEntryPlugin类中，注册插件SingleEntryPlugin【“compilation” & “make”回调】

- 继续回到WebpackOptionsApply的process方法，然后又继续通过compile.apply方法添加插件，插件太多了，不一一列举，感兴趣的可以跟踪代码了解详情

- 最后触发“after-plugins” 和 “after-resolvers” 的回调函数

以上就是WebpackOptionsApply实例调用process的全过程

在/bin/webpack中，得到的是/lib/webpack返回的compiler对象，最后调用compiler对象的run方法。


作为编译过程的核心类，我们接下来看看Compiler这个类：**/lib/Compiler.js**

我们看到Compiler类继承自Tapable类 [github地址](https://github.com/webpack/tapable)

Tapable类提供了一种调用插件的方式，webpack全部插件都是基于这种方式来注册和调用的。

Tapable类定义了plugin方法，用于注册插件，将插件及其回调函数以key-value的形式保存在内部_plugins={}对象中；
又定义了applyPlugins，applyPluginsWaterfall等方法来触发插件的回调函数。其实就是一个订阅-发布模式的实现。

所以当Compiler类继承Tapable类后，也同样具有注册插件和触发回调函数的功能。

接下来看看Compiler中的run方法

- 首先触发的“before-run”回调函数，NodeEnvironmentPlugin插件注册了回调函数
- 然后触发“run”回调函数,CachePlugin插件注册了回调函数
- 调用readRecords方法()
- 调用compile方法，进入compile过程
    1. 触发“before-compile”回调函数，DllReferencePlugin注册了回调函数
    2. 触发“compile”回调函数,ExternalsPlugin & DllReferencePlugin & DelegatedPlugin注册了回调函数
    3. 调用newCompilation方法，创建Compilation实例，这个实例包含了编译过程的所有属性和方法
    4. 触发“this-compilation”回调函数
    5. 触发“compilation”回调函数
    6. 触发“make”回调函数
        1. 如果是单入口项目，这里就会触发SingleEntryPlugin插件注册的“make”回调，其中调用了compilation的addEntry方法进行模块构建
        2. 通过compilation的processModuleDependencies方法收集模块的依赖
        3. 最后通过buildModule方法构建模块
    7. 调用compilation.finish()方法
    8. 调用compilation.seal()方法
    9. 触发“after-compile”回调函数


- compile方法执行完之后，就执行onCompiled回调
- 触发“should-emit”回调函数
- 触发“done”回调函数
- 调用emitAssets方法，触发了“emit”回调函数
- 调用emitFiles方法，触发“after-emit”回调函数
- 最后执行emitRecords方法


这就是compiler的run方法的主要内容分析


以上就是webpack简单的构建流程的分析。哈哈今天就分享到这里，希望大家喜欢，祝大家周末愉快啊。。。
