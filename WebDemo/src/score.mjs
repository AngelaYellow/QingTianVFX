export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,Number.isFinite(x)?x:0));
export const smooth=x=>{x=clamp(x);return clamp(x*x*x*(x*(x*6-15)+10));};
const mix=(a,b,u)=>a+(b-a)*u;
export class ScoreModel {
  constructor(timeline,contract,beats,features){
    this.timeline=timeline;this.contract=contract;this.beats=beats;this.features=features;
    this.phase=new Float64Array(Math.ceil(timeline.duration/.01)+2);
    for(let i=1;i<this.phase.length;i++)this.phase[i]=this.phase[i-1]+(this.slow('FlowSpeed',(i-1)*.01)+this.slow('FlowSpeed',i*.01))*.005;
  }
  span(t){const k=this.contract.anchorTimes;if(t<=k[0])return[0,0,0];if(t>=k[3])return[3,3,0];let a=0;while(a<2&&t>=k[a+1])a++;return[a,a+1,smooth((t-k[a])/(k[a+1]-k[a]))];}
  slow(name,t){const [a,b,u]=this.span(t),p=this.contract.parameters.find(p=>p.name===name);return mix(p.presets[a][0],p.presets[b][0],u);}
  cached(t){const f=this.features,idx=Math.max(0,t/f.step),i=Math.min(Math.floor(idx),f.frames.length-1),j=Math.min(i+1,f.frames.length-1),u=Math.min(1,idx-i);return Object.fromEntries(['rms','low','high','onset'].map(k=>[k,clamp(mix(f.frames[i][k],f.frames[j][k],u))]));}
  evaluate(seconds,input={},options={}){
    const t=clamp(seconds,0,this.timeline.duration),[a,b,u]=this.span(t),signals=Object.fromEntries(['rms','low','high','onset'].map(k=>[k,clamp(input[k]||0)]));
    const chapter=this.timeline.chapters.findIndex(c=>t<c.end),lyric=this.timeline.lyrics.findIndex(l=>t>=l.start&&t<l.end);
    let envelope=0;for(const l of this.timeline.lyrics){if(t<l.start||t>=l.end)continue;const v=(t-l.start)/(l.end-l.start);envelope=Math.max(envelope,(l.shape==='半成形'?.65:1)*smooth(v/.2)*smooth((1-v)/.35));}
    let beat=0;if(options.beatEnabled!==false)for(const bt of this.beats.times){const d=t-bt;if(d>=-.04&&d<=.18)beat=Math.max(beat,d<0?smooth((d+.04)/.04):smooth(1-d/.18));if(bt>t+.04)break;}
    const distances=this.contract.anchorTimes.map(k=>Math.abs(t-k)),exact=distances.findIndex(d=>d<1e-8),freedom=smooth(Math.min(...distances)/.85);
    const master=smooth(t/1.2)*smooth((this.timeline.duration-t)/(this.timeline.duration-265.54));
    const parameters={},slow={},midDelta={},fastDelta={};
    for(const p of this.contract.parameters){
      const sv=[],mv=[],fv=[],v=[];
      p.minimum.forEach((min,j)=>{
        let base=exact>=0?p.presets[exact][j]:mix(p.presets[a][j],p.presets[b][j],u),mid=0,fast=0;
        if(p.name==='FlowerForm')mid=-base*.65*(1-envelope);
        else if(p.name==='DustTargetCount')mid=base*.08*(envelope-.5);
        else if(p.name==='LightScaleA'||p.name==='LightScaleB')mid=base*.025*(envelope-.5);
        if(p.name.startsWith('LightGain')||p.name==='DustGain'||p.name==='BokehGain')fast=base*(.16*(signals.rms-.5)+.06*beat);
        else if(p.name==='FiberWidth')fast=base*(.08*(signals.low-.5)+.035*beat);
        else if(p.name==='NoiseAmp')fast=base*.25*(signals.high-.5);
        else if(p.name==='RainSpeed')fast=base*.08*(signals.low-.5);
        if(p.name==='MasterGain')base=master;
        mid*=freedom;fast*=freedom;sv.push(base);mv.push(mid);fv.push(fast);v.push(exact>=0?p.presets[exact][j]:clamp(base+mid+fast,min,p.maximum[j]));
      });
      const pack=v=>v.length===1?v[0]:v;parameters[p.name]=pack(v);slow[p.name]=pack(sv);midDelta[p.name]=pack(mv);fastDelta[p.name]=pack(fv);
    }
    const pi=t/.01,ip=Math.min(Math.floor(pi),this.phase.length-2);
    return {SongTime:t,ChapterIndex:chapter<0?3:chapter,LyricIndex:lyric,LyricEnvelope:envelope,BeatPulse:beat,AnchorFreedom:freedom,FlowPhase:mix(this.phase[ip],this.phase[ip+1],pi-ip),Signals:signals,span:[a,b,u],parameters,slow,midDelta,fastDelta,LayerDepth:this.contract.layers.map(l=>mix(l.LayerDepth[a],l.LayerDepth[b],u)),LayerDepthJitter:this.contract.layers.map(l=>mix(l.LayerDepthJitter[a],l.LayerDepthJitter[b],u))};
  }
}
