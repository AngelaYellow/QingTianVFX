import {MotionDirector} from './motion.mjs';
import {fieldGLSL,correspondenceGLSL,transportGLSL} from './flow-field.mjs';

const header=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;
const screenVertex=header+`out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0,1);}`;
const gamma=`vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0)),vec3(1.0/2.4))-.055,step(vec3(.0031308),c));}`;
const simulationFragment=header+`
uniform sampler2D positions,velocities;
uniform vec2 resolution;
uniform int initialize;
layout(location=0) out vec4 nextPosition;
layout(location=1) out vec4 nextVelocity;
${transportGLSL}
${fieldGLSL}
void main(){
 ivec2 cell=ivec2(gl_FragCoord.xy);float slot=float(cell.y*int(resolution.x)+cell.x);
 uint id=uint(floor((slot+.5)*(referenceSize.x*referenceSize.y)/(resolution.x*resolution.y)));float identity=(float(id)+.5)/(referenceSize.x*referenceSize.y);
 vec2 seedUV=(vec2(mod(float(id),referenceSize.x),floor(float(id)/referenceSize.x))+.5)/referenceSize;vec2 source=targetPoint(seedUV,morph),oldSource=targetPoint(seedUV,previousMorph);
 float group=step(.513,identity);
 // Neighbouring samples are neighbouring material, rather than independent
 // confetti. Smooth age/depth fields preserve the sampled silk and fog texture.
 float mist=1.-step(.82,hash(id+317u));
 float seed=.5+.5*sin(source.x*4.7+source.y*3.1+group*2.4),life=mix(4.2+seed*1.4,3.2+hash(id+49u)*2.,mist);
 vec4 old=texelFetch(positions,cell,0),previous=texelFetch(velocities,cell,0);
 float depth=.5+.4*sin(source.x*3.7-source.y*4.2+group*2.1),age=old.z+dt;vec2 p=old.xy+(source-oldSource),v=previous.xy;
 if(initialize==1){age=mix(fract(source.x*.68+source.y*.33+group*.37),hash(id+17u),mist)*life;vec3 field=velocityField(source,source,depth,identity);v=field.xy;p=source+v*age*.22;previous.z=0.;}
 if(age>=life||any(lessThan(p,vec2(-.35)))||any(greaterThan(p,vec2(1.35)))){age=0.;p=source;v=velocityField(source,source,depth,identity).xy*.45;}
 vec3 field=velocityField(p,source,depth,identity);
 v+=(field.xy-v)*(1.-exp(-dt/(.10+seed*.26)));p+=v*dt;
 nextPosition=vec4(p,age,depth);nextVelocity=vec4(v,max(previous.z*exp(-dt/.30),field.z),life);
}`;
const bodyVertex=header+`
uniform sampler2D positions,velocities,imageA,imageB,transportA,transportB,softA,softB;
uniform vec2 resolution,simulationSize;
uniform int keyA,keyB;
uniform float blend,master,freedom,anchorDelta,motion,energy,mistOpacity,lightGainA,lightGainB,prediction,showFine;
out vec3 color;out vec2 center,axis;out float sigma,opacity,stretch,fogBlend;
${correspondenceGLSL}
float hash(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return float(x)/4294967295.;}
void main(){
 ivec2 cell=ivec2(gl_VertexID%int(referenceSize.x),gl_VertexID/int(referenceSize.x));vec2 seed=(vec2(cell)+.5)/referenceSize;
 float ratio=(referenceSize.x*referenceSize.y)/(simulationSize.x*simulationSize.y);
 int slot=int(floor(float(gl_VertexID)/ratio)),carrier=int(floor((float(slot)+.5)*ratio));
 float materialMist=1.-step(.82,hash(uint(carrier)+317u));
 float carrierWeight=gl_VertexID==carrier?1.:0.,detailWeight=carrierWeight>0.||materialMist<.5?1.:pow(1.-freedom,3.);
 if(detailWeight<.00001){gl_Position=vec4(3,3,0,1);gl_PointSize=1.;opacity=0.;color=vec3(0);fogBlend=0.;center=vec2(0);axis=vec2(1,0);sigma=1.;stretch=1.;return;}
 ivec2 stateCell=ivec2(slot%int(simulationSize.x),slot/int(simulationSize.x));
 vec2 carrierSeed=(vec2(mod(float(carrier),referenceSize.x),floor(float(carrier)/referenceSize.x))+.5)/referenceSize;
 vec2 sampleA=keyPoint(seed,keyA),sampleB=keyA==keyB?sampleA:keyPoint(seed,keyB);vec2 target=mix(sampleA,sampleB,blend);
 vec3 originalColor=mix(texture(imageA,sampleA).rgb,texture(imageB,sampleB).rgb,blend);
 if(freedom<.000001){vec2 v=texelFetch(velocities,stateCell,0).xy;vec2 exact=target+v*anchorDelta*.72;color=originalColor*master;opacity=1.;fogBlend=0.;sigma=.29;stretch=1.;axis=vec2(1,0);center=vec2(exact.x,1.-exact.y)*resolution;gl_PointSize=4.;gl_Position=vec4(exact.x*2.-1.,1.-exact.y*2.,0,1);return;}
 // Dark reconstruction samples are necessary for the exact key, but do not
 // need expensive transport/material shading in its neighbourhood.
 if(freedom>.002&&freedom<.98&&max(max(originalColor.r,originalColor.g),originalColor.b)<.003){gl_Position=vec4(3,3,0,1);gl_PointSize=1.;opacity=0.;color=vec3(0);fogBlend=0.;center=vec2(0);axis=vec2(1,0);sigma=1.;stretch=1.;return;}
 vec4 state=texelFetch(positions,stateCell,0),velocity=texelFetch(velocities,stateCell,0);
 // Delta=0 is an exact particle reconstruction; its time derivative contains
 // velocity, so the formation is crossed rather than held or cross-faded.
 vec2 p=mix(target+velocity.xy*anchorDelta*.72,state.xy+velocity.xy*prediction,freedom);p=mix(target,p,clamp(motion,0.,1.));
 float depth=state.w;p+=freedom*(p-.5)*(depth-.5)*.025;
 vec3 ta=floor(texture(transportA,seed).rgb*255.+.5),tb=floor(texture(transportB,seed).rgb*255.+.5);
 float ia=ta.x+256.*ta.y+65536.*ta.z,ib=tb.x+256.*tb.y+65536.*tb.z;
 vec2 materialA=vec2(mod(ia,4096.),floor(ia/4096.))/4095.,materialB=vec2(mod(ib,4096.),floor(ib/4096.))/4095.;
 if(carrierWeight<.5){vec3 ca=floor(texture(transportA,carrierSeed).rgb*255.+.5),cb=floor(texture(transportB,carrierSeed).rgb*255.+.5);float xa=ca.x+256.*ca.y+65536.*ca.z,xb=cb.x+256.*cb.y+65536.*cb.z;vec2 carrierA=vec2(mod(xa,4096.),floor(xa/4096.))/4095.,carrierB=vec2(mod(xb,4096.),floor(xb/4096.))/4095.;p+=freedom*(mix(materialA,materialB,blend)-mix(carrierA,carrierB,blend));}
 color=mix(texture(imageA,mix(sampleA,materialA,freedom)).rgb,texture(imageB,mix(sampleB,materialB,freedom)).rgb,blend);
 float mist=materialMist;
 vec3 softColor=mix(texture(softA,materialA).rgb,texture(softB,materialB).rgb,blend);
 color=mix(color,softColor,freedom*mist);
 color=mix(color,max(vec3(0),color-softColor*.99)*4.,freedom*(1.-mist));
 fogBlend=freedom*mist;
 float lum=dot(color,vec3(.2126,.7152,.0722));float identity=(float(gl_VertexID)+.5)/(referenceSize.x*referenceSize.y);
 float gain=mix(lightGainA,lightGainB,step(.513,identity));
 color*=master*mix(1.,gain*(1.+velocity.z*.65+energy*.12),freedom);
 float age=state.z,life=velocity.w,alive=smoothstep(0.,.55,age)*(1.-smoothstep(life-1.2,life,age));
 opacity=mix(1.,alive*smoothstep(.0005,.014,lum)*clamp(mistOpacity/.12,.2,2.),freedom);
 float screenEdge=min(min(p.x,1.-p.x),min(p.y,1.-p.y));opacity*=mix(1.,smoothstep(-.03,.025,screenEdge),freedom);
 // Fog uses broad, overlapping volumetric samples; the fine material keeps
 // coherent filaments. Neither is a post-process displacement of an image.
 float keep=mix(1.,1.-step(.22,hash(uint(gl_VertexID)+619u)),mist);
 opacity*=mix(1.,keep,freedom)*detailWeight;
 opacity*=mix(1.,mist+(1.-mist)*showFine,freedom);
 vec2 screenVelocity=velocity.xy*resolution;screenVelocity.y*=-1.;axis=normalize(screenVelocity+vec2(.00001));
 sigma=mix(.29,mix(.8,(2.4+depth*.8)*sqrt(ratio),mist)*resolution.x/1672.,freedom*max(carrierWeight,1.-mist));
 stretch=mix(1.,mix(1.8,1.15,mist),freedom);
 center=vec2(p.x,1.-p.y)*resolution;gl_PointSize=ceil(sigma*stretch*6.)+2.;gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0,1);
 if(opacity<.00005){gl_Position=vec4(3,3,0,1);gl_PointSize=1.;}
}`;
const bodyFragment=header+`
in vec3 color;in vec2 center,axis;in float sigma,opacity,stretch,fogBlend;
layout(location=0) out vec4 outColor;layout(location=1) out vec4 outFog;
void main(){vec2 d=gl_FragCoord.xy-center;float x=dot(d,axis)/stretch,y=dot(d,vec2(-axis.y,axis.x));float w=exp(-.5*(x*x+y*y)/(sigma*sigma))*opacity;outColor=vec4(color*w,w)*(1.-fogBlend);outFog=vec4(color*w,w)*fogBlend;}`;
const resolveFragment=header+`
in vec2 uv;uniform sampler2D accumulation,fogAccumulation;uniform float freedom;uniform vec2 resolution;out vec4 outColor;${gamma}
void main(){
 vec4 s=texture(accumulation,uv);vec3 fine=s.rgb/max(s.a,.00001);fine*=mix(1.,(1.-exp(-s.a*.82))*1.16,freedom);
 vec2 d=vec2(5.)/resolution;
 vec4 f=texture(fogAccumulation,uv)*4.;
 f+=(texture(fogAccumulation,uv+vec2(d.x,0))+texture(fogAccumulation,uv-vec2(d.x,0))+texture(fogAccumulation,uv+vec2(0,d.y))+texture(fogAccumulation,uv-vec2(0,d.y)))*2.;
 f+=texture(fogAccumulation,uv+d)+texture(fogAccumulation,uv-d)+texture(fogAccumulation,uv+vec2(d.x,-d.y))+texture(fogAccumulation,uv+vec2(-d.x,d.y));f/=16.;
 vec3 fog=f.rgb/max(f.a,.00001)*(1.-exp(-f.a*.65))*.78;
 outColor=vec4(srgb(fine+fog),1);
}`;
const rainVertex=header+`
uniform vec2 resolution;uniform float rainPhase,rainAngle,rainLength,rainWidth,master,freedom,energy;
out vec2 center,axis;out float sigma,stretch;out vec3 color;
float hash(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return float(x)/4294967295.;}
void main(){uint id=uint(gl_VertexID);vec2 p=fract(vec2(hash(id+201u),hash(id+917u))+vec2(cos(rainAngle),sin(rainAngle))*rainPhase);
center=vec2(p.x,1.-p.y)*resolution;axis=normalize(vec2(cos(rainAngle),-sin(rainAngle))*resolution);sigma=max(.3,rainWidth*resolution.x*.5);stretch=max(2.,rainLength*resolution.x/(sigma*6.));
color=vec3(.09,.17,.23)*master*freedom*(.4+energy);gl_PointSize=ceil(sigma*stretch*6.)+2.;gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0,1);}`;
const rainFragment=header+`in vec2 center,axis;in float sigma,stretch;in vec3 color;out vec4 outColor;${gamma}
void main(){vec2 d=gl_FragCoord.xy-center;float x=dot(d,axis)/stretch,y=dot(d,vec2(-axis.y,axis.x));float a=exp(-.5*(x*x+y*y)/(sigma*sigma))*.22;outColor=vec4(srgb(color),a);}`;

