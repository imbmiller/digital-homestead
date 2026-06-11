import asyncio
import glob
import json
import os
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import docker
import httpx
import psutil
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, StreamingResponse

load_dotenv()

ADGUARD_USER = os.getenv("ADGUARD_USER", "")
ADGUARD_PASS = os.getenv("ADGUARD_PASS", "")
QBIT_USER = os.getenv("QBIT_USER", "admin")
QBIT_PASS = os.getenv("QBIT_PASS", "")

SERVICES: dict[str, dict] = {
    "jellyfin":                {"label": "Jellyfin",       "url": "http://jellyfin.home",      "group": "Media"},
    "gluetun":                 {"label": "Gluetun",        "url": None,                         "group": "Media"},
    "qbittorrent":             {"label": "qBittorrent",    "url": "http://qbittorrent.home",    "group": "Media"},
    "prowlarr":                {"label": "Prowlarr",       "url": "http://prowlarr.home",       "group": "Media"},
    "sonarr":                  {"label": "Sonarr",         "url": "http://sonarr.home",         "group": "Media"},
    "radarr":                  {"label": "Radarr",         "url": "http://radarr.home",         "group": "Media"},
    "lidarr":                  {"label": "Lidarr",         "url": "http://lidarr.home",         "group": "Media"},
    "readarr":                 {"label": "Readarr",        "url": "http://readarr.home",        "group": "Media"},
    "jellyseerr":              {"label": "Jellyseerr",     "url": "http://jellyseerr.home",     "group": "Media"},
    "immich_server":           {"label": "Immich",         "url": "http://immich.home",         "group": "Immich"},
    "immich_machine_learning": {"label": "Immich ML",      "url": None,                         "group": "Immich"},
    "immich_postgres":         {"label": "Immich DB",      "url": None,                         "group": "Immich"},
    "immich_redis":            {"label": "Immich Redis",   "url": None,                         "group": "Immich"},
    "portainer":               {"label": "Portainer",      "url": "http://portainer.home",      "group": "System"},
    "npm":                     {"label": "Nginx Proxy",    "url": "http://localhost:81",         "group": "System"},
    "adguard":                 {"label": "AdGuard",        "url": "http://adguard.home",        "group": "System"},
    "dashboard":               {"label": "Dashboard",      "url": "http://dashboard.home",      "group": "System"},
}

app = FastAPI()
_INDEX_HTML = Path("templates/index.html").read_text()


# ── Sync collectors ───────────────────────────────────────────────────────────

def get_system_stats() -> dict:
    uptime_secs = time.time() - psutil.boot_time()
    days, rem = divmod(int(uptime_secs), 86400)
    hours, rem = divmod(rem, 3600)
    mins = rem // 60

    cpu_pct = psutil.cpu_percent(interval=0.2)
    mem = psutil.virtual_memory()

    cpu_temp = None
    try:
        sensors = psutil.sensors_temperatures()
        for key in ("coretemp", "k10temp", "acpitz"):
            if sensors.get(key):
                cpu_temp = sensors[key][0].current
                break
    except AttributeError:
        pass

    gpu_temp = None
    for path in glob.glob("/sys/class/drm/card*/device/hwmon/*/temp1_input"):
        try:
            gpu_temp = int(Path(path).read_text().strip()) / 1000
            break
        except Exception:
            pass

    return {
        "hostname": os.uname().nodename,
        "uptime": f"{days}d {hours}h {mins}m",
        "cpu_pct": cpu_pct,
        "ram_used_gb": round(mem.used / 1e9, 1),
        "ram_total_gb": round(mem.total / 1e9, 1),
        "ram_pct": mem.percent,
        "cpu_temp": cpu_temp,
        "gpu_temp": gpu_temp,
    }


def get_storage_stats() -> list:
    mounts = [
        ("/rootfs",      "System (NVMe)"),
        ("/mnt/media",   "Media (2 TB)"),
        ("/mnt/backup",  "Backup (2 TB)"),
    ]
    result = []
    for path, label in mounts:
        try:
            u = psutil.disk_usage(path)
            result.append({
                "path": path,
                "label": label,
                "total_gb": round(u.total / 1e9, 1),
                "used_gb":  round(u.used  / 1e9, 1),
                "free_gb":  round(u.free  / 1e9, 1),
                "pct": u.percent,
            })
        except Exception as e:
            result.append({"path": path, "label": label, "error": str(e)})
    return result


def get_containers() -> list:
    try:
        client = docker.from_env()
        result = []
        for c in client.containers.list(all=True):
            meta = SERVICES.get(c.name, {"label": c.name, "url": None, "group": "Other"})
            result.append({
                "name":   c.name,
                "label":  meta["label"],
                "url":    meta.get("url"),
                "group":  meta.get("group", "Other"),
                "status": c.status,
                "image":  c.image.tags[0] if c.image.tags else c.image.short_id,
            })
        result.sort(key=lambda x: (x["group"], x["name"]))
        return result
    except Exception as e:
        return [{"error": str(e)}]


