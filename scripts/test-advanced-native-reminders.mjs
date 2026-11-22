import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';

const source = `import assert from 'node:assert/strict';
import path from 'node:path';
import {emptyWorkspace,newTask} from './lib/model';
import {desktopSnapshot} from './lib/desktop-snapshot';
import {nativeReminderBundle} from './lib/native-reminder-bundle';
import {defaultReminderPolicy} from './lib/reminder-policy';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const {validBundle,advancedEvents} = require(path.join(root, 'companions/windows/advanced-reminders.cjs'));
const {notificationPolicy} = require(path.join(root, 'companions/windows/notification-policy.cjs'));
const {createPoller} = require(path.join(root, 'companions/windows/poller.cjs'));

const now = new Date('2026-10-29T10:00:00Z');
const today = '2026-10-29';

// Setup workspace
const w = emptyWorkspace();
w.profile.onboarded = true;
w.profile.timezone = 'Asia/Kolkata';
w.profile.studyTime = '18:00';
w.studio = {
  memories: [],
  conversations: [],
  projects: [],
  opportunities: [],
  habits: [],
  busy: [],
  slots: [],
  checkins: [],
  wakePhrase: 'Hey NAV',
  reminderPolicy: {
    ...defaultReminderPolicy(),
    nativeEnabled: true,
    enabled: true,
    morningEnabled: true,
    eveningEnabled: true,
    missedEnabled: true,
    morning: '08:00',
    evening: '20:00',
    missed: '21:00'
  }
};

// Add exact deadline task
const task1 = newTask({
  id: 'task_exact',
  title: 'Operating Systems Project Submission',
  category: 'College',
  date: today,
  due: today,
  dueAt: '2026-10-29T12:00:00.000Z',
  dueZone: 'Asia/Kolkata',
  advanceMinutes: 60,
  status: 'planned'
});

// Add missed task from yesterday
const taskMissed = newTask({
  id: 'task_yesterday',
  title: 'Calculus Problem Set',
  category: 'College',
  date: '2026-10-28',
  due: '2026-10-28',
  status: 'missed'
});

w.tasks.push(task1, taskMissed);

// 1. Safety Gate Verification
// When safety gate is OFF (advancedReady = false), advanced bundle MUST NOT be present
const snapshotGateOff = desktopSnapshot(w, false, now);
assert.equal('advanced' in snapshotGateOff, false, 'advanced must be absent when safety gate is off');

// When user disables nativeEnabled, advanced bundle MUST NOT be present even if gate is on
const wDisabled = structuredClone(w);
wDisabled.studio.reminderPolicy.nativeEnabled = false;
const snapshotDisabled = desktopSnapshot(wDisabled, true, now);
assert.equal('advanced' in snapshotDisabled, false, 'advanced must be absent when nativeEnabled is false');

// When safety gate is ON (NAV_ADVANCED_REMINDERS_READY=v2) and nativeEnabled=true, bundle is active
const snapshotGateOn = desktopSnapshot(w, true, now);
assert.ok(snapshotGateOn.advanced, 'advanced must be present when gate is v2 and nativeEnabled is true');
assert.equal(snapshotGateOn.advanced.version, 2);

const bundle = snapshotGateOn.advanced;
assert.ok(validBundle(bundle), 'bundle must be valid for Windows companion');

// 2. Exact Deadline Reminders & Advance Alerts
// Advance alert event (1 hour before 12:00:00Z -> 11:00:00Z)
const advanceEvent = bundle.events.find(e => e.id.includes('exact:task_exact') && e.id.endsWith(':advance'));
assert.ok(advanceEvent, 'advance alert event must exist');
assert.equal(advanceEvent.title, 'NAV · Deadline approaching');
assert.equal(advanceEvent.at, Date.parse('2026-10-29T11:00:00.000Z'));
assert.equal(advanceEvent.until, Date.parse('2026-10-29T12:00:00.000Z'));

// Exact deadline event (at 12:00:00Z)
const exactEvent = bundle.events.find(e => e.id.includes('exact:task_exact') && e.id.endsWith(':at'));
assert.ok(exactEvent, 'exact deadline event must exist');
assert.equal(exactEvent.title, 'NAV · Deadline now');
assert.equal(exactEvent.at, Date.parse('2026-10-29T12:00:00.000Z'));
assert.equal(exactEvent.until, Date.parse('2026-10-29T12:10:00.000Z'));

// 3. Morning, Evening, and Missed Task Prompts
// Morning briefing prompt
const morningEvent = bundle.events.find(e => e.id.includes(':morning:'));
assert.ok(morningEvent, 'morning briefing event must exist');
assert.equal(morningEvent.title, 'NAV · Morning study briefing');
assert.ok(morningEvent.body.includes('tasks today'));

// Evening check-in prompt
const eveningEvent = bundle.events.find(e => e.id.includes(':evening:'));
assert.ok(eveningEvent, 'evening check-in event must exist');
assert.equal(eveningEvent.title, 'NAV · Evening check-in');

// Evening check-in suppressed if already completed
const wCheckedIn = structuredClone(w);
wCheckedIn.studio.checkins.push({id: 'ci1', date: today, notes: 'Done reflection', completedAt: now.toISOString()});
const bundleCheckedIn = nativeReminderBundle(wCheckedIn, now);
assert.equal(bundleCheckedIn.events.some(e => e.id.startsWith(today + ':evening:')), false, 'evening prompt must be suppressed if checkin completed');

// Missed-task review prompt
const missedEvent = bundle.events.find(e => e.id.includes(':missed:'));
assert.ok(missedEvent, 'missed task prompt event must exist');
assert.equal(missedEvent.title, 'NAV · Review unfinished work');
assert.ok(missedEvent.body.includes('unfinished tasks need review'));

// 4. Windows 0.6 Background Delivery Simulation
// Test delivery of advance alert when clock reaches 11:00:00Z
const atAdvanceTime = new Date('2026-10-29T11:00:01Z');
const activeAtAdvance = advancedEvents(bundle, atAdvanceTime);
assert.ok(activeAtAdvance.some(e => e.id === advanceEvent.id), 'advance alert must be triggered at 11:00:01Z');

// Test delivery of deadline now when clock reaches 12:00:00Z
const atDeadlineTime = new Date('2026-10-29T12:00:00Z');
const activeAtDeadline = advancedEvents(bundle, atDeadlineTime);
assert.ok(activeAtDeadline.some(e => e.id === exactEvent.id), 'exact deadline must be triggered at 12:00:00Z');

// Test Windows poller integration
let deliveredEvents = [];
const poller = createPoller({
  enabled: () => true,
  load: async () => snapshotGateOn,
  deliver: async (data) => {
    deliveredEvents = advancedEvents(data.advanced, atDeadlineTime);
  }
});
const polled = await poller.run();
assert.equal(polled, true);
assert.ok(deliveredEvents.some(e => e.id === exactEvent.id));

// Notification policy check with mock runner invoking callback
const mockRunner = (_cmd: unknown, _args: unknown, _opts: unknown, cb: (err: null, stdout: string) => void) => cb(null, '');
const policy = await notificationPolicy(mockRunner, async () => 0);
assert.equal(policy.enabled, true);

console.log('PASS: test-advanced-native-reminders.mjs passed safety gate, exact deadline reminders, advance alerts, morning/evening/missed prompts, and Windows 0.6 delivery.');
`;

await build({
  stdin: {contents: source, resolveDir: process.cwd(), sourcefile: 'test-advanced-native-reminders.ts', loader: 'ts'},
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.sites-runtime/tests/test-advanced-native-reminders.mjs'
});

const result = spawnSync(process.execPath, ['.sites-runtime/tests/test-advanced-native-reminders.mjs'], {stdio: 'inherit'});
process.exitCode = result.status ?? 1;
