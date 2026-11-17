const fs=require('node:fs');
const file='source/console.css';let css=fs.readFileSync(file,'utf8');
const scale={2:'3xs',4:'2xs',8:'xs',12:'sm',16:'md',24:'lg',32:'xl',40:'2xl'};
css=css.replace(/((?:padding|margin|gap|column-gap|row-gap)(?:-(?:top|bottom|left|right|inline|block|inline-start|inline-end))?\s*:)\s*([^;}]+)/g,(all,prop,value)=>prop+value.replace(/\b(\d+)px\b/g,(m,n)=>scale[n]?'var(--space-'+scale[n]+')':m));
css=css.replace('/* Hallmark · waive 24b · compact extension geometry retains optical sizes and saved panel dimensions */','/* Hallmark · waive 24b · existing compact extension geometry · optical sizes preserve saved panel dimensions and hit targets */');
fs.writeFileSync(file,css);
