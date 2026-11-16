import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MotionDirector,anchorState,morphWeights} from '../src/motion.mjs';
const data=n=>JSON.parse(fs.readFileSync(new URL(`../data/${n}.json`,import.meta.url)));
const anchors=[56.8,93.61,155.41,264.05],sections=data('form-sections').sections,beats=data('beats68').times;
const director=()=>new MotionDirector(anchors,sections,beats);
const frame=(t,enabled=true,signals={rms:.8,low:.6,high:.5,onset:0})=>({SongTime:t,Signals:signals,AudioEnabled:enabled,parameters:{RainSpeed:.18}});
test('anchors constrain positions without zeroing the musical velocity or events',()=>{
 for(const t of anchors){const s=director().evaluate(frame(t));assert.equal(s.freedom,0);assert.equal(s.anchorDelta,0);assert(s.flow>.18);assert(s.low>0);}
});
test('the anchor crossing has nonzero velocity, with no hold interval',()=>{
 const v=.08,eps=1e-4;
 for(const t of anchors){const position=x=>{const a=anchorState(x,anchors);return v*a.delta*.72*(1-a.freedom)+.17*a.freedom;};
  assert(Math.abs((position(t+eps)-position(t-eps))/(2*eps)-v*.72)<1e-7);
  assert(anchorState(t+.1,anchors).freedom>0);
 }
});
test('geometric morph weights cover the song, are continuous and hit exact presets',()=>{
 anchors.forEach((t,i)=>assert.deepEqual(morphWeights(t,anchors),[0,1,2,3].map(j=>+(i===j))));
 for(let t=0;t<270;t+=.071){const w=morphWeights(t,anchors);assert(Math.abs(w.reduce((a,b)=>a+b)-1)<1e-12);assert(w.every(v=>v>=0&&v<=1));}
 for(const t of anchors){const a=morphWeights(t-1e-4,anchors),b=morphWeights(t+1e-4,anchors);assert(Math.max(...a.map((x,i)=>Math.abs(x-b[i])))<1e-8);}
});
test('chorus transports material faster than verse for the same acoustic input',()=>{
 const v=director(),c=director();let a,b;for(let i=0;i<=120;i++){a=v.evaluate(frame(40+i/60));b=c.evaluate(frame(105+i/60));}
 assert(b.flow>a.flow*1.8);const v0=a.phase,c0=b.phase;a=v.evaluate(frame(42+1/60));b=c.evaluate(frame(107+1/60));assert(b.phase-c0>(a.phase-v0)*1.8);
});
test('audio off removes forces while retaining continuous base flow',()=>{
 const on=director().evaluate(frame(105)),off=director().evaluate(frame(105,false));assert.equal(off.hit,0);assert.equal(off.energy,0);assert.equal(off.low,0);assert.equal(off.flow,.18);assert(on.flow>off.flow*6);
});
test('live onsets generate propagating impulses independently of the stored beat grid',()=>{
 const d=new MotionDirector(anchors,sections,[]);d.evaluate(frame(100));const attack=d.evaluate(frame(100.04,true,{rms:.8,low:.6,high:.5,onset:.9}));assert.equal(attack.events.length,1);assert.equal(attack.events[0][3],1);
 const pulse=d.evaluate(frame(100.10));assert(pulse.hit>0);let release;for(let t=100.15;t<=101.15;t+=.05)release=d.evaluate(frame(t));assert(release.hit<pulse.hit);assert(release.hit>0);
});
test('rain distance integrates speed; changing speed does not teleport its phase',()=>{
 const d=director();let a=d.evaluate(frame(100));const f=frame(100.01);f.parameters.RainSpeed=1;const b=d.evaluate(f);assert(Math.abs((b.rainPhase-a.rainPhase)-.01*(.65+.6*1.4))<1e-9);
});
test('pause does not advance motion and seeking explicitly resets history',()=>{
 const d=director();d.evaluate(frame(100));const a=d.evaluate(frame(100.1)),b=d.evaluate(frame(100.1));assert.equal(a.phase,b.phase);assert.equal(b.dt,0);assert(!b.reset);assert(d.evaluate(frame(30)).reset);
});
test('whole-song input stays finite including silence, phrase boundaries and seeks',()=>{
 const d=director();for(let t=0;t<269.75;t+=1/30){const s=d.evaluate(frame(t,true,{rms:.5+.5*Math.sin(t),low:.3,high:.2,onset:0}));for(const key of ['flow','energy','hit','phase','rainPhase','freedom'])assert(Number.isFinite(s[key]),`${t}: ${key}`);assert(s.flow>0);assert(s.events.length<=6);}
});
