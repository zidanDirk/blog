---
title: 详解 React 中的闭包问题
date: 2023-08-26 15:34:00
tags: 翻译
---

JavaScript 中的闭包一定是最可怕的特性之一。 即使是无所不知的 ChatGPT 也会告诉你这一点。 它也可能是最隐秘的语言概念之一。 每次编写任何 React 代码时，我们都会用到它，大多数时候我们甚至没有意识到。 但最终还是无法摆脱它们：如果我们想编写复杂且高性能的 React 应用程序，我们就必须了解闭包。

因此，让我们深入研究它，并在此过程中学习以下内容：

*   什么是闭包，它们是怎么出现的，为什么我们需要它们
*   什么是过时闭包，为什么它们会出现
*   React 中哪些常见的场景会导致过时闭包，以及如何应对它们

警告：如果你从未处理过 React 中的闭包，这篇文章可能会让你的大脑爆炸。 当你阅读本文时，请确保随身携带足够的巧克力来刺激脑细胞。

# 问题出现

想象一下你正在实现一个带有几个输入框的表单。 其中一个字段是来自某些外部库的非常重的组件。 你没有办法了解其内部结构，因此无法修复其性能问题。 但你的表单中确实需要它，因此你决定将其包装在 React.memo 中，以在表单中的状态发生变化时最大程度地减少重新渲染的频率。 像这样：

```jsx
    const HeavyComponentMemo = React.memo(HeavyComponent);

    const Form = () => {
      const [value, setValue] = useState();

      return (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <HeavyComponentMemo />
        </>
      );
    };
```
到目前为止，一切都很好。 这个「非常重」的组件只接收一个字符串属性（比如 `title`）和一个 `onClick` 回调函数。 当单击这个组件内的 “完成” 按钮时会触发此回调函数。 并且希望在发生此单击时提交表单数据。 也很简单：只需将标题和 onClick 属性传递给它即可。

```jsx
    const HeavyComponentMemo = React.memo(HeavyComponent);

    const Form = () => {
      const [value, setValue] = useState();

      const onClick = () => {
        // 在这里提交表单数据
        console.log(value);
      };

      return (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <HeavyComponentMemo
            title="Welcome to the form"
            onClick={onClick}
          />
        </>
      );
    };
```
现在你将面临两难境地。 众所周知，`React.memo` 中包装的组件上的每个 prop 都需要是原始值或在重新渲染之间保持不变。 否则，记忆缓存将不起作用。 因此从技术上讲，我们需要将 `onClick` 包装在 `useCallback` 中：
```js
    const onClick = useCallback(() => {
        // 在这里提交表单数据
    }, []);
```
而且，我们知道 `useCallback` 这个 hook 应该在其依赖项数组中声明所有依赖项。 因此，如果我们想在内部提交表单数据，我们必须将该数据声明为依赖项：
```js
    const onClick = useCallback(() => {
        // 在这里提交表单数据
      console.log(value);

      // 添加数据作为依赖项
    }, [value]);
```
这就是一个困境：尽管我们的 `onClick` 被记忆缓存了，但每次有人在输入框中输入时它仍然会发生变化。 所以我们的性能优化是没有用的。

