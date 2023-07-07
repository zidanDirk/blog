---
title: 在 React Router 中使用 JWT
date: 2023-06-18 18:18:00
tags: 翻译
---



在这篇文章中，我们将探讨 JWT 身份校验与 React 和 React-router 的无缝集成。 我们还将学习如何处理公共路由、受校验保护路由，以及如何利用 axios 库通过身份验证令牌（token）发出 API 请求。

# 创建一个 React 项目

使用下方的指令会为我们创建一个项目

```bash
$ npm create vite@latest react-jwt-cn
```

然后我们选择 `react` 和 `javascript` 作为我们的框架和语言。在项目开始之前，我们要确保所有的依赖都已经被安装，所以我们要先执行

```bash
$ npm install
```

安装完毕后，在项目的根目录下，我们可以运行下面的指令来启动我们的项目

```bash
$ npm run dev
```

我们通过这些步骤来让我们的 React 项目顺利启动和运行

# 安装 **React-Router 和 Axios**

在我们继续之前，要确保我们已经为我们的项目安装了必要的依赖项。 我们将从安装 react-router v6 开始，它将处理我们的 React 应用程序中的路由。 此外，我们将安装 Axios，这是一个用于发送 API 请求的库。 通过执行这些步骤，我们将配备实现无缝路由和执行高效 API 通信所需的工具。 让我们从安装这些依赖项开始。

```bash
$ npm install react-router-dom axios
```

## 在 React 中创建 **AuthProvider 和 AuthContext**

接下来我们要实现的就是 JWT 身份验证的功能。在这个小节中我们将创建一个 `AuthProvider` 组件和一个关联的 `AuthContext` 。这将协助我们在整个应用中存储和共享 JWT 身份验证相关的数据和函数

在 `src > provider` 下创建 `authProvider.js` 。然后我们来探 `AuthProvider` 和 `AuthContext` 的实现

1.  导入必要的模块和依赖包：

    1.  导入 `axios` 用于发送 API 请求
    1.  从 `react` 导入 `createContext` `useContext` `useEffect` `useMemo` 以及 `useState`

```js
import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
```

1.  使用 `createContext()` 来创建一个用于身份验证的上下文

    1.  `createContext()` 创建的空的上下文是用于在组件之间共享身份验证的数据和函数的

```js
const AuthContext = createContext();
```

2.  创建 AuthProvider 组件

    1.  这个组件是用于作为身份验证上下文 的 provider
    1.  它接收 children 作为 prop，代表将有权访问身份验证上下文的子组件。

```js
const AuthProvider = ({ children }) => {
  // 组件内容写在这里
};
```

3.  使用 `useState` 定义一个名为 `token` 的 state

    1.  `token` 代表的是身份验证的令牌
    1.  如果令牌数据存在的话，我们将通过 `localStorage.getItem("token")` 来获取它

```js
const [token, setToken_] = useState(localStorage.getItem("token"));
```

4.  创建 `setToken` 函数来更新身份验证的令牌数据

    1.  这个函数将会用于更新身份验证的令牌
    1.  它使用 `setToken_` 函数更新令牌数据并且将更新之后的数据通过 `localStorage.setItem()` 存储在本地环境

```js
const setToken = (newToken) => {
  setToken_(newToken);
};
```
5.  使用 `useEffect()` 来设置 axios 默认的身份验证请求头并且将身份验证的令牌数据保存到本地

    1.  每当 `token` 更新， 这个 effect 函数都会执行
    1.  如果 `token` 存在，它将被设置为 axios 的请求头并且保存到本地 localStorage 中
    1.  如果 `token` 是 null 或者 undefined ，它将移除对应的 axios 请求头以及本地身份验证相关的 localStorage 的数据

```js
useEffect(() => {
  if (token) {
    axios.defaults.headers.common["Authorization"] = "Bearer " + token;
    localStorage.setItem('token',token);
  } else {
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem('token')
  }
}, [token]);
```

6.  使用 `useMemo` 创建记忆化的上下文

    1.  这个上下文包含 `token` 和 `setToken` 函数
    1.  token 的值会被作为记忆化的依赖项（如果 token 不变，则不会重新渲染）

```js
const contextValue = useMemo(
  () => ({
    token,
    setToken,
  }),
  [token]
);
```

7.  给自组件注入身份验证的上下文

    1.  使用 `AuthContext.Provider` 包裹子组件
    1.  把 contextValue 作为 provider 的值传入

