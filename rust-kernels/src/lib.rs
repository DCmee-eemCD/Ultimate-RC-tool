//! Pixel kernels only. Unicode text interpretation and DOM rendering stay in JS.
use std::cell::RefCell;
const MAX_BYTES: usize = 64 * 1024 * 1024;
#[derive(Default)]
struct Buffers { pixels: Vec<u8>, mask: Vec<u8>, output: Vec<u32> }
thread_local! { static BUFFERS: RefCell<Buffers> = RefCell::new(Buffers::default()); }

#[no_mangle]
pub extern "C" fn input_resize(len: usize) -> *mut u8 {
    if len > MAX_BYTES { return std::ptr::null_mut(); }
    BUFFERS.with(|b| { let mut b=b.borrow_mut(); b.pixels.resize(len,0); b.pixels.as_mut_ptr() })
}
#[no_mangle]
pub extern "C" fn mask_resize(len: usize) -> *mut u8 {
    if len > MAX_BYTES { return std::ptr::null_mut(); }
    BUFFERS.with(|b| { let mut b=b.borrow_mut(); b.mask.resize(len,0); b.mask.as_mut_ptr() })
}
#[no_mangle]
pub extern "C" fn output_ptr() -> *const u32 { BUFFERS.with(|b| b.borrow().output.as_ptr()) }
#[no_mangle]
pub extern "C" fn output_len() -> usize { BUFFERS.with(|b| b.borrow().output.len()) }
fn dimensions(w: usize,h: usize,len: usize) -> bool {
    w>0 && h>0 && w.checked_mul(h).and_then(|n|n.checked_mul(4))==Some(len)
}

#[no_mangle]
pub extern "C" fn preprocess() -> i32 {
    BUFFERS.with(|b| {
        let mut b=b.borrow_mut(); if b.pixels.len()%4!=0{return -1;}
        let mut lut=[0u8;256];
        for (v,out) in lut.iter_mut().enumerate(){*out=(255.0*(v as f64/255.0).powi(8)).round() as u8;}
        for p in b.pixels.chunks_exact_mut(4){
            let gray=(0.299*p[0] as f64+0.587*p[1] as f64+0.114*p[2] as f64).round() as usize;
            let value=lut[gray.min(255)];p[0]=value;p[1]=value;p[2]=value;
        }
        0
    })
}

/// Output rectangles [crop_x, crop_y, crop_w, crop_h, raw_y0, raw_y1].
#[no_mangle]
pub extern "C" fn figures(w:usize,h:usize)->i32 {
    BUFFERS.with(|b| {
        let mut b=b.borrow_mut();b.output.clear();
        if !dimensions(w,h,b.pixels.len())||b.mask.len()!=h{return -1;}
        let ink:Vec<u8>=b.pixels.chunks_exact(4).map(|p|{
            let low=p[0].min(p[1]).min(p[2]);let high=p[0].max(p[1]).max(p[2]);
            u8::from(low<238 || high-low>20)
        }).collect();
        let mut cols=vec![0usize;w];
        for row in ink.chunks_exact(w){for (x,&v)in row.iter().enumerate(){cols[x]+=v as usize;}}
        let skip:Vec<bool>=cols.iter().map(|&v| v as f64>h as f64*0.6).collect();
        let mut regions:Vec<(usize,usize,usize)>=Vec::new();
        for y in 0..h {
            if b.mask[y]!=0{continue;}
            let n=(0..w).filter(|&x|!skip[x] && ink[y*w+x]!=0).count();
            if n==0{continue;}
            if let Some(last)=regions.last_mut(){if y-last.1<=10{last.1=y;last.2+=n;continue;}}
            regions.push((y,y,n));
        }
        for (y0,y1,n) in regions {
            if y1-y0+1<36 || n<250{continue;}
            let mut x0=w;let mut x1=0;
            for y in y0..=y1{for x in 0..w{if !skip[x] && ink[y*w+x]!=0{x0=x0.min(x);x1=x1.max(x);}}}
            if x0==w || x1-x0<24{continue;}
            let bw=x1-x0+1;let bh=y1-y0+1;
            let mut rows=vec![0usize;bh];let mut cols=vec![0usize;bw];
            for y in 0..bh{for x in 0..bw{if ink[(y0+y)*w+x0+x]!=0{rows[y]+=1;cols[x]+=1;}}}
            let mut remaining=0;
            for y in 0..bh{if rows[y] as f64>bw as f64*0.5{continue;}
                for x in 0..bw{if cols[x] as f64<=bh as f64*0.6 && ink[(y0+y)*w+x0+x]!=0{remaining+=1;}}
            }
            if remaining<500{continue;}
            let cx=x0.saturating_sub(6);let cy=y0.saturating_sub(6);
            b.output.extend_from_slice(&[cx as u32,cy as u32,(w.min(x1+7)-cx)as u32,(h.min(y1+7)-cy)as u32,y0 as u32,y1 as u32]);
        }
        0
    })
}

