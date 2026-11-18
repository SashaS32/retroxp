const diskInput=document.getElementById('diskFile');
const startBtn=document.getElementById('startBtn');
const stopBtn=document.getElementById('stopBtn');
const fullscreenBtn=document.getElementById('fullscreenBtn');
const screenFullscreenBtn=document.getElementById('screenFullscreenBtn');
const screenWrap=document.querySelector('.screen-wrap');
const statusEl=document.getElementById('status');
const hint=document.getElementById('hint');
const placeholder=document.getElementById('placeholder');
let emulator=null, diskBuffer=null;
function setStatus(text){statusEl.textContent=text;}
diskInput.addEventListener('change',async()=>{
  const file=diskInput.files?.[0]; if(!file)return;
  if(file.size===0){hint.textContent='Файл пустой. Выбери другой образ диска.';return;}
  hint.textContent=`Выбран: ${file.name} · ${(file.size/1024/1024).toFixed(1)} МБ. Читаю файл локально…`;
  try{diskBuffer=await file.arrayBuffer();startBtn.disabled=false;hint.textContent=`Готово: ${file.name}. Файл остаётся в этом браузере и не отправляется на сервер.`;setStatus('ДИСК ПОДКЛЮЧЁН');}
  catch(e){hint.textContent='Не удалось прочитать файл: '+e.message;}
});
startBtn.addEventListener('click',async()=>{
  if(!diskBuffer)return;
  if(typeof V86Starter==='undefined'){hint.textContent='Не загрузилась библиотека v86. Проверь подключение к интернету и обнови страницу.';return;}
  startBtn.disabled=true;diskInput.disabled=true;setStatus('ЗАПУСК…');hint.textContent='Запускаю эмулятор. Первая загрузка может занять некоторое время.';placeholder?.remove();
  try{
    emulator=new V86Starter({
      wasm_path:'https://copy.sh/v86/build/',
      memory_size:512*1024*1024,
      vga_memory_size:8*1024*1024,
      screen_container:document.getElementById('screen_container'),
      bios:{url:'https://copy.sh/v86/bios/seabios.bin'},
      vga_bios:{url:'https://copy.sh/v86/bios/vgabios.bin'},
      hda:{buffer:diskBuffer},
      autostart:true,
      disable_speaker:true,
    });
    emulator.add_listener('emulator-ready',()=>{setStatus('ВИРТУАЛЬНАЯ МАШИНА РАБОТАЕТ');hint.textContent='Эмулятор запущен. Если диск совместим и содержит загрузочную систему, Windows начнёт загружаться.';stopBtn.disabled=false;});
    emulator.add_listener('emulator-started',()=>setStatus('ЗАГРУЗКА WINDOWS'));
    emulator.add_listener('emulator-stopped',()=>setStatus('ОСТАНОВЛЕН'));
  }catch(e){setStatus('ОШИБКА');hint.textContent='Не удалось запустить: '+e.message;startBtn.disabled=false;diskInput.disabled=false;}
});
stopBtn.addEventListener('click',()=>{if(emulator){emulator.stop();emulator=null;}stopBtn.disabled=true;startBtn.disabled=!diskBuffer;diskInput.disabled=false;setStatus('ОСТАНОВЛЕН');hint.textContent='Виртуальная машина остановлена. Для нового запуска нажми кнопку запуска.';});

async function toggleFullscreen(target){
  try{
    if(document.fullscreenElement){await document.exitFullscreen();}
    else if(target?.requestFullscreen){await target.requestFullscreen();}
    else{hint.textContent='Полноэкранный режим не поддерживается этим браузером.';}
  }catch(e){hint.textContent='Не удалось включить полный экран: '+e.message;}
}
fullscreenBtn?.addEventListener('click',()=>toggleFullscreen(document.documentElement));
screenFullscreenBtn?.addEventListener('click',()=>toggleFullscreen(screenWrap));
document.addEventListener('fullscreenchange',()=>{
  const active=!!document.fullscreenElement;
  if(fullscreenBtn)fullscreenBtn.textContent=active?'⤢ Выйти из полного экрана':'⛶ На весь экран';
});
