import {clamp} from './score.mjs';
export class AudioEngine {
  constructor(duration){this.duration=duration;this.position=0;this.playing=false;this.generation=0;this.signals={rms:0,low:0,high:0,onset:0};this.raw={...this.signals};this.normalization={rms:.27,low:.055,high:.0025,onset:.12};}
  async load(bytes){
    this.pause();
    this.context??=new AudioContext({latencyHint:'interactive',sampleRate:48000});
    this.analyser??=this.context.createAnalyser();this.analyser.fftSize=2048;this.analyser.smoothingTimeConstant=0;
    this.gain??=this.context.createGain();
    this.analyser.disconnect();this.analyser.connect(this.gain);this.gain.disconnect();this.gain.connect(this.context.destination);
    this.wave=new Float32Array(this.analyser.fftSize);this.spectrum=new Float32Array(this.analyser.frequencyBinCount);
    this.buffer=await this.context.decodeAudioData(bytes);this.position=0;
    if(Math.abs(this.buffer.duration-this.duration)>1)throw Error(`音频时长 ${this.buffer.duration.toFixed(1)} 秒，与时间线 ${this.duration.toFixed(1)} 秒不符。请选择同一版《晴天》。`);
  }
  get time(){return this.playing?clamp(Math.max(this.position,this.position+this.context.currentTime-this.origin),0,this.duration):this.position;}
  async play(){
    if(!this.buffer)throw Error('请先选择本地音频');if(this.playing)return;
    await this.context.resume();if(this.position>=this.duration)this.position=0;
    this.source=this.context.createBufferSource();this.source.buffer=this.buffer;this.source.connect(this.analyser);
    this.origin=this.context.currentTime+.04;this.playing=true;const generation=++this.generation;
    this.source.start(this.origin,this.position,this.duration-this.position);
    this.source.onended=()=>{if(generation===this.generation){this.playing=false;this.position=this.duration;}};
  }
  pause(){if(this.playing)this.position=this.time;this.playing=false;this.generation++;if(this.source){try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}}
  async seek(t,resume=this.playing){this.pause();this.position=clamp(t,0,this.duration);this.previousRms=null;this.signals={rms:0,low:0,high:0,onset:0};if(resume)await this.play();}
  measure(dt){
    if(!this.playing||this.context.currentTime<this.origin)return this.signals;
    this.analyser.getFloatTimeDomainData(this.wave);this.analyser.getFloatFrequencyData(this.spectrum);
    let square=0;for(const v of this.wave)square+=v*v;
    const rms=Math.sqrt(square/this.wave.length),hz=this.context.sampleRate/this.analyser.fftSize;
    const band=(lo,hi)=>{let sum=0,n=0;for(let i=Math.ceil(lo/hz);i<=Math.min(this.spectrum.length-1,Math.floor(hi/hz));i++){sum+=10**(this.spectrum[i]/10);n++;}return Math.sqrt(sum/Math.max(1,n));};
    this.raw={rms,low:band(30,250),high:band(2000,10000),onset:Math.max(0,rms-(this.previousRms??rms))};this.previousRms=rms;
    for(const k of Object.keys(this.signals)){const target=clamp(this.raw[k]/this.normalization[k]),tau=target>this.signals[k]?.03:.18;this.signals[k]+=(target-this.signals[k])*(1-Math.exp(-Math.min(dt,.1)/tau));}
    return this.signals;
  }
}
