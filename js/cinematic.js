// cinematic.js
// Transiciones cinematográficas con GSAP

window.cinematicTransition = function(selector){
    const el = (typeof selector === 'string') ? document.querySelector(selector) : selector;
    if(!el){ console.warn('Elemento no encontrado para cinematicTransition'); return; }
    if(typeof gsap === 'undefined'){
        // Fallback simple
        el.style.transition = 'opacity .8s ease, transform .8s ease';
        el.style.opacity = 0;
        el.style.transform = 'translateY(30px)';
        requestAnimationFrame(()=>{
            el.style.opacity = 1;
            el.style.transform = 'translateY(0)';
        });
        return;
    }

    gsap.fromTo(el, {opacity:0, y:40}, {opacity:1, y:0, duration:1, ease:'power2.out'});
};
