// oscillation.js
// Simula oscilación / inestabilidad (muletas)

window.initOscillation = function(){
    let enabled = true;
    let intensity = 1.2; // px/deg

    function applyOsc(){
        const active = document.querySelector('.screen.active') || document.body;
        const t = (Date.now() % 2000) / 2000;
        const x = Math.sin(t * Math.PI * 2) * intensity;
        const y = Math.cos(t * Math.PI * 2) * intensity * 0.6;
        if(enabled){
            active.style.transform = `translate(${x}px, ${y}px) rotate(${x * 0.08}deg)`;
        }
        requestAnimationFrame(applyOsc);
    }

    requestAnimationFrame(applyOsc);

    window.toggleOscillation = function(v){ enabled = !!v; };
    window.setOscillationIntensity = function(n){ intensity = Number(n) || 0; };
};
