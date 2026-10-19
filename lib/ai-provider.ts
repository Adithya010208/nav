import {outputFormat} from './ai';
export type ProviderId='gemini'|'openai';
type Bindings={AI_PROVIDER?:string;GEMINI_API_KEY?:string;GEMINI_MODEL?:string;OPENAI_API_KEY?:string;OPENAI_MODEL?:string};
export function providerConfig(env:Bindings){
 const id:ProviderId=env.AI_PROVIDER==='openai'?'openai':env.AI_PROVIDER==='gemini'||env.GEMINI_API_KEY?'gemini':'openai';
 const key=id==='gemini'?env.GEMINI_API_KEY:env.OPENAI_API_KEY,model=(id==='gemini'?env.GEMINI_MODEL:env.OPENAI_MODEL)||(id==='gemini'?'gemini-3.8-flash':'gpt-4.1-mini');
 return {id,label:id==='gemini'?'Google Gemini':'OpenAI',key,model,configured:!!key&&/^[a-zA-Z0-9._-]{1,100}$/.test(model)};
}
export class ProviderError extends Error {constructor(message:string,public status=502){super(message)}}
export async function providerAdvice(config:ReturnType<typeof providerConfig>,instructions:string,input:string){
 const gemini=config.id==='gemini';
 const response=await fetch(gemini?'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions':'https://api.openai.com/v1/responses',{
  method:'POST',redirect:'manual',headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),
  body:JSON.stringify(gemini?{model:config.model,max_tokens:4096,messages:[{role:'system',content:instructions},{role:'user',content:input}],response_format:{type:'json_schema',json_schema:{name:outputFormat.name,strict:true,schema:outputFormat.schema}}}:{model:config.model,store:false,max_output_tokens:2200,instructions,input,text:{format:outputFormat}})
 });
 if(!response.ok)throw new ProviderError(response.status===429?`${config.label} quota or rate limit reached. Check your API account and retry later.`:response.status===401||response.status===403?'The server AI credential is invalid or lacks access. Update it privately.':'AI provider request failed. Please retry later.',response.status===429?429:502);
 const result=await response.json() as {status?:string;choices?:{finish_reason?:string;message?:{content?:string}}[];output?:{content?:{type?:string;text?:string}[]}[]};
 if(gemini){const choice=result?.choices?.[0];if(choice?.finish_reason!=='stop'||typeof choice?.message?.content!=='string')throw new ProviderError('AI returned an incomplete response. Nothing was applied.');return JSON.parse(choice.message.content);}
 if(result.status!=='completed')throw new ProviderError('AI returned an incomplete response. Nothing was applied.');
 const text=(result.output||[]).flatMap((x:{content?:{type?:string;text?:string}[]})=>x.content||[]).filter((x:{type?:string})=>x.type==='output_text').map((x:{text?:string})=>x.text||'').join('');return JSON.parse(text);
}
