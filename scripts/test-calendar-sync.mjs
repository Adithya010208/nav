import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();

// Bundle calendar-sync.ts and dependencies for Node runtime testing
await build({
  entryPoints: ['lib/calendar-sync.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outdir: '.sites-runtime/tests/calendar-sync',
  outExtension: {'.js': '.cjs'}
});

const {
  generateCalendarFeed,
  isPrivateOrLocalHost,
  validateCalendarUrl,
  syncCalendarFeed
} = require(path.join(root, '.sites-runtime/tests/calendar-sync/calendar-sync.cjs'));

console.log('--- Testing Feature 41: Calendar Integration (WebCal Feed & Remote Sync) ---');

// Helper to create a test workspace
function makeWorkspace() {
  return {
    profile: {
      name: 'Test Student',
      dailyMinutes: 180,
      studyTime: '09:00',
      timezone: 'Asia/Kolkata',
      weekendBonus: 0,
      theme: 'dark'
    },
    tasks: [
      {
        id: 't-algo-1',
        title: 'Algorithms Revision',
        category: 'Exam',
        date: '2026-10-30',
        due: '2026-10-30',
        dueAt: '2026-10-30T17:00:00.000Z',
        dueZone: 'Asia/Kolkata',
        advanceMinutes: 60,
        minutes: 60,
        priority: 1,
        status: 'planned',
        notes: 'Chapter 4 Trees and Graphs',
        createdAt: '2026-10-25T10:00:00.000Z'
      },
      {
        id: 't-net-2',
        title: 'Computer Networks Assignment',
        category: 'Assignment',
        date: '2026-10-31',
        due: '2026-10-31',
        minutes: 45,
        priority: 2,
        status: 'planned',
        notes: 'Packet tracer simulation',
        createdAt: '2026-10-25T10:00:00.000Z'
      }
    ],
    sources: [],
    topics: [],
    studio: {
      memories: [],
      conversations: [],
      projects: [],
      opportunities: [],
      habits: [],
      busy: [],
      slots: [
        {
          id: 'slot-101',
          taskId: 't-algo-1',
          start: '2026-10-30T09:00:00.000Z',
          end: '2026-10-30T10:00:00.000Z'
        }
      ],
      checkins: [],
      exams: [
        {
          id: 'exam-cs301',
          subject: 'CS301 Data Structures and Algorithms',
          startsAt: '2026-11-05T04:30:00.000Z',
          endsAt: '2026-11-05T07:30:00.000Z',
          timezone: 'Asia/Kolkata',
          kind: 'Midterm',
          location: 'Hall B',
          difficulty: 4,
          confidence: 3,
          topicIds: []
        }
      ],
      dependencies: [],
      wakePhrase: 'Hey NAV'
    }
  };
}

// 1. Test WebCal Feed Generation (RFC 5545 Compliance)
const ws = makeWorkspace();
const feed = generateCalendarFeed(ws, 'NAV Test Schedule');

assert.ok(feed.startsWith('BEGIN:VCALENDAR\r\n'), 'Feed must start with BEGIN:VCALENDAR');
assert.ok(feed.includes('VERSION:2.0\r\n'), 'Feed must declare iCalendar VERSION:2.0');
assert.ok(feed.includes('PRODID:-//NAV//Study Planner WebCal 2.0//EN\r\n'), 'Feed must include NAV PRODID');
assert.ok(feed.includes('X-WR-CALNAME:NAV Test Schedule\r\n'), 'Feed must include calendar name');
assert.ok(feed.includes('X-WR-TIMEZONE:Asia/Kolkata\r\n'), 'Feed must include timezone');
assert.ok(feed.endsWith('END:VCALENDAR\r\n'), 'Feed must terminate with END:VCALENDAR');

// Verify study slot VEVENT
assert.ok(feed.includes('UID:slot-slot-101@nanba'), 'Feed must contain study slot UID');
assert.ok(feed.includes('SUMMARY:Study: Algorithms Revision'), 'Feed must contain study slot summary');
assert.ok(feed.includes('DTSTART:20261030T090000Z'), 'Feed must contain study slot start time');
assert.ok(feed.includes('DTEND:20261030T100000Z'), 'Feed must contain study slot end time');
assert.ok(feed.includes('TRIGGER:-PT10M'), 'Study slot must have a 10-minute advance VALARM');

// Verify task deadline VEVENT
assert.ok(feed.includes('UID:deadline-t-algo-1@nanba'), 'Feed must contain exact task deadline event');
assert.ok(feed.includes('SUMMARY:Due: Algorithms Revision'), 'Feed must contain deadline summary');
assert.ok(feed.includes('TRIGGER:-PT60M'), 'Exact deadline must have configured 60-min advance alert');

// Verify all-day deadline VEVENT
assert.ok(feed.includes('UID:deadline-t-net-2@nanba'), 'Feed must contain all-day task deadline');
assert.ok(feed.includes('DTSTART;VALUE=DATE:20261031'), 'All-day deadline must use VALUE=DATE');

// Verify exam milestone VEVENT
assert.ok(feed.includes('UID:exam-exam-cs301@nanba'), 'Feed must contain exam milestone UID');
assert.ok(feed.includes('SUMMARY:Exam: CS301 Data Structures and Algorithms'), 'Feed must contain exam subject');
assert.ok(feed.includes('LOCATION:Hall B'), 'Feed must include exam location');
assert.ok(feed.includes('TRIGGER:-P1D'), 'Exam must have 1-day advance notification alert');

console.log('✓ WebCal RFC 5545 feed generation verified (study slots, deadlines, exams, alarms)');

// 2. Test SSRF Protection
console.log('--- Testing SSRF Protection ---');

// Private and localhost IP detection
assert.equal(isPrivateOrLocalHost('localhost'), true, 'localhost must be blocked');
assert.equal(isPrivateOrLocalHost('127.0.0.1'), true, '127.0.0.1 must be blocked');
assert.equal(isPrivateOrLocalHost('127.1.2.3'), true, '127.x loopback must be blocked');
assert.equal(isPrivateOrLocalHost('0.0.0.0'), true, '0.0.0.0 must be blocked');
assert.equal(isPrivateOrLocalHost('::1'), true, '::1 IPv6 loopback must be blocked');

// RFC 1918 Private Subnets
assert.equal(isPrivateOrLocalHost('10.0.0.1'), true, '10.0.0.0/8 must be blocked');
assert.equal(isPrivateOrLocalHost('10.254.1.99'), true, '10.x.x.x must be blocked');
assert.equal(isPrivateOrLocalHost('172.16.0.1'), true, '172.16.0.0/12 must be blocked');
assert.equal(isPrivateOrLocalHost('172.31.255.254'), true, '172.31.x.x must be blocked');
assert.equal(isPrivateOrLocalHost('192.168.1.1'), true, '192.168.0.0/16 must be blocked');
assert.equal(isPrivateOrLocalHost('192.168.100.50'), true, '192.168.x.x must be blocked');

// Cloud Metadata and Link-Local
assert.equal(isPrivateOrLocalHost('169.254.169.254'), true, 'Cloud metadata 169.254.169.254 must be blocked');
assert.equal(isPrivateOrLocalHost('169.254.1.1'), true, '169.254.x.x link-local must be blocked');

// Internal TLDs and Obfuscations
assert.equal(isPrivateOrLocalHost('router.local'), true, '.local must be blocked');
assert.equal(isPrivateOrLocalHost('service.internal'), true, '.internal must be blocked');
assert.equal(isPrivateOrLocalHost('server.lan'), true, '.lan must be blocked');
assert.equal(isPrivateOrLocalHost('0x7f000001'), true, 'Hex encoded IP must be blocked');
assert.equal(isPrivateOrLocalHost('2130706433'), true, 'Decimal encoded IP must be blocked');

// Valid External Domains
assert.equal(isPrivateOrLocalHost('calendar.google.com'), false, 'Public Google Calendar domain must pass');
assert.equal(isPrivateOrLocalHost('outlook.live.com'), false, 'Public Outlook domain must pass');
assert.equal(isPrivateOrLocalHost('university.edu'), false, 'Public university domain must pass');

// URL Validation function
assert.equal(validateCalendarUrl('http://127.0.0.1/cal.ics').ok, false, 'Localhost URL must fail');
assert.equal(validateCalendarUrl('http://169.254.169.254/latest/meta-data/').ok, false, 'Metadata URL must fail');
assert.equal(validateCalendarUrl('https://admin:pass@google.com/cal.ics').ok, false, 'Credentials in URL must fail');
assert.equal(validateCalendarUrl('ftp://calendar.google.com/cal.ics').ok, false, 'Non-HTTP protocol must fail');
assert.equal(validateCalendarUrl('https://calendar.google.com/calendar/ical/user/public/basic.ics').ok, true, 'Valid HTTPS URL must pass');

console.log('✓ SSRF guard successfully blocks localhost, RFC 1918, cloud metadata, and internal hostnames');

// 3. Test External Calendar Synchronization & Conflict Detection
console.log('--- Testing Remote Calendar Sync & Conflict Detection ---');

// Mock external calendar ICS with a class that collides with slot-101
// slot-101 is at 2026-10-30T09:00:00Z to 10:00:00Z (which is 14:30 to 15:30 in Asia/Kolkata)
// Let's create an external appointment during that exact time:
const externalIcsWithConflict = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//University//Timetable 1.0//EN
BEGIN:VEVENT
UID:uni-lecture-401@university.edu
DTSTART:20261030T090000Z
DTEND:20261030T100000Z
SUMMARY:CS401 Distributed Systems Lecture
DESCRIPTION:Mandatory lecture in Room 204
END:VEVENT
BEGIN:VEVENT
UID:uni-lab-402@university.edu
DTSTART:20261030T110000Z
DTEND:20261030T123000Z
SUMMARY:CS402 Operating Systems Lab
DESCRIPTION:Lab session in Lab 3
END:VEVENT
END:VCALENDAR`;

const wsSync = makeWorkspace();
assert.equal(wsSync.studio.busy.length, 0, 'Initially busy list is empty');

const syncResult = syncCalendarFeed(wsSync, externalIcsWithConflict);

// Verify events were imported into workspace busy times
assert.equal(syncResult.added, 2, 'Two new external events must be added');
assert.equal(syncResult.totalEvents, 2, 'Total events parsed must be 2');
assert.equal(wsSync.studio.busy.length, 2, 'Workspace busy times must now contain 2 events');
assert.equal(wsSync.studio.busy[0].title, 'CS401 Distributed Systems Lecture');
assert.equal(wsSync.studio.busy[1].title, 'CS402 Operating Systems Lab');

// Verify conflict detection
assert.ok(syncResult.conflicts.length > 0, 'Conflict must be detected between lecture and study slot');
assert.equal(syncResult.conflictingSlots.length, 1, 'Exactly one study slot must be identified as conflicting');
assert.equal(syncResult.conflictingSlots[0].slotId, 'slot-101', 'Conflicting slot must be slot-101');
assert.equal(syncResult.conflictingSlots[0].taskTitle, 'Algorithms Revision');
assert.equal(syncResult.conflictingSlots[0].clashesWith, 'CS401 Distributed Systems Lecture');

console.log('✓ External calendar sync imports events and detects study slot schedule collisions');

// 4. Test Deduplication on Repeated Sync
const syncResult2 = syncCalendarFeed(wsSync, externalIcsWithConflict);
assert.equal(syncResult2.added, 0, 'No events should be added on re-sync');
assert.equal(syncResult2.skippedDuplicates, 2, 'Both events should be recognized as duplicates and skipped');
assert.equal(wsSync.studio.busy.length, 2, 'Busy events list must not duplicate');

console.log('✓ Idempotent re-sync verified: duplicates skipped cleanly');

// 5. Test Conflict Resolution & Replanning
console.log('--- Testing Conflict Resolution Replanning ---');

const { replacementSlots, applyReplacement } = require(path.join(root, '.sites-runtime/tests/calendar-sync/calendar-sync.cjs'));

// slot-101 overlaps with the 09:00-10:00 UTC lecture.
// Let's provide a replacement window from 14:00 to 18:00 UTC (19:30 to 23:30 Asia/Kolkata):
const dayString = '2026-10-30';
// Window in local Asia/Kolkata time for 2026-10-30:
// 15:00 UTC is 20:30 IST on 2026-10-30. 17:00 UTC is 22:30 IST on 2026-10-30.
const altWindowStart = '2026-10-30T15:00:00.000Z';
const altWindowEnd = '2026-10-30T17:00:00.000Z';

const alternatives = replacementSlots(wsSync, dayString, altWindowStart, altWindowEnd);
assert.ok(alternatives.replaced.includes('slot-101'), 'Replacements must target the conflicting slot-101');
assert.equal(alternatives.slots.length, 1, 'Alternative slot must be placed for the task');
assert.equal(alternatives.slots[0].taskId, 't-algo-1', 'Alternative slot must belong to Algorithms Revision');

// Apply the replacement
applyReplacement(wsSync, alternatives);
assert.ok(!wsSync.studio.slots.some(s => s.id === 'slot-101'), 'Old conflicting slot-101 must be removed');
assert.equal(wsSync.studio.slots.length, 1, 'New non-overlapping study slot must be present');

// Verify that conflict is completely resolved
const remainingConflicts = syncResult.conflicts = require(path.join(root, '.sites-runtime/tests/calendar-sync/calendar-sync.cjs')).conflicts(wsSync);
assert.equal(remainingConflicts.length, 0, 'All conflicts must be cleared after applying alternative slot');

console.log('✓ Conflict resolution replanning verified: conflicting slot replaced with non-overlapping window');

console.log('================================================================');
console.log('✓ FEATURE 41 (CALENDAR INTEGRATION) FULLY PASSES');
console.log('================================================================');
