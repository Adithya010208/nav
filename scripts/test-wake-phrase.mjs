import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();

await build({
  entryPoints: ['lib/wake-detector.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outdir: '.sites-runtime/tests/wake',
  outExtension: {'.js': '.cjs'}
});

const { detectWakePhrase, playWakeChime, AcousticWakeDetector } = require(path.join(root, '.sites-runtime/tests/wake/wake-detector.cjs'));

console.log('--- Testing Feature 32: Custom Wake Phrase & Acoustic Detector ---');

// 1. Test exact prefix matching with default 'Hey NAV'
const r1 = detectWakePhrase('Hey NAV, add task Prepare Data Structures for 45 minutes', 'Hey NAV');
assert.equal(r1.detected, true, 'Default wake phrase should be detected');
assert.equal(r1.postWakeCommand, 'add task Prepare Data Structures for 45 minutes');
assert.equal(r1.matchedPhrase, 'Hey NAV');
assert(r1.confidence >= 0.9, 'Confidence should be >= 0.9 for prefix match');
console.log('✓ Exact prefix wake phrase detected correctly');

// 2. Test case-insensitivity and punctuation
const r2 = detectWakePhrase('hey nav! read my schedule', 'Hey NAV');
assert.equal(r2.detected, true);
assert.equal(r2.postWakeCommand, 'read my schedule');
console.log('✓ Case-insensitivity and trailing punctuation handled');

// 3. Test embedded conversational wake phrase
const r3 = detectWakePhrase('Uh, okay, hey nav, complete Math Assignment', 'Hey NAV');
assert.equal(r3.detected, true);
assert.equal(r3.postWakeCommand, 'complete Math Assignment');
console.log('✓ Embedded wake phrase detected in stream');

// 4. Test custom configurable wake phrase
const customPhrases = ['Computer', 'Listen NAV', 'Study Assistant', 'OK NAV'];
for (const phrase of customPhrases) {
  const res = detectWakePhrase(`${phrase} create task Review Algorithms for 30 minutes`, phrase);
  assert.equal(res.detected, true, `Custom wake phrase "${phrase}" should be detected`);
  assert.equal(res.postWakeCommand, 'create task Review Algorithms for 30 minutes');
  assert.equal(res.matchedPhrase.toLowerCase(), phrase.toLowerCase());
}
console.log('✓ Configurable custom wake phrases verified across multiple variations');

// 5. Test negative rejection (no false positives)
const negativeCases = [
  'Just discussing navigation systems today',
  'The navy has several vessels',
  'Hello world this is a normal conversation',
  'What is the weather like?',
  '',
];
for (const neg of negativeCases) {
  const res = detectWakePhrase(neg, 'Hey NAV');
  assert.equal(res.detected, false, `Should not falsely trigger on "${neg}"`);
  assert.equal(res.postWakeCommand, '');
}
console.log('✓ False positive rejection verified on non-wake speech');

// 6. Test acoustic chime synthesizer with mock Web Audio API AudioContext
const mockOscillators = [];
const mockGains = [];
const mockAudioCtx = {
  currentTime: 1.0,
  destination: {},
  createOscillator() {
    const osc = {
      type: '',
      frequency: { setValueAtTime: (val, t) => { osc.freq = val; osc.freqTime = t; } },
      connect: () => {},
      start: (t) => { osc.startTime = t; },
      stop: (t) => { osc.stopTime = t; },
    };
    mockOscillators.push(osc);
    return osc;
  },
  createGain() {
    const gain = {
      gain: {
        setValueAtTime: (val, t) => { gain.val = val; },
        exponentialRampToValueAtTime: (val, t) => { gain.rampVal = val; gain.rampTime = t; },
      },
      connect: () => {},
    };
    mockGains.push(gain);
    return gain;
  },
};

const chimePlayed = playWakeChime(mockAudioCtx);
assert.equal(chimePlayed, true, 'playWakeChime should succeed with Web Audio context');
assert.equal(mockOscillators.length, 2, 'Should create 2 tones for the acoustic chime');
assert.equal(mockOscillators[0].freq, 880, 'First tone should be 880 Hz (A5)');
assert.equal(mockOscillators[1].freq, 1175, 'Second tone should be 1175 Hz (D6)');
console.log('✓ Acoustic chime synthesis verified (880 Hz -> 1175 Hz dual tone)');

// 7. Test AcousticWakeDetector continuous controller
let wakeTriggered = false;
let capturedCommand = '';
let lastState = '';

const detector = new AcousticWakeDetector({
  wakePhrase: 'Hey NAV',
  soundAlert: false, // disable audio in unit test
  onWake: (cmd, phrase) => {
    wakeTriggered = true;
    capturedCommand = cmd;
  },
  onStateChange: (state, msg) => {
    lastState = state;
  },
});

assert.equal(detector.getWakePhrase(), 'Hey NAV');
detector.setWakePhrase('Listen NAV');
assert.equal(detector.getWakePhrase(), 'Listen NAV');

// Start listening
const started = detector.start();
assert.equal(started, true);
assert.equal(detector.getState(), 'listening');
assert.equal(lastState, 'listening');

// Feed transcript chunk with wake phrase
const chunkResult = detector.processTranscriptChunk('Listen NAV, add task Final Project Review for 60 minutes');
assert.equal(chunkResult.detected, true);
assert.equal(wakeTriggered, true);
assert.equal(capturedCommand, 'add task Final Project Review for 60 minutes');
console.log('✓ AcousticWakeDetector real-time transcript processing & wake event dispatch verified');

// Test stopping
detector.stop();
assert.equal(detector.getState(), 'idle');
assert.equal(lastState, 'idle');
console.log('✓ AcousticWakeDetector start/stop state machine verified');

console.log('================================================================');
console.log('✓ FEATURE 32 (CUSTOM WAKE PHRASE & ACOUSTIC DETECTOR) FULLY PASSES');
console.log('================================================================');
