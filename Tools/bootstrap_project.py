"""Create this independent project from the editor's official URP template."""
from pathlib import Path
import json, shutil, tarfile
ROOT=Path(__file__).resolve().parents[1]
TEMPLATE=Path(r'D:\Works\Unity\Editors\6000.3.28f1\Editor\Data\Resources\PackageManager\ProjectTemplates\com.unity.template.3d-cross-platform-17.0.14.tgz')
with tarfile.open(TEMPLATE) as tf:
    prefix='package/ProjectData~/'
    for member in tf.getmembers():
        if not member.isfile() or not member.name.startswith(prefix): continue
        rel=member.name[len(prefix):]
        if rel.split('/')[0] not in ['Assets','ProjectSettings']: continue
        target=(ROOT/rel).resolve()
        if not target.is_relative_to(ROOT): raise ValueError(rel)
        if target.exists(): continue
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(tf.extractfile(member).read())
for folder in ['Runtime','Editor','Tests/EditMode','Tests/PlayMode','Scenes','Data','Settings','ReferenceFrames','Audio/LocalOnly']:
    (ROOT/'Assets/QingTian'/folder).mkdir(parents=True,exist_ok=True)
for folder in ['Docs/Evidence/Raw','LocalEvidence','Logs','Packages']:(ROOT/folder).mkdir(parents=True,exist_ok=True)
deps={
 'com.unity.render-pipelines.universal':'17.3.0','com.unity.visualeffectgraph':'17.3.0',
 'com.unity.test-framework':'1.6.0','com.unity.ugui':'2.0.0','com.unity.inputsystem':'1.20.1',
 'com.unity.nuget.newtonsoft-json':'3.2.2','com.unity.ide.visualstudio':'2.0.26',
 'com.unity.modules.audio':'1.0.0','com.unity.modules.imgui':'1.0.0','com.unity.modules.jsonserialize':'1.0.0',
 'com.unity.modules.uielements':'1.0.0','com.unity.modules.ui':'1.0.0'}
(ROOT/'Packages/manifest.json').write_text(json.dumps({'dependencies':deps},indent=2)+'\n',encoding='utf-8')
(ROOT/'ProjectSettings/ProjectVersion.txt').write_text('m_EditorVersion: 6000.3.28f1\nm_EditorVersionWithRevision: 6000.3.28f1 (8f082d2fe476)\n')
src=ROOT.parent/'.unity-tools/packages/com.coplaydev.unity-mcp-10.3.0'
dst=ROOT/'Packages/com.coplaydev.unity-mcp'
if not dst.exists():shutil.copytree(src,dst)
# Project-scoped endpoint and opt-in registration prevent touching other projects' clients.
p=dst/'Editor/Helpers/HttpEndpointUtility.cs';s=p.read_text(encoding='utf-8-sig')
s=s.replace('private const string LocalPrefKey = EditorPrefKeys.HttpBaseUrl;', 'private const string LocalPrefKey = "MCPForUnity.QingTianVFX.HttpUrl";')
s=s.replace('private const string DefaultLocalBaseUrl = "http://localhost:8080";', 'private const string DefaultLocalBaseUrl = "http://127.0.0.1:8082";')
s=s.replace('private const string DefaultLocalBaseUrl = "http://127.0.0.1:8080";', 'private const string DefaultLocalBaseUrl = "http://127.0.0.1:8082";')
p.write_text(s,encoding='utf-8')
p=dst/'Editor/Services/StartupConfigRewrite.cs';s=p.read_text(encoding='utf-8-sig')
needle='SessionState.SetBool(SESSION_GUARD_KEY, true);'
s=s.replace(needle,needle+'\n            if (!EditorPrefs.GetBool("MCPForUnity.QingTianVFX.AutoRegisterEnabled", false)) return;',1)
p.write_text(s,encoding='utf-8')
(dst/'LOCAL-CHANGES.md').write_text('''# QingTianVFX integration

Source: local pristine Coplay package cache, com.coplaydev.unity-mcp 10.3.0.
Upstream: https://github.com/CoplayDev/unity-mcp

2026-11-16: HttpEndpointUtility uses a QingTianVFX preference key and port 8082.
StartupConfigRewrite requires project-specific explicit opt-in, default false.
These scoped changes avoid rewriting another project/client registration.
No business assets or patched package copied from UnityMusicVisuals.
''',encoding='utf-8')
print('Official URP template and scoped MCP package prepared.')
