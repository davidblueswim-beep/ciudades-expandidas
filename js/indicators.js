// indicators.js
// Indicadores de esfuerzo y autonomía

window.initIndicators = function(){
    if(document.querySelector('.indicator-wrap')) return;

    const label = document.createElement('div');
    label.className = 'indicator-label';
    label.textContent = 'Esfuerzo';
    document.body.appendChild(label);

    const wrap = document.createElement('div');
    wrap.className = 'indicator-wrap';
    const bar = document.createElement('div');
    bar.className = 'indicator';
    wrap.appendChild(bar);
    document.body.appendChild(wrap);

    window.setEffort = function(value){
        // value 0..1
        const v = Math.max(0, Math.min(1, Number(value) || 0));
        bar.style.height = `${Math.round(v * 100)}%`;
    };

    // Initialize at 0
    setEffort(0);
};