def get_vpn_status() -> dict:
    try:
        client = docker.from_env()
        container = client.containers.get("gluetun")
        if container.status != "running":
            return {"connected": False, "label": "gluetun stopped"}
        logs = container.logs(tail=80).decode("utf-8", errors="ignore")
        ip_matches = re.findall(r"Public IP address is ([\d.]+)", logs)
        loc_matches = re.findall(r"Public IP address is [\d.]+ \(([^)]+)\)", logs)
        return {
            "connected": True,
            "public_ip": ip_matches[-1] if ip_matches else None,
            "location": loc_matches[-1] if loc_matches else None,
        }
    except docker.errors.NotFound:
        return {"connected": False, "error": "gluetun not found"}
    except Exception as e:
        return {"connected": False, "error": str(e)}


def get_backup_status() -> dict:
    try:
        lines = [l for l in Path("/var/log/media-backup.log").read_text().splitlines() if l.strip()]
        if not lines:
            return {"status": "empty"}
        status = "unknown"
        for line in reversed(lines):
            ll = line.lower()
            if any(w in ll for w in ("complete", "finished", "done", "succeeded")):
                status = "ok"
                break
            if any(w in ll for w in ("error", "failed", "exit code")):
                status = "error"
                break
        return {"status": status, "last_line": lines[-1][:120]}
    except FileNotFoundError:
        return {"status": "no_log"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def get_update_status() -> dict:
    try:
        lines = [l for l in Path("/var/log/unattended-upgrades/unattended-upgrades.log").read_text().splitlines() if l.strip()]
        return {"last_line": lines[-1][:120] if lines else "No entries"}
    except FileNotFoundError:
        return {"last_line": "Log not found"}
    except Exception as e:
        return {"error": str(e)}


# ── Async collectors ──────────────────────────────────────────────────────────

def get_tailscale_status() -> dict:
    try:
        ifaces = Path("/proc/net/dev").read_text()
        connected = "tailscale0" in ifaces
        if not connected:
            return {"connected": False, "ip": "", "peer_count": None}
        r = subprocess.run(
            ["ip", "-4", "addr", "show", "tailscale0"],
            capture_output=True, text=True, timeout=3,
        )
        import re
        m = re.search(r"inet ([\d.]+)/", r.stdout)
        ip = m.group(1) if m else ""
        return {"connected": True, "ip": ip, "peer_count": None}
    except Exception as e:
        return {"connected": False, "error": str(e)}


async def get_adguard_stats() -> dict:
    if not ADGUARD_USER or ADGUARD_USER == "changeme":
        return {"configured": False}
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(
                "http://localhost:3000/control/stats",
                auth=(ADGUARD_USER, ADGUARD_PASS),
            )
        data = r.json()
        total   = data.get("num_dns_queries", 0)
        blocked = data.get("num_blocked_filtering", 0)
        return {
            "configured":   True,
            "total":        total,
            "blocked":      blocked,
            "blocked_pct":  round(blocked / total * 100, 1) if total > 0 else 0,
        }
    except Exception as e:
        return {"configured": True, "error": str(e)}


async def get_qbit_stats() -> dict:
    if not QBIT_PASS or QBIT_PASS == "changeme":
        return {"configured": False}
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            login = await client.post(
                "http://localhost:8080/api/v2/auth/login",
                data={"username": QBIT_USER, "password": QBIT_PASS},
            )
            if login.text.strip() == "Fails.":
                return {"configured": True, "error": "auth failed"}
            info   = (await client.get("http://localhost:8080/api/v2/transfer/info")).json()
            active = (await client.get("http://localhost:8080/api/v2/torrents/info?filter=active")).json()
        return {
            "configured":   True,
            "dl_speed":     info.get("dl_info_speed", 0),
            "ul_speed":     info.get("up_info_speed", 0),
            "active_count": len(active),
        }
    except Exception as e:
        return {"configured": True, "error": str(e)}


# ── Aggregate ─────────────────────────────────────────────────────────────────

async def collect_stats() -> dict:
    loop = asyncio.get_event_loop()

    sync_fns   = [get_system_stats, get_storage_stats, get_containers,
                  get_vpn_status, get_backup_status, get_update_status, get_tailscale_status]
    async_coros = [get_adguard_stats(), get_qbit_stats()]

    results = await asyncio.gather(
        *[loop.run_in_executor(None, fn) for fn in sync_fns],
        *async_coros,
        return_exceptions=True,
    )

    def safe(r):
        return r if not isinstance(r, Exception) else {"error": str(r)}

    system, storage, containers, vpn, backup, updates, tailscale, adguard, qbit = [safe(r) for r in results]

    return {
        "system":     system,
        "storage":    storage,
        "containers": containers,
        "vpn":        vpn,
        "backup":     backup,
        "updates":    updates,
        "tailscale":  tailscale,
        "adguard":    adguard,
        "qbit":       qbit,
        "timestamp":  datetime.now(timezone.utc).isoformat(),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index():
    return _INDEX_HTML


@app.get("/api/stats")
async def api_stats():
    return await collect_stats()


@app.get("/api/containers")
async def api_containers():
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, get_containers)


@app.get("/stream")
async def stream():
    async def generate():
        while True:
            try:
                data = await collect_stats()
                yield f"data: {json.dumps(data)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
