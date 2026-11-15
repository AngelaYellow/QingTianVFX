"""Prepare reproducible data and local-only audio; never writes source material."""
from pathlib import Path
import json,hashlib,shutil,subprocess
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly,windows
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'cross-sensory-live-music/experiments/experiment-v2'
DATA=ROOT/'Assets/QingTian/Data';EVIDENCE=ROOT/'Docs/Evidence';LOCAL=ROOT/'LocalEvidence'
for p in [DATA,EVIDENCE,LOCAL,ROOT/'Assets/QingTian/Audio/LocalOnly']:p.mkdir(parents=True,exist_ok=True)
def save(p,o):p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
t=json.loads((SOURCE/'01_时间骨架/timeline.json').read_text(encoding='utf-8'))
save(DATA/'timeline-source.json',t)
timeline={'duration':269.747,'chapters':t['chapters'],'lyrics':[{'id':v['id'],'start':v['start'],'end':v['end'],'chapter':v['chapter_id'],'shape':v['成形程度'],'imagery':v['意象转述'],'confidence':v['confidence']} for v in t['lyric_units']]}
timeline['chapters'][-1]['end']=timeline['duration']
save(DATA/'timeline.json',timeline)
for i,p in enumerate(sorted((SOURCE/'05_风格帧定稿').glob('C[1-4]_*.png')),1):shutil.copyfile(p,ROOT/f'Assets/QingTian/ReferenceFrames/C{i}.png')
presets=json.loads((SOURCE/'06_Unity还原/风格帧拆解/关键状态提案.json').read_text(encoding='utf-8'))
save(DATA/'style-presets-source.json',presets)
ranges={
'LightCenterA':(0,1),'LightCenterB':(0,1),'LightScaleA':(.04,.60),'LightScaleB':(.04,.60),'LightColorA':(0,1),'LightColorB':(0,1),'LightGainA':(0,3),'LightGainB':(0,3),
'MistTargetCount':(0,64),'MistSize':(.04,.40),'MistOpacity':(0,.35),'FlowSpeed':(.005,.12),'FiberTargetCount':(0,128),'FiberWidth':(.0004,.0025),'FiberBend':(0,1),'NoiseAmp':(0,.03),'NoiseFrequency':(1,16),
'DustTargetCount':(0,8192),'DustSize':(.0004,.0024),'DustGain':(0,3),'BokehTargetCount':(0,64),'BokehSize':(.015,.06),'BokehGain':(0,1),
'FlowerCenter':(0,1),'FlowerRadius':(.02,.12),'FlowerForm':(0,1),'FlowerBreak':(0,1),'FlowerTargetCount':(0,1024),'FlowerSoftness':(0,1),
'RainTargetCount':(0,256),'RainLength':(.005,.04),'RainWidth':(.0003,.0015),'RainAngle':(-180,180),'RainSpeed':(.02,.40),
'GapCenter':(0,1),'GapWidth':(0,.35),'GapNormalAngle':(-180,180),'GapStrength':(0,1),'GapLength':(.05,1.20),'FocusDepth':(0,1),'DepthSpread':(0,1),'SoftFraction':(0,1),'BloomIntensity':(0,1.5),'MasterGain':(0,1)}
def value(v):
    if isinstance(v,str):
        rgb=np.array([int(v[i:i+2],16)/255 for i in [1,3,5]])
        return np.r_[np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4),1].tolist()
    return v if isinstance(v,list) else [v]
parameters=[]
for name,original in presets['C1']['parameters'].items():
    vals=[value(presets[k]['parameters'][name]) for k in ['C1','C2','C3','C4']]
    lo,hi=ranges.get(name,(-.15,1.15))
    dimension=len(vals[0]);kind='Color' if isinstance(original,str) else {1:'Float',2:'Vector2',3:'Vector3'}[dimension]
    minimum=[lo]*dimension;maximum=[hi]*dimension
    if name.startswith(('FlowA','FlowB')) and dimension==3:minimum[2]=0;maximum[2]=1
    parameters.append({'name':name,'kind':kind,'minimum':minimum,'maximum':maximum,'presets':vals})
parameters.append({'name':'MasterGain','kind':'Float','minimum':[0],'maximum':[1],'presets':[[1],[1],[1],[1]]})
layers=[]
for layer in presets['C1']['layer_depths']:
    layers.append({'layer':layer,'LayerDepth':[presets[k]['layer_depths'][layer]['LayerDepth'] for k in presets], 'LayerDepthJitter':[presets[k]['layer_depths'][layer]['LayerDepthJitter'] for k in presets]})
