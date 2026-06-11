# Immich

**Replaces:** Google Photos, iCloud Photos, Amazon Photos

Immich is a self-hosted photo and video backup platform with a mobile app that automatically backs up your camera roll. It includes AI-powered facial recognition, object search ("find photos with cats"), location mapping, and album sharing — all running on your own hardware.

## What you get

- Mobile app (iOS + Android) for automatic photo backup
- Web interface for browsing, searching, and sharing
- AI-powered search: find photos by face, object, scene, or text description
- Facial recognition and automatic person grouping
- Interactive map view of photo locations
- Multi-user with individual libraries
- Hardware-accelerated ML inference (AMD VAAPI supported)

## Services

| Container | Role |
|-----------|------|
| `immich_server` | Main API + Web UI (port 2283) |
| `immich_machine_learning` | Face recognition, CLIP semantic search |
| `immich_postgres` | Database (PostgreSQL) |
| `immich_redis` | Job queue (Valkey) |

## Requirements

- [docker](../docker/) installed
- Storage for photos (at least a few GB free; plan for your full photo library)
- 2 GB RAM minimum for machine learning container
- For AMD GPU acceleration: `/dev/dri` available and user in `render` group

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
