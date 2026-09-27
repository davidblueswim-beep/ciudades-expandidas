(function(){
    // Simple Find Exit experience: 4 sectors, audio beacon using WebAudio oscillator fallback.
    const STATE = {
        ctx: null,
        beaconTimer: null,
        interval: 800,
        target: 0,
        level: 1,
        maxLevels: 3,
        running: false
        ,
        started: false,
        startTime: null,
        attempts: 0,
        corrects: 0
    };

    function ensureAudio(){
        if(STATE.ctx) return;
        try{ STATE.ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ STATE.ctx = null; }
    }

    function playTone({freq=800, duration=0.12, pan=0, vol=0.25, type='sine'}={}){
        ensureAudio();
        if(STATE.ctx){
            const ctx = STATE.ctx;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = type;
            o.frequency.value = freq;
            // smooth envelope for clearer sounds
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), ctx.currentTime + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            if(typeof ctx.createStereoPanner === 'function'){
                const p = ctx.createStereoPanner();
                p.pan.value = pan;
                o.connect(p);
                p.connect(g);
            } else {
                o.connect(g);
            }
            g.connect(ctx.destination);
            o.start();
            setTimeout(()=>{ try{ o.stop(); }catch(e){} }, (duration+0.02)*1000);
        } else if(window.Howl){
            // no-op fallback; real audio assets would be better
        }
    }

    function playSuccess(){
        // brief ascending melody
        playTone({freq:880, duration:0.12, vol:0.4, type:'sine'});
        setTimeout(()=> playTone({freq:1100, duration:0.12, vol:0.45, type:'sine'}), 120);
        setTimeout(()=> playTone({freq:1400, duration:0.18, vol:0.5, type:'sine'}), 260);
        if(navigator.vibrate) navigator.vibrate([30,10,30]);
    }

    function playFail(){
        // short descending pair
        playTone({freq:420, duration:0.18, vol:0.34, type:'triangle'});
        setTimeout(()=> playTone({freq:360, duration:0.14, vol:0.28, type:'triangle'}), 160);
        if(navigator.vibrate) navigator.vibrate(120);
    }

    function panForIndex(i, level){
        // Map sector index to pan -1..1. level reduces separation to increase difficulty.
        const base = (i===0||i===2) ? -0.8 : 0.8; // left/right
        const diagFactor = (i===0||i===1) ? -0.4 : 0.4; // up/down slightly
        const separation = Math.max(0.25, 1 - (level-1)*0.25);
        return (base + diagFactor) * separation;
    }

    function startBeacon(){
        stopBeacon();
        STATE.running = true;
        // ping interval shortens with level
        const interval = Math.max(350, STATE.interval - (STATE.level-1)*150);
        STATE.beaconTimer = setInterval(()=>{
            const pan = panForIndex(STATE.target, STATE.level);
            const vol = Math.min(0.6, 0.25 + (STATE.level-1)*0.12);
            playTone({freq:900 - STATE.level*40, duration:0.12, pan, vol});
            // subtle secondary beep to create pulse feel
            setTimeout(()=> playTone({freq:1200 - STATE.level*30, duration:0.08, pan:pan*0.6, vol:vol*0.6}), 140);
        }, interval);
        updateLive(`Nivel ${STATE.level}. Empieza a buscar el sonido.`);
        speak(`Nivel ${STATE.level}. Empieza a buscar el sonido. Usa teclas uno a cuatro o pulsa un sector.`);
    }

    function stopBeacon(){
        if(STATE.beaconTimer){ clearInterval(STATE.beaconTimer); STATE.beaconTimer = null; }
        STATE.running = false;
    }

    function chooseTarget(){
        // choose random target different from previous
        const prev = STATE.target;
        let next = Math.floor(Math.random()*4);
        if(next===prev){ next = (next+1)%4; }
        STATE.target = next;
    }

    function updateLive(text){
        const live = document.getElementById('find-exit-live');
        if(live){ live.textContent = text; }
        const hint = document.getElementById('fx-hint');
        if(hint){ hint.textContent = text; }
    }

    function speak(text){
        try{
            const cb = document.getElementById('fx-voice');
            if(cb && !cb.checked) return;
            if('speechSynthesis' in window){
                const u = new SpeechSynthesisUtterance(text);
                u.lang = 'es-ES';
                u.rate = 1;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
            }
        }catch(e){ /* ignore */ }
    }

    // Attempt to use a higher-quality Spanish voice when available
    function getPreferredVoice(){
        if(!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        if(!voices.length) return null;
        // prefer non-default Spanish voices (Google/Microsoft) if present
        let v = voices.find(v=>/google/i.test(v.name) && /^es/i.test(v.lang));
        if(!v) v = voices.find(v=>/^es/i.test(v.lang) && /female|woman|mujer|female/i.test(v.name));
        if(!v) v = voices.find(v=>/^es/i.test(v.lang));
        if(!v) v = voices[0];
        return v;
    }

    function speakPreferred(text){
        try{
            const cb = document.getElementById('fx-voice');
            if(cb && !cb.checked) return;
            if('speechSynthesis' in window){
                const u = new SpeechSynthesisUtterance(text);
                u.lang = 'es-ES';
                const v = getPreferredVoice();
                if(v) u.voice = v;
                u.rate = 1;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
            }
        }catch(e){ /* ignore */ }
    }

    function showModal(title, body, usePreferred){
        const m = document.getElementById('fx-modal');
        if(!m) return;
        const t = document.getElementById('fx-modal-title');
        const b = document.getElementById('fx-modal-body');
        if(t) t.textContent = title;
        if(b) b.textContent = body;
        m.setAttribute('aria-hidden','false');
        if(usePreferred) speakPreferred(title);
        else speak(title);
        const btn = document.getElementById('fx-modal-continue');
        if(btn) btn.focus();
    }

    function hideModal(){
        const m = document.getElementById('fx-modal');
        if(!m) return;
        m.setAttribute('aria-hidden','true');
    }

    function onCorrect(el){
        stopBeacon();
        playSuccess();
        updateLive('Correcto. Avanzando al siguiente nivel.');
        speak('Correcto. Lo lograste.');
        STATE.corrects += 1;
        if(el){
            el.classList.add('correct');
            setTimeout(()=> el.classList.remove('correct'), 700);
        }
        STATE.level += 1;
        if(STATE.level > STATE.maxLevels){
            updateLive('Has encontrado la salida. Avanzando.');
            // show completion modal, speak with preferred voice if available
            showModal('Lo lograste', 'Has encontrado la salida.', true);
                // compute stats and show reflection after user continues (modal handler will call generateStats)
            return;
        }
        chooseTarget();
        setTimeout(startBeacon, 600);
    }

    function onIncorrect(el){
        playFail();
        updateLive('No es ahí. Intenta otro sector.');
        speak('No es ahí. Intenta otro sector.');
        // incorrect: do not increment corrects
        if(el){
            el.classList.add('incorrect');
            setTimeout(()=> el.classList.remove('incorrect'), 420);
        }
    }

    function handleSelect(index, el){
        if(!STATE.running) return;
        STATE.attempts += 1;
        if(parseInt(index,10) === STATE.target){ onCorrect(el); }
        else { onIncorrect(el); }
    }

    function wireUI(){
        const sectors = Array.from(document.querySelectorAll('.sectors-grid .sector'));
        sectors.forEach(s => {
            s.addEventListener('click', e => {
                e.preventDefault();
                // resume audio context on first interaction
                if(STATE.ctx && STATE.ctx.state === 'suspended') STATE.ctx.resume();
                const idx = s.getAttribute('data-index');
                handleSelect(idx, s);
            });
            s.addEventListener('keydown', e => {
                if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); s.click(); }
            });
        });

        document.getElementById('fx-start').addEventListener('click', ()=>{
            ensureAudio(); if(STATE.ctx && STATE.ctx.state === 'suspended') STATE.ctx.resume();
            // also resume speechSynthesis by interacting
            try{ window.speechSynthesis && window.speechSynthesis.cancel(); }catch(e){}
            STATE.level = 1;
            chooseTarget();
            // start/restart timer when user clicks Iniciar
            STATE.started = true; STATE.startTime = Date.now(); STATE.attempts = 0; STATE.corrects = 0;
            startBeacon();
            speak('Comienza la experiencia. Busca el sonido de la salida.');
        });
        document.getElementById('fx-reset').addEventListener('click', ()=>{
            stopBeacon(); STATE.level = 1; chooseTarget(); updateLive('Juego reiniciado. Pulsa Iniciar.');
        });

        // keyboard quick select 1-4
        window.addEventListener('keydown', e => {
            if(['1','2','3','4'].includes(e.key) && STATE.running){
                    const idx = parseInt(e.key,10)-1;
                    const el = document.querySelector(`.sector[data-index="${idx}"]`);
                    handleSelect(idx, el);
                }
        });

        // modal continue handler
        const modalContinue = document.getElementById('fx-modal-continue');
        if(modalContinue){
            modalContinue.addEventListener('click', ()=>{
                hideModal();
                // generate stats and show reflection
                generateStats();
                if(typeof window.showScreen === 'function') window.showScreen('blindnessReflection');
            });
        }
    }

    function init(){
        chooseTarget();
        wireUI();
        updateLive('Pulsa Iniciar para comenzar la prueba. Usa teclas 1 a 4 o pulsa los sectores.');
    }

    // Expose for debugging
    window.findExit = {
        init,
        start: ()=>{ document.getElementById('fx-start').click(); },
        stop: stopBeacon
    };

    function generateStats(){
        if(!STATE.started) return;
        const end = Date.now();
        const secs = Math.max(0, Math.round((end - STATE.startTime)/1000));
        const minutes = Math.floor(secs/60);
        const rem = secs % 60;
        const timeLabel = minutes > 0 ? `${minutes} min ${rem} s` : `${rem} s`;
        // estimate distance assuming 1.2 m/s walking speed
        const meters = Math.round(secs * 1.2);
        const successRate = STATE.attempts > 0 ? (STATE.corrects / STATE.attempts) : 0;
        let autonomy = 'Baja';
        if(successRate >= 0.75) autonomy = 'Alta';
        else if(successRate >= 0.4) autonomy = 'Media';
        const dependence = autonomy === 'Alta' ? 'Baja' : (autonomy === 'Media' ? 'Media' : 'Alta');

        const dEl = document.getElementById('stat-distance');
        const tEl = document.getElementById('stat-time');
        const aEl = document.getElementById('stat-autonomy');
        const depEl = document.getElementById('stat-dependence');
        if(dEl) dEl.textContent = `${meters} m`;
        if(tEl) tEl.textContent = `${timeLabel}`;
        if(aEl) aEl.textContent = `${autonomy}`;
        if(depEl) depEl.textContent = `${dependence}`;
        // play reflection audio via TTS (if enabled) using preferred voice when possible
        const reflectionText = 'No fue el camino lo que cambió. Cambió la manera de experimentarlo. Escuchar, interpretar y decidir cada movimiento requiere un esfuerzo adicional que muchas veces pasa desapercibido para quienes perciben la ciudad de otra forma.';
        speakPreferred(reflectionText);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
