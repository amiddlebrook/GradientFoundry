import {first,json,fail,type Env} from './core';
type Sample={text:string;label:string};
function stableHash(text:string,seed:number):number {let hash=(2166136261^seed)>>>0;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;return hash;}
export function crossValidation(records:Sample[],folds=5,seed=42){
 if(!Number.isSafeInteger(folds)||folds<2||folds>10)fail(400,'folds must be an integer from 2 to 10');
 if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647)fail(400,'seed must be a non-negative 31-bit integer');
 const groups=new Map<string,{size:number;labels:Map<string,number>}>();
 for(const r of records){const key=r.text.trim().toLocaleLowerCase().replace(/\s+/g,' '),g=groups.get(key)||{size:0,labels:new Map<string,number>()};g.size++;g.labels.set(r.label,(g.labels.get(r.label)||0)+1);groups.set(key,g);}
 if(groups.size<folds)fail(422,'Not enough distinct text groups for requested folds');
 const result=Array.from({length:folds},(_,index)=>({index,records:0,groups:0,labels:{} as Record<string,number>}));
 const ordered=[...groups.entries()].sort((a,b)=>stableHash(a[0],seed)-stableHash(b[0],seed)||a[0].localeCompare(b[0]));
 const contradictions:string[]=[];
 for(const [key,g] of ordered){if(g.labels.size>1)contradictions.push(key.slice(0,80));}
 // Whole duplicate groups stay together; label coverage and fold size are balanced deterministically.
 for(const [,g] of ordered){const primary=[...g.labels.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0];const min=result.slice().sort((a,b)=>(a.labels[primary]||0)-(b.labels[primary]||0)||a.records-b.records||a.index-b.index)[0];min.records+=g.size;min.groups++;for(const [label,count] of g.labels)min.labels[label]=(min.labels[label]||0)+count;}
 const labels=[...new Set(records.map(r=>r.label))].sort();
 const coverageIssues=[];for(const fold of result)for(const label of labels)if(!fold.labels[label])coverageIssues.push(`Fold ${fold.index+1} lacks label ${label}`);
 return {folds,seed,groups:groups.size,records:records.length,duplicates:records.length-groups.size,contradictory_groups:contradictions,partitions:result,coverage_warnings:coverageIssues,leakage_by_exact_duplicate:0,training_executed:false};
}
export async function crossValidationApi(req:Request,env:Env,url:URL):Promise<Response|null>{
 const match=url.pathname.match(/^\/api\/datasets\/([^/]+)\/cross-validation$/);
 if(!match||req.method!=='GET')return null;
 const ds=await first<{id:string;records:string}>(env,'SELECT id,records FROM datasets WHERE id=?',match[1]);if(!ds)fail(404,'Dataset not found');
 const folds=Number(url.searchParams.get('folds')??'5'),seed=Number(url.searchParams.get('seed')??'42');
 return json({dataset_id:ds.id,...crossValidation(JSON.parse(ds.records),folds,seed)});
}
