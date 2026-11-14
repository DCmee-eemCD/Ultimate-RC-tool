        // Theme files intentionally exclude OCR, clipboard and other behavior settings.
        const themeKeys = ['primary','userBubble','botBubble','chatBg','msgBg','panelBg','pageBg','fontSize','fontFamily','bgImage','bgBlur','autoTheme','glass','glassBlur','glassAlpha','siteWide'];
        const colors = [...themeKeys.slice(0,7), 'dashboardBg', 'consolePrimary', 'consoleSecondary'];
        themeKeys.push('dashboardBg', 'imageThemeMode', 'consolePrimary', 'consoleSecondary', 'consoleWidth', 'consoleHeight');
        const ranges = {fontSize:[12,22],bgBlur:[0,20],glassBlur:[0,30],glassAlpha:[15,90],consoleWidth:[320,560],consoleHeight:[420,820]};
        const dataMedia = /^data:(?:image\/(?:png|jpeg|gif|webp|avif)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/]*={0,2}$/;
        const validateTheme = doc => {
            if(!doc || doc.format !== 'ultimate-rc-theme' || doc.version !== 1 || !doc.theme || typeof doc.theme !== 'object' || Array.isArray(doc.theme)) throw Error('File theme không đúng định dạng hoặc phiên bản.');
            if(Object.keys(doc).some(k=>!['format','version','theme','video'].includes(k)))throw Error('File có trường không hợp lệ.');
            // Older portable themes do not contain the dashboard color.
            const t={dashboardBg:cfg.dashboardBg || DEFAULTS.dashboardBg, imageThemeMode:cfg.imageThemeMode || 'dark'};
            for (const key of ['consolePrimary','consoleSecondary','consoleWidth','consoleHeight']) t[key] = cfg[key] ?? DEFAULTS[key];
            for(const [k,v] of Object.entries(doc.theme)) {
                if(!themeKeys.includes(k))throw Error('Thuộc tính không hợp lệ: '+k);
                let ok;
                if(colors.includes(k))ok=typeof v==='string' && /^#[\da-f]{6}$/i.test(v);
                else if(ranges[k])ok=Number.isFinite(v) && v>=ranges[k][0] && v<=ranges[k][1];
                else if(['autoTheme','glass','siteWide'].includes(k))ok=typeof v==='boolean';
                else if(k==='imageThemeMode')ok=v==='dark' || v==='light';
                else if(k==='fontFamily')ok=typeof v==='string' && v.length<=160 && /^[\p{L}\p{N}\s,"'-]*$/u.test(v);
                else if(k==='bgImage') {
                    ok=typeof v==='string' && (v==='' || v===VID_LOCAL || dataMedia.test(v));
                    if(!ok && typeof v==='string')try {const u=new URL(v);ok=['https:','http:'].includes(u.protocol)&&!/[\s'"\\<>]/.test(v);}catch{}
                }
                if(!ok)throw Error('Giá trị không hợp lệ: '+k);
                t[k]=v;
            }
            if(themeKeys.some(k=>!Object.hasOwn(t,k)))throw Error('File thiếu thiết lập theme.');
            if(t.bgImage===VID_LOCAL && (typeof doc.video!=='string' || !/^data:video\/(mp4|webm);base64,/.test(doc.video) || !dataMedia.test(doc.video) || doc.video.length>Math.ceil(VID_MAX/3)*4+100))throw Error('Video thiếu, sai định dạng hoặc quá 14 MB.');
            if(t.bgImage!==VID_LOCAL && doc.video!==undefined)throw Error('Video không khớp theme.');
            return t;
        };
        $('#theme-export').addEventListener('click',async()=>{
            try {
                await RC.flush();
                const doc={format:'ultimate-rc-theme',version:1,theme:Object.fromEntries(themeKeys.map(k=>[k,cfg[k]]))};
                if(cfg.bgImage===VID_LOCAL)doc.video=GM_getValue(VID_KEY,'');
                validateTheme(doc);
                const blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'});
                if(blob.size>25*1024*1024)throw Error('Theme quá 25 MB. Hãy dùng ảnh/video nhỏ hơn.');
                const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Ultimate-RC-theme.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
                toast('Đã xuất theme, kèm nền đã tải lên.');
            }catch(e){toast(e.message);}
        });
        $('#theme-import').addEventListener('click',()=>$('#theme-file').click());
        $('#theme-file').addEventListener('change',async e=>{
            const file=e.target.files[0];e.target.value='';if(!file)return;
            try {
                if(file.size>25*1024*1024)throw Error('File theme tối đa 25 MB.');
                const doc=JSON.parse(await file.text()),theme=validateTheme(doc);
                // Validate the entire file before changing any stored value.
                await RC.themeImport({...cfg,...theme,autoFor:theme.bgImage},doc.video);
                location.reload();
            }catch(e){toast('Không nhập được: '+e.message);}
        });
        const paintRange = e => {if(e?.type==='range')e.style.setProperty('--fill',100*(+e.value-(+e.min))/(+e.max-(+e.min))+'%');};
        $$('input[type=range]').forEach(paintRange);
        root.addEventListener('input',e=>paintRange(e.target));
