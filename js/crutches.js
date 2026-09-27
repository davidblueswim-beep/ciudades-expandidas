(function(){
    const PHRASES = [
        'Pon un poco más de esfuerzo.',
        'Solo una vez más.',
        'Tú puedes.',
        'Descansa e inténtalo una vez más.',
        'Último escalón.'
    ];
    const STATE = { step: 0, dragging: false, pointerId: null, videoTimer: null };
    const BALANCE = { progress: 0, dragging: false, pointerId: null, completed: false, errorTimer: null };

    function elements(){
        return {
            track: document.getElementById('climb-track'),
            origin: document.getElementById('climb-origin'),
            climber: document.getElementById('climber'),
            status: document.getElementById('climb-status'),
            videoModal: document.getElementById('climb-video-modal'),
            video: document.getElementById('climb-video'),
            videoStatus: document.getElementById('climb-video-status'),
            videoContinue: document.getElementById('climb-video-continue'),
            steps: Array.from(document.querySelectorAll('#climb-track .climb-step'))
        };
    }

    function centerOf(step, track){
        const rect = step.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - trackRect.left,
            y: rect.top + rect.height / 2 - trackRect.top
        };
    }

    function placeClimber(index){
        const {track, origin, climber, steps} = elements();
        const destination = index === 0 ? origin : steps[index - 1];
        if(!track || !climber || !destination) return;
        const center = centerOf(destination, track);
        climber.style.left = `${center.x}px`;
        climber.style.top = `${center.y}px`;
    }

    function balanceElements(){
        return {
            course: document.getElementById('balance-course'),
            svg: document.getElementById('balance-svg'),
            path: document.querySelector('#balance-svg .balance-line'),
            progressPath: document.getElementById('balance-progress'),
            climber: document.getElementById('balance-climber'),
            status: document.getElementById('balance-status'),
            finish: document.getElementById('balance-continue'),
            alert: document.getElementById('balance-alert'),
            alertDismiss: document.getElementById('balance-alert-dismiss')
        };
    }

    function placeBalanceClimber(length){
        const {course, path, progressPath, climber} = balanceElements();
        const matrix = path && path.getScreenCTM();
        if(!course || !matrix || !climber) return;
        const total = path.getTotalLength();
        const point = path.getPointAtLength(Math.max(0, Math.min(total, length)));
        const screenPoint = path.ownerSVGElement.createSVGPoint();
        screenPoint.x = point.x;
        screenPoint.y = point.y;
        const position = screenPoint.matrixTransform(matrix);
        const bounds = course.getBoundingClientRect();
        climber.style.left = `${position.x - bounds.left}px`;
        climber.style.top = `${position.y - bounds.top}px`;
        progressPath.style.strokeDasharray = `${total}`;
        progressPath.style.strokeDashoffset = `${total - Math.max(0, Math.min(total, length))}`;
    }

    function updateBalanceProgress(length){
        const {path, status, finish, climber} = balanceElements();
        const total = path.getTotalLength();
        BALANCE.progress = Math.max(0, Math.min(total, length));
        if(BALANCE.progress >= total - 20){
            BALANCE.progress = total;
            BALANCE.completed = true;
            status.textContent = '¡Lo lograste! Mantuviste el equilibrio.';
            finish.disabled = false;
            climber.setAttribute('aria-label', 'Reto completado. Mantuviste el equilibrio.');
        }
        placeBalanceClimber(BALANCE.progress);
    }

    function resetBalance(message='Sigue la línea hasta el final sin salirte.'){
        const {course, climber, status, finish, alert} = balanceElements();
        if(BALANCE.errorTimer){
            clearTimeout(BALANCE.errorTimer);
            BALANCE.errorTimer = null;
        }
        BALANCE.progress = 0;
        BALANCE.dragging = false;
        BALANCE.pointerId = null;
        BALANCE.completed = false;
        course.classList.remove('is-error');
        status.textContent = message;
        finish.disabled = true;
        alert.setAttribute('aria-hidden', 'true');
        climber.classList.remove('is-dragging');
        climber.setAttribute('aria-label', 'Persona con muletas. Arrastra siguiendo la línea.');
        placeBalanceClimber(0);
    }

    function showBalanceAlert(){
        const {alert, alertDismiss} = balanceElements();
        alert.setAttribute('aria-hidden', 'false');
        alertDismiss.focus();
    }

    function hideBalanceAlert(restoreFocus=true){
        const {alert, climber} = balanceElements();
        alert.setAttribute('aria-hidden', 'true');
        if(restoreFocus && document.getElementById('crutches02').classList.contains('active')) climber.focus();
    }

    function closestBalancePoint(clientX, clientY){
        const {svg, path} = balanceElements();
        const matrix = svg.getScreenCTM();
        if(!matrix) return null;
        const pointer = svg.createSVGPoint();
        pointer.x = clientX;
        pointer.y = clientY;
        const localPointer = pointer.matrixTransform(matrix.inverse());
        const total = path.getTotalLength();
        let closest = {length: 0, distance: Infinity};
        for(let length = 0; length <= total; length += 6){
            const point = path.getPointAtLength(length);
            const distance = Math.hypot(point.x - localPointer.x, point.y - localPointer.y);
            if(distance < closest.distance) closest = {length, distance};
        }
        const end = path.getPointAtLength(total);
        const endDistance = Math.hypot(end.x - localPointer.x, end.y - localPointer.y);
        if(endDistance < closest.distance) closest = {length: total, distance: endDistance};
        return closest;
    }

    function wireBalance(){
        const {course, climber, path, alert, alertDismiss} = balanceElements();

        alertDismiss.addEventListener('click', ()=> hideBalanceAlert());
        alert.addEventListener('keydown', event=>{
            if(event.key === 'Escape'){
                event.preventDefault();
                hideBalanceAlert();
            } else if(event.key === 'Tab'){
                event.preventDefault();
                alertDismiss.focus();
            }
        });

        climber.addEventListener('pointerdown', event=>{
            if(BALANCE.completed) return;
            event.preventDefault();
            BALANCE.dragging = true;
            BALANCE.pointerId = event.pointerId;
            climber.classList.add('is-dragging');
            climber.setPointerCapture(event.pointerId);
        });

        climber.addEventListener('pointermove', event=>{
            if(!BALANCE.dragging || event.pointerId !== BALANCE.pointerId) return;
            const nearest = closestBalancePoint(event.clientX, event.clientY);
            if(!nearest) return;
            if(nearest.distance > 40){
                BALANCE.dragging = false;
                BALANCE.pointerId = null;
                climber.classList.remove('is-dragging');
                if(climber.hasPointerCapture(event.pointerId)) climber.releasePointerCapture(event.pointerId);
                const errorMessage = '¡Te saliste de la línea! Vuelve al inicio, inténtalo otra vez y hazlo despacio.';
                resetBalance(errorMessage);
                course.classList.remove('is-error');
                void course.offsetWidth;
                course.classList.add('is-error');
                BALANCE.errorTimer = setTimeout(()=> course.classList.remove('is-error'), 450);
                showBalanceAlert();
                return;
            }
            updateBalanceProgress(nearest.length);
        });

        function endBalanceDrag(event){
            if(!BALANCE.dragging || event.pointerId !== BALANCE.pointerId) return;
            BALANCE.dragging = false;
            BALANCE.pointerId = null;
            climber.classList.remove('is-dragging');
        }

        climber.addEventListener('pointerup', endBalanceDrag);
        climber.addEventListener('pointercancel', endBalanceDrag);
        climber.addEventListener('keydown', event=>{
            if((event.key === 'ArrowRight' || event.key === 'ArrowUp') && !BALANCE.completed){
                event.preventDefault();
                updateBalanceProgress(BALANCE.progress + 36);
            }
        });
        path.addEventListener('click', ()=> climber.focus());
    }

    function spanishVoice(){
        const voices = window.speechSynthesis.getVoices() || [];
        if(!voices.length) return null;
        let voice = voices.find(item => {
            const name = (item.name || '').toLowerCase();
            const lang = (item.lang || '').toLowerCase();
            if(name.includes('google') && (lang.includes('es-us') || name.includes('spanish') && name.includes('us'))) return true;
            if(lang === 'es-us') return true;
            return false;
        });
        if(!voice) voice = voices.find(item => /google/i.test(item.name) && /^es/i.test(item.lang));
        if(!voice) voice = voices.find(item => /^es/i.test(item.lang));
        return voice || voices[0] || null;
    }

    function speak(text, onComplete){
        if(!('speechSynthesis' in window)){
            if(onComplete) onComplete();
            return;
        }
        let completed = false;
        const finishSpeech = ()=>{
            if(completed) return;
            completed = true;
            if(onComplete) onComplete();
        };
        try{
            const utterance = new SpeechSynthesisUtterance(text);
            const voice = spanishVoice();
            if(voice){
                utterance.voice = voice;
                utterance.lang = voice.lang;
            } else {
                utterance.lang = 'es-US';
            }
            utterance.rate = 0.95;
            if(onComplete){
                utterance.onend = finishSpeech;
                utterance.onerror = finishSpeech;
            }
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        }catch(error){
            if(onComplete) finishSpeech();
        }
    }

    function openClimbVideo(){
        const {videoModal, video, videoStatus, videoContinue} = elements();
        videoModal.setAttribute('aria-hidden', 'false');
        videoStatus.textContent = 'Mira el recorrido antes de continuar.';
        videoContinue.disabled = true;
        video.currentTime = 0;
        video.focus();
        const playback = video.play();
        if(playback && typeof playback.catch === 'function'){
            playback.catch(()=>{
                videoStatus.textContent = 'Pulsa reproducir para ver el video.';
            });
        }
    }

    function closeClimbVideo(){
        const {videoModal, video} = elements();
        video.pause();
        videoModal.setAttribute('aria-hidden', 'true');
        window.showScreen('crutchesReflection');
    }

    function wireClimbVideo(){
        const {videoModal, video, videoStatus, videoContinue} = elements();
        video.addEventListener('ended', ()=>{
            videoStatus.textContent = 'Ya puedes continuar.';
            videoContinue.disabled = false;
            videoContinue.focus();
        });
        video.addEventListener('error', ()=>{
            videoStatus.textContent = 'No se pudo reproducir el video. Puedes continuar.';
            videoContinue.disabled = false;
            videoContinue.focus();
        });
        videoContinue.addEventListener('click', closeClimbVideo);
        videoModal.addEventListener('keydown', event=>{
            if(event.key === 'Escape') event.preventDefault();
        });
    }

    function completeStep(){
        if(STATE.step >= PHRASES.length) return;
        const {steps, status, climber} = elements();
        steps[STATE.step].classList.add('is-complete');
        STATE.step += 1;
        if(steps[STATE.step]) steps[STATE.step].classList.add('is-current');
        placeClimber(STATE.step);
        if(STATE.step === PHRASES.length){
            status.textContent = '¡Llegaste al último escalón!';
            climber.setAttribute('aria-label', 'Llegaste al último escalón');
            speak(PHRASES[STATE.step - 1], ()=>{
                STATE.videoTimer = setTimeout(()=>{
                    STATE.videoTimer = null;
                    if(document.getElementById('crutches03').classList.contains('active')) openClimbVideo();
                }, 1200);
            });
        } else {
            speak(PHRASES[STATE.step - 1]);
            status.textContent = `Escalón ${STATE.step + 1} de ${PHRASES.length}`;
            climber.setAttribute('aria-label', `Persona con muletas en el escalón ${STATE.step + 1} de ${PHRASES.length}`);
        }
    }

    function reset(){
        const {steps, status, climber, videoModal, video, videoStatus, videoContinue} = elements();
        if(STATE.videoTimer){
            clearTimeout(STATE.videoTimer);
            STATE.videoTimer = null;
        }
        STATE.step = 0;
        STATE.dragging = false;
        STATE.pointerId = null;
        steps.forEach((step, index)=>{
            step.classList.toggle('is-current', index === 0);
            step.classList.remove('is-complete');
        });
        video.pause();
        video.currentTime = 0;
        videoModal.setAttribute('aria-hidden', 'true');
        videoStatus.textContent = 'Mira el recorrido antes de continuar.';
        videoContinue.disabled = true;
        status.textContent = 'Escalón 1 de 5';
        climber.setAttribute('aria-label', 'Persona con muletas en el escalón 1 de 5. Arrastra al siguiente escalón.');
        placeClimber(0);
    }

    function wireDrag(){
        const {track, climber, steps} = elements();

        climber.addEventListener('pointerdown', event=>{
            if(STATE.step >= PHRASES.length) return;
            event.preventDefault();
            STATE.dragging = true;
            STATE.pointerId = event.pointerId;
            climber.classList.add('is-dragging');
            climber.setPointerCapture(event.pointerId);
        });

        climber.addEventListener('pointermove', event=>{
            if(!STATE.dragging || event.pointerId !== STATE.pointerId) return;
            const rect = track.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
            climber.style.left = `${x}px`;
            climber.style.top = `${y}px`;
        });

        function endDrag(event){
            if(!STATE.dragging || event.pointerId !== STATE.pointerId) return;
            STATE.dragging = false;
            STATE.pointerId = null;
            climber.classList.remove('is-dragging');
            const target = steps[STATE.step];
            if(target){
                const center = centerOf(target, track);
                const rect = track.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                const tolerance = Math.max(46, Math.min(86, rect.width * 0.1));
                if(Math.hypot(x - center.x, y - center.y) <= tolerance){
                    completeStep();
                    return;
                }
            }
            placeClimber(STATE.step);
        }

        climber.addEventListener('pointerup', endDrag);
        climber.addEventListener('pointercancel', endDrag);
        climber.addEventListener('keydown', event=>{
            if((event.key === 'ArrowRight' || event.key === 'ArrowUp') && STATE.step < PHRASES.length){
                event.preventDefault();
                completeStep();
            }
        });
    }

    function init(){
        if(document.getElementById('balance-course')){
            wireBalance();
            if(document.getElementById('crutches02').classList.contains('active')) resetBalance();
            window.addEventListener('resize', ()=>{
                if(!BALANCE.dragging && document.getElementById('crutches02').classList.contains('active')){
                    placeBalanceClimber(BALANCE.progress);
                }
            });
            window.addEventListener('screenShown', event=>{
                if(!event.detail) return;
                if(event.detail.id === 'crutches02') resetBalance();
                else hideBalanceAlert(false);
            });
        }
        if(document.getElementById('climb-track')){
            wireClimbVideo();
            wireDrag();
            reset();
            window.addEventListener('resize', ()=>{
                if(!STATE.dragging) placeClimber(STATE.step);
            });
            window.addEventListener('screenShown', event=>{
                if(!event.detail) return;
                if(event.detail.id === 'crutches03') reset();
                else if(STATE.videoTimer){
                    clearTimeout(STATE.videoTimer);
                    STATE.videoTimer = null;
                }
            });
        }
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();