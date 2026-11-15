# QingTianVFX integration

Source: local pristine Coplay package cache, com.coplaydev.unity-mcp 10.3.0.
Upstream: https://github.com/CoplayDev/unity-mcp

2026-11-16: HttpEndpointUtility uses a QingTianVFX preference key and port 8082.
StartupConfigRewrite requires project-specific explicit opt-in, default false.
These scoped changes avoid rewriting another project/client registration.
No business assets or patched package copied from UnityMusicVisuals.
