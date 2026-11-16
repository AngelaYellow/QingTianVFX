import {smooth,clamp} from './score.mjs';

// Shape-level director. Anchor correction changes the PATH, not particle tethers.
// Every anchor is crossed with generally nonzero velocity: no ease-to-zero gate.
export class MotionDirector {
  constructor(anchors,sections,beats){
    this.anchors=anchors;this.sections=sections;this.beats=beats;this.reset();
    this.weights=[.48,.58,.88,1.50,.72,1.02,1.70,1.45,.5];
  }
  reset(){this.previous=undefined;this.phase=0;this.energy=0;this.drive=0;this.lastBeat=-1;this.impulses=[];}
  section(t){let i=this.sections.findIndex(s=>t<s.end);if(i<0)i=this.sections.length-1;let level=this.weights[i];const s=this.sections[i];if(i>0&&t<s.start+2.4)level=this.weights[i-1]+(level-this.weights[i-1])*smooth((t-s.start)/2.4);return {index:i,label:s.label,level};}
  baselinePhase(t){let p=0;for(let i=0;i<this.sections.length;i++){const s=this.sections[i];p+=Math.max(0,Math.min(t,s.end)-s.start)*(.44+this.weights[i]*.64);}return p;}
  atAnchorCorrection(t,omega,offset=0){
    const keys=this.anchors;const raw=x=>Math.sin(omega*x+offset);
    if(t<=keys[0])return raw(t)-raw(keys[0]);if(t>=keys[3])return raw(t)-raw(keys[3]);
    let a=0;while(a<2&&t>=keys[a+1])a++;const u=smooth((t-keys[a])/(keys[a+1]-keys[a]));
    return raw(t)-((1-u)*raw(keys[a])+u*raw(keys[a+1]));
  }
  evaluate(frame,response=1){
    const t=frame.SongTime,s=frame.Signals,section=this.section(t),enabled=frame.AudioEnabled!==false;
    const dt=this.previous===undefined?0:t-this.previous;
    const target=enabled?clamp(.56*s.rms+.31*s.low+.13*s.high):0;
    if(this.enabled!==enabled){this.energy=target;this.drive=target;if(!enabled)this.impulses=[];this.enabled=enabled;}
    const sequential=dt>0&&dt<.25;
    if(!sequential&&dt!==0||this.previous===undefined){
      this.phase=this.baselinePhase(t);this.energy=target;this.drive=target;
      this.impulses=this.beats.filter(b=>b<=t&&t-b<2).map(b=>({t:b,level:target}));
    }
    if(sequential){
      this.energy+=(target-this.energy)*(1-Math.exp(-dt/(target>this.energy?.055:.32)));
      this.drive+=(this.energy-this.drive)*(1-Math.exp(-dt/.18));
      this.phase+=dt*(.22+section.level*(enabled?(.45+this.drive*1.4):.13));
      for(const b of this.beats)if(b>this.previous&&b<=t)this.impulses.push({t:b,level:target});
      this.impulses=this.impulses.filter(b=>t-b.t<2.4);
    }
    this.previous=t;
    let hit=0;if(enabled)for(const b of this.impulses){const age=t-b.t;if(age>=0)hit+=(1-Math.exp(-age/.026))*Math.exp(-age/.43)*(.35+b.level*.9);}
    // A signed crossing, with nonzero slope at the anchor. It never settles.
    let crossing=1;for(const a of this.anchors)crossing*=Math.tanh((t-a)/1.6);
    const strong=enabled?section.level*(.30+this.drive*1.10)*response:.11;
    const q=(w,o=0)=>this.atAnchorCorrection(t,w,o);
    const wave=[
      q(.31,.2)*.32+crossing*Math.sin(this.phase*.72)*strong,
      q(.23,1.7)*.25+crossing*Math.cos(this.phase*.57+1.1)*strong,
      q(.41,2.4)*.18+crossing*Math.sin(this.phase*.86+2.1)*strong,
      crossing*hit*section.level*response
    ];
    const camera=[q(.13,.9)*.10+crossing*Math.sin(this.phase*.22)*strong*.075,q(.17,2.3)*.07,crossing*strong*.18*Math.sin(this.phase*.31)+wave[3]*.10];
    return {section,energy:this.energy,hit,phase:this.phase,wave,camera,crossing,amplitude:strong,enabled};
  }
}

// Shared by the structural surface and subordinate particle layers.
export const shapeFieldGLSL=`
uniform vec4 wave;
uniform vec3 cameraMove;
uniform vec2 lightA,lightB,flower;
uniform vec2 lightScaleA,lightScaleB;
uniform float aspect,phrase,macroGain;
vec2 rotate2(vec2 p,float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c)*p;}
vec3 shapePoint(vec2 uv,float depth){
  vec2 p=uv;
  // Divergence-free large cells: a common river, not random particle jitter.
  vec2 curl1=vec2(sin(uv.y*4.2+.6)*cos(uv.x*3.4),-cos(uv.y*4.2+.6)*sin(uv.x*3.4));
  vec2 curl2=vec2(cos(uv.y*3.0-uv.x*1.5),sin(uv.x*3.7+uv.y*1.1));
  p+=macroGain*(curl1*wave.x*.070+curl2*wave.y*.050+vec2(wave.z*.044,wave.x*.023));
  vec2 da=(uv-lightA)/lightScaleA,db=(uv-lightB)/lightScaleB;
  float wa=exp(-dot(da,da)*1.2),wb=exp(-dot(db,db)*1.2);
  vec2 ra=uv-lightA,rb=uv-lightB;
  p+=macroGain*(wa*(rotate2(ra,wave.y*.46)-ra)+wb*(rotate2(rb,-wave.y*.38)-rb));
  p+=macroGain*(wa*vec2(-wave.z*.040,wave.x*.026)+wb*vec2(wave.z*.046,-wave.x*.022));
  // Fast attack / inertial release moves complete lobes and the central channel.
  vec2 outflow=vec2((uv.x-.5)*.9,(uv.y-.5)*.55);
  p+=macroGain*wave.w*(outflow*.12+vec2(.010,-.035));
  vec2 df=uv-flower;float flowerMask=exp(-dot(df,df)/.006);
  p+=macroGain*flowerMask*(rotate2(df,wave.z*.7)-df+df*(1.0-phrase)*wave.x*.35);
  // Actual perspective projection of the layered field, calibrated at camera 0.
  float z=2.2+depth*1.5;
  vec2 world=(p-.5)*z;
  world-=cameraMove.xy*macroGain*(.8+depth*.25);
  float projectedZ=max(.8,z-cameraMove.z*macroGain);
  return vec3(world/projectedZ+.5,z);
}
`;
