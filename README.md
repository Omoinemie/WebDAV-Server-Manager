# WebDAV Server Manager
<img width="2144" height="1247" alt="image" src="https://github.com/user-attachments/assets/4c6f82ac-0269-44be-9c2d-d890f2bbb286" />
<img width="2144" height="1247" alt="image" src="https://github.com/user-attachments/assets/0fcd516c-2714-4d38-b50a-9f314a0e23e5" />
<img width="2144" height="1247" alt="image" src="https://github.com/user-attachments/assets/464c259f-38d6-496a-b798-5a59a5c5f0e2" />
<img width="2144" height="1247" alt="image" src="https://github.com/user-attachments/assets/def78617-43e9-48d8-a286-90d378940ead" />
<img width="2144" height="1247" alt="image" src="https://github.com/user-attachments/assets/fd02b91e-08fd-46a8-8720-0fd52ac2d492" />


基于 Web 的 WebDAV 服务配置管理工具，提供可视化界面管理 `config.yaml`，支持用户管理、文件浏览、实时服务监控等功能。

A web-based config manager for WebDAV servers — visualize and edit `config.yaml` through a clean dashboard.

## 功能特性

### 服务器配置
- 监听地址 / 端口 / 路径前缀 / 根目录设置
- 调试模式、MIME 嗅探禁用、代理模式、无密码模式开关
- 默认权限管理（CRUD）与规则继承模式

### TLS / SSL
- 一键启用 TLS，配置证书与私钥路径

### CORS 跨域
- 启用/禁用 CORS，配置允许域名、请求头、方法、暴露头
- 支持凭证模式

### 日志配置
- 日志格式选择（Console / JSON）
- 彩色输出开关与输出目标管理

### 全局规则
- 路径匹配与正则匹配两种模式
- 按规则设置 CRUD 权限，支持多条规则

### 用户管理
- 增删改查用户，支持 bcrypt / 环境变量密码
- 每用户独立目录与权限配置
- 每用户独立规则
- 内置密码生成器（`crypto.getRandomValues`，客户端生成）

### 文件管理
- 浏览服务器文件目录，面包屑导航
- 文件预览：图片、视频、音频、PDF、代码、文本
- HMAC 签名下载链接（有效期 1 小时）

### 原始 YAML 编辑
- 直接编辑 `config.yaml` 源码，保存时自动验证语法

### 其他
- 深色 / 浅色主题切换
- 中文 / English 双语支持（纯前端 i18n，无额外 API 开销）
- 服务状态实时监控（10 秒轮询）
- 一键重启 WebDAV 服务

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Python 3 + Flask |
| 前端 | 原生 JS（无框架依赖） |
| 配置 | YAML（PyYAML） |
| 国际化 | 静态 JSON 文件，前端直接加载 |

## 快速开始

### 安装依赖

```bash
apt install python3-flask python3-yaml
```

### 运行

```bash
python3 server.py
```

默认访问 `http://localhost:3080`

### 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `PORT` | Web 管理界面端口 | `3080` |
| `CONFIG_PATH` | WebDAV 配置文件路径 | `/app/webdav/config.yaml` |
| `FILE_ROOT` | 文件管理根目录 | `/app/webdav/data` |
| `SECRET_KEY` | 签名密钥（留空自动生成） | 自动生成 |
| `SETTINGS_PATH` | settings.json 路径 | 同目录下 `settings.json` |

### 配置文件

首次运行会读取 `settings.json`：

```json
{
  "language": "en",
  "web_port": 3080,
  "config_path": "/app/webdav/config.yaml",
  "service_name": "webdav",
  "file_root": "/app/webdav/data",
  "secret_key": ""
}
```

## 项目结构

```
├── server.py              # Flask 后端
├── index.html             # 单页应用入口
├── settings.json           # 应用设置
├── static/
│   ├── css/
│   │   └── style.css       # 样式（深色/浅色主题）
│   ├── js/
│   │   ├── app.js          # 主逻辑（配置 CRUD、用户/规则管理）
│   │   ├── utils.js        # 工具函数（DOM 操作、密码生成、配置验证）
│   │   ├── i18n.js         # 国际化模块
│   │   ├── file-manager.js # 文件浏览器
│   │   └── file-preview.js # 文件预览
│   └── lang/
│       ├── en.json         # English
│       └── zh-CN.json      # 简体中文
```

## API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/config` | 获取配置 |
| `POST` | `/api/config` | 保存配置 |
| `GET` | `/api/raw` | 获取 YAML 原文 |
| `POST` | `/api/raw` | 保存 YAML 原文（自动校验语法） |
| `GET` | `/api/settings` | 获取应用设置 |
| `POST` | `/api/settings` | 保存应用设置 |
| `GET` | `/api/service/status` | 查询服务状态 |
| `POST` | `/api/restart` | 重启服务 |
| `GET` | `/api/files` | 列出目录文件 |
| `GET` | `/api/files/download` | 下载文件 |
| `POST` | `/api/files/sign` | 生成签名下载链接 |

## License

MIT
