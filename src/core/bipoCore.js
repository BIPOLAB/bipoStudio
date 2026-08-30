/**
 * Mock bipoCore device provider. Production bipoCore will identify the
 * physical device during the handshake; the selector is development-only.
 *
 * The mock persists its state in localStorage so configuration changes made
 * in bipoStudio survive reloads while we develop without physical hardware.
 */
class BipoCore {
    constructor() {
        this.simulateLatency = true;
        this.mockDevices = this.createMockDevices();
        this.activeDeviceId = this.getStoredMockDeviceId() ?? "lab-16k";
        this.restorePersistedState();
    }
    async hello() { await this.delay(150); const d=this.getActiveDevice(); return {id:d.id,name:d.name,firmware:"MOCK 1.0.0",protocol:"MOCK 1.0"}; }
    async read(resource) { await this.delay(); const d=this.getActiveDevice(); if(resource==="/hardware")return d.hardware; if(resource==="/configuration")return d.configuration; if(resource==="/runtime")return d.runtime; throw new Error(`Unknown resource: ${resource}`); }
    async write(resource,data) {
        await this.delay(80);
        const d=this.getActiveDevice();
        if(resource==="/configuration") d.configuration=structuredClone(data);
        else if(resource==="/runtime") d.runtime=structuredClone(data);
        else throw new Error(`Unknown writable resource: ${resource}`);
        this.persistActiveDevice();
        console.log("MOCK WRITE",resource,data);
    }
    async commit() { await this.delay(60); this.persistActiveDevice(); console.log("MOCK COMMIT"); }
    setMockDevice(id) { if(!this.mockDevices[id])throw new Error(`Unknown mock device: ${id}`); this.activeDeviceId=id; this.storeMockDeviceId(id); this.restorePersistedState(); }
    getMockDevices() { return Object.values(this.mockDevices).map(({id,name,description})=>({id,name,description})); }
    getActiveDevice() { return this.mockDevices[this.activeDeviceId]; }
    getStoredMockDeviceId() { try { const id=window.localStorage.getItem("bipoStudio.mockDevice"); return this.mockDevices[id]?id:null; } catch { return null; } }
    storeMockDeviceId(id) { try { window.localStorage.setItem("bipoStudio.mockDevice",id); } catch {} }
    persistActiveDevice() { try { const d=this.getActiveDevice(); window.localStorage.setItem(`bipoStudio.mockState.${d.id}`,JSON.stringify({configuration:d.configuration,runtime:d.runtime})); } catch {} }
    restorePersistedState() { try { const d=this.getActiveDevice(); const raw=window.localStorage.getItem(`bipoStudio.mockState.${d.id}`); if(!raw)return; const state=JSON.parse(raw); if(state?.configuration)d.configuration=state.configuration; if(state?.runtime)d.runtime=state.runtime; } catch {} }
    createMockDevices() { return {"lab-16k":createKnobDevice(16),"lab-16b":createButtonDevice(16),"lab-4f":createFaderDevice(4)}; }
    async delay(time=null) { if(!this.simulateLatency)return; return new Promise(resolve=>setTimeout(resolve,time??(80+Math.floor(Math.random()*120)))); }
}
function createKnobDevice(count) { const components=[],configuration={},runtime={}; for(let i=0;i<count;i++){const row=Math.floor(i/4),col=i%4,id=`K${String(i+1).padStart(3,"0")}`; components.push({id,label:`Knob ${i+1}`,type:"knob",position:{x:58+col*110,y:35+row*45},led:{type:"rgb",id:`L${String(i+1).padStart(3,"0")}`,configurable:true}}); configuration[id]={messageType:"cc",channel:1,number:20+i,led:{mode:"static",color:{r:255,g:255,b:255},brightness:100}}; runtime[id]=0; } return createDevice("lab-16k","LAB-16K","16 knobs · 4 × 4 matrix · RGB LED per control",components,configuration,runtime); }
function createButtonDevice(count) { const components=[],configuration={},runtime={}; for(let i=0;i<count;i++){const row=Math.floor(i/4),col=i%4,id=`B${String(i+1).padStart(3,"0")}`; components.push({id,label:`Button ${i+1}`,type:"button",position:{x:58+col*110,y:35+row*45},led:{type:"rgb",id:`L${String(i+1).padStart(3,"0")}`,configurable:true}}); configuration[id]={messageType:"note",channel:1,number:60+i,mode:"momentary",led:{mode:"static",color:{r:255,g:255,b:255},brightness:100}}; runtime[id]=0; } return createDevice("lab-16b","LAB-16B","16 buttons · 4 × 4 matrix · RGB LED per control",components,configuration,runtime); }
function createFaderDevice(count) { const components=[],configuration={},runtime={}; for(let i=0;i<count;i++){const id=`F${String(i+1).padStart(3,"0")}`; components.push({id,label:`Fader ${i+1}`,type:"fader",position:{x:55+i*110,y:80},led:{type:"rgb",id:`L${String(i+1).padStart(3,"0")}`,configurable:true}}); configuration[id]={messageType:"cc",channel:1,number:21+i,led:{mode:"static",color:{r:255,g:255,b:255},brightness:100}}; runtime[id]=0; } return createDevice("lab-4f","LAB-4F","4 faders · RGB LED per control",components,configuration,runtime); }
function createDevice(id,name,description,components,configuration,runtime) { return {id,name,description,hardware:{id,name,vendor:"bipoLab engineering",hardwareRevision:"MOCK",components,connectors:[]},configuration,runtime}; }
export default new BipoCore();
