// A bounded, local-only verification event. Never changes the user's plan or ordinary delivery receipts.
function createVerification(now=Date.now){let pending=null;
 return {
  schedule(){const due=now()+60000;pending={id:'verification:'+due,due,expires:due+600000};return new Date(due).toISOString();},
  dueAt(){return pending?new Date(pending.due).toISOString():null;},
  event(){if(!pending)return null;if(now()>pending.expires){pending=null;return null;}if(now()<pending.due)return null;return {id:pending.id,kind:'verification',title:'NAV · Scheduled reminder check',body:'This test ran automatically while NAV stayed in the tray.'};},
  accepted(id){if(pending?.id===id)pending=null;}
 };
}
module.exports={createVerification};
