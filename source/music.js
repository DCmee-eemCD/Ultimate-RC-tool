        function musicLink(raw) {
            let u; try { u=new URL(raw.trim()); } catch (_) { throw Error('Dán link HTTPS của YouTube hoặc Spotify.'); }
            if(u.protocol!=='https:' || u.username || u.password || u.port) throw Error('Link không hợp lệ.');
            const h=u.hostname.toLowerCase();
            if(h==='open.spotify.com') {
                const m=u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{22})\/?$/);
                if(!m)throw Error('Dùng link chia sẻ đầy đủ từ open.spotify.com.');
                return {src:'https://open.spotify.com/embed/'+m[1]+'/'+m[2],url:'https://open.spotify.com/'+m[1]+'/'+m[2],name:'Spotify',height:352};
            }
            let id,list;
            if(h==='youtu.be')id=u.pathname.slice(1);
            else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(h)) {
                if(u.pathname==='/watch')id=u.searchParams.get('v');
                else id=u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/)?.[1];
                list=u.searchParams.get('list');
            } else throw Error('Chỉ hỗ trợ link YouTube và open.spotify.com.');
            if(id && !/^[\w-]{11}$/.test(id))throw Error('ID video không hợp lệ.');
            if(list && !/^[\w-]{10,100}$/.test(list))throw Error('Playlist không hợp lệ.');
            if(!id && !list)throw Error('Không tìm thấy video hoặc playlist trong link.');
            const src=new URL('https://www.youtube.com/embed/'+(id||'videoseries'));
            src.searchParams.set('playsinline','1'); if(list)src.searchParams.set('list',list);
            return {src:src.href,url:id?'https://www.youtube.com/watch?v='+id:'https://www.youtube.com/playlist?list='+list,name:'YouTube',height:220};
        }
        const musicInput=$('#rc-music-url'),musicStatus=$('#rc-music-status');
        musicInput.value=typeof cfg.musicUrl==='string'?cfg.musicUrl:'';
        const musicBox=document.createElement('div');musicBox.hidden=true;
        musicBox.style.cssText='position:fixed;right:16px;bottom:16px;width:min(380px,calc(100vw - 32px));background:var(--bg,#111827);color:var(--fg,#fff);border:1px solid var(--line,#475569);border-radius:12px;box-shadow:0 0 16px #0006;overflow:hidden;z-index:10';
        const musicBar=document.createElement('div');musicBar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px 6px';
        const musicName=document.createElement('span'),musicClose=document.createElement('button');musicClose.className='sm';musicClose.textContent='Dừng ×';
        musicName.style.cssText='font:600 13px system-ui;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1';
        const clock=document.createElement('span');clock.textContent='0:00 / —';clock.style.cssText='font:11px system-ui;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--mut)';
        const expand=document.createElement('button');expand.className='sm';expand.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6"/></svg>';expand.style.cssText='display:grid;place-items:center;width:32px;height:32px;flex:0 0 32px;padding:0;line-height:0';
        const playIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5.8c0-.8.9-1.3 1.6-.9l10 6.2a1 1 0 0 1 0 1.8l-10 6.2c-.7.4-1.6-.1-1.6-.9z"/></svg>';
        const pauseIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
        const play=document.createElement('button');play.className='sm';play.innerHTML=playIcon;play.title='Phát / tạm dừng';play.setAttribute('aria-label','Phát');play.style.cssText='display:grid;place-items:center;width:38px;height:38px;flex:0 0 38px;padding:0;border-radius:11px;line-height:0';play.disabled=true;
        const seek=document.createElement('input');seek.type='range';seek.min=0;seek.max=100;seek.value=0;seek.step=0.1;seek.disabled=true;seek.setAttribute('aria-label','Tua nhạc');seek.style.cssText='width:100%;margin:0;accent-color:var(--acc,#60a5fa);--fill:0%;background:linear-gradient(to right,var(--acc,#60a5fa) var(--fill),#60646c var(--fill))';
        const controls=document.createElement('div');controls.style.cssText='display:flex;gap:10px;align-items:center;padding:0 14px 12px';controls.append(play,seek);
        musicClose.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';musicClose.style.cssText=expand.style.cssText;musicClose.title='Dừng và đóng';musicClose.setAttribute('aria-label','Dừng và đóng nhạc');
        const minimize=document.createElement('button');minimize.className='sm';minimize.id='rc-music-minimize';minimize.title='Thu nhỏ trình phát';minimize.setAttribute('aria-label',minimize.title);minimize.style.cssText=expand.style.cssText;
        minimize.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 12h12"/></svg>';
        const musicMini=document.createElement('button');musicMini.id='rc-music-mini';musicMini.title='Mở lại trình phát';musicMini.setAttribute('aria-label',musicMini.title);
        musicMini.style.cssText='display:none;position:fixed;right:16px;bottom:16px;width:48px;height:48px;padding:0;place-items:center;background:var(--bg,#111827);color:var(--fg,#fff);border:1px solid var(--line,#475569);border-radius:10px;box-shadow:0 0 16px #0006;cursor:pointer;z-index:10';
        musicMini.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/></svg>';
        minimize.addEventListener('click',()=>{musicBox.hidden=true;musicMini.style.display='grid';musicMini.focus();});
        musicMini.addEventListener('click',()=>{musicMini.style.display='none';musicBox.hidden=false;minimize.focus();});
        musicBar.append(musicName,clock,expand,minimize,musicClose);musicBox.append(musicBar,controls);root.querySelector('.w').append(musicBox,musicMini);
        let controller=null,provider='',paused=true,duration=0,poll=null,generation=0,expanded=false;
        const fmt=s=>Number.isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'—';
        const update=(pos,dur,isPaused)=>{duration=Number(dur)||0;paused=!!isPaused;clock.textContent=fmt(Number(pos)||0)+' / '+(duration?fmt(duration):'—');seek.disabled=duration<=0;seek.max=duration||100;if(!seek.matches(':active')){seek.value=Number(pos)||0;seek.style.setProperty('--fill',100*Number(seek.value)/Number(seek.max)+'%');}const label=paused?'Phát':'Tạm dừng';if(play.getAttribute('aria-label')!==label){play.innerHTML=paused?playIcon:pauseIcon;play.setAttribute('aria-label',label);}};
        function showPlayer(show){expanded=show;if(musicFrame)musicFrame.style.display=show?'block':'none';expand.setAttribute('aria-label',show?'Ẩn video':'Hiện video');expand.firstElementChild.style.transform=show?'rotate(180deg)':'rotate(0deg)';expand.title=show?'Thu gọn trình phát':'Hiện trình phát';expand.setAttribute('aria-expanded',String(show));}
        const apiPromises={};
        function sdk(kind){
            if(kind==='YouTube'&&window.YT?.Player)return Promise.resolve(window.YT);
            if(apiPromises[kind])return apiPromises[kind];
            apiPromises[kind]=new Promise((resolve,reject)=>{
                const callback=kind==='YouTube'?'onYouTubeIframeAPIReady':'onSpotifyIframeApiReady',previous=window[callback];
                const script=document.createElement('script');let timer;
                const fail=()=>{clearTimeout(timer);delete apiPromises[kind];reject(Error('Không tải được trình phát. Thử lại hoặc mở dịch vụ gốc.'));};
                window[callback]=api=>{clearTimeout(timer);try{if(typeof previous==='function')previous(api);}catch(_){}resolve(kind==='YouTube'?window.YT:api);};
                script.src=kind==='YouTube'?'https://www.youtube.com/iframe_api':'https://open.spotify.com/embed/iframe-api/v1';script.onerror=fail;timer=setTimeout(fail,20000);document.head.append(script);
            });return apiPromises[kind];
        }
        let musicFrame=null;
        const stopMusic=()=>{generation++;clearInterval(poll);poll=null;try{controller?.destroy();}catch(_){}controller=null;musicFrame?.remove();musicFrame=null;musicBox.hidden=true;musicMini.style.display='none';play.disabled=true;seek.disabled=true;update(0,0,true);musicStatus.textContent='Đã dừng nhạc.';};
        expand.addEventListener('click',()=>{showPlayer(!expanded);});
        play.addEventListener('click',()=>{if(!controller)return;if(provider==='YouTube'){if(paused){controller.playVideo();}else controller.pauseVideo();}else controller.togglePlay();});
        seek.addEventListener('change',()=>{if(!controller||!duration)return;const seconds=Math.min(duration,Math.max(0,Number(seek.value)));if(provider==='YouTube')controller.seekTo(seconds,true);else controller.seek(seconds);});
        musicClose.addEventListener('click',stopMusic);$('#rc-music-stop').addEventListener('click',stopMusic);
        $('#rc-music-load').addEventListener('click',async()=>{
            try {
                const link=musicLink(musicInput.value);
                stopMusic();const token=generation;cfg.musicUrl=link.url;save();provider=link.name;
                musicName.textContent=link.name;
                musicBox.hidden=false;musicStatus.textContent='Đang tải trình phát…';
                const a=$('#rc-music-external');a.href=link.url;a.hidden=false;
                const api=await sdk(link.name);if(token!==generation)return;
                const mount=document.createElement('div');musicFrame=mount;musicBox.insertBefore(mount,musicBar);
                if(link.name==='YouTube'){
                    const embed=new URL(link.src);controller=new api.Player(mount,{width:'100%',height:220,videoId:embed.pathname.split('/').pop()==='videoseries'?undefined:embed.pathname.split('/').pop(),playerVars:{playsinline:1,origin:location.origin,...(embed.searchParams.get('list')?{listType:'playlist',list:embed.searchParams.get('list')}:{})},events:{
                        onReady:e=>{if(token!==generation){e.target.destroy();return;}controller=e.target;musicFrame=controller.getIframe();musicFrame.title='YouTube player';play.disabled=false;showPlayer(false);controller.playVideo();musicStatus.textContent='Đã yêu cầu phát. Ẩn video vẫn tiếp tục phát nhạc.';poll=setInterval(()=>{if(token!==generation)return;const d=controller.getVideoData();musicName.textContent=d?.title||'YouTube';musicName.title=musicName.textContent;update(controller.getCurrentTime(),controller.getDuration(),controller.getPlayerState()!==1);},500);},
                        onStateChange:e=>{if(token!==generation)return;update(controller.getCurrentTime(),controller.getDuration(),e.data!==1);},
                        onAutoplayBlocked:()=>{if(token===generation)musicStatus.textContent='Trình duyệt chặn tự phát. Bấm nút Play để nghe.';},onError:()=>{if(token===generation)musicStatus.textContent='YouTube không phát được video này. Dùng link dịch vụ gốc bên dưới.';}
                    }});
                }else{
                    api.createController(mount,{uri:link.url,width:'100%',height:152},c=>{if(token!==generation){c.destroy();return;}controller=c;musicFrame=musicBox.querySelector('iframe')||mount;play.disabled=false;showPlayer(false);musicStatus.textContent='Sẵn sàng. Nếu trình duyệt chặn phát, mở rộng player và bấm Play.';
                        c.addListener('ready',()=>{if(token===generation){c.play();musicStatus.textContent='Đã yêu cầu phát. Nếu chưa nghe được, mở player và bấm Play.';}});
                        c.addListener('playback_update',e=>{if(token===generation)update(e.data.position/1000,e.data.duration/1000,e.data.isPaused);});
                    });
                    fetch('https://open.spotify.com/oembed?url='+encodeURIComponent(link.url)).then(r=>r.ok?r.json():null).then(meta=>{if(token===generation&&meta?.title){musicName.textContent=meta.title;musicName.title=meta.title;}}).catch(()=>{});
                }
            } catch(e) { musicStatus.textContent=e.message; }
        });
        musicInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#rc-music-load').click();}});
