# WebDAV Server Manager for https://github.com/hacdias/webdav

现代化的 WebDAV 服务器 Web 管理工具，支持多语言和自定义配置。

## 安装部署

### 环境要求
- Node.js 16+
- systemd (用于服务管理)

### 1. 下载项目
```bash
git clone https://github.com/Omoinemie/WebDAV-Server-Manager.git
cd webdav-manager
```
### 2. 安装依赖
```bash
npm install express js-yaml cors
```
### 3. 启动服务
```bash
#### 方式1: 使用默认配置
node server.js

#### 方式2: 自定义配置文件路径
node server.js /path/to/your/webdav/config.yaml

#### 方式3: 使用环境变量
CONFIG_PATH=/path/to/your/webdav/config.yaml PORT=3001 node server.js
```
### 4. 说明
#### 1. 你必须把webdav二进制文件放入/path/to/your/webdav/config.yaml同一个目录里面，
#### 2. webdav必须以service服务的方式运行，服务名为webdav.service，修改WorkingDirectory到你的目录
#### 3. 创建webdav服务
``` bash
nano /etc/systemd/system/webdav.service
```
``` ini
[Unit] 
Description=webdav server 
Wants=network-online.target
After=network-online.target 
 
[Service] 
Type=simple 
WorkingDirectory=/path/to/your/webdav
ExecStart=webdav -c config.yaml
ExecReload=webdav -c config.yaml
RestartSec=5s
Restart=on-failure
 
[Install] 
WantedBy=multi-user.target
```
``` bash
sudo systemctl daemon-reload
sudo systemctl enable webdav
sudo systemctl start webdav
```
