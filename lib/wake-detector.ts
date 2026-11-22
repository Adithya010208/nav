// Continuous foreground acoustic wake phrase detector and audio chime synthesis.
// Designed for hands-free foreground voice interaction with configurable wake phrases.

export interface WakeDetectionResult {
  detected: boolean;
  postWakeCommand: string;
  confidence: number;
  matchedPhrase: string;
}

/**
 * Deterministic wake phrase matching in speech transcript streams.
 * Supports exact prefix, embedded conversational wake, and punctuation tolerance.
 */
export function detectWakePhrase(
  transcript: string,
  wakePhrase: string = 'Hey NAV'
): WakeDetectionResult {
  const cleanTranscript = (transcript || '').trim();
  const cleanPhrase = (wakePhrase || 'Hey NAV').trim();

  if (!cleanTranscript || !cleanPhrase) {
    return { detected: false, postWakeCommand: '', confidence: 0, matchedPhrase: '' };
  }

  // Escape regex special characters in custom wake phrase
  const escaped = cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Match wake phrase at start of input, or after whitespace/punctuation
  const regex = new RegExp(`(?:^|[\\s,;:.!?-]+)(${escaped})([\\s,;:.!?-]+.*|$)`, 'i');
  const match = cleanTranscript.match(regex);

  if (!match) {
    return { detected: false, postWakeCommand: '', confidence: 0, matchedPhrase: '' };
  }

  const matchedPhrase = match[1];
  const postWakeRaw = match[2] || '';
  const postWakeCommand = postWakeRaw.replace(/^[\s,;:.!?-]+/, '').trim();

  // Higher confidence if wake phrase appears at the very beginning of the transcript
  const isPrefix = cleanTranscript.toLowerCase().startsWith(matchedPhrase.toLowerCase());
  const confidence = isPrefix ? 0.98 : 0.88;

  return {
    detected: true,
    postWakeCommand,
    confidence,
    matchedPhrase,
  };
}

/**
 * Generate a subtle dual-frequency audio chime using Web Audio API
 * confirming that the wake phrase was detected.
 */
export function playWakeChime(audioCtx?: any): boolean {
  try {
    const CtxClass =
      audioCtx?.constructor ||
      (typeof window !== 'undefined'
        ? (window as any).AudioContext || (window as any).webkitAudioContext
        : null);

    if (!CtxClass && !audioCtx) return false;

    const ctx = audioCtx || new CtxClass();
    const now = ctx.currentTime || 0;

    // First tone: 880 Hz (A5), duration 60ms
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.06);

    // Second tone: 1175 Hz (D6), duration 90ms
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1175, now + 0.05);
    gain2.gain.setValueAtTime(0.1, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.14);

    return true;
  } catch {
    return false;
  }
}

export type WakeListenerState = 'idle' | 'listening' | 'detected' | 'paused' | 'error';

export interface WakeListenerOptions {
  wakePhrase?: string;
  onWake?: (command: string, phrase: string) => void;
  onStateChange?: (state: WakeListenerState, message?: string) => void;
  soundAlert?: boolean;
}

/**
 * Foreground acoustic wake detector controller.
 * Operates in continuous foreground mode and safely pauses when the page is hidden.
 */
export class AcousticWakeDetector {
  private wakePhrase: string;
  private onWake?: (command: string, phrase: string) => void;
  private onStateChange?: (state: WakeListenerState, message?: string) => void;
  private soundAlert: boolean;
  private state: WakeListenerState = 'idle';
  private recognition: any = null;
  private visibilityHandler: (() => void) | null = null;
  private active = false;

  constructor(options: WakeListenerOptions = {}) {
    this.wakePhrase = options.wakePhrase || 'Hey NAV';
    this.onWake = options.onWake;
    this.onStateChange = options.onStateChange;
    this.soundAlert = options.soundAlert ?? true;
  }

  public setWakePhrase(phrase: string) {
    this.wakePhrase = phrase.trim() || 'Hey NAV';
  }

  public getWakePhrase(): string {
    return this.wakePhrase;
  }

  public getState(): WakeListenerState {
    return this.state;
  }

  private setState(state: WakeListenerState, message?: string) {
    this.state = state;
    this.onStateChange?.(state, message);
  }

  /**
   * Process a chunk of audio transcription from speech recognition stream.
   * Can be invoked directly by external speech recognition or synthetic events.
   */
  public processTranscriptChunk(transcript: string): WakeDetectionResult {
    const result = detectWakePhrase(transcript, this.wakePhrase);
    if (result.detected) {
      this.setState('detected', `Wake phrase "${result.matchedPhrase}" recognized.`);
      if (this.soundAlert) {
        playWakeChime();
      }
      this.onWake?.(result.postWakeCommand, result.matchedPhrase);
      // Return to listening state after a brief moment
      setTimeout(() => {
        if (this.active && this.state === 'detected') {
          this.setState('listening', `Listening for "${this.wakePhrase}" in foreground...`);
        }
      }, 500);
    }
    return result;
  }

  /**
   * Start continuous foreground listening.
   */
  public start(recognitionInstance?: any): boolean {
    if (this.active) return true;
    this.active = true;

    // Register visibility change handler: pause on tab background, resume on foreground
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.hidden) {
          if (this.state === 'listening') {
            this.setState('paused', 'Foreground wake listening paused while tab is hidden.');
            try { this.recognition?.abort(); } catch {}
          }
        } else if (this.active && this.state === 'paused') {
          this.setState('listening', `Listening for "${this.wakePhrase}" in foreground...`);
          try { this.recognition?.start(); } catch {}
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    if (recognitionInstance) {
      this.recognition = recognitionInstance;
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.onresult = (event: any) => {
        let interimText = '';
        for (let i = event.resultIndex || 0; i < (event.results?.length || 0); i++) {
          interimText += event.results[i][0].transcript + ' ';
        }
        if (interimText.trim()) {
          this.processTranscriptChunk(interimText);
        }
      };
      this.recognition.onerror = (event: any) => {
        this.setState('error', event?.error || 'Speech recognition error in wake listener.');
      };
      this.recognition.onend = () => {
        // Automatically restart if still active and not explicitly paused
        if (this.active && this.state === 'listening') {
          try { this.recognition.start(); } catch {}
        }
      };
      try {
        this.recognition.start();
      } catch (err) {
        this.setState('error', 'Could not start acoustic speech listener.');
        return false;
      }
    }

    this.setState('listening', `Listening for "${this.wakePhrase}" in foreground...`);
    return true;
  }

  /**
   * Stop foreground acoustic listening.
   */
  public stop() {
    this.active = false;
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    this.setState('idle', 'Foreground wake listener stopped.');
  }
}
