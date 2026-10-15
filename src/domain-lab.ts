import {first,fail,json,required,type Env} from './core';
async function fingerprint(value:string){ const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))); return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join(''); }
type RecordRow={text:string;label:string};
function normalize(s:string){return s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')}
export function datasetQuality(records:RecordRow[]){
 const examples=new Map<string,{indices:number[];labels:Set<string>}>();
 const labels=new Map<string,number>();
 records.forEach((r,i)=>{
  const key=normalize(r.text);const label=r.label.trim();
  labels.set(label,(labels.get(label)||0)+1);
  const slot=examples.get(key)||{indices:[],labels:new Set<string>()};slot.indices.push(i+1);slot.labels.add(label);examples.set(key,slot);
 });
 const duplicates=[...examples.entries()].filter(([,v])=>v.indices.length>1).map(([text,v])=>({preview:text.slice(0,110),rows:v.indices.slice(0,20),occurrences:v.indices.length,labels:[...v.labels].sort(),conflict:v.labels.size>1}));
 const imbalance=records.length?Math.max(...labels.values())/records.length:0;
 return {records:records.length,unique_texts:examples.size,labels:[...labels].sort(([a],[b])=>a.localeCompare(b)).map(([label,count])=>({label,count,share:records.length?Number((count/records.length).toFixed(3)):0})),duplicates,conflicts:duplicates.filter(d=>d.conflict),majority_label_share:Number(imbalance.toFixed(3)),warnings:[...(duplicates.some(d=>d.conflict)?['Conflicting labels for identical normalized text']:[]),...(duplicates.length?['Repeated text can leak across training and validation splits']:[]),...(imbalance>=.8?['One class occupies at least 80% of examples']:[])],method:'Unicode NFKC, lowercase, trim and whitespace collapse; exact normalized duplicates only'};
}
export async function domainLabApi(req:Request,env:Env,url:URL):Promise<Response|null>{
 if(url.pathname!=='/api/lab/dataset-quality'||req.method!=='GET')return null;
 const id=required(url.searchParams.get('dataset_id'),'dataset_id',100);
 const data=await first<{name:string;records:string}>(env,'SELECT name,records FROM datasets WHERE id=?',id);
 if(!data)fail(404,'Dataset not found');
 const records=JSON.parse(data.records) as RecordRow[];
 return json({dataset_id:id,name:data.name,sha256:await fingerprint(JSON.stringify(records)),...datasetQuality(records)});
}