export class ParticleRenderer {
 constructor(canvas){
  this.canvas=canvas;this.quality='medium';this.motion=1;this.responseGain=1;this.smallPoints=true;this.beatTimes=[];this.initialized=false;
  const gl=this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
  if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw Error('需要启用 Chrome 图形加速与 WebGL2 浮点缓冲。');
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
  this.sim=this.program(screenVertex,simulationFragment);this.body=this.program(bodyVertex,bodyFragment);this.resolve=this.program(screenVertex,resolveFragment);this.rain=this.program(rainVertex,rainFragment);
  this.accumulation=this.texture();this.fogAccumulation=this.texture();this.target=gl.createFramebuffer();this.states=[0,1].map(()=>({position:this.texture(),velocity:this.texture(),fbo:gl.createFramebuffer()}));this.current=0;
  const ext=gl.getExtension('WEBGL_debug_renderer_info');this.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 }
 program(vs,fs){const gl=this.gl,compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  const u={};for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const info=gl.getActiveUniform(p,i);u[info.name.replace('[0]','')]=gl.getUniformLocation(p,info.name);}return {p,u};
 }
 texture(){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);return t;}
 async load(){
  const gl=this.gl,load=(src,data=false)=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const t=this.texture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,data?gl.RGBA8:gl.SRGB8_ALPHA8,gl.RGBA,gl.UNSIGNED_BYTE,im);if(!data)for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);resolve(t);};im.onerror=()=>reject(Error(`载入失败 ${src}`));im.src=src;});
  this.textures=await Promise.all([1,2,3,4].map(i=>load(`references/C${i}.png`)));this.structural=await Promise.all([1,2,3,4].map(i=>load(`data/structure/C${i}.png`)));this.maps=await Promise.all([1,2,3,4].map(i=>load(`data/correspondence/C${i}.png`,true)));
  this.transportMaps=await Promise.all([1,2,3,4].map(i=>load(`data/correspondence/C${i}-transport.png`,true)));
  const sections=await(await fetch('data/form-sections.json')).json();this.director=new MotionDirector([56.8,93.61,155.41,264.05],sections.sections,this.beatTimes);
 }
 resize(width,height){
  const gl=this.gl;if(width){this.canvas.width=width;this.canvas.height=height;}else{const max=this.quality==='high'?1672:this.quality==='medium'?1280:960;const w=Math.min(max,Math.round(this.canvas.clientWidth*devicePixelRatio));this.canvas.width=w;this.canvas.height=Math.round(w*941/1672);}
  const w=this.canvas.width,h=this.canvas.height,allocate=(texture,format,type,sw=w,sh=h)=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,format,sw,sh,0,gl.RGBA,type,null);};
  allocate(this.accumulation,gl.RGBA16F,gl.HALF_FLOAT);allocate(this.fogAccumulation,gl.RGBA16F,gl.HALF_FLOAT);gl.bindFramebuffer(gl.FRAMEBUFFER,this.target);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.accumulation,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,this.fogAccumulation,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);
  if(!this.stateAllocated){for(const s of this.states){allocate(s.position,gl.RGBA32F,gl.FLOAT,512,512);allocate(s.velocity,gl.RGBA16F,gl.HALF_FLOAT,512,512);gl.bindFramebuffer(gl.FRAMEBUFFER,s.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,s.position,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,s.velocity,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('GPU 粒子状态缓冲创建失败');}this.stateAllocated=true;this.initialized=false;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
 }
 bind(program,name,texture,unit){const gl=this.gl;if(program.u[name]!==undefined){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(program.u[name],unit);}}
 values(program,values){const gl=this.gl,u=program.u;for(const [name,value] of Object.entries(values)){if(u[name]===undefined)continue;if(Array.isArray(value)||ArrayBuffer.isView(value)){if(value.length===2)gl.uniform2fv(u[name],value);else if(value.length===3)gl.uniform3fv(u[name],value);else gl.uniform4fv(u[name],value);}else gl.uniform1f(u[name],value);}}
 correspondence(program,state){const maps=program===this.sim?this.transportMaps:this.maps;for(let i=0;i<4;i++)this.bind(program,'map'+i,maps[i],i+2);this.values(program,{referenceSize:[1672,941],morph:state.morph,previousMorph:state.previousMorph});}
 simulate(frame,state,initialize=false){
  const gl=this.gl,p=frame.parameters,read=this.states[this.current],write=this.states[1-this.current];gl.disable(gl.BLEND);gl.useProgram(this.sim.p);gl.bindFramebuffer(gl.FRAMEBUFFER,write.fbo);
  gl.viewport(0,0,512,512);
  this.bind(this.sim,'positions',read.position,0);this.bind(this.sim,'velocities',read.velocity,1);this.correspondence(this.sim,state);
  const eventValues=new Float32Array(24);for(let i=0;i<6;i++)eventValues[i*4]=-1;state.events.forEach((e,i)=>eventValues.set(e,i*4));const angle=p.GapNormalAngle*Math.PI/180;
  this.values(this.sim,{resolution:[512,512],songTime:state.time,dt:initialize?0:state.dt,flow:state.flow,low:state.low,high:state.high,rms:state.rms,motion:this.motion,response:this.responseGain,aspect:941/1672,
   lightA:p.LightCenterA,lightB:p.LightCenterB,lightScaleA:p.LightScaleA,lightScaleB:p.LightScaleB,flower:p.FlowerCenter,flowerForm:p.FlowerForm,flowerRadius:p.FlowerRadius,flowerBreak:p.FlowerBreak,gapCenter:p.GapCenter,gapNormal:[Math.cos(angle),Math.sin(angle)],gapWidth:p.GapWidth,gapStrength:p.GapStrength,events:eventValues});
  for(const l of ['A','B'])for(let i=0;i<4;i++)this.values(this.sim,{[l.toLowerCase()+i]:p[`Flow${l}${i}`]});gl.uniform1i(this.sim.u.initialize,initialize?1:0);gl.drawArrays(gl.TRIANGLES,0,3);this.current=1-this.current;this.initialized=true;
 }
 render(frame){
  const gl=this.gl,p=frame.parameters,state=this.director.evaluate(frame,this.responseGain);this.state=state;this.motionPhase=state.phase;gl.bindVertexArray(this.vao);gl.disable(gl.DEPTH_TEST);gl.viewport(0,0,this.canvas.width,this.canvas.height);
  if(!this.initialized||state.reset){this.simulate(frame,state,true);this.simulationTime=state.time;this.nextSimulationTime=state.time+1/30;this.simulationMorph=state.morph;}
  else if(state.dt>0&&state.time>=this.nextSimulationTime-1e-6){
   this.simulate(frame,{...state,dt:Math.min(state.time-this.simulationTime,.10),previousMorph:this.simulationMorph});
   this.simulationTime=state.time;this.simulationMorph=state.morph;while(this.nextSimulationTime<=state.time+1e-6)this.nextSimulationTime+=1/30;
  }
  const stored=this.states[this.current],[a,b,blend]=frame.span;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.target);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.useProgram(this.body.p);
  this.bind(this.body,'positions',stored.position,0);this.bind(this.body,'velocities',stored.velocity,1);this.correspondence(this.body,state);const textures=this.smallPoints?this.textures:this.structural;this.bind(this.body,'imageA',textures[a],6);this.bind(this.body,'imageB',textures[b],7);
  this.bind(this.body,'softA',this.structural[a],8);this.bind(this.body,'softB',this.structural[b],11);
  this.bind(this.body,'transportA',this.transportMaps[a],9);this.bind(this.body,'transportB',this.transportMaps[b],10);
  gl.uniform1i(this.body.u.keyA,a);gl.uniform1i(this.body.u.keyB,b);
  this.values(this.body,{resolution:[this.canvas.width,this.canvas.height],simulationSize:[512,512],blend,master:p.MasterGain,freedom:state.freedom,anchorDelta:state.anchorDelta,motion:this.motion,energy:state.energy,mistOpacity:p.MistOpacity,lightGainA:p.LightGainA,lightGainB:p.LightGainB,prediction:Math.max(0,state.time-this.simulationTime),showFine:this.smallPoints?1:0});gl.drawArrays(gl.POINTS,0,1672*941);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.BLEND);gl.useProgram(this.resolve.p);this.bind(this.resolve,'accumulation',this.accumulation,4);this.bind(this.resolve,'fogAccumulation',this.fogAccumulation,5);this.values(this.resolve,{freedom:state.freedom,resolution:[this.canvas.width,this.canvas.height]});gl.drawArrays(gl.TRIANGLES,0,3);
  if(p.RainTargetCount>0){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.useProgram(this.rain.p);this.values(this.rain,{resolution:[this.canvas.width,this.canvas.height],rainPhase:state.rainPhase,rainAngle:p.RainAngle*Math.PI/180,rainLength:p.RainLength,rainWidth:p.RainWidth,master:p.MasterGain,freedom:state.freedom,energy:state.energy});gl.drawArrays(gl.POINTS,0,Math.ceil(p.RainTargetCount*(1+state.low*.7)));}
  this.bodyParticles=512*512;this.renderSamples=1672*941;this.particles=this.bodyParticles+Math.ceil(p.RainTargetCount*(1+state.low*.7));
  this.applied={Section:state.section.label,SectionLevel:state.section.level,MacroAmplitude:state.flow,Energy:state.energy,InertialHit:state.hit,CameraDolly:0,AnchorCrossing:state.freedom,SmallPoints:this.smallPoints,FlowPhase:state.phase,Simulation:'GPU position / velocity / age',WaveFronts:state.events.length};
 }
}
