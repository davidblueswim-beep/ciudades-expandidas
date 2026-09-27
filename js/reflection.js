// reflection.js — manage reflection screens, voice selection, and TTS
(function(){
    // Force Google Spanish (US) when available, fallback to any Spanish or default
    function listVoices(){
        const synth = window.speechSynthesis;
        return synth && synth.getVoices ? synth.getVoices() : [];
    }

    function findGoogleSpanishUSVoice(){
        const voices = listVoices();
        if(!voices || voices.length===0) return null;
        let v = voices.find(voice => {
            const name = (voice.name||'').toLowerCase();
            const lang = (voice.lang||'').toLowerCase();
            if(name.includes('google') && (lang.includes('es-us') || name.includes('spanish') && name.includes('us'))) return true;
            if(lang === 'es-us') return true;
            return false;
        });
        if(v) return v;
        v = voices.find(voice => /google/i.test(voice.name) && /^es/i.test(voice.lang));
        if(v) return v;
        v = voices.find(voice => /^es/i.test(voice.lang));
        if(v) return v;
        return voices[0] || null;
    }

    function speakForced(text){
        if(!('speechSynthesis' in window)) return;
        const utter = new SpeechSynthesisUtterance(text);
        const voice = findGoogleSpanishUSVoice();
        if(voice){ utter.voice = voice; if(voice.lang) utter.lang = voice.lang; }
        else { utter.lang = 'es-ES'; }
        utter.rate = 1.0; utter.pitch = 1.0;
        try{ window.speechSynthesis.cancel(); }catch(e){}
        window.speechSynthesis.speak(utter);
    }

    function renderComparisonFor(screenId){
        const section = document.getElementById(screenId);
        if(!section) return;
        const container = section.querySelector('.reflection-stats');
        if(container){
            const spans = container.querySelectorAll('.stat span');
            if(spans && spans.length >= 4){
                spans[0].textContent = 'La misma';
                spans[1].textContent = 'Caminante: 5 min — Silla: 11 min';
                spans[2].textContent = 'Menor';
                spans[3].textContent = 'Mayor';
            }
        }

        const cardId = 'time-comparison-card-' + screenId;
        if(document.getElementById(cardId)) return;
        const card = document.createElement('div');
        card.id = cardId;
        if(screenId === 'wheelchairReflection'){
            card.className = 'time-comparison wheelchair';
            card.innerHTML = `
                <div class="tc-title">Comparación de tiempos</div>
                <div class="wc-row">
                    <div class="wc-icon">🚶</div>
                    <div class="wc-bar-wrap"><div class="wc-bar"><div class="wc-fill" style="width:45%"></div></div></div>
                    <div class="wc-value">5 min</div>
                </div>
                <div class="wc-row">
                    <div class="wc-icon">🦽</div>
                    <div class="wc-bar-wrap"><div class="wc-bar"><div class="wc-fill" style="width:100%"></div></div></div>
                    <div class="wc-value">11 min</div>
                </div>
                <div class="tc-note">La distancia fue la misma. La experiencia cambió.</div>
            `;
        } else {
            card.className = 'time-comparison large';
            card.innerHTML = `
                <div class="tc-title">Comparación de tiempos</div>
                <div class="tc-row">
                    <div class="tc-icon">🚶</div>
                    <div class="tc-bar"><div class="tc-fill" style="width:45%"></div></div>
                    <div class="tc-value">5 min</div>
                </div>
                <div class="tc-row">
                    <div class="tc-icon">🦽</div>
                    <div class="tc-bar"><div class="tc-fill" style="width:100%"></div></div>
                    <div class="tc-value">11 min</div>
                </div>
                <div class="tc-note">La distancia fue la misma. La experiencia cambió.</div>
            `;
        }
        const refContainer = (container && container.parentNode) || section;
        refContainer.insertBefore(card, container || section.firstChild);
    }

    function wirePlayButton(section){
        if(!section) return;
        const play = section.querySelector('.reflection-play');
        if(play){
            play.addEventListener('click', ()=>{
                const text = 'Para algunas personas, cruzar una calle toma minutos. Para otras, requiere buscar rutas alternativas, superar barreras físicas y realizar un esfuerzo constante. La ciudad debería ofrecer las mismas oportunidades de movilidad para todos.';
                speakForced(text);
            });
        }
    }

    function getWheelchairReflectionText(){
        return 'Para algunas personas, cruzar una calle toma minutos. Para otras, requiere buscar rutas alternativas, superar barreras físicas y realizar un esfuerzo constante. La ciudad debería ofrecer las mismas oportunidades de movilidad para todos.';
    }

    function speakWheelchairReflection(){
        const text = getWheelchairReflectionText();
        if(!('speechSynthesis' in window)) return false;
        try{
            const utter = new SpeechSynthesisUtterance(text);
            const voice = findGoogleSpanishUSVoice();
            if(voice){
                utter.voice = voice;
                if(voice.lang) utter.lang = voice.lang;
            } else {
                utter.lang = 'es-US';
            }
            utter.rate = 1.0;
            utter.pitch = 1.0;
            try{ window.speechSynthesis.cancel(); }catch(e){}
            window.speechSynthesis.speak(utter);
            return true;
        }catch(e){ return false; }
    }

    function onScreenShown(e){
        if(!e || !e.detail) return;
        const id = e.detail.id;
        if(id === 'wheelchairReflection'){
            renderComparisonFor(id);
            const section = document.getElementById(id);
            speakWheelchairReflection();
            if(section && section.querySelector('.reflection-play')){
                wirePlayButton(section);
            }
        }
    }

    // when available, re-evaluate voices
    window.addEventListener('voiceschanged', ()=>{});
    window.addEventListener('screenShown', onScreenShown);
    document.addEventListener('DOMContentLoaded', ()=>{
        const active = document.querySelector('.screen.active');
        if(active && active.id === 'wheelchairReflection'){
            renderComparisonFor(active.id);
            wirePlayButton(document.getElementById(active.id));
            setTimeout(()=>{ speakWheelchairReflection(); }, 400);
        }
    });
})();