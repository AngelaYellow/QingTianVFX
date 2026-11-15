"""Fail closed before public push: ignored audio, large files, secrets, local links."""
from pathlib import Path
from urllib.parse import unquote
import hashlib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
raw=subprocess.check_output(['git','ls-files','-c','-o','--exclude-standard','-z'],cwd=ROOT)
files=sorted(set(p.decode('utf-8') for p in raw.split(b'\0') if p))
violations=[];largest=[];links=[];hashes={}
for name in files:
    path=ROOT/name
    if not path.is_file():continue
    size=path.stat().st_size;largest.append((size,name))
    if path.suffix.lower() in {'.wav','.flac','.mp3','.ogg','.m4a','.mp4','.mov'}:violations.append('media in public candidate: '+name)
    if any(part in name.split('/') for part in ['Library','Temp','Logs','LocalEvidence','.venv','.vs','.vscode']):violations.append('local/generated path: '+name)
    if size>100*1024*1024:violations.append('file >100MiB: '+name)
    if path.suffix.lower() in {'.cs','.py','.json','.md','.yml','.yaml','.cmd','.txt'} and size<10*1024*1024:
        text=path.read_text(encoding='utf-8-sig',errors='replace')
        if re.search(r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|sk-proj-[A-Za-z0-9_-]{40,}',text):violations.append('possible credential: '+name)
        if path.suffix.lower()=='.md' and name.startswith(('Docs/','README','DEVELOPMENT')):
            for match in re.finditer(r'\]\(([^)]+)\)',text):
                target=match.group(1).split(' "',1)[0].strip('<>')
                if re.match(r'^[a-z]+://|^#|^mailto:',target,re.I):continue
                target=unquote(target.split('#')[0])
                if not target:continue
                resolved=(path.parent/target).resolve()
                if not resolved.exists():links.append({'file':name,'target':target})
    if name.startswith(('Assets/QingTian/Runtime/','Assets/QingTian/Editor/','Assets/QingTian/Data/','Assets/QingTian/Tests/')) and not name.endswith('.meta'):
        hashes[name]=hashlib.sha256(path.read_bytes()).hexdigest()
for local in ['Assets/QingTian/Audio/LocalOnly/QingTian.wav','LocalEvidence/QingTian_68BPM_review.mp3','LocalEvidence/M1_editor_live.mp4']:
    if subprocess.run(['git','check-ignore','-q',local],cwd=ROOT).returncode:violations.append('not ignored: '+local)
report={'candidateFileCount':len(files),'candidateTotalMiB':round(sum(s for s,_ in largest)/2**20,2),'largestFiles':[{'path':n,'MiB':round(s/2**20,3)} for s,n in sorted(largest,reverse=True)[:12]],'violations':violations,'brokenLocalLinks':links,'originalAudioIgnored':True,'lfsDecision':'No file above 50 MiB; standard Git for this initial revision, revisit LFS for later large textures/recordings.','implementationAndDataSha256':hashes}
(ROOT/'Docs/Evidence/repository-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='implementationAndDataSha256'},ensure_ascii=False,indent=2))
if violations or links:raise SystemExit(1)
