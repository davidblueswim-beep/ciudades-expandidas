// audio.js
// Implementación de audio espacial (Web Audio API) con fallback a Howler para ambiente

window.initSpatialAudio = async function(){
    if(window.audioManager && window.audioManager.inited) return window.audioManager;

    const audioManager = {
        ctx: null,
        master: null,
        sources: {},
        inited: false,
    };

    try{
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioManager.ctx = new AudioContext();
        audioManager.master = audioManager.ctx.createGain();
        audioManager.master.gain.value = 0.9;
        audioManager.master.connect(audioManager.ctx.destination);
        audioManager.inited = true;
    }catch(e){
        console.warn('No Web Audio API disponible:', e);
    }

    // Fallback: carga ambiente con Howler si existe
    if(typeof Howl !== 'undefined'){
        audioManager.ambience = new Howl({
            src: ['assets/audio/city_ambience.mp3'],
            loop: true,
            volume: 0.6,
            html5: true
        });
        // Intentar reproducir (puede bloquearse por autoplay)
        try{ audioManager.ambience.play(); }catch(e){}
    }

    // Helper: decode audio buffer from URL
    async function fetchBuffer(url){
        if(!audioManager.ctx) throw new Error('No AudioContext');
        const resp = await fetch(url);
        const ab = await resp.arrayBuffer();
        return await audioManager.ctx.decodeAudioData(ab);
    }

    // Crear un sonido posicional y retornarlo
    audioManager.createPositional = async function(id, url, opts={}){
        opts = Object.assign({loop:true, volume:1, position:[0,0,0]}, opts);
        if(!audioManager.ctx){
            console.warn('AudioContext no disponible, no se puede crear fuente posicional:', id);
            return null;
        }

        if(audioManager.sources[id]){
            // Stop and remove existing
            try{ audioManager.sources[id].source.stop(); }catch(e){}
            delete audioManager.sources[id];
        }

        const buffer = await fetchBuffer(url);
        const src = audioManager.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = !!opts.loop;

        const panner = audioManager.ctx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;

        const gain = audioManager.ctx.createGain();
        gain.gain.value = opts.volume;

        // connect: src -> panner -> gain -> master -> destination
        src.connect(panner);
        panner.connect(gain);
        gain.connect(audioManager.master);

        // Set initial position
        const [x,y,z] = opts.position;
        if(panner.positionX){
            panner.positionX.setValueAtTime(x, audioManager.ctx.currentTime);
            panner.positionY.setValueAtTime(y, audioManager.ctx.currentTime);
            panner.positionZ.setValueAtTime(z, audioManager.ctx.currentTime);
        }else if(panner.setPosition){
            panner.setPosition(x,y,z);
        }

        src.start(0);

        audioManager.sources[id] = { source: src, panner, gain, buffer };
        return audioManager.sources[id];
    };

    audioManager.setSourcePosition = function(id, x,y,z){
        const s = audioManager.sources[id];
        if(!s) return;
        const p = s.panner;
        if(!p) return;
        if(p.positionX){
            p.positionX.setValueAtTime(x, audioManager.ctx.currentTime);
            p.positionY.setValueAtTime(y, audioManager.ctx.currentTime);
            p.positionZ.setValueAtTime(z, audioManager.ctx.currentTime);
        }else if(p.setPosition){
            p.setPosition(x,y,z);
        }
    };

    audioManager.setListener = function(x,y,z, forward=[0,0,-1], up=[0,1,0]){
        if(!audioManager.ctx) return;
        const l = audioManager.ctx.listener;
        try{
            if(l.positionX){
                l.positionX.setValueAtTime(x, audioManager.ctx.currentTime);
                l.positionY.setValueAtTime(y, audioManager.ctx.currentTime);
                l.positionZ.setValueAtTime(z, audioManager.ctx.currentTime);
                l.forwardX.setValueAtTime(forward[0], audioManager.ctx.currentTime);
                l.forwardY.setValueAtTime(forward[1], audioManager.ctx.currentTime);
                l.forwardZ.setValueAtTime(forward[2], audioManager.ctx.currentTime);
                l.upX.setValueAtTime(up[0], audioManager.ctx.currentTime);
                l.upY.setValueAtTime(up[1], audioManager.ctx.currentTime);
                l.upZ.setValueAtTime(up[2], audioManager.ctx.currentTime);
            }else if(l.setPosition){
                l.setPosition(x,y,z);
            }
        }catch(e){
            console.warn('setListener failed', e);
        }
    };

    // Expose manager globally
    window.audioManager = audioManager;

    return audioManager;
};

// Convenience helper to ensure audio context resume on user gesture
window.resumeAudioIfNeeded = async function(){
    try{
        if(window.audioManager && window.audioManager.ctx && window.audioManager.ctx.state === 'suspended'){
            await window.audioManager.ctx.resume();
        }
    }catch(e){/* ignore */}
};

// Ejemplo de uso (puedes llamarlo tras una interacción del usuario):
// await initSpatialAudio();
// await audioManager.createPositional('car','assets/audio/car_passby.mp3',{position:[5,0,0],loop:true,volume:0.8});
// audioManager.setListener(0,0,0);