```jsx
return (
  <AuthContext.Provider value={contextValue}>
    {children}
  </AuthContext.Provider>
);
```

8.  导出 useAuth 这个 hook ，以供外部使用到身份验证这个 context

    1.  useAuth 是一个自定义的 hook，它可以让子组件很方便的访问到身份验证信息

```js
export const useAuth = () => {
  return useContext(AuthContext);
};
```

9.  默认导出 AuthProvider

```js
export default AuthProvider;
```

## 完整代码

```jsx
import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {

    const [token, setToken_] = useState(localStorage.getItem("token"));

    const setToken = (newToken) => {
        setToken_(newToken);
    };

    useEffect(() => {
        if (token) {
          axios.defaults.headers.common["Authorization"] = "Bearer " + token;
          localStorage.setItem('token',token);
        } else {
          delete axios.defaults.headers.common["Authorization"];
          localStorage.removeItem('token')
        }
    }, [token]);
    
    const contextValue = useMemo(
        () => ({
          token,
          setToken,
        }),
        [token]
    );

    return (
        <AuthContext.Provider value={contextValue}>
          {children}
        </AuthContext.Provider>
    );

};

export const useAuth = () => {
    return useContext(AuthContext);
};
  
export default AuthProvider;
```

小结，此代码使用 React 的 context API 设置身份验证上下文。 它通过 context 向子组件提供身份验证令牌和 setToken 函数。 它还确保在身份验证令牌更新时可以及时更新 axios 中的默认授权请求头。

# 为 JWT 身份验证创建路由

为了能够更高效的组织路由，我们将创建一个 `src > routes` 目录。在这个目录里，我们将创建一个 `index.jsx` 文件，这个文件用来作为定义整个应用路由的入口。通过在单独的文件夹中构建我们的路由，我们可以保持清晰且易于管理的路由结构。让我们继续创建路由并探索如何将 JWT 身份验证集成到我们的 React 应用程序中。

## 为身份验证路由创建受保护路由组件

为了保护我们身份验证的路由并防止未经授权的访问，我们将创建一个名为 `ProtectedRoute` 的组件。这个组件将包裹我们的身份验证路由，以确保只有被授权的用户才能够访问。通过现实这个组件，我们可以轻松完成身份验证需求并提供良好的用户体验。我们将在 `src > routes` 下创建 `ProtectedRoute.jsx` 文件

1.  首先我们要从 `react-router-dom` 中导入必要的依赖

```
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../provider/authProvider";
```

2.  定义 `ProtectedRoute` 组件，让它包裹我们所有的需要鉴权的路由

```js
export const ProtectedRoute = () => {
    const { token } = useAuth();
  
    // 判断用户是否有权限
    if (!token) {
      // 如果没有授权，则跳转到登录页面
      return <Navigate to="/login" />;
    }
  
    // 如果已经授权，则直接渲染子组件
    return <Outlet />;
 };
```

3.  在 `ProtectedRoute` 组件中，我们通过 AuthContext 提供的自定义 hook （useAuth） 来获取 token 信息
4.  接下来我们检查 token 是否存在。如果用户没有被授权（ token 是 faslse 或者是 null ），我们将把路由导航到登录页面（`/login` ）
5.  如果用户被授权了，我们将使用 Outlet 组件来渲染子路由。Outlet 组件充当占位符，显示父路由中定义的子组件。

小结，`ProtectedRoute` 组件充当了身份验证的路由的守卫。 如果用户未通过身份验证，他们将被重定向到登录页面。 如果用户通过身份验证，则 `ProtectedRoute` 组件中定义的子路由将使用 `Outlet` 组件呈现。

上述代码使我们能够根据用户的身份验证状态轻松保护特定路由并控制访问，从而在我们的 React 应用程序中提供安全的导航体验。

## 深入探索路由

现在我们已经有了 `ProtectedRoute` 组件和身份验证上下文，我们可以继续定义我们的路由。通过区分公共路由、受校验保护路由和非认证用户路由，我们可以有效地处理基于 JWT 认证的导航和访问控制。接下来我们将深入到 `src > routes > index.jsx` 文件并探索如何将 JWT 身份校验集成到我们的路由结构中

1.  导入必要的依赖

    1.  `RouterProvider` 和 `createBrowserRouter` 用于配置和提供路由功能
    1.  `useAuth` 运行我们访问身份校验的上下文
    1.  `ProtectedRoute` 组件包裹着受校验路由

