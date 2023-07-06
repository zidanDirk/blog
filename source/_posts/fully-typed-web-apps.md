---
title: Remix -- 真正类型安全的 Web Apps
date: 2022-11-03 11:03:30
tags: 翻译
---


TypeScript 是 Web 行业一个重要的组成部分。这是有充分理由证明的，它非常的棒。当然了，我说的不仅仅是下面这样：

```typescript
function add(a: number, b: number) {
  return a + b
}
add(1, 2) // 类型检查通过了
add('one', 3) // 类型检查没通过
```

这非常的酷～但我想说的是类似下面这样的：


![workshop-type-diagram.jpg](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/97314cb3a3d542bebe0ca8bcb87cde86~tplv-k3u1fbpfcp-watermark.image?)

贯穿整个程序的「类型」（包括了前端与后端）。在现实中它可能就是这样的，而且可能在未来的某一天你需要做出一个非常艰难的决定：将 `剩余座位` 这个字段拆分成 `总座位` 和 `已坐座位` 两个字段。如果没有「类型」来指导重构，那么你将会非常困难。当然了，我也非常希望你有一些很可靠的单元测试。

这篇文章我并不是想说服你 JavaScript 中的「类型」是多么好。而是想跟你聊聊「端到端类型安全」有多么的棒，并且跟你介绍如何将它应用到你的项目中去。

首先，我这里说的「端到端类型安全」指的是，从数据库层到后端代码层再到前端 UI 层的全链路类型安全。然而我意识到，每个人的环境情况都是不同的。你可能没有操作数据库的权限。当年我在某互联网大厂工作，我经常消费许多来自不同后端团队的服务。我从未直接操作过数据库。所以如果要实现真正的「端到端类型安全」，可能是需要多个团队配合的。但希望我能帮助你走上正确的轨道，尽可能地适应你自己的情况。

让我们项目的「端到端类型安全」变得困难的最重要因素是：**边界**

**要实现类型安全的 Web Apps 就是要覆盖边界的类型**

在 Web 环境中，我们有很多的边界。有一些你可能比较清楚，有一些你可能没有意识到。这里有一些你可能会在 Web 环境中遇到的边界的例子：

```typescript
// 获取 localStorge 中 ticket 的值
const ticketData = JSON.parse(localStorage.get('ticket'))
// 它是 any 类型吗 😱

// 从 form 表单中获取值
// <form>
//   ...
//   <input type="date" name="workshop-date" />
//   ...
// </form>
const workshopDate = form.elements.namedItem('workshop-date')
// 它是 Element | RadioNodeList | null 😵 这样的类型吗

// 从 API 中获取数据
const data = await fetch('/api/workshops').then(r => r.json())
// 它是 any 类型吗 😭

// 获取配置信息或者路由上的参数（比如 Remix 或者 React Router）
const { workshopId } = useParams()
// string | undefined 🥴

// 通过 node.js 的 fs 模块，读取或者解析字符串
const workshops = YAML.parse(await fs.readFile('./workshops.yml'))
// 它是 any 类型吗 🤔

// 从数据库中读取数据
const data = await SQL`select * from workshops`
// 它是 any 类型吗 😬

// 从请求中读取数据
const description = formData.get('description')
// FormDataEntryValue | null 🧐
```

还有更多示例，但这些是你会遇到的一些常见的边界：

1.  本地存储
1.  用户输入
1.  网络
1.  基础配置或约定
1.  文件系统
1.  数据库请求

事实上， ***不能*** 100% 确定我们从边界获取到的内容就是我们预期的内容。重要的事情说三遍：***不能，不能，不能*** 。当然了，你可以使用 `as Workshop` 这样的显示类型声明来让 TypeScript 编译通过并正常运行，但这只是把问题给隐藏起来。文件可能被其他的进程修改，API 可能被修改，用户可能手动修改 DOM。所以我们无法明确的知道边界的修改结果是否跟你预期的一样的。

