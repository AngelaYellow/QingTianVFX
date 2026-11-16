export const correspondenceGLSL=`
uniform sampler2D map0,map1,map2,map3;
uniform vec2 referenceSize;
uniform vec4 morph,previousMorph;
vec2 decodePoint(vec4 packed){vec3 b=floor(packed.rgb*255.+.5);float index=b.x+256.*b.y+65536.*b.z;return (vec2(mod(index,referenceSize.x),floor(index/referenceSize.x))+.5)/referenceSize;}
vec2 keyPoint(vec2 seed,int key){if(key==0)return decodePoint(texture(map0,seed));if(key==1)return decodePoint(texture(map1,seed));if(key==2)return decodePoint(texture(map2,seed));return decodePoint(texture(map3,seed));}
void keyPositions(vec2 seed,out vec2 k0,out vec2 k1,out vec2 k2,out vec2 k3){k0=decodePoint(texture(map0,seed));k1=decodePoint(texture(map1,seed));k2=decodePoint(texture(map2,seed));k3=decodePoint(texture(map3,seed));}
vec2 targetPoint(vec2 seed,vec4 weights){vec2 k0,k1,k2,k3;keyPositions(seed,k0,k1,k2,k3);return k0*weights.x+k1*weights.y+k2*weights.z+k3*weights.w;}
`;
export const transportGLSL=correspondenceGLSL.replace(
 'return (vec2(mod(index,referenceSize.x),floor(index/referenceSize.x))+.5)/referenceSize;',
 'return vec2(mod(index,4096.),floor(index/4096.))/4095.;'
);
// These are velocity fields evaluated at the CURRENT position. The simulation
// integrates them, so material can enter a curl, turn, leave, and dissolve.
export const fieldGLSL=`
uniform float songTime,dt,flow,low,high,rms,motion,response,aspect;
uniform vec2 lightA,lightB,lightScaleA,lightScaleB,flower,gapCenter,gapNormal;
uniform float flowerForm,flowerRadius,flowerBreak,gapWidth,gapStrength;
uniform vec3 a0,a1,a2,a3,b0,b1,b2,b3;
uniform vec4 events[6];
float hash(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return float(x)/4294967295.;}
vec2 safeNormal(vec2 v){return v/max(length(v),.0001);}
vec2 tangentAt(float t,float group){
 vec2 p0=mix(a0.xy,b0.xy,group),p1=mix(a1.xy,b1.xy,group),p2=mix(a2.xy,b2.xy,group),p3=mix(a3.xy,b3.xy,group);
 return safeNormal(3.*(1.-t)*(1.-t)*(p1-p0)+6.*(1.-t)*t*(p2-p1)+3.*t*t*(p3-p2));
}
vec2 curl(vec2 p,float z){
 vec2 k1=vec2(8.2,5.7),k2=vec2(-13.1,10.3),k3=vec2(29.7,-21.6);
 float n1=cos(dot(p,k1)+songTime*.34+z*2.0),n2=cos(dot(p,k2)-songTime*.47+z*4.2),n3=cos(dot(p,k3)+songTime*.73+z*1.9);
 return vec2(k1.y,-k1.x)*n1*.085+vec2(k2.y,-k2.x)*n2*.040+vec2(k3.y,-k3.x)*n3*(.008+high*.012);
}
vec3 velocityField(vec2 p,vec2 source,float depth,float identity){
 float group=step(.513,identity),side=mix(-1.,1.,group);vec2 center=mix(lightA,lightB,group);
 vec2 q=vec2(p.x,p.y*aspect),c=vec2(center.x,center.y*aspect),radial=q-c;
 vec2 direction=tangentAt(clamp(source.x*.86+.07,0.,1.),group);direction.y*=aspect;direction=safeNormal(direction);
 float speed=.013+flow*.040;vec2 v=direction*speed;
 v+=vec2(-radial.y,radial.x)*side*(.004+flow*.003)/(dot(radial,radial)+.038);
 v+=curl(q,depth)*(.010+flow*.012);
 float front=0.;
 for(int i=0;i<6;i++){
   float age=events[i].x,amp=events[i].y;if(age<0.||amp<.001)continue;
   vec2 origin=mix(lightA,lightB,events[i].z);origin.y*=aspect;
   vec2 r=q-origin;float distance=length(r),radius=.025+age*(.17+.045*events[i].w),width=.060+age*.020;
   float ring=exp(-pow((distance-radius)/width,2.))*exp(-age*.8)*amp;
   vec2 normal=safeNormal(r),turn=vec2(-normal.y,normal.x)*mix(-1.,1.,events[i].z);
   // A passing wave pushes, then releases. A unipolar radial force vacuumed
   // out the fog behind every beat and left artificial concentric stripes.
   float release=clamp((distance-radius)/width,-1.5,1.5);
   v+=ring*(normal*release*.055+turn*.042)*(.5+flow*.6);front+=ring;
 }
 v.y/=aspect;
 float f=1.-step(.026,identity);vec2 flowerDrift=vec2(sin(songTime*.17)*.018,cos(songTime*.13)*.014);
 v=mix(v,v*.20+(source+flowerDrift-p)*2.2,f*clamp(flowerForm,0.,1.));
 v+=f*(1.-flowerForm)*flowerBreak*safeNormal(p-flower)*.035;
 float distance=dot(p-gapCenter,gapNormal),g=1.-smoothstep(gapWidth*.2,gapWidth*.55+.001,abs(distance));
 v+=gapNormal*sign(distance)*g*gapStrength*.025;
 v*=motion*(.78+depth*.55);return vec3(clamp(v,vec2(-.38),vec2(.38)),front);
}
`;
