const isoInput=document.getElementById('isoFile');
const startBtn=document.getElementById('startBtn');
const stopBtn=document.getElementById('stopBtn');
const fullscreenBtn=document.getElementById('fullscreenBtn');
const screenFullscreenBtn=document.getElementById('screenFullscreenBtn');
const screenWrap=document.querySelector('.screen-wrap');
const statusEl=document.getElementById('status');
const hint=document.getElementById('hint');
const placeholder=document.getElementById('placeholder');
let emulator=null, isoBuffer=null, isoName='';
function setStatus(text){statusEl.textContent=text;}
async function loadIsoFile(file){
  if(!file)return;
  if(!file.name.toLowerCase().endsWith('.iso')){hint.textContent='Нужен файл с расширением .iso.';return;}
  if(!file.size){hint.textContent='Выбранный ISO пустой (0 байт).';return;}
  try{isoBuffer=await file.arrayBuffer();isoName=file.name;startBtn.disabled=false;hint.textContent=`ISO готов: ${isoName} · ${(file.size/1024/1024).toFixed(1)} МБ. Нажми «Запустить Windows XP».`;setStatus('ISO ПОДКЛЮЧЁН');}
  catch(e){hint.textContent='Не удалось прочитать ISO: '+e.message;}
}
isoInput.addEventListener('change',()=>loadIsoFile(isoInput.files?.[0]));
// Пробуем загрузить ISO по прямой ссылке Google Drive. Drive может вернуть
// HTML-подтверждение или заблокировать запрос через CORS; тогда нужен ручной выбор.
const DRIVE_ISO_URL='https://drive.google.com/uc?export=download&id=141hM1shSenSf9gGN3oNqNxJnbb8IFhDc';
(async()=>{
  try{
    const response=await fetch(DRIVE_ISO_URL);
    if(!response.ok)throw new Error('Google Drive ответил HTTP '+response.status+'.');
    const blob=await response.blob();
    if(!blob.size || (blob.type||'').toLowerCase().includes('text/html'))throw new Error('Google Drive вернул страницу подтверждения вместо ISO.');
    isoBuffer=await blob.arrayBuffer();isoName='GRTMPVOL_RU.ISO (Google Drive)';startBtn.disabled=false;
    hint.textContent=`ISO получен из Google Drive · ${(blob.size/1024/1024).toFixed(1)} МБ. Нажми «Запустить Windows XP».`;
    setStatus('ISO ПОДКЛЮЧЁН');
  }catch(e){hint.textContent='Не удалось автоматически получить ISO из Google Drive: '+e.message+' Скачай GRTMPVOL_RU.ISO и выбери его кнопкой «Выбрать ISO». Возможны ограничения CORS или подтверждение скачивания большого файла.';}
})();
startBtn.addEventListener('click',async()=>{
  if(!isoBuffer)return;
  if(typeof V86Starter==='undefined'){hint.textContent='Не загрузилась библиотека v86. Проверь интернет и обнови страницу.';return;}
  startBtn.disabled=true;isoInput.disabled=true;setStatus('ЗАПУСК…');hint.textContent=`Запускаю эмулятор с ISO «${isoName}» как CD/DVD. Виртуальный жёсткий диск намеренно не подключён.`;placeholder?.remove();
  try{
    emulator=new V86Starter({
      wasm_path:'https://copy.sh/v86/build/v86.wasm',
      memory_size:512*1024*1024,
      vga_memory_size:8*1024*1024,
      screen_container:document.getElementById('screen_container'),
      bios:{url:'https://copy.sh/v86/bios/seabios.bin'},
      vga_bios:{url:'https://copy.sh/v86/bios/vgabios.bin'},
      cdrom:{buffer:isoBuffer},
      autostart:true,
      disable_speaker:true,
    });
    emulator.add_listener('emulator-ready',()=>{setStatus('ЭМУЛЯТОР РАБОТАЕТ');hint.textContent='Эмулятор запущен с ISO. Без виртуального жёсткого диска установщик Windows не сможет установить систему; это режим запуска/проверки ISO.';stopBtn.disabled=false;});
    emulator.add_listener('emulator-started',()=>setStatus('ЗАГРУЗКА ISO'));
    emulator.add_listener('emulator-stopped',()=>setStatus('ОСТАНОВЛЕН'));
  }catch(e){setStatus('ОШИБКА');hint.textContent='Не удалось запустить: '+e.message;startBtn.disabled=false;isoInput.disabled=false;}
});
stopBtn.addEventListener('click',()=>{if(emulator){emulator.stop();emulator=null;}stopBtn.disabled=true;startBtn.disabled=!isoBuffer;isoInput.disabled=false;setStatus('ОСТАНОВЛЕН');hint.textContent='Эмулятор остановлен. Можно запустить ISO снова.';});
async function toggleFullscreen(target){try{if(document.fullscreenElement)await document.exitFullscreen();else if(target?.requestFullscreen)await target.requestFullscreen();else hint.textContent='Полноэкранный режим не поддерживается.';}catch(e){hint.textContent='Не удалось включить полный экран: '+e.message;}}
fullscreenBtn?.addEventListener('click',()=>toggleFullscreen(document.documentElement));
screenFullscreenBtn?.addEventListener('click',()=>toggleFullscreen(screenWrap));
document.addEventListener('fullscreenchange',()=>{if(fullscreenBtn)fullscreenBtn.textContent=document.fullscreenElement?'⤢ Выйти из полного экрана':'⛶ На весь экран';});

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
