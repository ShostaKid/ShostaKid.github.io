(function(){
  var $=function(id){return document.getElementById(id)};

  /* theme */
  function setTheme(t){document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('sk-theme',t)}catch(e){}
    $('themeBtn').textContent=t==='dark'?'☀':'☾'}
  function toggleTheme(){setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark')}
  $('themeBtn').addEventListener('click',toggleTheme);$('themeBtnM').addEventListener('click',toggleTheme);
  setTheme(document.documentElement.getAttribute('data-theme')||'light');

  /* menu điện thoại */
  var burger=$('burger'),menu=$('menu');
  function closeMenu(){menu.classList.remove('open');burger.setAttribute('aria-expanded','false')}
  burger.addEventListener('click',function(){var o=menu.classList.toggle('open');burger.setAttribute('aria-expanded',o?'true':'false')});
  menu.addEventListener('click',function(e){if(e.target.closest('a'))closeMenu()});

  /* mục ToS: máy tính luôn mở, điện thoại gập được */
  var mq=window.matchMedia('(max-width:820px)');
  var secs=[].slice.call(document.querySelectorAll('.cm-sec'));
  secs.forEach(function(d){d.querySelector('summary').addEventListener('click',function(e){if(!mq.matches)e.preventDefault()})});
  function sync(){secs.forEach(function(d,i){ if(!mq.matches) d.open=true; else if(!sync.done) d.open=(i===0) }); sync.done=true}
  mq.addEventListener('change',sync);sync();
  /* bấm mục lục / link #tos-N trên điện thoại thì mở đúng mục đó */
  window.addEventListener('hashchange',function(){var d=document.querySelector(location.hash+'.cm-sec');if(d)d.open=true});
  document.querySelectorAll('a[href^="#tos-"]').forEach(function(a){a.addEventListener('click',function(){var d=document.querySelector(a.getAttribute('href'));if(d&&d.classList.contains('cm-sec'))d.open=true})});

  /* đánh dấu mục đang xem */
  var spy=[].slice.call(document.querySelectorAll('[data-spy]'));
  var ids=['tos-1','tos-2','tos-3','tos-4','tos-5','prices','samples','contact'];
  function onScroll(){
    var cur=ids[0],y=window.scrollY+140;
    ids.forEach(function(id){var el=$(id);if(el&&el.offsetTop<=y)cur=id});
    var top=(cur.indexOf('tos-')===0)?'tos-1':cur;
    spy.forEach(function(a){var h=a.getAttribute('href').slice(1);
      var on=a.closest('.cm-links')?h===top:h===cur;a.classList.toggle('on',on)});
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* nhạc: cùng cách web chính làm — source github, <audio> loop, chỉ phát sau một cú bấm.
     Trang này là trang riêng nên không có màn intro; cú bấm đầu tiên vào bất cứ đâu trên trang
     sẽ mở nhạc, sau đó nút Play/Pause điều khiển. */
  var audio=$('audio'),bars=$('bars'),mbtn=$('mbtn'),started=false,wantsOff=false;
  function paint(){var on=!audio.paused;bars.classList.toggle('paused',!on);mbtn.textContent=on?'Pause':'Play'}
  audio.addEventListener('play',paint);audio.addEventListener('pause',paint);
  mbtn.addEventListener('click',function(e){e.stopPropagation();started=true;
    if(audio.paused){wantsOff=false;audio.play().catch(function(){})}else{wantsOff=true;audio.pause()}});
  function firstGesture(e){
    if(started||wantsOff||e.target.closest&&e.target.closest('#music'))return;
    started=true;audio.play().catch(function(){});
    document.removeEventListener('click',firstGesture);document.removeEventListener('keydown',firstGesture);
  }
  document.addEventListener('click',firstGesture);document.addEventListener('keydown',firstGesture);
})();
