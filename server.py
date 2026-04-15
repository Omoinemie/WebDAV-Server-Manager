#!/usr/bin/env python3
"""WebDAV Config Manager - config.yaml visualization tool"""

import os
import json
import shutil
import re
import secrets
import time
import hashlib
import hmac
import subprocess

from flask import Flask, request, jsonify, send_from_directory, send_file
import yaml

app = Flask(__name__, static_folder="static", static_url_path="")

# ─── Settings ───
SETTINGS_PATH = os.environ.get("SETTINGS_PATH", os.path.join(os.path.dirname(__file__), "settings.json"))

def load_settings():
    default = {
        "language": "en",
        "web_port": 3080,
        "config_path": "/app/webdav/config.yaml",
        "service_name": "webdav",
        "file_root": "/app/webdav/data",
        "secret_key": ""
    }
    if os.path.exists(SETTINGS_PATH):
        try:
            with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
                s = json.load(f)
                default.update(s)
        except Exception:
            pass
    return default

def save_settings(settings):
    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)

settings = load_settings()

CONFIG_PATH = os.environ.get("CONFIG_PATH", settings.get("config_path", "/app/webdav/config.yaml"))
APP_PORT = int(os.environ.get("PORT", settings.get("web_port", 3080)))
SECRET_KEY = os.environ.get("SECRET_KEY", settings.get("secret_key") or secrets.token_hex(32))
app.secret_key = SECRET_KEY

SERVICE_NAME = settings.get("service_name", "webdav")
FILE_ROOT = os.environ.get("FILE_ROOT", settings.get("file_root", "/app/webdav/data"))
LANG = settings.get("language", "en")

# ─── YAML Tools ───
def load_config():
    if not os.path.exists(CONFIG_PATH):
        return None
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_config(config):
    if os.path.exists(CONFIG_PATH):
        shutil.copy2(CONFIG_PATH, CONFIG_PATH + ".bak")
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True,
                  sort_keys=False, width=120)


# ─── File Management ───
SIGN_EXPIRE = 3600


def safe_path(user_path):
    """Prevent path traversal attacks"""
    target = os.path.normpath(os.path.join(FILE_ROOT, user_path.lstrip('/')))
    if not target.startswith(os.path.normpath(FILE_ROOT)):
        return None
    return target


def make_sign(path, expire=None):
    """Generate file download signature"""
    if expire is None:
        expire = int(time.time()) + SIGN_EXPIRE
    msg = f"{path}:{expire}"
    sig = hmac.new(
        SECRET_KEY.encode(), msg.encode(), hashlib.sha256
    ).hexdigest()
    return f"/api/signed-download?path={path}&expire={expire}&sig={sig}"


# ─── Routes: Pages ───
@app.route("/")
def index():
    return send_from_directory(".", "index.html")


# ─── Routes: Settings ───
@app.route("/api/settings", methods=["GET"])
def api_get_settings():
    return jsonify(settings)


@app.route("/api/settings", methods=["POST"])
def api_save_settings():
    global settings, CONFIG_PATH, SERVICE_NAME, FILE_ROOT, LANG
    try:
        data = request.get_json()
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid settings data"}), 400
        settings.update(data)
        save_settings(settings)
        CONFIG_PATH = settings.get("config_path", CONFIG_PATH)
        SERVICE_NAME = settings.get("service_name", SERVICE_NAME)
        FILE_ROOT = settings.get("file_root", FILE_ROOT)
        LANG = settings.get("language", LANG)
        return jsonify({"success": True, "settings": settings})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Routes: Service ───
@app.route("/api/service/status")
def get_service_status():
    try:
        result = subprocess.run(
            ["systemctl", "status", f"{SERVICE_NAME}.service"],
            capture_output=True, text=True, timeout=2
        )

        active_line = ""
        for line in result.stdout.splitlines():
            if "Active:" in line:
                active_line = line
                break

        state = "unknown"
        uptime_desc = ""

        if "active (running)" in active_line:
            state = "active"
            match = re.search(r';\s*([^;]+)$', active_line)
            if match:
                uptime_desc = match.group(1).strip()
        elif "inactive" in active_line:
            state = "inactive"

        return jsonify({
            "state": state,
            "uptime": uptime_desc
        })
    except Exception:
        return jsonify({"state": "error", "uptime": "n/a"}), 200


