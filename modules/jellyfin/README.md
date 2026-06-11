# Jellyfin

**Replaces:** Netflix, Hulu, Disney+, Plex Pass, Emby

Jellyfin is a free, open-source media server. You store your own movie and TV library on disk, and Jellyfin streams it to any device — browser, phone, TV app, or Chromecast — with no subscription, no account required, and no tracking.

## What you get

- Web UI and media player at `http://localhost:8096`
- Apps for Android, iOS, Apple TV, Fire TV, Roku, Android TV, Kodi
- Automatic metadata and cover art fetching (TMDB, TheTVDB)
- Hardware-accelerated transcoding (AMD VAAPI, Intel QSV, NVIDIA NVENC)
- Multi-user support with individual libraries and parental controls
- Live TV and DVR support (with tuner hardware)

## Requirements

- [docker](../docker/) installed
- Storage with your media files (movies, TV, music, books)
- For hardware transcoding on AMD GPUs: `/dev/dri` device available; user in `render` and `video` groups

## Notes

Jellyfin is completely free including hardware transcoding. Plex requires a paid "Pass" for hardware transcoding and remote access — Jellyfin has neither restriction.

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
