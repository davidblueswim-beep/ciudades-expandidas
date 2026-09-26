// ergodic.js
// Interacciones ergódicas que obligan a "sentir" la ciudad

window.initErgodicInteractions = function(){
    // Ejemplo: una acción que requiere pulsar repetidamente para completar una tarea
    window.requirePush = function(reps, onComplete){
        reps = reps || 6;
        let count = 0;
        const btn = document.createElement('button');
        btn.textContent = 'EMPUJAR';
        btn.style.position = 'fixed';
        btn.style.left = '20px';
        btn.style.bottom = '20px';
        btn.style.zIndex = 9999;
        document.body.appendChild(btn);

        function inc(){
            count++;
            btn.textContent = `EMPUJAR (${count}/${reps})`;
            if(count>=reps){
                btn.removeEventListener('click', inc);
                document.body.removeChild(btn);
                if(typeof onComplete === 'function') onComplete();
            }
        }

        btn.addEventListener('click', inc);
    };
};
