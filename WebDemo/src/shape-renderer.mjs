import {MotionDirector,shapeFieldGLSL} from './motion.mjs';

const header=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D imageA,imageB;
uniform float blend,phase,master,energy,impact,crossing;
uniform vec2 resolution;
${shapeFieldGLSL}
`;
const gamma=`vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0)),vec3(1.0/2.4))-.055,step(vec3(.0031308),c));}`;
const bodyVertex=header+`
out vec3 color;
out vec2 center;
out float sigma;
float hash(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return float(x)/4294967295.;}
void main(){
 vec2 uv=(vec2(gl_VertexID%int(resolution.x),gl_VertexID/int(resolution.x))+.5)/resolution;
 vec2 df=uv-flower;float flowerDepth=exp(-dot(df,df)/.006);
 float seed=hash(uint(gl_VertexID)+17u);
 float depth=clamp(.72-uv.y*.44+flowerDepth*.28+(seed-.5)*.12,.12,.98);
 vec3 p=shapePoint(uv,depth);
 // Each sample is an independent point with depth and continuous slip.
 p.xy+=macroGain*crossing*.0012*vec2(sin(phase*.8+seed*6.283),cos(phase*.7+seed*6.283));
 color=mix(texture(imageA,uv).rgb,texture(imageB,uv).rgb,blend);
 color*=master*(1.0+abs(crossing)*(.14*energy+.14*impact));
 // The particle volume dissolves at its outer extent; never reveal a cut card.
 float border=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));
 color*=mix(1.,smoothstep(0.,.17,border),min(1.,abs(crossing)*macroGain));
 center=vec2(p.x,1.-p.y)*resolution;
 sigma=mix(.29,.68,min(1.,abs(crossing)*macroGain));
 gl_PointSize=ceil(sigma*6.)+2.;
 gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0,1);
}`;
const bodyFragment=`#version 300 es
precision highp float;
in vec3 color;
in vec2 center;
in float sigma;
out vec4 outColor;
void main(){
 vec2 d=gl_FragCoord.xy-center;float w=exp(-dot(d,d)/(2.*sigma*sigma));
 outColor=vec4(color*w,w);
}`;
const screenVertex=`#version 300 es
precision highp float;
out vec2 uv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0,1);}`;
const resolveFragment=`#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D accumulation;
out vec4 outColor;
${gamma}
void main(){vec4 s=texture(accumulation,uv);outColor=vec4(srgb(s.rgb/max(s.a,.00001)),1);}`;
const pointVertex=header+`
uniform float pointCount,rainCount,rainSpeed,rainAngle;
uniform int pass;
out vec3 color;
out vec2 center,axis;
out float opacity,sigma,stretch;
float hash(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return float(x)/4294967295.;}
void main(){
 uint id=uint(gl_VertexID);float seed=hash(id+19u);
 vec2 uv=vec2(hash(id+201u),hash(id+917u));
 vec3 c=mix(texture(imageA,uv).rgb,texture(imageB,uv).rgb,blend);
 float lum=dot(c,vec3(.2126,.7152,.0722));
 float depth=clamp(.72-uv.y*.44,.12,.98);
 vec3 p=shapePoint(uv,depth);
 color=mix(c,vec3(.6,.8,1),.1);
 opacity=abs(crossing)*master*clamp(lum*.28,0.,.14)*step(float(id),pointCount);
 sigma=(.35+seed*.55)*resolution.x/1672.;stretch=1.0+impact*1.2;
 axis=normalize(vec2(1.,-.25));
 if(pass==1){
   uv=fract(uv+vec2(cos(rainAngle),sin(rainAngle))*phase*rainSpeed*.12);
   p=shapePoint(uv,.5);color=vec3(.12,.3,.5);
   opacity=abs(crossing)*master*.18*step(float(id),rainCount);
   sigma=.35*resolution.x/1672.;stretch=15.0;axis=vec2(cos(rainAngle),-sin(rainAngle));
 }
 center=vec2(p.x,1.-p.y)*resolution;
 gl_PointSize=ceil(sigma*stretch*6.)+2.;
 gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0,1);
}`;
const pointFragment=`#version 300 es
precision highp float;
in vec3 color;
in vec2 center,axis;
in float opacity,sigma,stretch;
out vec4 outColor;
${gamma}
void main(){vec2 d=gl_FragCoord.xy-center;float x=dot(d,axis),y=dot(d,vec2(-axis.y,axis.x));float a=opacity*exp(-.5*(x*x/(stretch*stretch)+y*y)/(sigma*sigma));outColor=vec4(srgb(color),a);}`;
const fiberVertex=header+`
uniform vec3 a0,a1,a2,a3,b0,b1,b2,b3;
uniform vec3 colorA,colorB;
uniform float fiberWidth,fiberBend,noise;
out vec3 color;
out float opacity,edge;
const vec2 corners[6]=vec2[6](vec2(0,-1),vec2(1,-1),vec2(0,1),vec2(0,1),vec2(1,-1),vec2(1,1));
vec3 cubic(vec3 p0,vec3 p1,vec3 p2,vec3 p3,float t){float s=1.-t;return s*s*s*p0+3.*s*s*t*p1+3.*s*t*t*p2+t*t*t*p3;}
vec3 target(float t,float group,float seed){
 vec3 p=group<.5?cubic(a0,a1,a2,a3,t):cubic(b0,b1,b2,b3,t);
 p.xy+=vec2(sin(t*9.+seed*7.+phase*.2),cos(t*7.+seed*7.+phase*.2))*noise*fiberBend;
 p.y+=(seed-.5)*.028;
 return shapePoint(p.xy,p.z);
}
void main(){
 float fiber=float(gl_InstanceID/64),seg=float(gl_InstanceID%64),seed=fract(fiber*.61803398875),group=mod(fiber,2.);
 vec2 corner=corners[gl_VertexID];float t=(seg+corner.x)/64.;
 vec3 p=target(t,group,seed),q=target(t+.001,group,seed);
 vec2 tangent=normalize((q.xy-p.xy)*resolution),normal=vec2(-tangent.y,tangent.x);
 p.xy+=normal*corner.y*fiberWidth*resolution.x/resolution*.5;
 color=mix(colorA,colorB,group);edge=corner.y;
 opacity=abs(crossing)*master*.038*(.5+energy+impact*.25)*pow(max(0.,sin(t*3.14159)),.6);
 gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0,1);
}`;
const fiberFragment=`#version 300 es
precision highp float;
in vec3 color;
in float opacity,edge;
out vec4 outColor;
${gamma}
void main(){outColor=vec4(srgb(color),opacity*exp(-edge*edge*2.));}`;

export class ParticleRenderer {
  constructor(canvas){
    this.canvas=canvas;this.quality='high';this.motion=1;this.responseGain=1;this.smallPoints=true;this.beatTimes=[];
    const gl=this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
    if(!gl)throw Error('需要 WebGL2。请开启 Chrome 图形加速。');
    const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const program=(vs,fs)=>{const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));const u={};for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const info=gl.getActiveUniform(p,i);u[info.name]=gl.getUniformLocation(p,info.name);}return {p,u};};
    if(!gl.getExtension('EXT_color_buffer_float'))throw Error('需要浮点粒子缓冲；请开启 Chrome 图形加速。');
    this.body=program(bodyVertex,bodyFragment);this.resolve=program(screenVertex,resolveFragment);this.points=program(pointVertex,pointFragment);this.fibers=program(fiberVertex,fiberFragment);
    this.target=gl.createFramebuffer();this.accumulation=gl.createTexture();
    gl.bindVertexArray(gl.createVertexArray());gl.clearColor(0,0,0,1);
    const ext=gl.getExtension('WEBGL_debug_renderer_info');this.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  }
  async load(){
    const gl=this.gl;const loadImage=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(`载入失败 ${src}`));im.src=src;});
    const texture=im=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.SRGB8_ALPHA8,gl.RGBA,gl.UNSIGNED_BYTE,im);for(const pname of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,pname,gl.LINEAR);for(const pname of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,pname,gl.CLAMP_TO_EDGE);return t;};
    this.textures=(await Promise.all([1,2,3,4].map(i=>loadImage(`references/C${i}.png`)))).map(texture);
    this.structural=(await Promise.all([1,2,3,4].map(i=>loadImage(`data/structure/C${i}.png`)))).map(texture);
    const sections=await (await fetch('data/form-sections.json')).json();this.director=new MotionDirector([56.8,93.61,155.41,264.05],sections.sections,this.beatTimes);
  }
  resize(width,height){
    const gl=this.gl;
    if(width){this.canvas.width=width;this.canvas.height=height;}else{const max=this.quality==='high'?1672:this.quality==='medium'?1280:960;const w=Math.min(max,Math.round(this.canvas.clientWidth*devicePixelRatio));this.canvas.width=w;this.canvas.height=Math.round(w*941/1672);}
    gl.bindTexture(gl.TEXTURE_2D,this.accumulation);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,this.canvas.width,this.canvas.height,0,gl.RGBA,gl.HALF_FLOAT,null);
    for(const pname of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,pname,gl.NEAREST);
    for(const pname of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,pname,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.target);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.accumulation,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('浮点粒子缓冲创建失败');
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);
  }
  common(program,frame,state){
    const gl=this.gl,u=program.u,p=frame.parameters,[a,b,blend]=frame.span;gl.useProgram(program.p);
    const textures=this.smallPoints?this.textures:this.structural;
    for(const [unit,name,texture] of [[0,'imageA',textures[a]],[1,'imageB',textures[b]]]){if(u[name]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(u[name],unit);}}
    for(const [name,value] of Object.entries({blend,phase:state.phase,master:p.MasterGain,energy:state.energy,impact:state.hit,crossing:state.crossing,aspect:this.canvas.height/this.canvas.width,phrase:frame.LyricEnvelope,macroGain:this.motion}))if(u[name])gl.uniform1f(u[name],value);
    for(const [name,value] of Object.entries({lightA:p.LightCenterA,lightB:p.LightCenterB,flower:p.FlowerCenter,lightScaleA:p.LightScaleA,lightScaleB:p.LightScaleB,resolution:[this.canvas.width,this.canvas.height]}))if(u[name])gl.uniform2fv(u[name],value);
    if(u.wave)gl.uniform4fv(u.wave,state.wave);if(u.cameraMove)gl.uniform3fv(u.cameraMove,state.camera);
  }
  render(frame){
    const gl=this.gl,p=frame.parameters;
    const state=this.director.evaluate(frame,this.responseGain);this.state=state;this.motionPhase=state.phase;
    gl.disable(gl.DEPTH_TEST);gl.bindFramebuffer(gl.FRAMEBUFFER,this.target);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
    this.common(this.body,frame,state);gl.drawArrays(gl.POINTS,0,this.canvas.width*this.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.BLEND);gl.useProgram(this.resolve.p);gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,this.accumulation);gl.uniform1i(this.resolve.u.accumulation,4);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    this.common(this.fibers,frame,state);const fu=this.fibers.u;
    for(const letter of ['A','B'])for(let i=0;i<4;i++)gl.uniform3fv(fu[`${letter.toLowerCase()}${i}`],p[`Flow${letter}${i}`]);
    gl.uniform3fv(fu.colorA,p.LightColorA.slice(0,3));gl.uniform3fv(fu.colorB,p.LightColorB.slice(0,3));
    gl.uniform1f(fu.fiberWidth,p.FiberWidth*(1+state.hit*.3));gl.uniform1f(fu.fiberBend,p.FiberBend);gl.uniform1f(fu.noise,p.NoiseAmp);
    gl.drawArraysInstanced(gl.TRIANGLES,0,6,Math.ceil(p.FiberTargetCount)*64);
    this.common(this.points,frame,state);const pu=this.points.u;
    gl.uniform1f(pu.pointCount,p.DustTargetCount);gl.uniform1f(pu.rainCount,p.RainTargetCount);gl.uniform1f(pu.rainSpeed,p.RainSpeed);gl.uniform1f(pu.rainAngle,p.RainAngle*Math.PI/180);
    if(this.smallPoints){gl.uniform1i(pu.pass,0);gl.drawArrays(gl.POINTS,0,12000);}
    if(p.RainTargetCount>0){gl.uniform1i(pu.pass,1);gl.drawArrays(gl.POINTS,0,Math.ceil(p.RainTargetCount));}
    this.bodyParticles=this.canvas.width*this.canvas.height;
    this.particles=this.bodyParticles+(this.smallPoints?12000:0)+Math.ceil(p.RainTargetCount);
    this.applied={Section:state.section.label,SectionLevel:state.section.level,MacroAmplitude:state.amplitude,Energy:state.energy,InertialHit:state.hit,CameraDolly:state.camera[2],AnchorCrossing:state.crossing,SmallPoints:this.smallPoints,FlowPhase:state.phase};
  }
}
