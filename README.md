# WebDAV Server Manager for https://github.com/hacdias/webdav

现代化的 WebDAV 服务器 Web 管理工具，支持多语言和自定义配置。
<img width="2523" height="1382" alt="Image" src="https://github.com/user-attachments/assets/04ebafe7-a862-4adf-a5b6-4895470e95b6" />

<img width="2549" height="1403" alt="Image" src="https://github.com/user-attachments/assets/e412a640-bed3-47a9-b57e-b57def30023e" />

<img width="2549" height="1403" alt="Image" src="https://github.com/user-attachments/assets/d709348c-5e1e-44e5-9456-9495063dbcf9" />

<img width="2549" height="1403" alt="Image" src="https://github.com/user-attachments/assets/07e271ae-7358-42ed-9931-2a91344b442c" />

<img width="2549" height="1403" alt="Image" src="https://github.com/user-attachments/assets/e90f55ef-7f91-4a6a-8ef0-806ccb0a1977" />

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
#### 1. 你必须把webdav二进制文件放入config.yaml同一个目录里面，
#### 2. webdav必须以service服务的方式运行，服务名为webdav.service，修改WorkingDirectory为webdav的目录
#### 3. 创建webdav服务
``` bash
nano /etc/systemd/system/webdav.service
```
``` ini
[Unit]
Description=WebDAV Server
After=network.target

[Service]
Type=simple
User=root
ExecStart=/path/to/your/webdav/webdav --config /path/to/your/webdav/config.yaml
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
``` bash
sudo systemctl daemon-reload
sudo systemctl enable webdav
sudo systemctl start webdav
```
