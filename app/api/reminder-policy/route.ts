import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {deviceJSON as json} from '@/lib/devices';
export const dynamic='force-dynamic';
export async function GET(){if(!await getChatGPTUser())return json({error:'Sign in first.'},401);return json({nativeReady:env.NAV_ADVANCED_REMINDERS_READY==='v2'});}