好吧，让我们寻找其他解决方案。 `React.memo` 有一个叫做 [comparison function](https://react.dev/reference/react/memo#specifying-a-custom-comparison-function) 的东西。它允许我们更精细地控制 `React.memo` 中的 props 比较。通常，React 会自行将所有 “上一次更新”的 props 与所有 “下一次更新” props 进行比较。 如果我们使用了这个函数，它将依赖于它的返回结果。 如果它返回 true，那么 React 就会知道 props 是相同的，并且组件不应该被重新渲染。 这听起来正是我们所需要的

我们只关心更新一个 props，即我们的 `title`，所以它不会那么复杂：
```js
    const HeavyComponentMemo = React.memo(
      HeavyComponent,
      (before, after) => {
        return before.title === after.title;
      },
    );
```
整个表单的代码将如下所示
```jsx
    const HeavyComponentMemo = React.memo(
      HeavyComponent,
      (before, after) => {
        return before.title === after.title;
      },
    );

    const Form = () => {
      const [value, setValue] = useState();

      const onClick = () => {
        // 在这里提交表单数据
        console.log(value);
      };

      return (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <HeavyComponentMemo
            title="Welcome to the form"
            onClick={onClick}
          />
        </>
      );
    };
```
成功了！ 我们在输入了一些内容，这个「非常重」的组件不会重新渲染，并且性能不会受到影响。

然而有一个小问题：它实际上并没有成功。 如果你在输入某些内容，然后按下该按钮，则我们在 `onClick` 中打印的 `value` 是 `undefined` 。 但它不能是`undefined` 的，但是如果我在 `onClick` 之外添加 `console.log` ，它会正确打印它。 在 `onClick` 内部则不正确。

这是怎么回事呢？

这就是所谓的“过时闭包”问题。 为了解决这个问题，我们首先需要深入研究 JavaScript 中最令人恐惧的主题：闭包及其工作原理。

# JavaScipt，作用域，闭包

让我们从函数和变量开始。 当我们在 JavaScript 中通过普通声明或箭头函数声明函数时会发生什么
```js
    function something() {
      //
    }
    const something = () => {};
```
通过这样做，我们创建了一个局部作用域：代码中的一个作用域，其中声明的变量在外部是不可见的。
```js
    const something = () => {
      const value = 'text';
    };

    console.log(value); // 不起作用，value 是 something 函数的内部变量
```
每次我们创建函数时都会发生这种情况。 在另一个函数内部创建的函数将具有自己的局部作用域，对于外部函数不可见
```js
    const something = () => {
      const inside = () => {
        const value = 'text';
      };

      console.log(value); // 不起作用，value 是 inside 函数的内部变量
    };
```
然而如果反过来，这是一条可行的道路。 最里面的函数将能「看到」外部声明的所有变量
```js
    const something = () => {
      const value = 'text';

      const inside = () => {
        // 非常好，value 可以在这里访问到
        console.log(value);
      };
    };
```
这是通过创建所谓的「闭包」来实现的。 内部函数「关闭」来自外部的所有数据。 它本质上是所有「外部」数据的快照，这些数据会被及时冻结并单独存储在内存中。

如果我不是在 `something` 函数内创建 `value`，而是将其作为参数传递并返回`inside` 函数：
```js
    const something = (value) => {
      const inside = () => {
        // 非常好，value 可以在这里访问到
        console.log(value);
      };

      return inside;
    };
```
我们会得到这样的行为：
```js
    const first = something('first');
    const second = something('second');

    first(); // 打印 "first"
    second(); // 打印 "second"
```
我们用字符串 “first” 作为参数调用 `something` 函数，并将结果赋值给了一个变量。 该变量则是对内部声明的函数的引用。 形成闭合。 从现在开始，只要保存该引用的 `first` 变量存在，我们传递给它的字符串“first”就会被冻结，并且内部函数将可以访问它

第二次调用也是同样的情况：我们传递一个不同的值，形成一个闭包，并且返回的函数将永远可以访问该变量。

对于在 `something` 函数内本地声明的任何变量都是如此：
```js
    const something = (value) => {
      const r = Math.random();

      const inside = () => {
        // ...
    		console.log(r)
      };

      return inside;
    };

    const first = something('first');
    const second = something('second');

    first(); // 打印一个随机数
    second(); // 打印另外一个随机数
```
这就像拍摄一些动态场景的照片：只要按下按钮，整个场景就会永远“冻结”在照片中。 下次按下该按钮不会改变之前拍摄的照片中的任何内容。


![p1.webp](/imgs/post/fantastic-closures-and-how-to-find-them-in-react/p1.webp)

在 React 中，我们一直在创建闭包，甚至没有意识到。 组件内声明的每个回调函数都是一个闭包：
```js
    const Component = () => {
      const onClick = () => {
        // 闭包！
      };

      return <button onClick={onClick} />;
    };
```
所有在 `useEffect` 或者 `useCallback` 中的都是闭包
```js
    const Component = () => {
      const onClick = useCallback(() => {
        // 闭包！
      });

      useEffect(() => {
        // 闭包！
      });
    };
```
所有闭包都可以访问组件中声明的 state、props 和局部变量：
```js
    const Component = () => {
      const [state, setState] = useState();

      const onClick = useCallback(() => {
        // 没问题
        console.log(state);
      });

      useEffect(() => {
        // 没问题
        console.log(state);
      });
```
组件内的每个函数都是一个闭包，因为组件本身只是一个函数。

# 过时闭包问题

以上所有内容，即使你之前没有接触过太多闭包的概念，仍然相对简单。 你创建几个函数几次，它就会变得很自然。 很多年来，使用 React 编写应用程序甚至都不需要理解“闭包”的概念。

那么问题出在哪里呢？ 为什么闭包是 JavaScript 中最可怕的事情之一，也是许多开发人员的痛苦之源？

这是因为只要闭包函数的引用存在，闭包就存在。 对函数的引用只是一个可以赋值给任何东西的值。 让我们稍微动动脑子。 这是上面我们的函数，它返回一个闭包：
```js
    const something = (value) => {
      const inside = () => {
        console.log(value);
      };
      return inside;
    };
```
但是 `inside` 函数会随着每次 `something` 调用而重新创建。 如果我决定重构它并缓存它，会发生什么？ 像这样：
```js
    const cache = {};

    const something = (value) => {
      if (!cache.current) {
        cache.current = () => {
          console.log(value);
        };
      }

      return cache.current;
    };
```
表面上看，这个代码似乎没什么问题。 我们刚刚创建了一个名为 `cache` 的外部变量，并将内部函数赋值给 `cache.current` 属性。 现在，我们只需返回已保存的值，而不是每次都重新创建该函数。

然而，如果我们尝试调用它几次，我们会看到一个奇怪的事情：
```js
    const first = something('first');
    const second = something('second');
    const third = something('third');

    first(); // 打印 "first"
    second(); // 打印 "first"
    third(); // 打印 "first"
```
无论我们使用不同的参数调用 `something` 函数多少次，打印的值始终是第一个！


![p2.webp](/imgs/post/fantastic-closures-and-how-to-find-them-in-react/p2.webp)

为了修复此行为，我们希望在每次入参发生变化时重新创建该函数及其闭包。 像这样：
```js
    const cache = {};
    let prevValue;

    const something = (value) => {
      // 检查值是否改变
      if (!cache.current || value !== prevValue) {
        cache.current = () => {
          console.log(value);
        };
      }

      // 更新它
      prevValue = value;
      return cache.current;
    };
```
将值保存在变量中，以便我们可以将下一个入参与前一个入参进行比较。 如果变量发生了变化，则更新 `cache.current` 闭包

现在它将正确打印变量，如果我们比较具有相同入参的函数，则将返回 `true`：
```js
    const first = something('first');
    const anotherFirst = something('first');
    const second = something('second');

    first(); // 打印 "first"
    second(); // 打印 "second"
    console.log(first === anotherFirst); // 返回 true
```
# useCallback中的过时闭包

我们刚刚实现了几乎完全一样的 `useCallback` hook 为我们所做的事情！ 每次我们使用 `useCallback` 时，我们都会创建一个闭包，并且我们传递给它的函数会被缓存：

    // 该内联函数的缓存与之前的部分完全相同
    const onClick = useCallback(() => {}, []);

如果我们需要访问此函数内的 state 或 props，我们需要将它们添加到依赖项数组中：
```js
    const Component = () => {
      const [state, setState] = useState();

      const onClick = useCallback(() => {
        // 访问内部 state
        console.log(state);

        // 需要添加到依赖数组里面
      }, [state]);
    };
```
这个依赖数组使得 React 刷新缓存的闭包，就像我们比较 `value !== prevValue` 时所做的那样。 如果我忘记填这个数组，我们的闭包就会变得过时：
```js
    const Component = () => {
      const [state, setState] = useState();

      const onClick = useCallback(() => {
        // state 将永远都是初始值
        // 闭包永远不会刷新
        console.log(state);

        // 忘记写依赖数组
      }, []);
    };
```
每次触发这个回调函数，都会打印 `undefined`

# Refs 中的过时闭包

在 `useCallback` 和 `useMemo` hook 之后，引入过时闭包问题的第二个最常见的方法是 Refs

如果我尝试对 `onClick` 回调函数使用 Ref 而不是 `useCallback` hook，会发生什么情况？ 有时，网上的文章建议这样做来缓存组件上的 props。 从表面上看，它确实看起来更简单：只需将一个函数传递给 `useRef` 并通过 `ref.current` 访问它。 没有依赖，也不用担心。
```js
    const Component = () => {
      const ref = useRef(() => {
        // 点击回调
      });

      // ref.current 存储了函数
      return <HeavyComponent onClick={ref.current} />;
    };
```
然而。 组件内的每个函数都会形成一个闭包，包括我们传递给 `useRef` 的函数。 我们的 ref 在创建时只会初始化一次，并且不会自行更新。 这基本上就是我们一开始创建的逻辑。 只是我们传递的不是 `value`，而是我们想要保留的函数。 像这样：
```js
    const ref = {};

    const useRef = (callback) => {
      if (!ref.current) {
        ref.current = callback;
      }

      return ref.current;
    };
```
因此，在这种情况下，在刚载入组件时一开始形成的闭包将被保留并且永远不会刷新。 当我们尝试访问存储在 Ref 中的函数内的 state 或 props 时，我们只会获得它们的初始值：
```js
    const Component = ({ someProp }) => {
      const [state, setState] = useState();

      const ref = useRef(() => {
        // 所有都会被缓存并且永远不会改变
        console.log(someProp);
        console.log(state);
      });
    };
```
为了解决这个问题，我们需要确保每次尝试访问内部内容发生变化时都会更新该引用值。 本质上，我们需要实现 `useCallback` hook 中依赖数组所做的事情
```js
    const Component = ({ someProp }) => {
      // 初始化 ref - 创建闭包
      const ref = useRef(() => {
        // 所有都会被缓存并且永远不会改变
        console.log(someProp);
        console.log(state);
      });

      useEffect(() => {
        // 当 state 或者 props 更新时，及时更新闭包
        ref.current = () => {
          console.log(someProp);
          console.log(state);
        };
      }, [state, someProp]);
    };
```
# ****React.memo**** 中的过时闭包

最后，我们回到文章的开头以及引发这一切的谜团。 我们再看一下有问题的代码：
```js
    const HeavyComponentMemo = React.memo(
      HeavyComponent,
      (before, after) => {
        return before.title === after.title;
      },
    );

    const Form = () => {
      const [value, setValue] = useState();

      const onClick = () => {
        // submit our form data here
        console.log(value);
      };

      return (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <HeavyComponentMemo
            title="Welcome to the form"
            onClick={onClick}
          />
        </>
      );
    };
```
每次我们单击按钮时，我们都会记录 “undefined”。 `onClick` 中我们的 `value` 永远不会更新。 现在你能说出原因吗

当然，这又是一个过时的闭包。 当我们创建 `onClick` 时，首先使用默认 state 值（即“ undefined ”）形成闭包。 我们将该闭包与 `title` 属性一起传递给我们的记忆组件。 在比较函数中，我们仅比较标题。 它永远不会改变，它只是一个字符串。 比较函数始终返回 `true`，`HeavyComponent` 永远不会更新，因此它保存对第一个 `onClick` 闭包的引用，并具有冻结的 “undefined” 值。

既然我们知道了问题所在，那么我们该如何解决呢？ 这里说起来容易做起来难……

理想情况下，我们应该在比较函数中比较每个 prop，因此我们需要在其中包含 `onClick`：
```js
    (before, after) => {
      return (
        before.title === after.title &&
        before.onClick === after.onClick
      );
    };
```
然而，在这种情况下，这意味着我们只是重新实现 React 默认行为，并完全执行没有比较函数的 `React.memo` 的操作。 所以我们可以放弃它，只将其保留为 `React.memo(HeavyComponent)`。

但这样做意味着我们需要将 `onClick` 包装在 `useCallback` 中。 但这取决于 state，因此它会随着每次击键而改变。 我们回到了第一点：我们的「重组件」将在每次状态变化时重新渲染，这正是我们试图避免的。

我们可以尝试组合并尝试提取和隔离 state 或者是 `HeavyComponent`。 但这并不容易：输入和 `HeavyComponent` 都依赖于该 state。

我们可以尝试很多其他的事情。 但我们不需要进行任何大量的重构来摆脱闭包陷阱。 有一个很酷的技巧可以在这里帮助我们。

# ****使用 Refs 逃离闭包陷阱****

这个技巧绝对令人兴奋：它非常简单，但它可以永远改变你在 React 中记忆函数的方式。 或者也许没有……无论如何，它可能有用，所以让我们深入研究它。

现在让我们去掉 `React.memo` 和 `onClick` 中的比较函数。 只是一个带有 state 和记忆的 `HeavyComponent` 的纯组件：
```js
    const HeavyComponentMemo = React.memo(HeavyComponent);

    const Form = () => {
      const [value, setValue] = useState();

      return (
        <>
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} />
            <HeavyComponentMemo title="Welcome to the form" onClick={...} />
        </>
      );
    }
```
现在我们需要添加一个 `onClick` 函数，该函数在重新渲染之间保持稳定，但也可以访问最新状态而无需重新创建自身。

我们将把它存储在 Ref 中，所以让我们添加它。 暂时为空：
```js
    const Form = () => {
      const [value, setValue] = useState();

    	// 添加一个空的 ref
      const ref = useRef();
    };
```
为了使函数能够访问最新状态，需要在每次重新渲染时重新创建它。 这是无法回避的，这是闭包的本质，与 React 无关。 我们应该在 `useEffect` 中修改 Refs，而不是直接在渲染中修改，所以让我们这样做
```js
    const Form = () => {
      const [value, setValue] = useState();

      // 添加一个空的 ref
      const ref = useRef();

      useEffect(() => {
    		// 我们需要去触发的回调函数
    		// 带上 state
        ref.current = () => {
          console.log(value);
        };

        // 没有依赖数组
      });
    };
```
不带依赖数组的 `useEffect` 将在每次重新渲染时触发。 这正是我们想要的。 所以现在我们的 `ref.current` 中，我们有一个每次重新渲染都会重新创建的闭包，因此记录的状态始终是最新的。

但我们不能只是将 `ref.current` 传递给记忆组件。 每次重新渲染时该值都会有所不同，因此缓存记忆是行不通的。
```js
    const Form = () => {
      const ref = useRef();

      useEffect(() => {
        ref.current = () => {
          console.log(value);
        };
      });

      return (
        <>
          {/* 不能这么做, 将会击穿缓存，让记忆失效 */}
          <HeavyComponentMemo onClick={ref.current} />
        </>
      );
    };
```
因此，我们创建一个封装在 `useCallback` 中的小的空函数，并且不依赖它。
```js
    const Form = () => {
      const ref = useRef();

      useEffect(() => {
        ref.current = () => {
          console.log(value);
        };
      });

      const onClick = useCallback(() => {
    		// 依赖是空的，所以函数永远不会改变
      }, []);

      return (
        <>
          {/* 现在缓存生效了, onClick 永远不会改变 */}
          <HeavyComponentMemo onClick={onClick} />
        </>
      );
    };
```
现在，缓存记忆功能完美地起作用了—— `onClick` 永远不会改变。 但有一个问题：它什么也不做。

这是一个魔术：让它工作所需的只是在该记忆回调函数中调用 `ref.current` ：
```js
    useEffect(() => {
      ref.current = () => {
        console.log(value);
      };
    });

    const onClick = useCallback(() => {
      // 在这里调用 ref 
      ref.current();

      // 依然是空的依赖数组!
    }, []);
```
请注意 `ref` 为何不在 `useCallback` 的依赖项中？ 没必要这样。 `ref` 本身永远不会改变。 它仅仅是 `useRef` hook 返回的可变对象的引用。

但是，当闭包冻结其周围的所有内容时，它不会使对象变得不可变或冻结。 对象存储在内存的不同部分，多个变量可以包含对完全相同对象的引用。
```js
    const a = { value: 'one' };
    // b 是不同的变量，指向相同的对象
    const b = a;
```
如果我通过其中一个引用改变对象，然后通过另一个引用访问它，则更改将可以生效：
```js
    a.value = 'two';

    console.log(b.value); // 生效了，打印 "two"
```
例子中，我们在 `useCallback` 和 `useEffect` 中有完全相同的引用。 因此，当我们改变 `useEffect` 中`ref` 对象的当前属性时，我们可以在 `useCallback` 中访问该确切属性。 这个属性恰好是一个捕获最新状态数据的闭包。

完整的代码如下所示：
```jsx
    const Form = () => {
      const [value, setValue] = useState();
      const ref = useRef();

      useEffect(() => {
        ref.current = () => {
          // 最新的值
          console.log(value);
        };
      });

      const onClick = useCallback(() => {
        // 最新的值
        ref.current?.();
      }, []);

      return (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <HeavyComponentMemo
            title="Welcome closures"
            onClick={onClick}
          />
        </>
      );
    };
```
现在，我们拥有了两全其美的优点：重组件已被正确记忆缓存，并且不会随着每次状态更改而重新渲染。 它的 `onClick` 回调可以访问组件中的最新数据，而不会击穿缓存。 现在可以安全地将我们需要的一切发送到后端了！

# 总结

希望所有这些都是有意义的，并且现在闭包对你来说很容易。 在你开始编码之前，请记住有关闭包的注意事项：

*   每次在一个函数内创建另一个函数时都会形成闭包
*   由于 React 组件只是函数，因此内部创建的每个函数都会形成一个闭包，包括 `useCallback` 和 `useRef` 等 hook
*   当调用形成闭包的函数时，它周围的所有数据都被“冻结”，就像快照一样。
*   要更新该数据，我们需要重新创建“关闭”函数。 这就是 `useCallback` 等 hook 的依赖项允许我们做的事情
*   如果我们错过了依赖项，或者不刷新分配给 `ref.current` 的关闭函数，则闭包将变得“过时”。
*   我们可以利用 Ref 是一个可变对象这一情况来逃离 React 中的“过时闭包”陷阱。 我们可以在过时闭包之外改变 `ref.current` ，然后在内部访问它。 将会是最新的数据。

