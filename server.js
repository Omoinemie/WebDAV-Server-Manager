const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();

// 允许通过环境变量或命令行参数设置端口和配置路径
const PORT = process.env.PORT || 3001;
const CONFIG_PATH = process.env.CONFIG_PATH || process.argv[2] || path.join(__dirname, 'config.yaml');

console.log('Server starting with configuration:');
console.log('  Port:', PORT);
console.log('  Config path:', CONFIG_PATH);
console.log('  Current working directory:', process.cwd());
console.log('  Config file exists:', fs.existsSync(CONFIG_PATH));

// 启用 CORS
app.use(cors());

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 确保目录存在，如果不存在则创建
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Directory created: ${dirPath}`);
      return true;
    }
    return true;
  } catch (error) {
    console.error(`Failed to create directory: ${dirPath}`, error);
    return false;
  }
}

// 读取配置文件
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.error('Config file does not exist:', CONFIG_PATH);
      const defaultConfig = getDefaultConfig();
      if (writeConfig(defaultConfig)) {
        console.log('Default config file created successfully');
        return defaultConfig;
      } else {
        console.error('Failed to create default config file');
        return null;
      }
    }

    const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = yaml.load(fileContents);
    return config;
  } catch (e) {
    console.error('Error reading config file:', e);
    return null;
  }
}

// 获取默认配置
function getDefaultConfig() {
  return {
    address: '0.0.0.0',
    port: 80,
    tls: false,
    cert: '.cert',
    key: '.key',
    prefix: '/',
    debug: true,
    noSniff: false,
    behindProxy: false,
    directory: '.',
    permissions: 'R',
    rules: [],
    rulesBehavior: 'overwrite',
    log: {
      format: 'console',
      colors: true,
      outputs: ['stderr']
    },
    cors: {
      enabled: false,
      credentials: true,
      allowed_headers: ['Depth'],
      allowed_hosts: ['http://localhost:8080'],
      allowed_methods: ['GET'],
      exposed_headers: ['Content-Length', 'Content-Range']
    },
    users: [
      {
        username: 'admin',
        password: 'admin',
        permissions: 'CRUD',
        directory: '/'
      }
    ]
  };
}

// 写入配置文件
function writeConfig(config) {
  try {
    const yamlStr = yaml.dump(config);
    fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');
    console.log('Config file written successfully');
    return true;
  } catch (e) {
    console.error('Error writing config file:', e);
    return false;
  }
}

// 生成随机密码
function generateRandomPassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// 重启 WebDAV 服务器
function restartWebDAV(callback) {
  console.log('Executing restart command: systemctl restart webdav');
  
  exec('systemctl restart webdav', (error, stdout, stderr) => {
    if (error) {
      console.error(`Restart error: ${error}`);
      callback(false, error.message);
      return;
    }
    console.log('Restart command output:', stdout);
    if (stderr) {
      console.error('Restart command stderr:', stderr);
    }
    callback(true, 'WebDAV server restarted successfully');
  });
}

// API 路由

// 获取当前配置
app.get('/api/config', (req, res) => {
  const config = readConfig();
  if (config) {
    res.json({ success: true, config });
  } else {
    res.status(500).json({ 
      success: false, 
      error: 'Unable to read configuration file'
    });
  }
});

// 更新服务器配置
app.post('/api/config/server', (req, res) => {
  const config = readConfig();
  if (!config) {
    return res.status(500).json({ success: false, error: 'Unable to read configuration file' });
  }

  const { serverConfig } = req.body;
  Object.assign(config, serverConfig);

  if (writeConfig(config)) {
    res.json({ success: true, message: 'Server configuration updated' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to update configuration' });
  }
});

// 获取用户列表
app.get('/api/users', (req, res) => {
  const config = readConfig();
  if (config && config.users) {
    res.json({ success: true, users: config.users });
  } else {
    res.json({ success: true, users: [] });
  }
});

// 添加或更新用户
app.post('/api/users', (req, res) => {
  const config = readConfig();
  if (!config) {
    return res.status(500).json({ success: false, error: 'Unable to read configuration file' });
  }

  const { user, isEdit } = req.body;
  
  if (!config.users) {
    config.users = [];
  }

  // 确保用户目录存在
  if (user.directory && !ensureDirectoryExists(user.directory)) {
    return res.status(500).json({ success: false, error: `Unable to create user directory: ${user.directory}` });
  }

  if (isEdit) {
    const index = config.users.findIndex(u => u.username === user.username);
    if (index !== -1) {
      config.users[index] = user;
    } else {
      config.users.push(user);
    }
  } else {
    const existingUser = config.users.find(u => u.username === user.username);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    config.users.push(user);
  }

  if (writeConfig(config)) {
    res.json({ success: true, message: `User ${isEdit ? 'updated' : 'added'} successfully` });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save user' });
  }
});

// 删除用户
app.delete('/api/users/:username', (req, res) => {
  const config = readConfig();
  if (!config || !config.users) {
    return res.status(500).json({ success: false, error: 'Unable to read configuration file' });
  }

  const { username } = req.params;
  config.users = config.users.filter(u => u.username !== username);

  if (writeConfig(config)) {
    res.json({ success: true, message: 'User deleted successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// 生成随机密码
app.get('/api/generate-password', (req, res) => {
  const password = generateRandomPassword();
  res.json({ success: true, password });
});

// 重启服务器
app.post('/api/restart', (req, res) => {
  restartWebDAV((success, message) => {
    if (success) {
      res.json({ success: true, message });
    } else {
      res.status(500).json({ success: false, error: message });
    }
  });
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  const configExists = fs.existsSync(CONFIG_PATH);
  res.json({
    status: 'ok',
    config: {
      exists: configExists,
      path: CONFIG_PATH
    }
  });
});

// 根路径重定向到前端
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`WebDAV Management Tool backend running at http://0.0.0.0:${PORT}`);
  console.log(`Configuration file: ${CONFIG_PATH}`);
  
  const config = readConfig();
  if (config) {
    console.log('Configuration file loaded successfully');
  } else {
    console.log('Failed to load configuration file, using default config');
  }
});

// 导出 app 用于测试
module.exports = app;