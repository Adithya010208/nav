export const deviceJSON=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function tokenHash(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export function newDeviceToken(){return 'navd_'+Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export function deviceBearer(request:Request){const header=request.headers.get('Authorization')||'';return /^Bearer navd_[a-f0-9]{64}$/.test(header)?header.slice(7):null;}
