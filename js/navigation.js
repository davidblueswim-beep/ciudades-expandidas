// Simple navigation with history stack and global left-side buttons
window._screenHistory = window._screenHistory || [];

function stopSpeechIfAny(){
	try{
		if(window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function'){
			window.speechSynthesis.cancel();
		}
	}catch(e){}
}

function showSelectorTransition(){
	if(typeof window.playWheelchairVideoOverlay === 'function'){
		window.playWheelchairVideoOverlay('assets/video3.mp4', 'selector');
		return;
	}
	showScreen('selector');
}

window.showSelectorTransition = showSelectorTransition;

function showScreen(id){
	stopSpeechIfAny();
	const current = document.querySelector('.screen.active');
	if(current && current.id !== id){
		window._screenHistory.push(current.id);
	}

	const screens = document.querySelectorAll('.screen');
	screens.forEach(s => s.classList.remove('active'));
	const target = document.getElementById(id);
	if(target) target.classList.add('active');

	// Audio handling: play ambient audio when entering 'blindness02', stop when leaving
	try{
		// stop ambience if we left the crossing screen
		if(window._lastScreen === 'blindness02' && window.audioManager && window.audioManager.ambience){
			try{ window.audioManager.ambience.stop(); }catch(e){}
		}

		if(id === 'blindness02' && typeof initSpatialAudio === 'function'){
			initSpatialAudio().then(am=>{
				// ensure user gesture resumed audio if needed
				if(typeof resumeAudioIfNeeded === 'function') resumeAudioIfNeeded();
				if(am && am.ambience && typeof am.ambience.play === 'function'){
					try{ am.ambience.play(); }catch(e){ console.warn('ambience play failed', e); }
				}else if(am && am.createPositional){
					// fallback: create a positional ambient source
					am.createPositional('ambient','assets/audio/city_ambience.mp3',{position:[0,0,0],loop:true,volume:0.6}).catch(()=>{});
					am.setListener(0,0,0);
				}
			}).catch(()=>{});
		}
	}catch(e){ console.warn('audio handling error', e); }

	// track last screen for cleanup

	// if we are leaving wheelchair02, pause its background video
	try{
		if(window._lastScreen === 'wheelchair02'){
			const prevV = document.querySelector('#wheelchair02 video');
			if(prevV && !prevV.paused){ try{ prevV.pause(); }catch(e){} }
		}
	}catch(e){}

	window._lastScreen = id;

	// if entering wheelchair02, try to play its video once
	try{
		if(id === 'wheelchair02'){
			const v = document.querySelector('#wheelchair02 video');
			if(v){
				v.loop = false;
				try{ v.currentTime = 0; }catch(e){}
				const p = v.play();
				if(p && p.catch){ p.catch(err=>{ console.warn('wheelchair02 video play blocked', err); }); }
			}
		}
	}catch(e){ console.warn('wheelchair02 play error', e); }

	// When entering blindness02: show intro message, hide options for 10s, then reveal
	if(id === 'blindness02'){
		showDelayedCrossOptions();
	} else {
		// if leaving blindness02 while timer active, clear and remove intro
		if(window._crossIntroTimer){
			clearTimeout(window._crossIntroTimer);
			window._crossIntroTimer = null;
		}

		// stop any city/semafor audio sequence when leaving
		try{ if(typeof window.stopCitySequence === 'function') window.stopCitySequence(); }catch(e){}
		const existing = document.querySelector('.cross-intro');
		if(existing) existing.remove();
		// ensure buttons are visible when not on that screen
		const btns = document.querySelectorAll('.btn-cruzar, .btn-esperar');
		btns.forEach(b=>{ b.style.display = ''; });
	}

	// dispatch a global event so other modules can react to screen changes
	try{ window.dispatchEvent(new CustomEvent('screenShown',{detail:{id:id}})); }catch(e){}
}

function goBack(){
	const prev = window._screenHistory.pop();
	if(prev){
		showScreen(prev);
	}else{
		// default to landing if no history
		showScreen('landing');
	}
}

function goHome(){
	// clear history and go to landing
	window._screenHistory = [];
	showScreen('landing');
}

// Create global nav buttons on the left side
function ensureGlobalNav(){
	if(document.querySelector('.global-nav')) return;
	const nav = document.createElement('div');
	nav.className = 'global-nav';

	const btnBack = document.createElement('button');
	btnBack.className = 'nav-button back';
	btnBack.setAttribute('aria-label','Volver');
	btnBack.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	btnBack.addEventListener('click', (e)=>{ e.preventDefault(); goBack(); });

	const btnHome = document.createElement('button');
	btnHome.className = 'nav-button home';
	btnHome.setAttribute('aria-label','Inicio');
	btnHome.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 9.5L12 3L21 9.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21V12h6v9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	btnHome.addEventListener('click', (e)=>{ e.preventDefault(); goHome(); });

	nav.appendChild(btnBack);
	nav.appendChild(btnHome);
	document.body.appendChild(nav);
}

