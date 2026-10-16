(() => {
    const SUPABASE_URL = 'https://hmvbccvtnrmkjanddmxc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_70mTFeHAbUPOmXY11mUqNw_NM5ypwlO';
  const $ = id => document.getElementById(id);
  const audio = $('audio');
  let songs = [], playlists = [], currentIndex = -1, shuffle = false, repeat = false, activePlaylist = null;
  const tabs = [...document.querySelectorAll('.tab')];

  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function titleFromFile(name){return name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim() || name;}
  function fmt(sec){if(!Number.isFinite(sec))return '0:00';const m=Math.floor(sec/60),s=Math.floor(sec%60);return m+':'+String(s).padStart(2,'0');}
  function showTab(name){tabs.forEach(t=>t.classList.toggle('active',t.dataset.tab===name));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name));}
  tabs.forEach(t=>t.addEventListener('click',()=>showTab(t.dataset.tab)));
  $('themeBtn').addEventListener('click',()=>document.body.classList.toggle('night'));

  function renderSongs(){
    const query=$('searchInput').value.toLowerCase();
    const visible=songs.map((s,i)=>({...s,i})).filter(s=>(s.title+' '+s.name).toLowerCase().includes(query));
    $('songCount').textContent=`${songs.length} track${songs.length===1?'':'s'}`;
    $('songList').innerHTML=visible.length?visible.map(s=>`<div class="song-row"><div class="song-symbol">♫</div><div class="song-info"><strong>${esc(s.title)}</strong><span>${esc(s.name)}</span></div><button class="row-btn" data-play="${s.i}">▶ Play</button></div>`).join(''):`<div class="empty"><span class="empty-moon">☾</span><strong>${songs.length?'No matches in your orbit.':'Your soundtrack starts here.'}</strong><span>${songs.length?'Try another search.':'Add audio files from your device to begin.'}</span></div>`;
    $('songList').querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>playAt(Number(b.dataset.play))));
  }
  function renderPlaylists(){
    $('playlistGrid').innerHTML=playlists.length?playlists.map((p,i)=>`<button class="playlist-card" data-detail="${i}"><div class="playlist-art">${['☾','✦','☁','✧','◌'][i%5]}</div><strong>${esc(p.name)}</strong><span>${p.ids.length} song${p.ids.length===1?'':'s'}</span></button>`).join(''):`<div class="empty" style="grid-column:1/-1"><span class="empty-moon">☾</span><strong>No moonmixes yet.</strong><span>Make a playlist for every mood.</span></div>`;
    $('playlistGrid').querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>openPlaylist(Number(b.dataset.detail))));
  }
  $('fileInput').addEventListener('change',e=>{
    const files=[...e.target.files];
    files.forEach(file=>{songs.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),name:file.name,title:titleFromFile(file.name),url:URL.createObjectURL(file),file});});
    e.target.value='';renderSongs();renderPlaylists();
  });
  $('searchInput').addEventListener('input',renderSongs);

  function playAt(i){
    if(i<0||i>=songs.length)return;
    currentIndex=i;audio.src=songs[i].url;audio.play().catch(()=>{});updatePlayer();showTab('player');
  }
  function updatePlayer(){
    const s=songs[currentIndex];$('nowTitle').textContent=s?s.title:'Nothing playing yet';$('nowArtist').textContent=s?s.name:'Choose a song from your library';$('playBtn').textContent=audio.paused?'▶':'Ⅱ';$('playBtn').setAttribute('aria-label',audio.paused?'Play':'Pause');
    $('artwork').innerHTML=s?`<span>☾</span><small>${esc(s.title.toUpperCase().slice(0,24))}</small>`:'<span>☾</span><small>MOONWAVE</small>';
  }
  $('playBtn').addEventListener('click',()=>{if(currentIndex<0){if(songs.length)playAt(0);return;}if(audio.paused)audio.play().catch(()=>{});else audio.pause();updatePlayer();});
  function next(){if(!songs.length)return;let i;if(shuffle&&songs.length>1){do{i=Math.floor(Math.random()*songs.length)}while(i===currentIndex)}else i=(currentIndex+1)%songs.length;playAt(i);}
  function prev(){if(!songs.length)return;if(audio.currentTime>3){audio.currentTime=0;return;}playAt((currentIndex-1+songs.length)%songs.length);}
  $('nextBtn').addEventListener('click',next);$('prevBtn').addEventListener('click',prev);
  $('shuffleBtn').addEventListener('click',()=>{shuffle=!shuffle;$('shuffleBtn').classList.toggle('on',shuffle);});
  $('repeatBtn').addEventListener('click',()=>{repeat=!repeat;audio.loop=repeat;$('repeatBtn').classList.toggle('on',repeat);});
  audio.addEventListener('play',updatePlayer);audio.addEventListener('pause',updatePlayer);audio.addEventListener('ended',()=>{if(!repeat)next();});
  audio.addEventListener('loadedmetadata',()=>{$('duration').textContent=fmt(audio.duration);});
  audio.addEventListener('timeupdate',()=>{ $('currentTime').textContent=fmt(audio.currentTime);$('seek').value=audio.duration?audio.currentTime/audio.duration*1000:0;});
  $('seek').addEventListener('input',()=>{if(audio.duration)audio.currentTime=Number($('seek').value)/1000*audio.duration;});
  $('volume').addEventListener('input',()=>audio.volume=Number($('volume').value));audio.volume=.8;

  $('newPlaylistBtn').addEventListener('click',()=>{
    $('playlistName').value='';
    $('playlistChoices').innerHTML=songs.length?songs.map(s=>`<label class="choice"><input type="checkbox" value="${esc(s.id)}"><span>${esc(s.title)}</span></label>`).join(''):'<p class="tiny">Add songs first, or create an empty mix.</p>';
    $('playlistDialog').showModal();
  });
  $('savePlaylistBtn').addEventListener('click',e=>{
    e.preventDefault();const name=$('playlistName').value.trim();if(!name){$('playlistName').focus();return;}
    const ids=[...$('playlistChoices').querySelectorAll('input:checked')].map(c=>c.value);
    playlists.push({name,ids});$('playlistDialog').close();renderPlaylists();
  });
  $('playlistForm').addEventListener('submit',e=>{if(e.submitter&&e.submitter.id!=='savePlaylistBtn')return;});
  function openPlaylist(i){
    activePlaylist=playlists[i];$('detailTitle').textContent=activePlaylist.name;
    const tracks=activePlaylist.ids.map(id=>songs.findIndex(s=>s.id===id)).filter(i=>i>=0);
    $('detailSongs').innerHTML=tracks.length?tracks.map(i=>`<div class="song-row"><div class="song-symbol">♫</div><div class="song-info"><strong>${esc(songs[i].title)}</strong><span>${esc(songs[i].name)}</span></div><button class="row-btn" data-p="${i}">▶</button></div>`).join(''):'<div class="empty"><strong>This mix is waiting for songs.</strong><span>Close this window and create another mix with songs selected.</span></div>';
    $('detailSongs').querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>playAt(Number(b.dataset.p))));
    $('detailDialog').showModal();
  }
  $('playMixBtn').addEventListener('click',()=>{if(!activePlaylist)return;const i=activePlaylist.ids.map(id=>songs.findIndex(s=>s.id===id)).find(i=>i>=0);if(i!==undefined)playAt(i);});
  $('closeDetailBtn').addEventListener('click',()=>$('detailDialog').close());
  renderSongs();renderPlaylists();
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