然而，你是**能够**做一些事情来规避一些风险的。比如说：

1.  编写「类型守卫函数」或者「类型断言函数」
1.  使用可以类型生成的工具（能给你 90% 的信心）
1.  通知 TypeScript 你的约定 / 配置

现在，让我们看看使用这些策略通过 Web 应用的边界来实现端对端类型安全

# 类型守卫 / 断言函数

这确实是最有效的方法来按照你的预期处理边界类型问题。你可以通过写代码逐个字段去检查它！这里有一个简单的类型守卫例子：

```typescript
const { workshopId } = useParams()
if (workshopId) {
  // 你已经获取了 workshopId 并且 TypeScript 也知道了 
} else {
  // 处理你获取不到 workshopId 的情况
}
```

在这个时候，有些人可能会因为要迁就 TypeScript 编译器而感到恼火。如果你十分肯定 `workshopId` 是你必须要获取的字段，那么你可以在获取不到的时候直接抛出错误（这样将对你的程序有非常大的帮助而不是忽略这些潜在的问题）

```typescript
const { workshopId } = useParams()

if (!workshipId) {
	throw new Error('workshopId 不合法')
}
```

下面这个工具，我在项目中用的最多，因为它十分的便利，也让代码可读性更强

```typescript
import invariant from 'tiny-invariant'

const { workshopId } = useParams()
invariant(workshopId, 'workshopId 不合法')
```

