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

  /* điều khoản: bấm đĩa để đọc mục đó tại quầy. Không có JS thì cả 5 mục hiện nối nhau. */
  var discs=[].slice.call(document.querySelectorAll('.cm-disc.term'));
  var panels=[].slice.call(document.querySelectorAll('.cm-panel'));
  var cur=0;
  function pick(i){
    if(i<0||i>=panels.length)return;
    cur=i;
    discs.forEach(function(d,k){d.setAttribute('aria-pressed',k===i?'true':'false')});
    panels.forEach(function(p,k){p.classList.toggle('on',k===i)});
    onScroll();
  }
  discs.forEach(function(d,i){d.addEventListener('click',function(){pick(i)})});
  /* mũi tên trái/phải chuyển đĩa và giữ tiêu điểm trên đĩa mới */
  document.querySelector('.cm-row-terms').addEventListener('keydown',function(e){
    var n=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;
    if(!n)return;
    var i=Math.max(0,Math.min(discs.length-1,cur+n));
    e.preventDefault();pick(i);discs[i].focus();
  });
  /* link #tos-N (mục lục, link sâu) chọn đúng đĩa rồi cuộn tới quầy đọc */
  function fromHash(){
    var m=/^#tos-([1-5])$/.exec(location.hash);
    if(!m)return false;
    pick(+m[1]-1);
    var desk=document.querySelector('.cm-desk');if(desk)desk.scrollIntoView();
    return true;
  }
  window.addEventListener('hashchange',fromHash);
  document.querySelectorAll('a[href^="#tos-"]').forEach(function(a){
    a.addEventListener('click',function(e){e.preventDefault();var h=a.getAttribute('href');
      if(location.hash===h)fromHash();else location.hash=h;if(menu)closeMenu()});
  });

  /* đánh dấu mục đang xem */
  var spy=[].slice.call(document.querySelectorAll('[data-spy]'));
  var ids=['prices','process','terms','samples','contact'];
  function onScroll(){
    var at=ids[0],y=window.scrollY+160;
    ids.forEach(function(id){var el=$(id);if(el&&el.getBoundingClientRect().top+window.scrollY<=y)at=id});
    spy.forEach(function(a){
      var h=a.getAttribute('href').slice(1),on;
      if(a.closest('.cm-links'))on=(h===at);
      else if(h.indexOf('tos-')===0)on=(at==='terms'&&h==='tos-'+(cur+1));
      else on=(h===at);
      a.classList.toggle('on',on);
    });
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  pick(0);fromHash();

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
