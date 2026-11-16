import {smooth,clamp} from './score.mjs';

export function anchorState(t,anchors){
  const key=anchors.reduce((a,b)=>Math.abs(t-b)<Math.abs(t-a)?b:a,anchors[0]);
  const delta=t-key;
  return {delta,freedom:1-Math.exp(-delta*delta/(2.8*2.8))};
}
export function morphWeights(t,anchors){
  const w=[0,0,0,0];if(t<=anchors[0]){w[0]=1;return w;}if(t>=anchors[3]){w[3]=1;return w;}
  let i=0;while(i<2&&t>=anchors[i+1])i++;const u=smooth((t-anchors[i])/(anchors[i+1]-anchors[i]));w[i]=1-u;w[i+1]=u;return w;
}
// The CPU sends musical forces; it never iterates over particle positions.
export class MotionDirector {
  constructor(anchors,sections,beats){this.anchors=anchors;this.sections=sections;this.beats=beats;this.weights=[.42,.56,.85,1.35,.64,.95,1.55,1.30,.45];this.reset();}
  reset(){this.previous=undefined;this.phase=0;this.energy=0;this.drive=0;this.audioMix=1;this.events=[];this.lastOnset=-10;this.previousOnset=0;this.rainPhase=0;}
  section(t){let i=this.sections.findIndex(s=>t<s.end);if(i<0)i=this.sections.length-1;const s=this.sections[i];let level=this.weights[i];if(i>0&&t<s.start+2.4)level=this.weights[i-1]+(level-this.weights[i-1])*smooth((t-s.start)/2.4);return {index:i,label:s.label,level};}
  evaluate(frame,response=1){
    const t=frame.SongTime,s=frame.Signals,section=this.section(t),enabled=frame.AudioEnabled!==false;
    const elapsed=this.previous===undefined?0:t-this.previous,reset=this.previous===undefined||elapsed<0||elapsed>.5;
    const dt=reset?0:Math.max(0,elapsed),target=enabled?clamp(.40*s.rms+.45*s.low+.15*s.high):0;
    if(reset){this.phase=t*.5;this.energy=target;this.audioMix=enabled?1:0;this.events=[];this.lastOnset=t-.5;this.rainPhase=t*.18;}
    this.audioMix+=(Number(enabled)-this.audioMix)*(1-Math.exp(-dt/.20));
    this.energy+=(target-this.energy)*(1-Math.exp(-dt/(target>this.energy?.025:.15)));this.drive=this.energy;
    if(enabled){
      for(let i=0;i<this.beats.length;i++){const b=this.beats[i];if(b>t)break;if((reset?b>t-1.8:b>this.previous)&&b<=t){
        this.events.push({t:b,strength:(.10+.70*s.low+.40*s.rms)*(i%4===0?1.2:1)*response,group:i%2,kind:0});
      }}
      if(!reset&&s.onset>.24&&s.onset>this.previousOnset+.025&&t-this.lastOnset>.24){
        this.events.push({t,strength:(.25+s.onset*.95)*response,group:Math.floor(t*1.7)%2,kind:1});this.lastOnset=t;
      }
    }
    this.previousOnset=s.onset;this.events=this.events.filter(e=>t-e.t<2.6).slice(-6);
    let hit=0;for(const e of this.events){const age=t-e.t;hit+=e.strength*(1-Math.exp(-age/.025))*Math.exp(-age/.38);}
    const low=s.low*this.audioMix,high=s.high*this.audioMix,rms=s.rms*this.audioMix;
    const flow=.18+section.level*this.audioMix*(.35+.72*low+.28*rms)*response;
    this.phase+=dt*flow;this.rainPhase+=dt*(frame.parameters?.RainSpeed||.18)*(.65+low*1.4);
    const {delta,freedom}=anchorState(t,this.anchors),morph=morphWeights(t,this.anchors),previousMorph=morphWeights(reset?t:this.previous,this.anchors);this.previous=t;
    return {time:t,dt,reset,section,energy:this.energy,hit:hit*this.audioMix,phase:this.phase,flow,low,high,rms,onset:s.onset*this.audioMix,audioMix:this.audioMix,
      anchorDelta:delta,freedom,morph,previousMorph,crossing:freedom,amplitude:flow,enabled,rainPhase:this.rainPhase,
      events:this.events.map(e=>[t-e.t,e.strength*this.audioMix,e.group,e.kind]),wave:[flow,low,high,hit],camera:[0,0,0]};
  }
}
