# 中日・中英 双语翻译学习工具
# Bilingual Translation Study Tool (ZH↔JP / ZH↔EN)

[中文](#中文说明) | [English](#english)

---

## 中文说明

一款运行在本地的网页翻译学习工具，支持**中日**和**中英**双向互译，在翻译的同时提供词汇卡片和语法要点，帮助系统地学习外语。

### 功能特点

- **双模式**：左上角一键切换中日 / 中英翻译模式
- **双向自动翻译**：输入后 800ms 自动触发，无需手动点击
- **风格切换**：普通（ですます / 自然英语）与商务礼貌（敬語 / 正式英语）两种风格
- **词汇面板**：每次中→外翻译后，自动列出 3~6 个核心词汇，标注读音、词性、释义和用法例句
- **一键保存**：点击任意词汇行，即可保存到本地词汇本
- **词汇本**：持久化存储，支持全文搜索和删除，永久保留
- **流式输出**：翻译结果逐字实时显示
- **夜间模式**：右上角切换，自动记忆偏好
- **后台静默启动**：双击 `启动.vbs` 无窗口启动，浏览器自动打开

### 技术栈

| 模块 | 技术 |
|------|------|
| 后端 | Node.js + Express |
| 数据库 | SQLite（node-sqlite3-wasm，无需编译） |
| AI | Anthropic Claude API（claude-sonnet-4-6） |
| 前端 | 原生 HTML / CSS / JavaScript（单文件） |
| 流式传输 | Server-Sent Events（SSE） |

### 快速开始

**1. 安装依赖**
```bash
npm install
```

**2. 配置 API Key**
```bash
copy .env.example .env
```
编辑 `.env`，填入你的 [Anthropic API Key](https://console.anthropic.com)：
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

**3. 启动**
- Windows：双击 `启动.vbs`（无窗口，浏览器自动打开）
- 命令行：`npm start`，然后访问 http://localhost:3000

### 项目结构

```
├── server.js          # Express 后端 + SSE 流式翻译
├── public/
│   └── index.html     # 单文件前端（HTML + CSS + JS）
├── db/
│   └── vocab.db       # SQLite 词汇本（自动创建，已加入 .gitignore）
├── 启动.vbs           # Windows 静默启动脚本
├── 停止.vbs           # 停止服务脚本
├── .env.example       # 环境变量模板
└── package.json
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/translate` | SSE 流式翻译（支持 zh-ja / ja-zh / zh-en / en-zh） |
| POST | `/api/vocab/save` | 保存词汇（重复自动忽略） |
| GET  | `/api/vocab/list` | 获取词汇本列表 |
| DELETE | `/api/vocab/:id` | 删除词汇 |

---

## English

A locally-hosted web tool for translation and language learning. Supports **Chinese↔Japanese** and **Chinese↔English** bidirectional translation, with vocabulary cards and grammar notes to accelerate language study.

### Features

- **Dual mode**: Switch between ZH↔JP and ZH↔EN in the top-left corner
- **Auto-translate**: Triggers 800ms after you stop typing — no button needed
- **Style toggle**: Casual (ですます / natural English) vs. Business Formal (敬語 / professional English)
- **Vocabulary panel**: After each Chinese→foreign translation, displays 3–6 key words with reading, type, meaning, and example sentences
- **One-click save**: Click any word row to save it to your personal vocab book
- **Vocab book**: Persistent local storage with full-text search and delete
- **Streaming output**: Translation appears character by character in real time
- **Dark mode**: Toggle in the top-right corner, preference remembered across sessions
- **Silent background launch**: Double-click `启动.vbs` — no console window, browser opens automatically

### Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| Database | SQLite (node-sqlite3-wasm — no compilation needed) |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Frontend | Vanilla HTML / CSS / JavaScript (single file) |
| Streaming | Server-Sent Events (SSE) |

### Quick Start

**1. Install dependencies**
```bash
npm install
```

**2. Set up API Key**
```bash
copy .env.example .env   # Windows
cp .env.example .env     # macOS/Linux
```
Edit `.env` and add your [Anthropic API Key](https://console.anthropic.com):
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

**3. Run**
- Windows: Double-click `启动.vbs` (silent, browser opens automatically)
- CLI: `npm start`, then open http://localhost:3000

### Project Structure

```
├── server.js          # Express backend + SSE streaming
├── public/
│   └── index.html     # Single-file frontend (HTML + CSS + JS)
├── db/
│   └── vocab.db       # SQLite vocab book (auto-created, git-ignored)
├── 启动.vbs           # Windows silent launcher
├── 停止.vbs           # Server stop script
├── .env.example       # Environment variable template
└── package.json
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/translate` | SSE streaming translation (zh-ja / ja-zh / zh-en / en-zh) |
| POST | `/api/vocab/save` | Save a word (duplicates silently ignored) |
| GET  | `/api/vocab/list` | List all saved words |
| DELETE | `/api/vocab/:id` | Delete a word |

### License

MIT
