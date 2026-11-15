"""Plot the exported C# evaluator output. Never duplicate the runtime score math."""
from pathlib import Path
import gzip,json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'Docs/Evidence'
data=np.genfromtxt(gzip.open(OUT/'parameters-120hz.csv.gz','rt'),delimiter=',',names=True,deletechars='',encoding='utf-8')
timeline=json.loads((ROOT/'Assets/QingTian/Data/timeline.json').read_text(encoding='utf-8'))
contract=json.loads((ROOT/'Assets/QingTian/Data/parameter-contract.json').read_text(encoding='utf-8'))
beats=json.loads((ROOT/'Assets/QingTian/Data/beats68.json').read_text(encoding='utf-8'))['times']
plt.rcParams.update({'font.sans-serif':['Microsoft YaHei','DejaVu Sans'],'axes.unicode_minus':False,'font.size':10,'figure.facecolor':'#f8fafc'})
anchors=contract['anchorTimes']; colors=['#4f82aa','#af6573','#b88b40','#6265b4']
def markers(ax,beat=True):
    for i,c in enumerate(timeline['chapters']):
        ax.axvspan(c['start'],c['end'],color=colors[i],alpha=.055)
        ax.axvline(c['start'],color='#657789',lw=.65,ls='--')
    for i,t in enumerate(anchors): ax.axvline(t,color=colors[i],lw=1.2,ls=':')
    if beat: ax.plot(beats,np.full(len(beats),.015), '|', transform=ax.get_xaxis_transform(),color='#80909f',alpha=.45,ms=4)
    ax.grid(alpha=.17);ax.set_xlim(0,timeline['duration'])
groups=[('LightGainA','光强 · 慢中快与最终'),('FiberWidth','光纤宽度'),('FlowerForm','花形成形'),('DustTargetCount','星尘目标数'),('GapWidth','黑隙宽度'),('MasterGain','整体显隐')]
fig,axes=plt.subplots(8,1,figsize=(18,19),sharex=True)
for ax,(name,title) in zip(axes,groups):
    ax.plot(data['time'],data[name+'.slow'],color='#667987',lw=1,label='慢基准')
    ax.plot(data['time'],data[name+'.final'],color='#147d92',lw=.8,label='最终')
    ax.set_ylabel(name);ax.set_title(title,loc='left',fontsize=11);markers(ax)
    p=next(p for p in contract['parameters'] if p['name']==name)
    ax.scatter(anchors,[p['presets'][i][0] for i in range(4)],color=colors,s=24,zorder=5)
axes[0].legend(loc='upper right',ncol=2)
for i,c in enumerate(timeline['chapters']):
    axes[0].text((c['start']+c['end'])/2,1.10,f"C{i+1}  {c['start']:.3f}–{c['end']:.3f}s",transform=axes[0].get_xaxis_transform(),ha='center',fontsize=10,color=colors[i])
for name,c in [('LyricEnvelope','#bc8931'),('BeatPulse','#5c66ae')]:axes[6].plot(data['time'],data[name],lw=.6,label=name,color=c)
axes[6].legend(loc='upper right');axes[6].set_ylabel('句 / 节拍');markers(axes[6])
for name,c in [('Rms01','#147d92'),('Low01','#9f6587')]:axes[7].plot(data['time'],data[name],lw=.65,label=name,color=c)
axes[7].legend(loc='upper right');axes[7].set_ylabel('缓存音频特征');markers(axes[7]);axes[7].set_xlabel('歌曲时间 / 秒')
fig.suptitle('晴天 M1 · 整曲连续参数曲线\nC# 运行时同一演算器 · 120 Hz + 精确锚点 · 离线特征复核模式',fontsize=18,y=.995)
fig.text(.5,.006,'虚线：章节边界   彩色点线：56.80 / 93.61 / 155.41 / 264.05 s   底部短线：68 BPM 节拍。实时音频输入会产生不同微扰。',ha='center')
fig.tight_layout(rect=[0,.02,1,.975]);fig.savefig(OUT/'整曲参数曲线.png',dpi=150);plt.close(fig)
fig,axes=plt.subplots(4,2,figsize=(16,13))
for i,t in enumerate(anchors):
    for j,name in enumerate(['LightGainA','FlowerForm']):
        ax=axes[i,j];sel=np.abs(data['time']-t)<1.5
        for stage,c in [('slow','#8796a2'),('mid','#bd893b'),('fast','#95649c'),('final','#147d92')]:ax.plot(data['time'][sel],data[name+'.'+stage][sel],label=stage,color=c,lw=1.2)
        ax.axvline(t,color=colors[i],ls=':');p=next(p for p in contract['parameters'] if p['name']==name)
        ax.scatter([t],[p['presets'][i][0]],color=colors[i],zorder=5)
        ax.set_title(f'C{i+1} · {t:.2f}s · {name}');ax.grid(alpha=.2);ax.legend(ncol=4,fontsize=8)
fig.suptitle('锚点附近：中 / 快偏移平滑归零，最终值经过预设',fontsize=18)
fig.tight_layout(rect=[0,0,1,.97]);fig.savefig(OUT/'四锚点局部曲线.png',dpi=150);plt.close(fig)
# All final visual components, normalized by their contractual ranges for readability.
names=[];series=[]
for p in contract['parameters']:
    for j,(lo,hi) in enumerate(zip(p['minimum'],p['maximum'])):
        name=p['name']+('' if len(p['minimum'])==1 else '.'+str(j));names.append(name)
        series.append((data[name+'.final']-lo)/max(hi-lo,1e-8))
fig,ax=plt.subplots(figsize=(18,22));im=ax.imshow(np.array(series),aspect='auto',origin='upper',extent=[0,timeline['duration'],len(names)-.5,-.5],vmin=0,vmax=1,cmap='viridis')
ax.set_yticks(range(len(names)),names,fontsize=8);ax.set_xlabel('歌曲时间 / 秒')
for t in anchors:ax.axvline(t,color='white',lw=.8,ls=':')
for c in timeline['chapters'][1:]:ax.axvline(c['start'],color='orange',lw=.8,ls='--')
fig.colorbar(im,ax=ax,label='合同范围归一化值',fraction=.02);ax.set_title('全部视觉参数标量分量 / 最终值',fontsize=18)
fig.tight_layout();fig.savefig(OUT/'全部参数热图.png',dpi=140);plt.close(fig)
print('Wrote 3 parameter figures from C# export.')
