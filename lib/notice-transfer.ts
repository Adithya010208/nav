import {z} from 'zod';
import {Source,Workspace,uid,dateInZone} from './model';
import {fingerprint,suggestFromMessage} from './college';

export const noticeBundle=z.object({format:z.literal('nav-college-notices'),version:z.literal(1),group:z.string().min(1).max(150),notices:z.array(z.object({group:z.string().min(1).max(150),text:z.string().trim().min(1).max(12000),receivedAt:z.number().int().nonnegative()})).min(1).max(100)});
export type NoticeBundle=z.infer<typeof noticeBundle>;
export function readNoticeBundle(text:string,approvedGroup:string,now=Date.now()):NoticeBundle {
 if(new TextEncoder().encode(text).length>500000)throw Error('Notice file exceeds 500 KB.');
 if(!approvedGroup)throw Error('Choose your approved college group in Settings first.');
 let parsed;try{parsed=noticeBundle.safeParse(JSON.parse(text));}catch{throw Error('Choose a NAV college notice JSON export.');}
 if(!parsed.success)throw Error('This is not a valid NAV college notice export.');
 const bundle=parsed.data;
 if(bundle.group!==approvedGroup||bundle.notices.some(n=>n.group!==approvedGroup))throw Error('Every notice must match your exact approved group.');
 if(bundle.notices.some(n=>n.receivedAt>now+60000||n.receivedAt<now-7*86400000))throw Error('Only notices from the last seven days can be imported.');
 return bundle;
}
export function mergeNoticeBundle(workspace:Workspace,bundle:NoticeBundle,now=Date.now()) {
 // Revalidate at commit time: the approved group or time may have changed during review.
 const checked=readNoticeBundle(JSON.stringify(bundle),workspace.profile.approvedGroup,now);
 const result=structuredClone(workspace);let added=0,duplicates=0;
 for(const notice of checked.notices){
  const fp=fingerprint(notice.text),normalized=notice.text.trim().toLowerCase().replace(/\s+/g,' ');
  if(result.sources.some(s=>s.group===checked.group&&Date.parse(s.receivedAt)===notice.receivedAt&&s.fingerprint===fp&&s.text.trim().toLowerCase().replace(/\s+/g,' ')===normalized)){duplicates++;continue;}
  const source:Source={id:uid(),text:notice.text,group:checked.group,receivedAt:new Date(notice.receivedAt).toISOString(),importedAt:new Date(now).toISOString(),title:notice.text.split('\n')[0].slice(0,100),fingerprint:fp};
  result.sources.push(source);result.suggestions.push(...suggestFromMessage(source,result.tasks,dateInZone(result.profile.timezone,new Date(source.receivedAt))));added++;
 }
 if(result.sources.length>1000||result.suggestions.length>1000)throw Error('Your inbox is full. Export a workspace backup before removing old notices.');
 return {workspace:result,added,duplicates};
}
