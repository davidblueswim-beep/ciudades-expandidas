let progress = 0;
let slopeStep = 0;

function updateSlopeImage(){
	const img = document.getElementById('slope-bg-image');
	if(!img) return;
	const stage = Math.min(3, Math.max(1, slopeStep));
	img.src = `assets/slope${stage}.svg`;
}

function resetSlopeSequence(){
	slopeStep = 0;
	progress = 0;
	const bar = document.getElementById('bar');
	if(bar) bar.style.width = '0%';
	updateSlopeImage();
	updateSlope(0);
}

function pushHill(){
	if(slopeStep >= 3) return;

	slopeStep += 1;
	progress = Math.min(100, slopeStep * 34);
	const bar = document.getElementById('bar');
	if(bar) bar.style.width = progress + '%';
	updateSlopeImage();
	updateSlope(progress);

	if(slopeStep >= 3){
		setTimeout(()=>{
			showScreen('wheelchairReflection');
		}, 250);
	}
}

function updateSlope(p){
	// p: 0..100 — move wheelchair marker along diagonal path
	const marker = document.getElementById('wheelchair-marker');
	const track = document.getElementById('slope-track');
	if(!marker || !track) return;
	const pct = Math.max(0, Math.min(100, p));
	// compute translation: x from 6% -> 82%, y from bottom 6% -> 78%
	const startX = 6; const endX = 82;
	const startY = 6; const endY = 78;
	const x = startX + (endX - startX) * (pct/100);
	const y = startY + (endY - startY) * (pct/100);
	// set transform (translate by percent of track width/height)
	marker.style.left = x + '%';
	marker.style.bottom = y + '%';
	// subtle rotation to simulate slope
	const rot = Math.min(18, 4 + (pct/100)*14);
	marker.style.transform = `translate(-50%, 0) rotate(${rot}deg)`;
}

// simple 3-click sequence: slope1 -> slope2 -> slope3 -> reflection
function wirePushHold(){
	const btn = document.getElementById('btn-push');
	if(!btn) return;
	btn.addEventListener('click', (e)=>{
		e.preventDefault();
		pushHill();
	});
}

function playWheelchairVideoOverlay(videoPath, nextScreen){
	if(document.getElementById('wheelchair-video-overlay')) return;

	const overlayMessage = document.createElement('div');
	overlayMessage.id = 'wheelchair-wait-message';
	overlayMessage.textContent = 'Espera';
	overlayMessage.setAttribute('aria-live', 'polite');
	document.body.appendChild(overlayMessage);

	const video = document.createElement('video');
	video.id = 'wheelchair-video-overlay';
	video.className = 'wheelchair-video-overlay';
	video.autoplay = true;
	video.playsInline = true;
	video.controls = false;
	video.src = videoPath;
	video.setAttribute('preload','auto');
	video.setAttribute('muted','false');
	document.body.appendChild(video);

	function cleanAndNext(){
		try{ video.pause(); }catch(e){}
		video.remove();
		if(overlayMessage && overlayMessage.parentNode){ overlayMessage.parentNode.removeChild(overlayMessage); }
		showScreen(nextScreen);
	}

	video.addEventListener('ended', ()=>{ cleanAndNext(); });
	video.addEventListener('error', ()=>{ console.warn('Wheelchair overlay video failed to play, continuing.'); cleanAndNext(); });
	const p = video.play();
	if(p && p.catch){ p.catch(()=>{ /* fallback */ }); }
}

window.playWheelchairVideoOverlay = playWheelchairVideoOverlay;

// Play an inline fullscreen video for the wheelchair intro, then navigate to wheelchair02
function startWheelchairVideo(){
	const section = document.getElementById('wheelchair01');
	if(!section){ showScreen('wheelchair02'); return; }
	playWheelchairVideoOverlay('assets/video4.mp4', 'wheelchair02');
}

// initialize push hold wiring after DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
	wirePushHold();
	resetSlopeSequence();
});

document.addEventListener('screenShown', (event)=>{
	if(event && event.detail && event.detail.id === 'wheelchair03'){
		resetSlopeSequence();
	}
});