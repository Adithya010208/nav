import {z} from 'zod';
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const reminderPolicySchema=z.object({
 enabled:z.boolean().default(false),morning:time.default('08:00'),evening:time.default('20:00'),missed:time.default('19:00'),
 morningEnabled:z.boolean().default(true),eveningEnabled:z.boolean().default(true),missedEnabled:z.boolean().default(true),
 quietEnabled:z.boolean().default(true),quietStart:time.default('22:00'),quietEnd:time.default('07:00'),
 graceMinutes:z.number().int().min(15).max(180).default(60),
 missedGraceMinutes:z.number().int().min(0).max(180).default(30),
}).superRefine((v,c)=>{if(v.quietEnabled&&v.quietStart===v.quietEnd)c.addIssue({code:'custom',message:'Quiet hours must have different start and end times.'});});
export type ReminderPolicy=z.infer<typeof reminderPolicySchema>;
export const defaultReminderPolicy=()=>reminderPolicySchema.parse({});
export function quietAt(time:string,policy:ReminderPolicy){return policy.enabled&&policy.quietEnabled&&(policy.quietStart<policy.quietEnd?time>=policy.quietStart&&time<policy.quietEnd:time>=policy.quietStart||time<policy.quietEnd);}
export function policyFromForm(f:FormData):ReminderPolicy{return reminderPolicySchema.parse({enabled:f.get('enabled')==='on',morning:f.get('morning'),evening:f.get('evening'),missed:f.get('missed'),morningEnabled:f.get('morningEnabled')==='on',eveningEnabled:f.get('eveningEnabled')==='on',missedEnabled:f.get('missedEnabled')==='on',quietEnabled:f.get('quietEnabled')==='on',quietStart:f.get('quietStart'),quietEnd:f.get('quietEnd'),graceMinutes:Number(f.get('graceMinutes')),missedGraceMinutes:Number(f.get('missedGraceMinutes'))});}
