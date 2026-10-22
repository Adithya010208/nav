import type {Workspace} from './model';
// Deliberately excludes profile identity, notes, documents, notices, AI conversations and progress.
export function desktopSnapshot(workspace:Workspace){
 return {profile:{onboarded:workspace.profile.onboarded,timezone:workspace.profile.timezone,studyTime:workspace.profile.studyTime},tasks:workspace.tasks.filter(t=>!t.archived&&t.status!=='done').map(t=>({id:t.id,title:t.title.slice(0,160),date:t.date,due:t.due,status:t.status}))};
}
