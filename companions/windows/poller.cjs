// At most one live poll. Cancellation makes late account responses unusable.
function createPoller({enabled,load,deliver,timeoutMs=15000}) {
 let active=null;
 async function run(){
  if(active||!enabled())return false;
  const controller=new AbortController();active=controller;
  let deadline;
  try{
   const aborted=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('Poll cancelled')),{once:true}));
   deadline=setTimeout(()=>controller.abort(),timeoutMs);
   const data=await Promise.race([Promise.resolve().then(()=>load(controller.signal)),aborted]);
   if(controller.signal.aborted||active!==controller||!enabled())return false;
   await deliver(data,controller.signal);return true;
  }catch{return false;}
  finally{clearTimeout(deadline);if(active===controller)active=null;}
 }
 return {run,cancel(){active?.abort();}};
}
module.exports={createPoller};