**[tiny-invariant](https://npm.im/tiny-invariant)** 的 README 中提到

> ***`invariant`*** 这个函数校验入参，如果入参为 false 则该函数会抛出错误；为 true 则不会抛出

需要添加额外代码来进行校验总是比较难受的。这是一个棘手的问题因为 TypeScript 不知道你的约定和配置。也就是说，如果能让 TypeScript 知道我们项目中的约定和配置，那么将能够起到一定的作用。这里有一些项目正在处理这样的问题：

-   **[routes-gen](https://github.com/sandulat/routes-gen)** 和 **[remix-routes](https://github.com/yesmeck/remix-routes)** 都可以基于你的 Remix 约定或者配置自动生成类型（这块在本文还会再细说）
-   **[TanStack Router](https://tanstack.com/router)** 会确保所有的工具方法（比如 useParams）都可以访问到你定义的路由信息（有效地将你的配置通知 TypeScript，这是我们的另一种解决方法）

这个只是一个 URL 边界相关的例子，但这里关于如何教会 TypeScript 知道我们项目约定的方案是可以移植到其他边界情况的。

让我们再来看看另一个更加复杂的「类型守卫」的例子

```typescript
type Ticket = {
  workshopId: string
  attendeeId: string
  discountCode?: string
}

// 类型守卫函数
function isTicket(ticket: unknown): ticket is Ticket {
  return (
    Boolean(ticket) &&
    typeof ticket === 'object' &&
    typeof (ticket as Ticket).workshopId === 'string' &&
    typeof (ticket as Ticket).attendeeId === 'string' &&
    (typeof (ticket as Ticket).discountCode === 'string' ||
      (ticket as Ticket).discountCode === undefined)
  )
}

// ticket 是 any 类型 ？？
const ticket = JSON.parse(localStorage.get('ticket'))

if (isTicket(ticket)) {
  // 我们知道 ticket 的类型了
} else {
  // 处理获取不到 ticket 的情况 ....
}
```

即便是一个相对简单的类型，我们好像都需要做不少的工作。想象一下在真实项目中更加复杂的类型！！如果你经常要做这样类似的工作，那建议你还是选用一些比较好用的工具比如 **[zod](https://github.com/colinhacks/zod#safeparse)** 这样的。

```typescript
import { z } from "zod"

const Ticket = z.object({
  workshopId: z.string(),
  attendeeId: z.string(),
  discountCode: z.string().optional()
})
type Ticket = z.infer<typeof Ticket>

const rawTicket = JSON.parse(localStorage.get('ticket'))
const result = Ticket.safeParse(rawTicket);
if (result.success) {
  const ticket = result.data
  //    ^? Ticket 数据
} else {
	// result.error 将会返回一个带有错误信息的 error 对象
}
```

我对于 zod 最大的关心点在于打包后的 bundle 体积比较大（目前在没压缩的情况下有 42 KB 左右），所以我不经常在项目中使用到它。但是如果你只是在服务端使用到或者你真的从 zod 中得到很多的便利，那我觉得还是值得使用的。

**[tRPC](https://trpc.io/)** 就通过 zod 实现了类型全覆盖；它在服务端和客户端共享类型来实现网络边界的类型安全。我个人喜欢使用 Remix 所以很少用到 tRPC；如果不使用 Remix ，我 100 % 会使用 tRPC 来实现类型安全这样的能力。

类型守卫/断言函数同样也是你处理表单的`FormData` 的方法。对我来说，我非常喜欢使用 **[remix-validity-state](https://github.com/brophdawg11/remix-validity-state)** ，原因是：代码通过在运行时检查类型来保证整个应用的类型安全。

# 类型生成

上面已经讲了一些关于如何为 Remix 约定路由生成类型的工具；类型生成能够解决端对端的类型安全问题。另一个流行的例子是 **[Prisma](https://www.prisma.io/)** （我最喜欢的 ORM）。许多的 GraphQL 工具同样也有类似的能力。大致的做法就是允许你去定义一个 schema ，然后 Prisma 来保证你的数据库表跟这个 schema 是可以匹配上的。然后 Prisma 也会生成跟 schema 匹配的 TypeScript 类型声明。高效地保持类型跟数据库同步。比如：

```typescript
const workshop = await prisma.user.findFirst({
   // ^? { id: string, title: string, date: Date } 🎉
  where: { id: workshopId },
  select: { id: true, title: true, date: true },
})
```

任何时候你修改了 schema 并且创建一个 Prisma 的 migration，Prisma 将会直接更新你的 node_modules 目录下对应的类型文件。所以当你在使用 Prisma ORM 的时候，类型文件始终跟你的 schema 是保持一致的。下面是一个真实项目的 User 数据库表：

```typescript
model User {
  id           String     @id @default(uuid())
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  email        String     @unique(map: "User.email_unique")
  firstName    String
  discordId    String?
  convertKitId String?
  role         Role       @default(MEMBER)
  team         Team
  calls        Call[]
  sessions     Session[]
  postReads    PostRead[]
}
```

这个是生成的类型

```typescript
/**
 * Model User
 * 
 */
export type User = {
  id: string
  createdAt: Date
  updatedAt: Date
  email: string
  firstName: string
  discordId: string | null
  convertKitId: string | null
  role: Role
  team: Team
}
```

这确实是一个非常棒的开发体验，并它可以作为我在后端应用程序中类型的起点。

这里主要的风险在于，如果数据库的 schema 可能会跟数据库里面的数据因为某种原因导致不同步。但是我还没有在使用 Prisma 的过程中遇到过这种情况，希望这种情况是很少见，所以我对不在数据库交互中添加断言函数还是很有信心的。然而，如果你没办法使用像 Prisma 这样的工具或者你所在的团队不负责数据库 schema，我还是建议你去找其他方法生产基于数据库 schema 的类型，因为这实在是太棒了。

请记住，我们不仅仅是为了服务 TypeScript。即使我们的项目不使用 TypeScript ，我们也应该让应用边界之间的数据跟我们预知类型的保持一致。

# 使用约定 / 配置来帮助 TypeScript

另一个挑战比较大的边界是网络边界。验证服务端给到 UI 层的数据是一件比较困难的事情。**`fetch`** 没有提供范型支持，即便是有，你也只是在自欺欺人。

```typescript
// 这样不行, 别这么做 :
const data = fetch<Workshop>('/api/workshops/123').then(r => r.json())
```

请允许我给你说一些关于范型的秘密，基本上大部分函数像下面这么做都是不好的选择：

```typescript
function getData<DataType>(one, two, three) {
  const data = doWhatever(one, two, three)
  return data as DataType // <-- 这里这里！！！
}
```

任何时候你看到这个写法 `as XXX类型` ，你可以认为：这是在欺骗 TypeScript 的编译器。即使有的时候你为了能够让代码不报错而不得不这么做，我都依然不建议你像上面这个 `getData` 函数这样做。而这个时候，你有两个选择：

```typescript
const a = getData<MyType>() // 🤮 我非常难受
const b = getData() as MyType // 😅 好一点，但是我依然难受
```

在这两种情况中，你都是在对 TypeScript 撒谎（也是在对自己撒谎），但是第一种情况你不知道你在对自己撒谎。如果你不得不对自己撒谎或者决定对自己撒谎，起码你要知道你正在这么做。

所以我们应该这么样做才能不对自己说谎呢？好的，你需要跟你 fetch 的数据建立一个强约定，然后再通知 TypeScript 这个约定。看看 Remix 中是怎么做的，下面是一个简单的例子：

```typescript
import type { LoaderArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { prisma } from "~/db.server"
import invariant from "tiny-invariant"

export async function loader({ params }: LoaderArgs) {
  const { workshopId } = params
  invariant(workshopId, "Missing workshopId")
  const workshop = await prisma.workshop.findFirst({
    where: { id: workshopId },
    select: { id: true, title: true, description: true, date: true },
  })
  if (!workshop) {
		// 会被 Remix 的错误捕获错处
    throw new Response("Not found", { status: 404 })
  }
  return json({ workshop })
}

export default function WorkshopRoute() {
  const { workshop } = useLoaderData<typeof loader>()
  //      ^? { title: string, description: string, date: string }
  return <div>{/* Workshop form */}</div>
}
```

`useLoaderData` 函数接收一个 Remix `loader` 函数类型并且能够确定 JSON 相应数据的所有可能。`loader` 函数运行在服务端，`WorkshopRoute` 函数运行在服务端和客户端，由于 `userLoaderData` 能够明确 Remix loader 的约定，所以类型可以在网络边界同步（共享）。Remix 会确保服务端 `loader` 的数据是通过 `useLoaderData` 最后返回的。所有的事情都在同一个文件里面完成，不需要 API 路由。

如果你还没有这样实践过，你也可以相信这是一个非常棒的体验。想象一下，我们决定要在 UI 中显示 *价格* 字段。 这就像在数据库查询更新一样简单，然后我们突然在我们的 UI 代码中使用它，而无需更改任何其他内容。完完全全地类型安全！！！如果我们决定不使用 `description` 这个字段，那么我们只需要在 `select` 那里删除这个字段，然后我们就会看到之前所有用到这个字段的地方都飘红了（类型检查报错）。这对于我们重构代码非常有用。

无处不在的**网络边界**。

你可能已经注意到了，即使 `date` 在后端是一个 `Date` 类型， 它在我们的 UI 层代码使用的却是 `string` 类型。这是因为数据经过了网络边界，在这个过程中所有数据都会被序列化成字符串（JSON 不支持 Date 类型）。类型工具强制让这种行为发生。

如何你计划要去显示日期，你可能需要在 `loader` 中格式化它，在它被发送到客户端之前做这个事情是为了避免出现时区错乱。如果你不喜欢这么做，你可以使用像 **[superjson](https://github.com/blitz-js/superjson)** 或者 **[remix-typedjson](https://github.com/kiliman/remix-typedjson)** 这样的工具让这些数据在发送到 UI 层的时候被恢复成日期格式。

在 Remix 中，我们也可以在 `action` 中保证类型安全。看看下面这个例子：

```typescript
import type { ActionArgs } from "@remix-run/node"
import { redirect, json } from "@remix-run/node"
import { useActionData, useLoaderData, } from "@remix-run/react"
import type { ErrorMessages, FormValidations } from "remix-validity-state"
import { validateServerFormData, } from "remix-validity-state"
import { prisma } from "~/db.server"
import invariant from "tiny-invariant"

// loader 逻辑写在这里。。。已省略

const formValidations: FormValidations = {
  title: {
    required: true,
    minLength: 2,
    maxLength: 40,
  },
  description: {
    required: true,
    minLength: 2,
    maxLength: 1000,
  },
}

const errorMessages: ErrorMessages = {
  tooShort: (minLength, name) =>
    `The ${name} field must be at least ${minLength} characters`,
  tooLong: (maxLength, name) =>
    `The ${name} field must be less than ${maxLength} characters`,
}

export async function action({ request, params }: ActionArgs) {
  const { workshopId } = params
  invariant(workshopId, "Missing workshopId")
  const formData = await request.formData()
  const serverFormInfo = await validateServerFormData(formData, formValidations)
  if (!serverFormInfo.valid) {
    return json({ serverFormInfo }, { status: 400 })
  }
  const { submittedFormData } = serverFormInfo
  //      ^? { title: string, description: string }
  const { title, description } = submittedFormData
  const workshop = await prisma.workshop.update({
    where: { id: workshopId },
    data: { title, description },
    select: { id: true },
  })
  return redirect(`/workshops/${workshop.id}`)
}

export default function WorkshopRoute() {
  // ... loader 处理逻辑。。。已省略
  const actionData = useActionData<typeof action>()
  //    ^? { serverFormInfo: ServerFormInfo<FormValidations> } | undefined
  return <div>{/* Workshop form */}</div>
}
```

同样，不管我们的 `action` 返回什么，最终都会返回被 `useActionData` 序列化之后的类型。在这种情况下，我会使用 `remix-validity-state` 来保证类型安全。因为我通过提供给`remix-validity-state` 函数传递 schema 的形式进行校验，所以被提交的数据也同样是类型安全的。`submittedFormData`也是类型安全的。当然，还有其他的库可以实现类似的能力，但重点是，我们通过这些少量并且简单的工具就能够实现效果非常好的边界类型安全，同时也增强了我们部署和运行代码的信心。显然，这些工具的 API 都比较简单易用，虽然有时候这些工具本身内部的实现是非常复杂的 😅

应该提到的是，这也适用于其他 Remix 工具。`meta` export 也可以是类型安全的，useFetcher ，useMatcher 等等都可以。世界又变得无比美好～～

认真的说，`loader` 只是冰山一角，但也可以说明很多的问题了～让我们再看看下面这个（请耐心等待 gif 下载～）：


<img src="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bd5972cc94224742bb40a3d4b844dab0~tplv-k3u1fbpfcp-watermark.image?" alt="across-the-network-typesafety.gif" />

这大概就是网络边界类型安全吧。而且，这一切都在一个文件中完成，太酷了🔥

# 总结

我在这里要说明的一点是，类型安全不仅有价值的，而且是可以做到端到端地跨边界实现。最后 loader 的例子覆盖了从数据库到 UI。数据类型安全从 `数据库` → `node` → `浏览器` ，这让研发效率大大的提升。不管你正在做什么项目，请思考如何减少类似 `as XXX类型` 这样的用法，通过我上述的一些建议尝试将这样的用法转换成真正的类型安全。我想日后你会感谢你自己的。这真的是值得投入去做的事情。

如果你想要运行一下这个例子，你可以直接 clone 这个项目：[项目地址](https://github.com/zidanDirk/fully-typed-web-apps-demo-cn)

最后的最后，希望你可以在下方留言跟我一起探讨你的看法～～

欢迎点赞，关注，收藏 ❤️ ❤️ ❤️

> 本文是翻译文，原文地址：[](https://www.epicweb.dev/fully-typed-web-apps)<https://www.epicweb.dev/fully-typed-web-apps>
