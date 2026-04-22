# Discount App — Shopify 会员折扣应用

基于 Shopify Functions 的会员满额立减折扣应用。仅对带有指定标签（默认 `member`）的客户生效，根据购物车小计金额自动匹配折扣档位并按比例分摊到各行项。折扣规则和客户标签均可通过后台 UI 动态配置，无需重新部署。

## 项目结构

```
discount-app/
├── shopify.app.toml                    # 应用主配置（权限、metafield 定义）
├── package.json
├── extensions/
│   ├── discount-function/              # Shopify Function — 折扣计算逻辑
│   │   ├── shopify.extension.toml      # 扩展配置（target、input variables、UI 关联）
│   │   ├── schema.graphql              # Shopify Functions GraphQL Schema
│   │   ├── src/
│   │   │   ├── index.js                # 核心折扣逻辑
│   │   │   └── cart_lines_discounts_generate_run.graphql  # 输入查询
│   │   └── tests/
│   │       └── fixtures/               # 测试数据（JSON）
│   ├── discount-ui/                    # Admin UI Extension — 折扣配置界面
│   │   ├── shopify.extension.toml      # UI 扩展配置
│   │   ├── package.json                # 依赖（preact、@shopify/ui-extensions）
│   │   ├── src/
│   │   │   └── DiscountFunctionSettings.jsx  # 配置表单组件
│   │   └── locales/
│   │       └── en.default.json
│   └── discount-theme-app/             # 主题扩展 — 前端折扣横幅（可选）
│       ├── snippets/discount-banner.liquid
│       ├── assets/
│       └── locales/
```

## 架构说明

本应用由三个 Shopify Extension 协作：

1. **discount-function** — Shopify Function，运行在 Shopify 后端，接收购物车数据并返回折扣操作。编译为 WebAssembly (WASM) 执行。
2. **discount-ui** — Admin UI Extension，渲染在 Shopify 后台折扣详情页中，提供可视化配置界面（客户标签、折扣档位）。配置通过 metafield 存储。
3. **discount-theme-app** — 主题扩展（可选），在店铺前端展示折扣横幅。

**数据流：**
- 商家通过 **discount-ui** 配置折扣规则 → 保存为 discount 资源上的 `$app:function-configuration` metafield
- 客户下单时，Shopify 调用 **discount-function** → 读取 metafield 配置 + 购物车数据 → 返回折扣操作

## 折扣规则

默认档位（可通过后台 UI 自定义）：

| 档位 | 消费门槛 | 折扣金额 | 提示信息 |
|------|---------|---------|---------|
| 1 | R12,999 | R300 | Spend R12,999, Get R300 OFF |
| 2 | R22,999 | R800 | Spend R22,999, Get R800 OFF |
| 3 | R42,999 | R2,000 | Spend R42,999, Get R2,000 OFF |

**匹配逻辑：** 匹配客户能达到的最高档位，折扣按各行项金额占比分摊，最后一行承担舍入余额。

**不触发折扣的情况：**
- 客户不带指定标签（默认 `member`）
- 购物车小计低于最低档位门槛
- 购物车无商品行

## 前置条件

- [Node.js](https://nodejs.org/) >= 18
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [Shopify Partner 账号](https://partners.shopify.com/) 及开发商店

## 开发流程

### 1. 安装依赖

```bash
npm install
cd extensions/discount-ui && npm install
```

### 2. 部署应用（首次必须）

首次运行或修改了 `shopify.app.toml`、`shopify.extension.toml` 后，需要先部署以注册 metafield 定义和扩展配置：

```bash
shopify app deploy
```

### 3. 本地开发

```bash
shopify app dev
```

启动本地开发服务器，自动连接开发商店。修改代码后会自动重新构建 Function 和 UI Extension。

### 4. 后台创建折扣

1. 登录 Shopify Admin → **Discounts**（折扣）
2. 点击 **Create discount**
3. 在 **Select discount type** 对话框底部 **Apps** 区域，选择 **discount-function**
4. 选择 **Automatic discount**（自动折扣）
5. 填写折扣标题（如 "会员满额立减"）
6. 在 **Discount Function Settings** 面板中配置：
   - **Customer Tag** — 触发折扣的客户标签（默认 `member`）
   - **Discount Tiers** — 添加/编辑/删除折扣档位（门槛、金额、提示信息）
7. 点击 **Save** 保存

> **注意：** 客户必须在 Shopify Admin → **Customers** 页面中打上对应标签，折扣才会对该客户生效。

### 5. 正式部署

```bash
shopify app deploy
```

将应用及所有扩展部署到 Shopify 生产环境。

## 配置说明

折扣规则存储在 discount 资源的 `$app:function-configuration` metafield 中，JSON 格式：

```json
{
  "tags": ["member"],
  "tiers": [
    { "threshold": 12999, "discount": 300, "message": "Spend R12,999, Get R300 OFF" },
    { "threshold": 22999, "discount": 800, "message": "Spend R22,999, Get R800 OFF" },
    { "threshold": 42999, "discount": 2000, "message": "Spend R42,999, Get R2,000 OFF" }
  ]
}
```

- `tags` — 客户标签列表，通过 GraphQL input query variable 动态注入 `hasAnyTag` 查询
- `tiers` — 折扣档位数组，在 Function 运行时读取；如 metafield 未配置则使用代码中的默认值