```js
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAuth } from "../provider/authProvider";
import { ProtectedRoute } from "./ProtectedRoute";
```

2.  定义路由组件

    1.  该函数组件充当配置应用程序路由的入口

```js
const Routes = () => {
  const { token } = useAuth();
  // 路由配置写在这里
};
```

3.  使用 useAuth hook 访问身份校验令牌

    1.  调用 useAuth hook 可以从身份校验上下文中获取令牌

```js
const { token } = useAuth();
```

1.  定义面向所有用户的路由（公共路由）

    1.  `routesForPublic` 数组保护所有可被所有用户访问的路由信息。每个路由信息对象包含一个 path 和一个 element
    1.  path 属性明确了路由的 URL 路径，element 属性指向该路由下需要渲染的 jsx 组件/元素

```js
const routesForPublic = [
  {
    path: "/service",
    element: <div>Service Page</div>,
  },
  {
    path: "/about-us",
    element: <div>About Us</div>,
  },
];
```

4.  定义只有授权用户可以访问的路由

    1.  `routesForAuthenticatedOnly` 数组包含只能由经过身份验证的用户访问的路由对象。它包括包装在 ProtectedRoute 组件中的受保护根路由（“/”）和使用 children 属性定义的其他子路由。

```js
const routesForAuthenticatedOnly = [
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <div>User Home Page</div>,
      },
      {
        path: "/profile",
        element: <div>User Profile</div>,
      },
      {
        path: "/logout",
        element: <div>Logout</div>,
      },
    ],
  },
];
```

5.  定义只有没有授权的用户才可以访问的路由

    1.  `routesForNotAuthenticatedOnly` 数组包含没有经过身份验证的用户访问的路由对象。它包含登录路由（`/login` ）

```
const routesForNotAuthenticatedOnly = [
  {
    path: "/",
    element: <div>Home Page</div>,
  },
  {
    path: "/login",
    element: <div>Login</div>,
  },
];
```

6.  基于身份验证状态来组合和判断路由

    1.  createBrowserRouter 函数用于创建路由配置，它接收一个路由数组作为入参
    1.  扩展运算符 (…) 用于将多个路由数组合并到一个数组
    1.  条件表达式 (`!token ? routesForNotAuthenticatedOnly : []`) 检查用户是否已通过身份验证（令牌存在）。 如果不是，则包含 routesForNotAuthenticatedOnly 数组； 否则，它包含一个空数组。

```jsx
const router = createBrowserRouter([
  ...routesForPublic,
  ...(!token ? routesForNotAuthenticatedOnly : []),
  ...routesForAuthenticatedOnly,
]);
```

7.  使用 RouterProvider 注入路由配置

    1.  RouterProvider 组件包装路由配置，使其可用于整个应用程序

```jsx
return <RouterProvider router={router} />;
```

## 完整代码

```jsx
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAuth } from "../provider/authProvider";
import { ProtectedRoute } from "./ProtectedRoute";

const Routes = () => {
  const { token } = useAuth();

  // 公共路由配置
  const routesForPublic = [
    {
      path: "/service",
      element: <div>Service Page</div>,
    },
    {
      path: "/about-us",
      element: <div>About Us</div>,
    },
  ];

  // 授权的用户才可以访问的路由配置
  const routesForAuthenticatedOnly = [
    {
      path: "/",
      element: <ProtectedRoute />, // Wrap the component in ProtectedRoute
      children: [
        {
          path: "/",
          element: <div>User Home Page</div>,
        },
        {
          path: "/profile",
          element: <div>User Profile</div>,
        },
        {
          path: "/logout",
          element: <div>Logout</div>,
        },
      ],
    },
  ];

  // 没有授权的用户才可以访问的路由配置
  const routesForNotAuthenticatedOnly = [
    {
      path: "/",
      element: <div>Home Page</div>,
    },
    {
      path: "/login",
      element: <div>Login</div>,
    },
  ];

  // 合并路由配置
  const router = createBrowserRouter([
    ...routesForPublic,
    ...(!token ? routesForNotAuthenticatedOnly : []),
    ...routesForAuthenticatedOnly,
  ]);

  return <RouterProvider router={router} />;
};

export default Routes;
```

# 最后整合

现在我们已经准备好了 `AuthContext`, `AuthProvider`  和  `Routes` 。让我们把它们整合到 `App.jsx`

