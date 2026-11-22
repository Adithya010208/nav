import type {aiContext,aiOutput} from './ai';
import type {z} from 'zod';

export type AIAdviceOutput=z.infer<typeof aiOutput>;
export type ClaimVerification={
 verified:boolean;
 warnings:string[];
 metrics:{checked:number;passed:number;warningsCount:number};
};

/**
 * Deterministic, offline evidence verification for AI output.
 * Checks factual counts, deadline grounding, and capacity limits against active context.
 * Incurs ZERO billable API calls.
 */
export function verifyAIAdvice(
 output:AIAdviceOutput,
 context:ReturnType<typeof aiContext>
):ClaimVerification{
 const warnings:string[]=[];
 let checked=0,passed=0;

 // 1. Evidence check: Completed task count claims
 checked++;
 const completedMatch=output.answer.match(/(\d+)\s+(?:tasks?\s+completed|completed\s+tasks?)/i);
 if(completedMatch){
  const claimed=parseInt(completedMatch[1],10),actual=context.evidence.completedTasksLast7Days;
  if(claimed!==actual)warnings.push(`AI claimed ${claimed} completed tasks, but verified records show ${actual}.`);
  else passed++;
 }else{passed++;}

 // 2. Evidence check: Overdue task count claims
 checked++;
 const overdueMatch=output.answer.match(/(\d+)\s+(?:tasks?\s+overdue|overdue\s+tasks?)/i);
 if(overdueMatch){
  const claimed=parseInt(overdueMatch[1],10),actual=context.planning.overdue;
  if(claimed!==actual)warnings.push(`AI claimed ${claimed} overdue tasks, but verified records show ${actual}.`);
  else passed++;
 }else{passed++;}

 // 3. Evidence check: Planned minutes claims
 checked++;
 const minutesMatch=output.answer.match(/(\d+)\s+(?:minutes?\s+planned|planned\s+minutes?)/i);
 if(minutesMatch){
  const claimed=parseInt(minutesMatch[1],10),actual=context.planning.plannedMinutes;
  if(claimed!==actual)warnings.push(`AI claimed ${claimed} planned minutes today, but verified plan has ${actual} minutes.`);
  else passed++;
 }else{passed++;}

 // 4. Grounding check: Due dates in suggestions must be grounded in context or empty
 for(const s of output.suggestions){
  if(s.due){
   checked++;
   const sourceText=context.selectedSource?.text||'';
   const inSource=sourceText.includes(s.due);
   const inTasks=context.tasks.some(t=>t.due===s.due||t.date===s.due);
   const isToday=s.due===context.currentDate;
   if(!inSource&&!inTasks&&!isToday){
    warnings.push(`Suggestion "${s.title}" specifies deadline ${s.due} which is not grounded in source text or existing plan.`);
   }else{passed++;}
  }
 }

 // 5. Capacity check: Suggestions exceeding available capacity when 0 minutes remain
 if(context.planning.availableMinutes===0&&output.suggestions.length>0){
  checked++;
  const totalSuggested=output.suggestions.reduce((sum,s)=>sum+s.minutes,0);
  if(totalSuggested>0){
   warnings.push(`Suggestions add ${totalSuggested} minutes, but 0 available minutes remain today. Existing tasks must be rescheduled first.`);
  }else{passed++;}
 }

 return {
  verified:warnings.length===0,
  warnings,
  metrics:{checked,passed,warningsCount:warnings.length}
 };
}
