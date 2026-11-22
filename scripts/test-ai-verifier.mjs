import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';

const source = `import assert from 'node:assert/strict';
import {verifyAIAdvice} from './lib/ai-verifier';
import {emptyWorkspace,newTask} from './lib/model';
import {aiContext} from './lib/ai';

const w = emptyWorkspace();
w.profile.dailyMinutes = 180;
w.profile.studyTime = '18:00';
w.profile.timezone = 'Asia/Kolkata';

// Add tasks:
// t1: 60 min, planned today (2026-10-29), due 2026-10-31
// t2: 30 min, completed today (2026-10-29)
// Total planned for today = 90 minutes. Available capacity = 180 - 90 = 90 minutes.
const t1 = newTask({id: 't1', title: 'Calculus Assignment', category: 'College', date: '2026-10-29', due: '2026-10-31', minutes: 60, status: 'planned'});
const t2 = newTask({id: 't2', title: 'Data Structures Problem', category: 'Roadmap', date: '2026-10-29', minutes: 30, status: 'done', completedAt: '2026-10-29'});
const t3 = newTask({id: 't3', title: 'Old Overdue Task', category: 'Personal', date: '2026-10-20', due: '2026-10-25', minutes: 30, status: 'planned'});
w.tasks.push(t1, t2, t3);

const fixedNow = new Date('2026-10-29T12:00:00Z');
const context = aiContext(w, 'briefing', undefined, fixedNow);

assert.equal(context.evidence.completedTasksLast7Days, 1);
assert.equal(context.planning.overdue, 1);
assert.equal(context.planning.plannedMinutes, 90);
assert.equal(context.planning.availableMinutes, 90);

// Test 1: Verified advice with truthful claims and valid capacity
const validOutput = {
  answer: 'You have 1 tasks completed this week and 1 tasks overdue. Today you have 90 minutes planned.',
  suggestions: [
    {
      title: 'Work on Calculus Assignment',
      category: 'College' as const,
      minutes: 45,
      date: '2026-10-29',
      due: '2026-10-31',
      reason: 'It is due soon'
    }
  ]
};
const result1 = verifyAIAdvice(validOutput, context);
assert.equal(result1.verified, true);
assert.equal(result1.warnings.length, 0);
assert(result1.metrics.checked >= 4);

// Test 2: AI hallucinates completed tasks count
const badCompletedOutput = {
  answer: 'Great job! You have 5 tasks completed this week.',
  suggestions: []
};
const result2 = verifyAIAdvice(badCompletedOutput, context);
assert.equal(result2.verified, false);
assert(result2.warnings.some(w => w.includes('AI claimed 5 completed tasks')));

// Test 3: AI hallucinates overdue tasks count
const badOverdueOutput = {
  answer: 'Alert: You have 4 tasks overdue.',
  suggestions: []
};
const result3 = verifyAIAdvice(badOverdueOutput, context);
assert.equal(result3.verified, false);
assert(result3.warnings.some(w => w.includes('AI claimed 4 overdue tasks')));

// Test 4: AI hallucinates planned minutes
const badMinutesOutput = {
  answer: 'You currently have 180 minutes planned for today.',
  suggestions: []
};
const result4 = verifyAIAdvice(badMinutesOutput, context);
assert.equal(result4.verified, false);
assert(result4.warnings.some(w => w.includes('AI claimed 180 planned minutes today')));

// Test 5: AI invents an ungrounded deadline date not in sources, tasks, or today
const ungroundedOutput = {
  answer: 'Here is a new assignment deadline.',
  suggestions: [
    {
      title: 'Invented Exam',
      category: 'College' as const,
      minutes: 30,
      date: '2026-10-29',
      due: '2026-11-20', // Date does not exist anywhere in context or source
      reason: 'AI hallucinated date'
    }
  ]
};
const result5 = verifyAIAdvice(ungroundedOutput, context);
assert.equal(result5.verified, false);
assert(result5.warnings.some(w => w.includes('not grounded in source text or existing plan')));

// Test 6: Capacity overload check when 0 minutes remain
const fullWorkspace = structuredClone(w);
// Fill up dailyMinutes (180 min)
fullWorkspace.tasks[0].minutes = 150;
const fullContext = aiContext(fullWorkspace, 'briefing', undefined, fixedNow);
assert.equal(fullContext.planning.availableMinutes, 0);

const overloadOutput = {
  answer: 'Add this extra task today.',
  suggestions: [
    {
      title: 'Extra Heavy Project',
      category: 'Project' as const,
      minutes: 45,
      date: '2026-10-29',
      due: '',
      reason: 'Important task'
    }
  ]
};
const result6 = verifyAIAdvice(overloadOutput, fullContext);
assert.equal(result6.verified, false);
assert(result6.warnings.some(w => w.includes('0 available minutes remain today')));

console.log('PASS: test-ai-verifier.mjs verified completed claims, overdue claims, planned minutes, grounded dates, and capacity limits.');
`;

await build({
  stdin: {contents: source, resolveDir: process.cwd(), sourcefile: 'test-ai-verifier.ts', loader: 'ts'},
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.sites-runtime/tests/test-ai-verifier.mjs'
});

const result = spawnSync(process.execPath, ['.sites-runtime/tests/test-ai-verifier.mjs'], {stdio: 'inherit'});
process.exitCode = result.status ?? 1;
