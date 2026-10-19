import Nanba from './nanba';
import {getChatGPTUser,chatGPTSignInPath} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();if(!user)return <main className="signin"><div className="logo">n</div><span className="eyebrow">NANBA · PERSONAL STUDY COMPANION</span><h1>Your next step,<br/>a little clearer.</h1><p>Bring your learning roadmap, college deadlines and daily progress into one calm workspace.</p><a className="primary" href={chatGPTSignInPath('/')} target="_top">Sign in with ChatGPT →</a><small>Your workspace is private to your account.</small></main>;return <Nanba userId={user.userId} displayName={user.fullName||''}/>;}
