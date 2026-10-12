# X Follower Numbers

在 X (Twitter) 页面上直接显示每个用户的粉丝数量 —— 时间线、关注/粉丝列表、推荐关注、个人主页、悬停卡片，全部可见。

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![No API Key](https://img.shields.io/badge/API%20Key-%E4%B8%8D%E9%9C%80%E8%A6%81-brightgreen)

![效果截图](docs/screenshot.png)

## 为什么做这个

很多人会通过看别人关注了哪些账号来满足信息破圈需求，也会想了解自己信息流里出现的账号粉丝量如何、哪些有影响力的人关注了自己。粉丝数量不决定内容质量，但它是重要的参考指标 —— 而 X 在时间线和列表里并不直接展示它。

## 原理

不需要申请 X API，也不发送任何额外请求。

X 页面自己发出的 GraphQL 请求响应里，用户对象本来就带着粉丝数（`relationship_counts.followers`）。这个插件只是：

1. **拦截**：以 `world: "MAIN"` 在 `document_start` 注入 `injected.js`，monkey-patch `fetch` / `XMLHttpRequest`，从 X 自己的响应 JSON 里递归提取 `{ screen_name, followers }`
2. **展示**：`content.js` 用 `MutationObserver` 扫描页面上的用户名区域（`User-Name` / `UserName` / `UserCell` / `HoverCard`），把粉丝数徽章插到显示名旁边

纯本地运行，零网络开销，零隐私风险。

## 功能

- 📊 时间线推文作者的粉丝数
- 👥 关注 / 粉丝列表中每个用户的粉丝数
- ✨ 侧边栏「推荐关注」的粉丝数
- 🏠 个人主页头部的粉丝数
- 🀄 中文计数格式：`3.5万`、`1.2亿`，不足一万显示精确数字（如 `粉丝 7,806`）
- 🖱 鼠标悬停徽章可查看精确粉丝数

## 安装

1. 克隆或下载本仓库

   ```bash
   git clone git@github.com:leonzone/x-follower-numbers.git
   ```

2. 打开 Chrome，访问 `chrome://extensions`
3. 打开右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择本仓库目录
5. 刷新 x.com 页面即可

## 使用说明

- 只有**页面实际加载到**的用户才会显示粉丝数（数据来自 X 自己的请求，插件不主动请求）
- 滚动加载新内容时徽章会自动出现
- 如果 X 调整了 GraphQL 响应结构导致不显示，请提 issue —— 修起来通常只要改 `injected.js` 里 `collectUsers` 的字段路径

## 项目结构

```
├── manifest.json   # Manifest V3 配置
├── injected.js     # MAIN world：拦截 fetch/XHR，提取用户粉丝数
├── content.js      # 隔离 world：维护粉丝数映射，扫描 DOM 并插入徽章
└── docs/
    └── screenshot.png
```

## License

[MIT](LICENSE)
