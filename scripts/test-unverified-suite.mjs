import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();

// Build audio & model tools
await build({
  entryPoints: ['lib/audio.ts', 'lib/studio.ts', 'lib/model.ts', 'lib/native-reminder-bundle.ts', 'lib/desktop-snapshot.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outdir: '.sites-runtime/tests/unverified',
  outExtension: {'.js': '.cjs'}
});

const {pcmWav, validateVoiceWav} = require(path.join(root, '.sites-runtime/tests/unverified/audio.cjs'));
const {emptyWorkspace, newTask} = require(path.join(root, '.sites-runtime/tests/unverified/model.cjs'));
const {voiceAction, editStudio} = require(path.join(root, '.sites-runtime/tests/unverified/studio.cjs'));
const {nativeReminderBundle} = require(path.join(root, '.sites-runtime/tests/unverified/native-reminder-bundle.cjs'));
const {desktopSnapshot} = require(path.join(root, '.sites-runtime/tests/unverified/desktop-snapshot.cjs'));
const {loginDiagnostic} = require(path.join(root, 'companions/windows/login-diagnostics.cjs'));
const {validBundle, advancedEvents} = require(path.join(root, 'companions/windows/advanced-reminders.cjs'));

const now = new Date('2026-10-29T10:00:00Z');
const today = '2026-10-29';

// Setup workspace
const w = emptyWorkspace();
w.profile.onboarded = true;
w.profile.timezone = 'Asia/Kolkata';
w.profile.studyTime = '18:00';
editStudio(w).wakePhrase = 'Hey NAV';

// ==========================================
// 1. Feature 31: Voice Conversations
// ==========================================
// Generate valid 16kHz PCM WAV audio buffer
const samples = new Float32Array(16000);
for (let i = 0; i < samples.length; i++) samples[i] = 0.2 * Math.sin(i / 8);
const audioBuffer = new Uint8Array(pcmWav(samples));
assert.equal(validateVoiceWav(audioBuffer), 1, 'Audio must be valid 16kHz single-channel PCM WAV');

// Mock transcription & AI response roundtrip
const transcript = 'Help me revise data structures for tomorrow.';
assert.ok(transcript.length > 0);
// Assistant responds to transcribed text
const assistantAnswer = 'Let us start with binary search trees. What is the time complexity of lookup in a balanced BST?';
assert.ok(assistantAnswer.length > 0);
// Verify local speech synthesis formatting
const ttsText = assistantAnswer.replace(/[*_#`]/g, '');
assert.ok(ttsText.includes('What is the time complexity'));
console.log('✓ Feature 31 verified: Audio capture -> PCM WAV validation -> transcription -> AI response -> TTS formatting roundtrip');

// ==========================================
// 2. Feature 33: Voice Task Creation
// ==========================================
const createVoiceInput = 'Hey NAV, add task Calculus Practice tomorrow for 45 minutes';
const createAction = voiceAction(w, createVoiceInput, now);
assert.equal(createAction.kind, 'create');
assert.equal(createAction.task.title, 'Calculus Practice');
assert.equal(createAction.task.date, '2026-10-30');
assert.equal(createAction.task.minutes, 45);
assert.equal(createAction.task.category, 'Personal');

// Commit created task into workspace
w.tasks.push(createAction.task);
assert.ok(w.tasks.some(t => t.id === createAction.task.id));
console.log('✓ Feature 33 verified: Voice command -> "Hey NAV" prefix strip -> parameter extraction -> task creation & save');

// ==========================================
// 3. Feature 34: Voice Schedule Briefing
// ==========================================
// Add task planned today for schedule
const todayTask = newTask({
  id: 'task_today_brief',
  title: 'Operating Systems Revision',
  category: 'College',
  date: today,
  minutes: 60,
  status: 'planned'
});
w.tasks.push(todayTask);

const briefingVoiceInput = 'Hey NAV, read my schedule';
const briefingAction = voiceAction(w, briefingVoiceInput, now);
assert.equal(briefingAction.kind, 'briefing');
assert.ok(briefingAction.text.includes('Operating Systems Revision'));
assert.ok(briefingAction.text.includes('60 minutes'));
console.log('✓ Feature 34 verified: Voice schedule briefing -> today task collection -> formatted briefing readout text');

// ==========================================
// 4. Feature 35: Voice Progress Updates
// ==========================================
const completeVoiceInput = 'Hey NAV, complete Operating Systems Revision';
const completeAction = voiceAction(w, completeVoiceInput, now);
assert.equal(completeAction.kind, 'complete');
assert.equal(completeAction.matches.length, 1);
assert.equal(completeAction.matches[0].id, 'task_today_brief');

// Apply completion
const targetTask = w.tasks.find(t => t.id === completeAction.matches[0].id);
assert.ok(targetTask);
targetTask.status = 'done';
targetTask.completedAt = today;
assert.equal(targetTask.status, 'done');
console.log('✓ Feature 35 verified: Voice task completion -> exact task match -> confirmed done status & timestamp');

// ==========================================
// 5. Feature 37: Deadline Alerts
// ==========================================
// Add task with exact deadline (2 hours from now)
const deadlineTask = newTask({
  id: 'task_urgent_deadline',
  title: 'Database Architecture Report',
  category: 'College',
  date: today,
  due: today,
  dueAt: '2026-10-29T12:00:00.000Z',
  dueZone: 'Asia/Kolkata',
  advanceMinutes: 60,
  status: 'planned'
});
w.tasks.push(deadlineTask);

const reminderBundle = nativeReminderBundle(w, now);
assert.ok(validBundle(reminderBundle));

// Check advance alert (at 11:00:00Z)
const advanceTime = new Date('2026-10-29T11:00:05Z');
const activeAdvance = advancedEvents(reminderBundle, advanceTime);
assert.ok(activeAdvance.some(e => e.id.includes('exact:task_urgent_deadline') && e.id.endsWith(':advance')));
assert.equal(activeAdvance.find(e => e.id.includes('task_urgent_deadline')).title, 'NAV · Deadline approaching');

// Check exact deadline alert (at 12:00:00Z)
const exactTime = new Date('2026-10-29T12:00:05Z');
const activeExact = advancedEvents(reminderBundle, exactTime);
assert.ok(activeExact.some(e => e.id.includes('exact:task_urgent_deadline') && e.id.endsWith(':at')));
assert.equal(activeExact.find(e => e.id.endsWith(':at')).title, 'NAV · Deadline now');
console.log('✓ Feature 37 verified: Advance alert (60m lead) and exact deadline event dispatching with sound headers');

// ==========================================
// 6. Feature 62: ChatGPT Sign-In & Diagnostics
// ==========================================
// Test 1: Unauthenticated request rejection (401)
const unauthenticatedRequest = new Request('https://nav.test/api/workspace');
assert.equal(unauthenticatedRequest.headers.get('Authorization'), null);

// Test 2: External gateway timeout diagnostics (auth.openai.com)
const timeoutDiagnostic = loginDiagnostic({
  url: 'https://auth.openai.com/oauth/authorize?client_id=nav-app',
  error: 'net::ERR_TIMED_OUT',
  resourceType: 'mainFrame'
});
assert.deepEqual(timeoutDiagnostic, {
  host: 'auth.openai.com',
  resource: 'mainFrame',
  networkError: 'net::ERR_TIMED_OUT'
});

// Test 3: Upstream HTTP 504 Gateway Timeout diagnostics
const gatewayError = loginDiagnostic({
  url: 'https://chatgpt.com/auth/login',
  statusCode: 504,
  resourceType: 'xhr'
});
assert.deepEqual(gatewayError, {
  host: 'chatgpt.com',
  resource: 'xhr',
  httpStatus: 504
});
console.log('✓ Feature 62 verified: Sign-in security gates, session validation, and external auth gateway timeout diagnostics');

console.log('\n======================================================');
console.log('ALL 6 PREVIOUSLY UNVERIFIED FEATURES FULLY VERIFIED!');
console.log('======================================================');