1.  导入必要的组件和文件

    1.  `AuthProvider` 是从 `./provider/authProvider` 文件中导入的组件。它为整个应用程序提供了身份验证的上下文
    2.  从 `./routes` 中导入 `Routes` 。它定义了应用路由

```jsx
import AuthProvider from "./provider/authProvider";
import Routes from "./routes";
```

2.  使用 `AuthProvider` 组件包装 `Routes` 组件

    1.  `AuthProvider` 组件用于向应用程序提供身份验证上下文。 它包装了 `Routes` 组件，使身份验证上下文可用于 `Routes` 组件树中的所有组件

```jsx
return (
  <AuthProvider>
    <Routes />
  </AuthProvider>
);
```

## 完整代码

```jsx
import AuthProvider from "./provider/authProvider";
import Routes from "./routes";

function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}

export default App;
```

# 实现登录与登出

在 `src > pages > Login.jsx` 创建 **登录页面**

```jsx
const Login = () => {
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    setToken("this is a test token");
    navigate("/", { replace: true });
  };

  setTimeout(() => {
    handleLogin();
  }, 3 * 1000);

  return <>Login Page</>;
};

export default Login;
```

-   登录组件是一个用于表示登录页面的函数组件
-   使用 useAuth hook 从身份校验上下文中导入 `setToken` 函数
-   从 `react-router-dom` 中导入 navigate 函数用于处理路由跳转
-   在组件内部，有一个 `handleLogin` 函数，它使用上下文中的 setToken 函数设置测试令牌，并导航到主页 (“/”)，并将替换选项（replace）设置为 true
-   setTimeout 函数用于模拟执行 `handleLogin` 函数前的 3 秒延迟
-   组件为登录页返回 JSX，在此处充当一个占位符文本

现在，我们在 `src > pages > Logout.jsx` 创建一个 **登出页面**

```jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../provider/authProvider";

const Logout = () => {
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setToken();
    navigate("/", { replace: true });
  };

  setTimeout(() => {
    handleLogout();
  }, 3 * 1000);

  return <>Logout Page</>;
};

export default Logout;
```

-   在登出页面中，我们调用了 `setToken` 函数并且没有传参，这相当于调用 `setToken(null)`

现在，我们将用更新后的版本替换路由组件中的登录和登出组件

```jsx
const routesForNotAuthenticatedOnly = [
  {
    path: "/",
    element: <div>Home Page</div>,
  },
  {
    path: "/login",
    element: <Login />,
  },
];
```

在 `routesForNotAuthenticatedOnly` 数组中，`“/login”` 的 `element` 属性设置为 `<Login />`，表示当用户访问 `“/login”` 路径时，会渲染 `Login` 组件

```jsx
const routesForAuthenticatedOnly = [
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <div>User Home Page</div>,
      },
      {
        path: "/profile",
        element: <div>User Profile</div>,
      },
      {
        path: "/logout",
        element: <Logout />,
      },
    ],
  },
];
```

在 `routesForAuthenticatedOnly` 数组中，`“/logout”` 的 `element` 属性设置为 `<Logout />`，表示当用户访问 `“/logout”` 路径时，会渲染 `Logout` 组件

## 测试流程

1.  当你第一次访问根页面 `/` 时，会看到 `routesForNotAuthenticatedOnly` 数组中的 “ Home page ”
2.  如果你导航到 `/login`，在延迟 3 秒后，将模拟登录过程。 它将使用身份验证上下文中的 setToken 函数设置测试令牌，然后你将被`react-router-dom` 库中的导航函数重定向到根页面 `/` 。 重定向后，你将从 `routesForAuthenticatedOnly` 数组中看到 “User Home Page”
3.  如果你随后访问 `/logout`，在延迟 3 秒后，将模拟登出过程。 它将通过不带任何参数调用 `setToken` 函数来清除身份验证令牌，然后您将被重定向到根页面 `/` 。 由于你现在已登出，我们将从 `routesForNotAuthenticatedOnly` 数组中看到 “ Home Page ”。

此流程演示了登录和登出过程，其中用户在经过身份验证和未经过身份验证的状态之间转换，并相应地显示相应的路由。

以上就是本篇文章的全部内容，感谢大家对本文的支持～欢迎点赞收藏，在评论区留下你的高见 🌹🌹🌹

# 其他
- 本文为翻译文，原文地址 [在这里](<https://dev.to/sanjayttg/jwt-authentication-in-react-with-react-router-1d03>)
- [代码仓库](https://github.com/zidanDirk/react-jwt-cn)