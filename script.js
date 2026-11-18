const diskInput=document.getElementById('diskFile');
const isoInput=document.getElementById('isoFile');
const isoFolderInput=document.getElementById('isoFolder');
const startBtn=document.getElementById('startBtn');
const stopBtn=document.getElementById('stopBtn');
const fullscreenBtn=document.getElementById('fullscreenBtn');
const screenFullscreenBtn=document.getElementById('screenFullscreenBtn');
const screenWrap=document.querySelector('.screen-wrap');
const statusEl=document.getElementById('status');
const hint=document.getElementById('hint');
const placeholder=document.getElementById('placeholder');
let emulator=null, diskBuffer=null, isoBuffer=null, isoName='';
function setStatus(text){statusEl.textContent=text;}

async function loadIsoFile(file){
  if(!file)return;
  if(!file.name.toLowerCase().endsWith('.iso')){hint.textContent='Нужен файл с расширением .iso. Имя файла может быть любым.';return;}
  if(file.size===0){hint.textContent='Выбранный ISO пустой (0 байт).';return;}
  try{isoBuffer=await file.arrayBuffer();isoName=file.name;hint.textContent=`ISO подключён: ${isoName} · ${(file.size/1024/1024).toFixed(1)} МБ. Имя файла не имеет значения.`;}
  catch(e){hint.textContent='Не удалось прочитать ISO: '+e.message;}
}
isoInput.addEventListener('change',()=>loadIsoFile(isoInput.files?.[0]));
isoFolderInput.addEventListener('change',async()=>{
  const matches=Array.from(isoFolderInput.files||[]).filter(f=>f.name.toLowerCase().endsWith('.iso')&&f.size>0);
  if(!matches.length){hint.textContent='В выбранной папке не найдено непустых файлов .iso. Имя файла может быть любым.';return;}
  if(matches.length===1){await loadIsoFile(matches[0]);return;}
  const names=matches.map((f,i)=>`${i+1}. ${f.webkitRelativePath||f.name} (${(f.size/1024/1024).toFixed(1)} МБ)`).join('\n');
  const choice=prompt(`Найдено ISO-файлов: ${matches.length}. Введи номер нужного файла:\n\n${names}`,'1');
  const index=Number(choice)-1;
  if(Number.isInteger(index)&&index>=0&&index<matches.length)await loadIsoFile(matches[index]);
});
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
  startBtn.disabled=true;diskInput.disabled=true;setStatus('ЗАПУСК…');hint.textContent=isoBuffer?`Запускаю эмулятор с диском и ISO «${isoName}» в CD/DVD-приводе.`:'Запускаю эмулятор с выбранным виртуальным диском. Первая загрузка может занять некоторое время.';placeholder?.remove();
  try{
    emulator=new V86Starter({
      wasm_path:'https://copy.sh/v86/build/',
      memory_size:512*1024*1024,
      vga_memory_size:8*1024*1024,
      screen_container:document.getElementById('screen_container'),
      bios:{url:'https://copy.sh/v86/bios/seabios.bin'},
      vga_bios:{url:'https://copy.sh/v86/bios/vgabios.bin'},
      hda:{buffer:diskBuffer},
      ...(isoBuffer?{cdrom:{buffer:isoBuffer}}:{}),
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


// Дополнительное управление v86: аппаратные клавиши, текст и кнопки мыши.
const scancodeButtons=document.querySelectorAll('[data-key]');
scancodeButtons.forEach(button=>button.addEventListener('click',()=>{
  if(!emulator || typeof emulator.keyboard_send_scancodes!=='function'){
    hint.textContent='Сначала запусти виртуальную машину. Если управление не реагирует, проверь поддержку API текущей версии v86.';return;
  }
  const code=parseInt(button.dataset.key,16);
  try{emulator.keyboard_send_scancodes([code, code|0x80]);}catch(e){hint.textContent='Не удалось отправить клавишу: '+e.message;}
}));
const mouseButtons=document.querySelectorAll('[data-mouse]');
mouseButtons.forEach(button=>button.addEventListener('click',()=>{
  if(!emulator || typeof emulator.mouse_send_button!=='function'){
    hint.textContent='Сначала запусти виртуальную машину, чтобы использовать кнопки мыши.';return;
  }
  const which=Number(button.dataset.mouse);
  try{emulator.mouse_send_button(which,true);setTimeout(()=>emulator?.mouse_send_button?.(which,false),100);}catch(e){hint.textContent='Не удалось отправить нажатие мыши: '+e.message;}
}));
document.getElementById('sendText')?.addEventListener('click',()=>{
  const field=document.getElementById('textInput');
  if(!emulator || typeof emulator.keyboard_send_text!=='function'){
    hint.textContent='Ввод текста недоступен в этой сборке эмулятора. Можно использовать физическую или экранную клавиатуру устройства.';return;
  }
  if(field.value){try{emulator.keyboard_send_text(field.value);field.value='';}catch(e){hint.textContent='Не удалось отправить текст: '+e.message;}}
});
document.getElementById('textInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('sendText')?.click();});
document.getElementById('releaseKeys')?.addEventListener('click',()=>{
  if(emulator && typeof emulator.keyboard_send_scancodes==='function'){
    // Отправить break-коды для часто используемых модификаторов.
    try{emulator.keyboard_send_scancodes([0x9d,0xb8,0xaa]);}catch{}
  }
});
