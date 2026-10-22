const known=new Set(['auth.openai.com','auth0.openai.com','chatgpt.com','nav-personal-assistant.opalmug128.chatgpt.site']);
function loginDiagnostic(details){
 let u;try{u=new URL(details.url);}catch{return null;}
 if(u.protocol!=='https:'||!known.has(u.hostname))return null;
 const status=Number.isInteger(details.statusCode)?details.statusCode:null;
 const error=typeof details.error==='string'&&/^net::ERR_[A-Z_0-9]+$/.test(details.error)?details.error:null;
 if(!error&&(status===null||status<400))return null;
 return {host:u.hostname,resource:['mainFrame','subFrame','script','xhr','fetch'].includes(details.resourceType)?details.resourceType:'other',...(status===null?{}:{httpStatus:status}),...(error?{networkError:error}:{})};
}
module.exports={loginDiagnostic};
