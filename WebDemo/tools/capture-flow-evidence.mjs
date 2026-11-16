// Run sequentially so the evidence recordings do not compete for the GPU.
import {spawnSync} from 'node:child_process';
for(const spec of [
 {PROOF_LABEL:'after-final',PROOF_DURATION:'12'},
 {PROOF_LABEL:'audio-off',PROOF_AUDIO:'off',PROOF_DURATION:'10'},
 {PROOF_LABEL:'verse',PROOF_START:'40',PROOF_DURATION:'10'},
 {PROOF_LABEL:'body-only',PROOF_POINTS:'off',PROOF_DURATION:'10'},
 {PROOF_LABEL:'anchor-pass',PROOF_START:'91',PROOF_DURATION:'6'},
]){
 const result=spawnSync(process.execPath,['tools/flow-proof.mjs'],{env:{...process.env,PROOF_BASELINE:'0',PROOF_START:'105',PROOF_AUDIO:'on',PROOF_POINTS:'on',...spec},stdio:'inherit',windowsHide:true});
 if(result.status)process.exit(result.status||1);
}
