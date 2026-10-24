import type {Workspace} from './model';
import {nativeReminderBundle} from './native-reminder-bundle';
// Deliberately excludes profile identity, notes, documents, notices, AI conversations and progress.
export function desktopSnapshot(workspace:Workspace,advancedReady=false,now=new Date()){
 return {profile:{onboarded:workspace.profile.onboarded,timezone:workspace.profile.timezone,studyTime:workspace.profile.studyTime},tasks:workspace.tasks.filter(t=>!t.archived&&t.status!=='done').map(t=>({id:t.id,title:t.title.slice(0,160),date:t.date,due:t.due,status:t.status})),...(advancedReady&&workspace.studio?.reminderPolicy?.nativeEnabled?{advanced:nativeReminderBundle(workspace,now)}:{})};
}
