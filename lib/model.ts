export type TaskStatus = 'planned' | 'partial' | 'done' | 'missed';
export type Category = 'Roadmap' | 'College' | 'Personal' | 'Project' | 'Revision';
export interface Task { id:string; title:string; category:Category; date:string; due:string; dueAt?:string; dueZone?:string; advanceMinutes?:number; minutes:number; priority:number; status:TaskStatus; notes:string; sourceId?:string; topicId?:string; completedAt?:string; archived?:boolean; createdAt:string; }
export interface Topic { id:string; title:string; phase:number; week:number; evidence:string; done:boolean; }
export interface Source { id:string; text:string; group:string; receivedAt:string; importedAt:string; title:string; fingerprint:string; }
export interface Suggestion { id:string; sourceId:string; title:string; due:string; confidence:'review'|'date-found'; reason:string; dueTime?:string; dueZone?:string; existingTaskId?:string; }
export interface Session { id:string; taskId:string; title:string; startedAt:string; endedAt:string; seconds:number; note:string; }
export interface Problem { id:string; title:string; pattern:string; result:'Independent'|'With hints'|'Revisit'; date:string; notes:string; review3:string; review14:string; }
export interface Profile { name:string; timezone:string; startDate:string; dailyMinutes:number; studyTime:string; examMode:boolean; approvedGroup:string; onboarded:boolean; }
export interface Workspace { schemaVersion:2; profile:Profile; tasks:Task[]; topics:Topic[]; sources:Source[]; suggestions:Suggestion[]; sessions:Session[]; problems:Problem[]; studio?:import('./studio').Studio; }
export const uid=()=>crypto.randomUUID();
export function dateInZone(zone='Asia/Kolkata',date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function addDays(iso:string,n:number){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function emptyWorkspace():Workspace{return {schemaVersion:2,profile:{name:'',timezone:'Asia/Kolkata',startDate:dateInZone(),dailyMinutes:150,studyTime:'18:30',examMode:false,approvedGroup:'',onboarded:false},tasks:[],topics:[],sources:[],suggestions:[],sessions:[],problems:[]};}
export function newTask(values:Partial<Task>):Task{return {id:uid(),title:'',category:'Roadmap',date:dateInZone(),due:'',minutes:30,priority:2,status:'planned',notes:'',createdAt:new Date().toISOString(),...values};}
export function weekNumber(start:string,date:string){return Math.max(1,Math.floor((Date.parse(date+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/604800000)+1);}
export function planWithinCapacity(tasks:Task[],ids:string[],start:string,capacity:number){
 const selected=tasks.filter(t=>ids.includes(t.id)&&t.status!=='done'&&!t.archived).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||a.priority-b.priority);
 const selectedIds=new Set(selected.map(t=>t.id));
 // Completed work already consumed that day's budget; it is never moved.
 const occupied=new Map<string,number>();tasks.filter(t=>!selectedIds.has(t.id)&&!t.archived).forEach(t=>occupied.set(t.date,(occupied.get(t.date)||0)+t.minutes));
 const placements:Record<string,string>={},unplaced:string[]=[];for(const t of selected){let placed=false;for(let n=0;n<30;n++){const date=addDays(start,n);if((occupied.get(date)||0)+t.minutes<=capacity){placements[t.id]=date;occupied.set(date,(occupied.get(date)||0)+t.minutes);placed=true;break;}}if(!placed)unplaced.push(t.id);}
 return {placements,unplaced,late:selected.filter(t=>placements[t.id]&&t.due&&placements[t.id]>t.due).map(t=>t.id)};
}
export function rescheduleStart(selectedDate:string,today:string){
 if(!validDate(selectedDate)||!validDate(today))throw Error('Choose a valid calendar date.');
 return selectedDate<today?today:addDays(selectedDate,1);
}
