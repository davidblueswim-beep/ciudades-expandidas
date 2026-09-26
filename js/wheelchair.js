let progress = 0;

function pushHill(){

progress += 10;

const bar =
document.getElementById("bar");

bar.style.width =
progress + "%";

if(progress >= 100){

alert(
"Has superado la pendiente"
);

showScreen(
"wheelchairReflection"
);

}

}