save(DATA/'parameter-contract.json',{'version':'1.2','anchorTimes':[56.8,93.61,155.41,264.05],'colorSpace':'linear float values; source hex is sRGB','parameters':parameters,'layers':layers,'rawSignals':['SongTime','FlowPhase','ChapterBlend','LyricEnvelope','BeatPulse','Rms01','Low01','High01','Onset01']})
audio=ROOT.parent/'周杰伦 - 晴天.flac'; digest=hashlib.sha256(audio.read_bytes()).hexdigest()
assert digest==t['source_sha256'],'Wrong song source'
samples,sr=sf.read(audio,dtype='float32',always_2d=True)
duration=len(samples)/sr
assert abs(duration-t['duration'])<1/sr
pcm=resample_poly(samples,1,2,axis=0) if sr==96000 else resample_poly(samples,48000,sr,axis=0)
sf.write(ROOT/'Assets/QingTian/Audio/LocalOnly/QingTian.wav',pcm,48000,subtype='PCM_16')
mono=resample_poly(samples.mean(axis=1),24000,sr).astype(np.float32);fs=24000;size=1024;hop=480
padded=np.pad(mono,(size//2,size//2));starts=np.arange(0,len(mono),hop);window=windows.blackmanharris(size).astype(np.float32)
freq=np.fft.rfftfreq(size,1/fs);low=(freq>=30)&(freq<250);high=(freq>=2000)&(freq<10000)
raw=[];last=None
for start in starts:
    frame=padded[start:start+size];spectrum=np.abs(np.fft.rfft(frame*window))/size
    flux=0 if last is None else np.maximum(spectrum-last,0).sum()
    raw.append([np.sqrt(np.mean(frame*frame)),np.sqrt(np.sum(spectrum[low]**2)),np.sqrt(np.sum(spectrum[high]**2)),flux]);last=spectrum
raw=np.asarray(raw);norm=np.maximum(np.percentile(raw,97,axis=0),1e-7);normalized=np.clip(raw/norm,0,1)
smooth=np.zeros_like(normalized)
for i,x in enumerate(normalized):
    previous=smooth[i-1] if i else np.zeros(4);tau=np.where(x>previous,.030,.180)
    smooth[i]=previous+(x-previous)*(1-np.exp(-hop/fs/tau))
features={'step':hop/fs,'normalization':norm.tolist(),'frames':[{'t':round(s/fs,5),'rms':round(float(v[0]),6),'low':round(float(v[1]),6),'high':round(float(v[2]),6),'onset':round(float(v[3]),6)} for s,v in zip(starts,smooth)]}
save(DATA/'audio-features.json',features)
b=json.loads((SOURCE.parent/'qingtian-mir-v1/02_MIR/beats_and_onsets.json').read_text(encoding='utf-8'))
save(DATA/'beats136-source.json',{'bpm':b['tempo_bpm'],'times':b['beats_seconds']})
beats=np.asarray(b['beats_seconds']);times=starts/fs
attack=np.maximum(np.diff(raw[:,1],prepend=0),0)
attack/=max(np.percentile(attack,98),1e-9)
accent=.60*np.clip(raw[:,1]/norm[1],0,2)+.25*np.clip(attack,0,2)+.15*np.clip(raw[:,3]/norm[3],0,2)
scores=[]
for beat in beats:
    mask=(times>=beat-.07)&(times<=beat+.10)
    scores.append(float(np.max(accent[mask])) if mask.any() else 0)
scores=np.asarray(scores);valid=(beats>=8)&(beats<=265.54)
phase_reports=[]
for phase in [0,1]:
    mask=(np.arange(len(beats))%2==phase)&valid
    chapter_scores=[]
    for ch in t['chapters']:
        cm=mask&(beats>=ch['start'])&(beats<ch['end']);chapter_scores.append(float(np.mean(scores[cm])))
    phase_reports.append({'phase':phase,'first_beat_seconds':float(beats[phase]),'valid_samples':int(mask.sum()),'mean_accent':float(np.mean(scores[mask])),'median_accent':float(np.median(scores[mask])),'chapter_mean_accent':chapter_scores})
phase=max(phase_reports,key=lambda v:v['mean_accent'])['phase'];selected=beats[phase::2]
save(DATA/'beats68.json',{'bpm':b['tempo_bpm']/2,'sourceBpm':b['tempo_bpm'],'phase':phase,'times':selected.tolist(),'method':'alternate timestamps, phase chosen by mean low-band energy + attack + spectral flux; no downbeat or meter claim'})
report={'source_sha256':digest,'duration_s':duration,'source_sample_rate':sr,'unity_sample_rate':48000,'phase_candidates':phase_reports,'selected_phase':phase,'bpm':b['tempo_bpm']/2,'beat_count':len(selected),'score_definition':'0.60 low-band RMS + 0.25 positive low-band attack + 0.15 positive spectral flux; local maximum [-70,+100]ms; exclude first8s and after265.54s','caveat':'Acoustic preference between two phases, not a verified downbeat annotation. User listening pending.'}
save(EVIDENCE/'beat-phase-analysis.json',report)
mix=pcm.copy();tickt=np.arange(int(.026*48000))/48000;tick=(.18*np.sin(2*np.pi*1800*tickt)*np.hanning(len(tickt))).astype(np.float32)
for beat in selected:
    start=int(round(beat*48000));n=min(len(tick),len(mix)-start)
    if n>0:mix[start:start+n]+=tick[:n,None]
peak=float(np.max(np.abs(mix)))
if peak>.98:mix*=.98/peak
wav=LOCAL/'QingTian_68BPM_review.wav';sf.write(wav,mix,48000,subtype='PCM_16')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','192k',str(LOCAL/'QingTian_68BPM_review.mp3')],check=True)
save(EVIDENCE/'input-manifest.json',{'source_sha256':digest,'duration':duration,'parameter_count':len(parameters),'layer_count':len(layers),'feature_frames':len(raw),'beat_count':len(selected),'references':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'Assets/QingTian/ReferenceFrames').glob('*.png')}})
print(json.dumps(report,ensure_ascii=False))