document.addEventListener('DOMContentLoaded', ()=>{
	ensureGlobalNav();
	document.addEventListener('click', (event)=>{
		const btn = event.target.closest('button');
		if(!btn) return;
		const text = (btn.textContent || '').trim().toUpperCase();
		if(text === 'VER OTRA EXPERIENCIA'){
			event.preventDefault();
			showSelectorTransition();
		}
	});
});

// expose functions
window.showScreen = showScreen;
window.goBack = goBack;
window.goHome = goHome;
window.stopSpeechIfAny = stopSpeechIfAny;

// Show a crossing prompt when the user chooses to cross
function showCrossPrompt(){
	if(document.querySelector('.cross-prompt')) return;
	const overlay = document.createElement('div');
	overlay.className = 'cross-prompt';
	overlay.innerHTML = `
		<div class="cross-prompt-inner">
			<p>Utiliza tu bastón: siente el suelo y el ambiente, los sonidos a tu alrededor.</p>
			<div class="cross-prompt-actions">
				<button class="cross-ok">Entendido</button>
			</div>
		</div>
	`;
	document.body.appendChild(overlay);
	const btn = overlay.querySelector('.cross-ok');
	if(btn) btn.addEventListener('click', ()=> overlay.remove());
}

window.showCrossPrompt = showCrossPrompt;

// Show intro message on blindness02, hide options for 10 seconds then reveal them
function showDelayedCrossOptions(){
	// avoid duplicate
	if(document.querySelector('#blindness02 .cross-intro-inline')) return;

	const section = document.getElementById('blindness02');
	if(!section) return;
	const btnC = section.querySelector('.btn-cruzar');
	const btnE = section.querySelector('.btn-esperar');
	const btnContainer = section.querySelector('div');

	// hide buttons until timer expires
	if(btnC) btnC.style.display = 'none';
	if(btnE) btnE.style.display = 'none';

	const intro = document.createElement('div');
	intro.className = 'cross-intro-inline';
	intro.innerHTML = `<div class="cross-intro-inner"><p>Utiliza tu bastón: siente el suelo y el ambiente, los sonidos a tu alrededor.</p><p class="countdown">Espera 10s...</p></div>`;

	// insert intro above the buttons container
	if(btnContainer) section.insertBefore(intro, btnContainer);
	else section.appendChild(intro);

	let remaining = 10;
	const countdownEl = intro.querySelector('.countdown');
	window._crossIntroTimer = setInterval(()=>{
		remaining -= 1;
		if(countdownEl) countdownEl.textContent = `Espera ${remaining}s...`;
		if(remaining <= 0){
			clearInterval(window._crossIntroTimer);
			window._crossIntroTimer = null;
			// reveal buttons
			if(btnC) btnC.style.display = '';
			if(btnE) btnE.style.display = '';
			// attach action: CRUZAR continues to next screen and stops audio
			if(btnC) btnC.onclick = function(e){ e.preventDefault(); window.stopCitySequence(); showScreen('blindness03'); };
			// ESPERAR restarts the sequence
			if(btnE) btnE.onclick = function(e){ e.preventDefault(); window.startCitySequence(); };

			// start the city->semafor sequence automatically when buttons appear
			try{ window.startCitySequence(); }catch(e){ console.warn('startCitySequence failed', e); }
			// fade and remove intro after short time
			intro.classList.add('hide');
			setTimeout(()=> intro.remove(), 400);
		}
	}, 1000);
}

window.showDelayedCrossOptions = showDelayedCrossOptions;

// Manage city -> semafor sequence so it can be stopped/restarted
window.stopCitySequence = function(){
	try{
		if(window._citySeqTimeout){ clearTimeout(window._citySeqTimeout); window._citySeqTimeout = null; }
		if(window._citySeqSource){
			const s = window._citySeqSource;
			try{ if(s.source && typeof s.source.stop === 'function') s.source.stop(); }catch(e){}
			try{ if(typeof s.stop === 'function') s.stop(); }catch(e){}
		}
	}catch(e){ console.warn('stopCitySequence error', e); }
	window._citySeqSource = null;
};

window.startCitySequence = async function(){
	// restart sequence: stop existing then start 10s city ambience then semafor
	try{
		window.stopCitySequence();
		const am = (typeof initSpatialAudio === 'function') ? await initSpatialAudio() : window.audioManager;
		const CITY = 'assets/audio/city_ambience.mp3';

		if(am && typeof am.playOneShot === 'function'){
			// play city ambience once
			const s = await am.playOneShot(CITY, {position:[0,0,0], volume:0.9});
			window._citySeqSource = s;
		}else{
			// fallback using Howler directly
			if(typeof Howl !== 'undefined'){
				const h = new Howl({ src:[CITY], loop:false, volume:0.9 });
				try{ h.play(); window._citySeqSource = h; }catch(e){}
			}
		}
	}catch(e){ console.warn('startCitySequence error', e); }
};