/// Bounding boxes for text strips [x0, y0, x1, y1], inclusive endpoints.
#[no_mangle]
pub extern "C" fn strips(w:usize,h:usize,k:usize)->i32 {
    BUFFERS.with(|b| {
        let mut b=b.borrow_mut();b.output.clear();
        if !dimensions(w,h,b.pixels.len()) || k==0 || k>64{return -1;}
        if k<2 || h<200{return 0;}
        let mut bands=Vec::new();let mut start=None;let mut last=0;
        for y in 0..=h {
            let has=y<h && (0..w).step_by(2).filter(|&x| b.pixels[(y*w+x)*4]<200).count()>3;
            if has{if start.is_none(){start=Some(y);}last=y;}
            else if let Some(st)=start{if y==h || y-last>7{if last-st>=6{bands.push((st,last));}start=None;}}
        }
        if bands.len()<2{return 0;}
        let target=bands.iter().map(|&(a,z)|z-a+1).sum::<usize>() as f64 / bands.len().min(k*2).max(2) as f64;
        let max_chunks=bands.len().min(k*2).max(2);let mut chunks=Vec::new();let mut cur=None;let mut acc=0;
        for (a,z)in bands{let st=cur.map_or(a,|(old,_)|old);cur=Some((st,z));acc+=z-a+1;
            if acc as f64>=target && chunks.len()<max_chunks-1{chunks.push(cur.take().unwrap());acc=0;}}
        if let Some(ch)=cur{chunks.push(ch);}
        if chunks.len()<2{return 0;}
        for (y0,y1) in chunks {
            let mut x0=w;let mut x1=0;
            for y in y0..=y1{for x in 0..w{if b.pixels[(y*w+x)*4]<200{x0=x0.min(x);x1=x1.max(x);}}}
            if x0==w{x0=0;x1=w-1;}
            b.output.extend_from_slice(&[x0.saturating_sub(4)as u32,y0 as u32,(w-1).min(x1+4)as u32,y1 as u32]);
        }
        0
    })
}

fn hsl(r:f64,g:f64,b:f64)->(f64,f64,f64){
    let (r,g,b)=(r/255.0,g/255.0,b/255.0);let mx=r.max(g).max(b);let mn=r.min(g).min(b);
    let l=(mx+mn)/2.0;let d=mx-mn;
    if d==0.0{return(0.0,0.0,l);}
    let s=d/(1.0-(2.0*l-1.0).abs());
    let h=if mx==r{(g-b)/d+if g<b{6.0}else{0.0}}else if mx==g{(b-r)/d+2.0}else{(r-g)/d+4.0};
    (h*60.0,s,l)
}
fn color(h:f64,s:f64,l:f64)->u32{
    let h=h.rem_euclid(360.0);let s=s.clamp(0.0,1.0);let l=l.clamp(0.0,1.0);let a=s*l.min(1.0-l);
    let f=|n:f64|{let k=(n+h/30.0)%12.0;(255.0*(l-a*(-1.0f64).max((k-3.0).min((9.0-k).min(1.0))))).round()as u32};
    (f(0.0)<<16)|(f(8.0)<<8)|f(4.0)
}
#[no_mangle]
pub extern "C" fn palette()->i32 {
    BUFFERS.with(|b| {
        let mut b=b.borrow_mut();b.output.clear();if b.pixels.len()%4!=0{return -1;}
        let mut bins=vec![[0.0;4];4096];let mut order=Vec::new();let mut lum=0.0;let mut n=0.0;
        for p in b.pixels.chunks_exact(4){if p[3]<128{continue;}
            let (r,g,bl)=(p[0]as f64,p[1]as f64,p[2]as f64);lum+=0.299*r+0.587*g+0.114*bl;n+=1.0;
            let key=((p[0]as usize>>4)<<8)|((p[1]as usize>>4)<<4)|(p[2]as usize>>4);
            if bins[key][0]==0.0{order.push(key);}let e=&mut bins[key];e[0]+=1.0;e[1]+=r;e[2]+=g;e[3]+=bl;
        }
        if n==0.0{return 0;}
        let mut dom=(0.0,0.0,0.0);let mut accent=None;let mut dom_count=-1.0;let mut score=-1.0;
        for key in order{let e=bins[key];let p=hsl(e[1]/e[0],e[2]/e[0],e[3]/e[0]);
            if e[0]>dom_count{dom_count=e[0];dom=p;}
            let sc=e[0]*p.1*(1.0-(2.0*p.2-1.0).abs()*0.8);
            if p.1>0.15 && sc>score{score=sc;accent=Some(p);}
        }
        let ac=accent.unwrap_or(dom);let h=dom.0;let s=dom.1.clamp(0.25,0.75);let ph=ac.0;let ps=ac.1.clamp(0.5,0.85);
        b.output=if lum/n/255.0>0.5{
            vec![color(ph,ps,0.45),color(ph,ps*0.8,0.88),color(h,s*0.35,0.98),color(h,s*0.5,0.94),color(h,s*0.7,0.32),color(h,s*0.55,0.86),color(h,s*0.6,0.78)]
        }else{
            vec![color(ph,ps,0.62),color(ph,ps*0.6,0.28),color(h,s*0.5,0.19),color(h,s*0.5,0.13),color(h,s*0.55,0.38),color(h,s*0.5,0.16),color(h,s*0.55,0.09)]
        };0
    })
}