# ─── Routes: Config ───
@app.route("/api/config")
def api_get_config():
    try:
        if not os.path.exists(CONFIG_PATH):
            return jsonify({"error": "Config file not found", "path": CONFIG_PATH}), 404
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            raw = f.read()
        config = yaml.safe_load(raw)
        return jsonify({"config": config, "path": CONFIG_PATH, "raw": raw})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/config", methods=["POST"])
def api_save_config():
    try:
        config = request.get_json()
        if not config or not isinstance(config, dict):
            return jsonify({"error": "Invalid config data"}), 400
        save_config(config)
        return jsonify({"success": True, "message": "Config saved successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/raw")
def api_get_raw():
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return f.read(), 200, {"Content-Type": "text/plain; charset=utf-8"}
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/raw", methods=["POST"])
def api_save_raw():
    try:
        data = request.get_json()
        content = data.get("content", "")
        yaml.safe_load(content)
        if os.path.exists(CONFIG_PATH):
            shutil.copy2(CONFIG_PATH, CONFIG_PATH + ".bak")
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            f.write(content)
        return jsonify({"success": True})
    except yaml.YAMLError as e:
        return jsonify({"error": f"Invalid YAML: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Routes: Files ───
@app.route("/api/files/sign", methods=["POST"])
def api_sign_files():
    data = request.get_json()
    paths = data.get("paths", [])
    expire = int(time.time()) + SIGN_EXPIRE
    result = {p: make_sign(p, expire) for p in paths}
    return jsonify(result)


@app.route("/api/signed-download")
def api_signed_download():
    path = request.args.get("path", "")
    expire = request.args.get("expire", "")
    sig = request.args.get("sig", "")

    if not path or not expire or not sig:
        return jsonify({"error": "Missing parameters"}), 400

    try:
        if int(expire) < time.time():
            return jsonify({"error": "Link expired"}), 403
    except ValueError:
        return jsonify({"error": "Invalid expire"}), 400

    msg = f"{path}:{expire}"
    expected_sig = hmac.new(
        SECRET_KEY.encode(), msg.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(sig, expected_sig):
        return jsonify({"error": "Invalid signature"}), 403

    target = safe_path(path)
    if not target or not os.path.isfile(target):
        return jsonify({"error": "File not found"}), 404

    filename = os.path.basename(target)
    resp = send_file(target, mimetype="application/octet-stream")
    resp.headers["Content-Disposition"] = 'attachment; filename="{}"'.format(
        filename.replace("\\", "\\\\").replace('"', '\\"')
    )
    return resp


@app.route("/api/files")
def api_list_files():
    try:
        rel_path = request.args.get("path", "/")
        target = safe_path(rel_path)
        if not target:
            return jsonify({"error": "Invalid path"}), 400
        if not os.path.exists(target):
            return jsonify({"error": "Path not found"}), 404
        if not os.path.isdir(target):
            return jsonify({"error": "Not a directory"}), 400

        items = []
        names = os.listdir(target)
        for name in names[:5000]:
            full = os.path.join(target, name)
            try:
                stat = os.stat(full)
                items.append({
                    "name": name,
                    "is_dir": os.path.isdir(full),
                    "size": stat.st_size,
                    "mod_time": int(stat.st_mtime),
                })
            except (OSError, PermissionError):
                pass
        truncated = len(names) > 5000
        return jsonify({"items": items, "path": rel_path, "truncated": truncated})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/download")
def api_download_file():
    try:
        rel_path = request.args.get("path", "")
        target = safe_path(rel_path)
        if not target or not os.path.isfile(target):
            return jsonify({"error": "File not found"}), 404
        return send_file(target, as_attachment=True, download_name=os.path.basename(target))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Routes: Restart ───
@app.route("/api/restart", methods=["POST"])
def api_restart():
    try:
        result = subprocess.run(
            ["systemctl", "restart", SERVICE_NAME],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return jsonify({"success": True, "message": f"{SERVICE_NAME} service restarted"})
        else:
            return jsonify({"success": False, "error": result.stderr.strip() or "Restart failed"}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"success": False, "error": "Restart timed out"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── Main ───
if __name__ == "__main__":
    print(f"WebDAV Config Manager running at http://localhost:{APP_PORT}")
    print(f"Managing config: {CONFIG_PATH}")
    print(f"Service name: {SERVICE_NAME}")
    print(f"File root: {FILE_ROOT}")
    print(f"Language: {LANG}")
    app.run(host="0.0.0.0", port=APP_PORT, debug=False, threaded=True)
