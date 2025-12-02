# 论文投稿系统前端

使用 Vite + React + Mantine 构建的论文投稿系统前端，覆盖作者、专家与编辑三种角色的核心业务流程，提供多语言标题录入、文件上传、通知管理、审稿与支付管理等功能。

## 部署教程

### postman（推荐）

1. 构建镜像

```bash
podman build \
  -t paper-sub-system-frontend \
  -f Containerfile \
  --build-arg VITE_API_BASE_URL=<"background url"> \
  .
```

- 注意：`VITE_*` 变量为编译期常量，变更后端地址需重新构建镜像

2. 运行容器

```bash
podman run -d \
  --name paper-sub-system-frontend \
  -p 21743:80 \
  localhost/paper-sub-system-frontend
```

- 打开浏览器访问 `http://localhost:21743`

### 直接构建

```bash
npm install
VITE_API_BASE_URL=<"background url"> npm run dev
```

- `npm run build` 构建生产包
- `npm run preview` 本地预览生产构建
- `npm test` 运行 Vitest + Testing Library 单元测试

> 所有接口均通过 `VITE_API_BASE_URL` 前缀访问，可在 `.env.local` 中配置。

## 目录结构

```
├─ public/                # 静态资源（favicon、占位图等）
├─ src/
│  ├─ App.jsx             # 根组件，注册路由与 Provider
│  ├─ main.jsx            # 应用入口，挂载到 DOM
│  ├─ api/                # Axios 实例与端点映射
│  │   ├─ axios.js
│  │   └─ endpoints.js
│  ├─ components/         # 可复用 UI 与布局
│  │   ├─ ThemeProvider.jsx
│  │   └─ layout/         # AppLayout、TopBar、SideNav 等
│  ├─ features/           # 按业务域封装逻辑（auth、papers...）
│  │   └─ papers/         # 论文表单 schema 与校验
│  ├─ pages/              # 角色维度的页面集合
│  │   ├─ author/         # 作者端仪表盘、投稿、详情
│  │   ├─ editor/         # 编辑端稿件、排期、支付
│  │   ├─ expert/         # 专家端审稿、提现
│  │   ├─ status/         # 403、404 等状态页
│  │   └─ NotificationsPage.jsx 等独立页面
│  ├─ routes/             # 路由配置与访问控制
│  ├─ stores/             # 本地存储封装（如 JWT 持久化）
│  ├─ styles/             # 全局样式表
│  └─ utils/              # 工具方法与状态映射
├─ tests/                 # Vitest + Testing Library 测试
├─ vite.config.js         # Vite 构建配置
└─ vitest.setup.js        # 测试运行时初始化
```
