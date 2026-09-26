// locomotive-init.js
// Inicializador ligero para Locomotive Scroll

window.initLocomotive = function(){
    if(typeof LocomotiveScroll === 'undefined'){
        console.warn('Locomotive Scroll no está cargado.');
        return;
    }

    // Busca un contenedor con data-scroll-container, si no existe usa body
    const container = document.querySelector('[data-scroll-container]') || document.querySelector('body');

    try{
        window.loco = new LocomotiveScroll({
            el: container,
            smooth: true,
            multiplier: 1,
        });
    }catch(e){
        console.warn('Error inicializando Locomotive:', e);
    }
};
