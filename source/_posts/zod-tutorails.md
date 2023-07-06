---
title: 【超详细】Zod 入门教程
date: 2022-11-08 15:48:30
tags: 翻译
---


Zod 是一个以 TypeScript 为首的模式声明和验证库 ，弥补了 TypeScript 无法在运行时进行校验的问题

Zod 既可以用在服务端也可以运行在客户端，以保障 [Web Apps 的类型安全](https://juejin.cn/post/7161619831844765710)

接下来会用十个有趣的例子，带你快速入门 Zod，体会 Zod 的强大和便利 ～ 感谢 Matt Pocock 大神提供的 [示例](https://www.totaltypescript.com/tutorials/zod)


本文仓库地址 [传送门 👉](https://github.com/zidanDirk/zod-tutorial-cn)

> 提示：本文 Star Wars API 有时会有超时情况，如遇超时则重试几遍哈

# 01 - 使用 Zod 进行运行时类型校验

## 问题

TypeScript 是一个非常有用的类型工具，用于检查代码中变量的类型

但是我们不能总是保证代码中变量的类型，比如这些变量来自 API 接口或者表单输入

Zod 库使得我们能够在 `运行时` 检查变量的类型，它对于我们的大部分项目都是有用的

### 初探运行时检查

看看这个 `toString` 函数：

```javascript
export const toString = (num: unknow) => {
    return String(num)
}
```
我们将 num 的入参设置为 unknow

这意味着我们可以在编码过程中给 `toString` 函数传递任何类型的参数，包括 object 类型或者 undefined :
```javascript
toString('blah')
toString(undefined)
toString({name: 'Matt'})
```
到目前为止还是没有报错的，但我们想要在 `运行时` 防止这样的事情发生

如果我们给 `toString` 传入一个字符串，我们想要抛出一个错误，并提示预期传入一个数字但是接收到一个字符串

```javascript
it("当入参不是数字的时候，需要抛出一个错误", () => {
  expect(() => toString("123")).toThrowError(
    "Expected number, received string",
  );
});
```
如果我们传入一个数字，`toString` 是能够正常运行的

```javascript
it("当入参是数字的时候，需要返回一个字符串", () => {
    expect(toString(1)).toBeTypeOf("string");
});
```

## 解决方案

### 创建一个 `numberParser`

各种 Parser 是 Zod 最基础的功能之一

我们通过 `z.number()` 来创建一个 `numberParser`

它创建了 `z.ZodNumber` 对象，这个对象提供了一些有用的方法

```javascript
const numberParser = z.number();
```
如果数据不是数字类型的话，那么将这些数据传进 `numberParser.parse()` 后会报错

这就意味着，所有传进  `numberParser.parse()` 的变量都会被转成数字，然后我们的测试才能够通过。

添加 `numberParser` , 更新 `toString` 方法

```javascript

const numberParser = z.number();

export const toString = (num: unknown) => {
  const parsed = numberParser.parse(num);
  return String(parsed);
};

```

### 尝试不同的类型

Zod 也允许其他的类型检验

比如，如果我们要接收的参数不是数字而是一个 boolean 值，那么我们可以把 `numberParser` 修改成 `z.boolean()`

当然，如果我们只修改了这个，那么我们原有的测试用例就会报错哦


Zod 的这种技术为我们提供了坚实的基础。 随着我们的深入使用，你会发现 Zod 模仿了很多你在 TypeScript 中习惯的东西。

可以在 [这里](https://zod.dev/?id=primitives) 查看 Zod 完整的基础类型



# 02 - 使用 Object Schema 对未知的 API 进行校验

## 问题

Zod 经常被用于校验未知的 API 返回内容

在下面这个例子中，我们从 Star Wars API 中获取一个人物的信息

```javascript
export const fetchStarWarsPersonName = async (id: string) => {
  const data = await fetch("<https://swapi.dev/api/people/>" + id).then((res) =>
    res.json(),
  );

  const parsedData = PersonResult.parse(data);

  return parsedData.name;
};
```

注意到现在 `PersonResult.parser()` 处理的数据是从 fetch 请求来的

`PersonResult` 变量是由 `z.unknown()` 创建的，这告诉我们数据是被认为是 `unknown` 类型因为我们不知道这些数据里面包含有什么

```javascript
const PersonResult = z.unknown();
```

### 运行测试

如果我们是用 `console.log(data)` 打印出 fetch 函数的返回值，我们可以看到这个 API 返回的内容有很多，不仅仅有人物的 name ，还有其他的比如 eye_color，skin_color 等等一些我们不感兴趣的内容


接下来我们需要修复这个 `PersonResult` 的 unknown 类型

## 解决方案

### 使用 `z.object` 来修改 PersonResult

首先，我们需要将 `PersonResult` 修改为 `z.object`

它允许我们使用 key 和类型来定义这些 object

在这个例子中，我们需要定义 `name` 成为字符串

```javascript
const PersonResult = z.object({
  name: z.string(),
});
```

注意到这里有点像我们在 TypeScript 中创建 interface

```javascript
interface PersonResult {
    name: string;
}
```

### 检查我们的工作

在 `fetchStarWarsPersonName` 中，我们的 `parsedData` 现在已经被赋予了正确的类型，并且拥有了一个 Zod 能识别的结构

重新调用 API 我们依然能够看到返回的数据里面有很多我们不感兴趣的信息

现在如果我们用 `console.log` 打印 `parsedData`，我们可以看到 Zod 已经帮我们过滤掉我们不感兴趣的 Key 了，只给我们 `name` 字段

### 更多

任何额外加入 `PersonResult` 的 key 都会被添加到 `parsedData` 中

能够显式的指明数据中每个 key 的类型是 Zod 中一个非常有用的功能


# 03 - 创建自定义类型数组

## 问题

在这个例子中，我们依然使用 Star Wars API，但是这一次我们要拿到 `所有` 人物的数据

一开始的部分跟我们之前看到的非常类似，`StarWarsPeopleResults` 变量会被设置为 `z.unknown()`

```javascript
const StarWarsPeopleResults = z.unknown();

export const fetchStarWarsPeople = async () => {
  const data = await fetch("https://swapi.dev/api/people/").then((res) =>
    res.json(),
  );

  const parsedData = StarWarsPeopleResults.parse(data);

  return parsedData.results;
};
```

跟之前类似，添加 `console.log(data)` 到 fetch 函数中，我们可以看到数组中有很多数据即使我们只对数组中的 name 字段感兴趣

如果这是一个 TypeScript 的 interface，它可能是需要写成这样
```javascript
interface Results {
  results: {
    name: string;
  }[];
}

```
### 作业

通过使用 object schema 更新 `StarWarsPeopleResults` ，来表示一个 `StarWarsPerson` 对象的数组

可以参考[这里](https://zod.dev/?id=arrays)的文档来获得帮助

## 解决方案

正确的解法就是创建一个对象来饮用其他的对象。在这个例子中，`StarWarsPeopleResults` 将是一个包含 `results` 属性的 `z.object`

关于 `results`，我们使用 `z.array` 并提供 `StarWarsPerson` 作为参数。我们也不用重复写 `name: z.string()` 这部分了

这个是之前的代码
```javascript
const StarWarsPeopleResults = z.unknown()
```

修改之后
```javascript
const StarWarsPeopleResults = z.object({
  results: z.array(StarWarsPerson),
});
```

如果我们 `console.log` 这个 `parsedData` ，我们可以获得期望的数据

像上面这样声明数组的 object 是 `z.array()` 最常用的的功能一直，特别是当这个 object 已经创建好了。


# 04 - 提取对象类型

## 问题

现在我们使用 console 函数将 StarWarsPeopleResults 打印到控制台
```javascript
const logStarWarsPeopleResults = (data: unknown) => {
  data.results.map((person) => {
    console.log(person.name);
  });
};
```
再一次，`data` 的类型是 `unknown`

为了修复，可能会尝试使用下面这样的做法：
```javascript
const logStarWarsPeopleResults = (data: typeof StarWarsPeopleResults)
```
然而这样还是会有问题，因为这个类型代表的是 Zod 对象的类型而不是 `StarWarsPeopleResults` 类型


### 作业
更新 `logStarWarsPeopleResults` 函数去提取对象类型


## 解决方案

### 更新这个打印函数
使用 `z.infer` 并且传递 `typeof StarWarsPeopleResults` 来修复问题

```javascript
const logStarWarsPeopleResults = (
  data: z.infer<typeof StarWarsPeopleResults>,
) => {
  ...
```
现在当我们在 VSCode 中把鼠标 hover 到这个变量上，我们可以看到它的类型是一个包含了 results 的 object

当我们更新了 `StarWarsPerson` 这个 schema，函数的 data 也会同步更新

这是一个很棒的方式，它做到使用 Zod 在运行时进行类型检查，同时也可以在构建时获取数据的类型


### 一个替代方案

当然，我们也可以把 StarWarsPeopleResultsType 保存为一个类型并将它从文件中导出
```javascript
export type StarWarsPeopleResultsType = z.infer<typeof StarWarsPeopleResults>;
```
`logStarWarsPeopleResults` 函数则会被更新成这样
```javascript
const logStarWarsPeopleResults = (data: StarWarsPeopleResultsType) => {
  data.results.map((person) => {
    console.log(person.name);
  });
};
```

这样别的文件也可以获取到 `StarWarsPeopleResults` 类型，如果需要的话

# 05 - 让 schema 变成可选的

## 问题

Zod 在前端项目中也同样是有用的

在这个例子中，我们有一个函数叫做 `validateFormInput`

这里 `values` 的类型是 `unknown`，这样做是安全的因为我们不是特别了解这个 form 表单的字段。在这个例子中，我们收集了 `name` 和 `phoneNumber` 作为 `Form` 对象的 schema

```javascript
const Form = z.object({
  name: z.string(),
  phoneNumber: z.string(),
});

export const validateFormInput = (values: unknown) => {
  const parsedData = Form.parse(values);

  return parsedData;
};
```
目前的状况来说，我们的测试会报错如果 phoneNumber 字段没有被提交

### 作业
因为 phoneNumber 不总是必要的，需要想一个方案，不管 phoneNumber 是否有提交，我们的测试用例都可以通过

## 解决方案

在这种情况下，解决方案非常直观！
在 `phoneNumber` schema 后面添加 `.optional()`，我们的测试将会通过

```javascript
const Form = z.object({ name: z.string(), phoneNumber: z.string().optional(), });
```

我们说的是， `name` 字段是一个必填的字符串，`phoneNumber` 可能是一个字符串或者 undefined

我们不需要再做更多什么额外的事情，让这个 schema 变成可选的就是一个非常不错的方案

# 06 - 在 Zod 中设置默认值

## 问题

我们的下一个例子跟之前的很像：一个支持可选值的 form 表单输入校验器

这一次，`Form` 有一个 `repoName` 字段和一个可选数组字段 `keywords`

```javascript
const Form = z.object({
  repoName: z.string(),
  keywords: z.array(z.string()).optional(),
});
```
为了使实际表单更容易，我们希望对其进行设置，以便不必传入字符串数组。

### 作业
修改 `Form` 使得当 `keywords` 字段为空的时候，会有一个默认值（空数组）


## 解决方案

Zod 的 [default schema 函数](https://zod.dev/?id=default)，允许当某个字段没有传参时提供一个默认值

在这个例子中，我们将会使用 `.default([])` 设置一个空数组

修改前

```javascript
keywords: z.array(z.string()).optional()
```

修改后

```javascript
keywords: z.array(z.string()).default([])
```

因为我们添加了默认值，所以我们不需要再使用 `optional()` ，optional 已经是被包含在其中了。

修改之后，我们的测试可以通过了

### 输入不同于输出

在 Zod 中，我们已经做到了输入与输出不同的地步。

也就是说，我们可以做到基于输入生成类型也可以基于输出生成类型

比如，我们创建 `FormInput` 和 `FormOutput` 类型

```javascript
type FormInput = z.infer<typeof Form>
type FormOutput = z.infer<typeof Form>
```

### 介绍 `z.input`

就像上面写的，输入不完全正确，因为当我们在给 `validateFormInput` 传参数时，我们没有必要一定要传递 `keywords` 字段

我们可以使用 `z.input` 来替代 `z.infer` 来修改我们的 FormInput

如果验证函数的输入和输出之间存在差异，则为我们提供了另外一种生成的类型的方法。

```javascript
type FormInput = z.input<typeof Form>
```

# 07 - 明确允许的类型

## 问题

在这个例子中，我们将再一次校验表单

这一次，Form 表单有一个 `privacyLevel` 字段，这个字段只允许 `private` 或者 `public` 这两个类型
```javascript
const Form = z.object({
  repoName: z.string(),
  privacyLevel: z.string(),
});
```
如果是在 TypeScript 中，我们会这么写
```javascript
type PrivacyLevel = 'private' | 'public'
```

当然，我们可以在这里使用 boolean 类型，但如果将来我们还需要往 `PrivacyLevel` 中添加新的类型，那就不太合适了。在这里，使用联合类型或者枚举类型是更加安全的做法。


### 作业

第一个测试报错了，因为我们的 `validateFormInput` 函数有除了 "private" 或 "public" 以外的其他值传入 `PrivacyLevel` 字段

```javascript
it("如果传入一个非法的 privacyLevel 值，则需要报错", async () => {
  expect(() =>
    validateFormInput({
      repoName: "mattpocock",
      privacyLevel: "something-not-allowed",
    }),
  ).toThrowError();
});
```
你的任务是要找到一个 Zod 的 API 来允许我们明确入参的字符串类型，以此来让测试能够顺利通过。


## 解决方案

### 联合 (Unions) & 字面量 (Literals)

第一个解决方案，我们将使用 [Zod 的 联合函数](https://zod.dev/?id=unions)，再传一个包含 "private" 和 "public" [字面量](https://zod.dev/?id=literals) 的数组

```javascript
const Form = z.object({
  repoName: z.string(),
  privacyLevel: z.union([z.literal("private"), z.literal("public")]),
});
```
字面量可以用来表示：数字，字符串，布尔类型；不能用来表示对象类型

我们能使用 `z.infer` 检查我们 `Form` 的类型

```javascript
type FormType = z.infer<typeof Form>
```
在 VS Code 中如果你把鼠标移到 FormType 上，我们可以看到 `privacyLevel` 有两个可选值："private" 和 "public"

### 可认为是更加简洁的方案：枚举

通过 `z.enum` 使用 [Zod 枚举](https://zod.dev/?id=zod-enums)，也可以做到相同的事情，如下：
```javascript
const Form = z.object({
  repoName: z.string(),
  privacyLevel: z.enum(["private", "public"]),
});
```

我们可以通过语法糖的方式来解析字面量，而不是使用 `z.literal`

这个方式不会产生 TypeScript 中的枚举类型，比如
```javascript
enum PrivacyLevcel {
    private,
    public
}
```
一个新的联合类型会被创建

同样，我们通过把鼠标移到类型上面，我们可以看到一个新的包含 "private" 和 "public" 的联合类型

# 08 - 复杂的 schema 校验

## 问题

到目前为止，我们的表单校验器函数已经可以检查各种值了

表单拥有 name，email 字段还有可选的 phoneNumber 和 website 字段

然而，我们现在想对一些值做强约束

需要限制用户不能输入不合法的 URL 以及电话号码

### 作业

你的任务是寻找 Zod 的 API 来为表单类型做校验

电话号码需要是合适的字符，邮箱地址和 URL 也需要正确的格式


## 解决方案

Zod 文档的[字符串章节](https://zod.dev/?id=strings)包含了一些校验的例子，这些可以帮助我们顺利通过测试

现在我们的 Form 表单 schema 会是写成这样
```javascript
const Form = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().min(5).max(20).optional(),
  email: z.string().email(),
  website: z.string().url().optional(),
});
```

`name` 字段加上了 `min(1)`，因为我们不能给它传空字符串

`phoneNumber` 限制了字符串长度是 5 至 20，同时它是可选的

Zod 有内建的邮箱和 url 校验器，我们可以不需要自己手动编写这些规则

可以注意到，我们不能这样写 `.optional().min()`， 因为optional 类型没有 `min` 属性。这意味着我们需要将 `.optional()` 写在每个校验器后面

还有很多其他的校验器规则，我们可以在 Zod 文档中找到

# 09 - 通过组合 schema 来减少重复

## 问题

现在，我们来做一些不一样的事情

在这个例子中，我们需要寻找方案来重构项目，以减少重复代码

这里我们有这些 schema，包括：`User`, `Post` 和 `Comment`

```javascript
const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const Post = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
});

const Comment = z.object({
  id: z.string().uuid(),
  text: z.string(),
});
```
我们看到, id 在每个 schema 都出现了

Zod 提供了许多方案可以将 object 对象组织到不同的类型中，使得我们可以让我们的代码更加符合 [`DRY`](https://www.ruanyifeng.com/blog/2013/01/abstraction_principles.html) 原则


### 作业

你的挑战是，需要使用 Zod 进行代码重构，来减少 id 的重复编写

#### 关于测试用例语法

你不用担心这个测试用例的 TypeScript 语法，这里有个快速的解释：

```javascript
Expect<
  Equal<z.infer<typeof Comment>, { id: string; text: string }>
>
```
在上面的代码中，`Equal` 是确认 `z.infer<typeof Comment>` 和 `{id: string; text: string}` 是相同的类型

如果你删除掉 `Comment` 的 `id` 字段，那么在 VS Code 中可以看到 `Expect` 会有一个报错，因为这个比较不成立了

## 解决方案

我们有很多方法可以重构这段代码

作为参考，这是我们开始的内容：
```javascript
const User = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const Post = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
});

const Comment = z.object({
  id: z.string().uuid(),
  text: z.string(),
});
```


### 简单的方案
最简单的方案是抽取 `id` 字段保存成一个单独的类型，然后每一个 `z.object` 都可以引用它

```javascript
const Id = z.string().uuid();

const User = z.object({
  id: Id,
  name: z.string(),
});

const Post = z.object({
  id: Id,
  title: z.string(),
  body: z.string(),
});

const Comment = z.object({
  id: Id,
  text: z.string(),
});
```
这个方案挺不错，但是 `id: ID` 这段仍然是一直在重复。所有的测试都可以通过，所以也还行

### 使用扩展（Extend）方法
另一个方案是创建一个叫做 `ObjectWithId` 的基础对象，这个对象包含 `id` 字段

```javascript
const ObjectWithId = z.object({
  id: z.string().uuid(),
});
```
我们可以使用[扩展方法](https://zod.dev/?id=extend)去创建一个新的 schema 来添加基础对象

```javascript
const ObjectWithId = z.object({
  id: z.string().uuid(),
});

const User = ObjectWithId.extend({
  name: z.string(),
});

const Post = ObjectWithId.extend({
  title: z.string(),
  body: z.string(),
});

const Comment = ObjectWithId.extend({
  text: z.string(),
});
```
请注意，`.extend()` 会覆盖字段


### 使用合并（Merge）方法

跟上面的方案类似，我们可以使用[合并方法](https://zod.dev/?id=merge)来扩展基础对象 `ObjectWithId` :

```javascript
const User = ObjectWithId.merge(
  z.object({
    name: z.string(),
  }),
);
```

使用 `.merge()` 会比 `.extend()` 更加冗长。我们必须传一个包含 `z.string()` 的 `z.object()` 对象

合并通常是用于联合两个不同的类型，而不是仅仅用来扩展单个类型

这些是在 Zod 中将对象组合在一起的几种不同方式，以减少代码重复量，使代码更加符合 DRY，并使项目更易于维护！


# 10 - 通过 schema 转换数据

## 问题

Zod 的另一个十分有用的功能是控制从 API 接口响应的数据

现在我们翻回去看看 Star Wars 的例子

想起我们创建了 `StarWarsPeopleResults` , 其中 `results` 字段是一个包含 `StarWarsPerson` schema 的数组

当我们从 API 获取 `StarWarsPerson` 的 `name`，我们获取的是他们的全称

现在我们要做的是为 `StarWarsPerson` 添加转换


### 作业

你的任务是为这个基础的 `StarWarsPerson` 对象添加一个转换，将 `name` 字段按照空格分割成数组，并将数组保存到 `nameAsArray` 字段中


测试用例大概是这样的：

```javascript
it("需要解析 name 和 nameAsArray 字段", async () => {
  expect((await fetchStarWarsPeople())[0]).toEqual({
    name: "Luke Skywalker",
    nameAsArray: ["Luke", "Skywalker"],
  });
});
```

## 解决方案

提醒一下，这是 `StarWarsPerson` 在转换前的样子：

```javascript
const StarWarsPerson = z.object({
  name: z.string()
});
```

### 添加一个转换 (Transformation)

当我们在 `.object()` 中的 `name` 字段时，我们可以获取 `person` 参数，然后转换它并添加到一个新的属性中

```javascript
const StarWarsPerson = z
  .object({
    name: z.string(),
  })
  .transform((person) => ({
    ...person,
    nameAsArray: person.name.split(" "),
  }));
```

在 `.transform()` 内部，`person` 是上面包含 `name` 的对象。

这也是我们添加满足测试的 `nameAsArray` 属性的地方。

所有这些都发生在 `StarWarsPerson` 这个作用域中，而不是在 `fetch` 函数内部或其他地方。

### 另一个例子

Zod 的转换 API 适用于它的任何原始类型。

比如，我们可以转换 `name` 在 `z.object` 的内部

```javascript
const StarWarsPerson = z
  .object({
    name: z.string().transform((name) => `Awesome ${name}`)
  }),
  ...
```

现在我们拥有一个 `name` 字段包含 `Awesome Luke Skywalker` 和一个 `nameAsArray` 字段包含 `['Awesome', 'Luke', 'Skywalker']`

转换过程在最底层起作用，可以组合，并且非常有用


# 总结
以上就是教程的所有内容，后续还会一直补充更多的实用例子，建议收藏 ～ 也欢迎各位小伙伴看完之后能跟我一起讨论有关于 Zod 的相关问题，提出宝贵意见 ～ 


### 引用文献
- https://www.totaltypescript.com/tutorials/zod
- https://zod.dev/

# 联系作者

![QRCode.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1d5880fb29d2439a9021e2a62c0cd32c~tplv-k3u1fbpfcp-watermark.image?)


