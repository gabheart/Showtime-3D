export interface BandTelemetry {
  isPlaying: boolean;
  bpm: number;
  currentStep: number;
  currentBar: number;
  bassEnergy: number;   // 0..1 (energia real dos graves via FFT)
  highEnergy: number;   // 0..1 (energia dos pratos/guitarra)
  kickPulse: number;    // 0..1 (pico no exato instante do bumbo)
  snarePulse: number;   // 0..1 (pico no exato instante da caixa)
}

export class RockBandAudio {
  private context: AudioContext;
  private master: GainNode;
  private compressor: DynamicsCompressorNode;
  private analyser: AnalyserNode;
  private frequencyData: Uint8Array<ArrayBuffer>;

  private roomReverb: ConvolverNode;
  private reverbSend: GainNode;

  private bassFilter: BiquadFilterNode;
  private guitarDrive: WaveShaperNode;
  private guitarCabinet: BiquadFilterNode;
  private leadFilter: BiquadFilterNode;

  private noiseBuffer: AudioBuffer;

  private timer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private bar = 0;

  private lastKickTime = -10;
  private lastSnareTime = -10;

  private readonly bpm = 116;
  private readonly lookAhead = 0.15;
  private readonly scheduleInterval = 25;

  constructor() {
    this.context = new AudioContext();

    this.master = this.context.createGain();
    this.master.gain.value = 0.0001;

    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 4.5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.76;
    this.frequencyData = new Uint8Array(
      new ArrayBuffer(this.analyser.frequencyBinCount)
    );

    // Ambiência natural da casa de show (reverb curto de sala)
    this.roomReverb = this.context.createConvolver();
    this.roomReverb.buffer = this.createRoomImpulse(0.95, 2.8);
    this.reverbSend = this.context.createGain();
    this.reverbSend.gain.value = 0.22;

    this.reverbSend.connect(this.roomReverb);
    this.roomReverb.connect(this.master);

    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    // Canal do baixo com corpo médio-grave definido
    this.bassFilter = this.context.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = 580;
    this.bassFilter.Q.value = 1.4;
    this.bassFilter.connect(this.master);

    // Canal da guitarra base (overdrive + filtro de gabinete 4x12)
    this.guitarDrive = this.context.createWaveShaper();
    this.guitarDrive.curve = this.createDistortionCurve(135);
    this.guitarDrive.oversample = '4x';

    this.guitarCabinet = this.context.createBiquadFilter();
    this.guitarCabinet.type = 'lowpass';
    this.guitarCabinet.frequency.value = 2600;
    this.guitarCabinet.Q.value = 0.9;

    this.guitarDrive.connect(this.guitarCabinet);
    this.guitarCabinet.connect(this.master);
    this.guitarCabinet.connect(this.reverbSend);

    // Canal da guitarra solo / arpejo atmosférico
    this.leadFilter = this.context.createBiquadFilter();
    this.leadFilter.type = 'bandpass';
    this.leadFilter.frequency.value = 1450;
    this.leadFilter.Q.value = 0.85;
    this.leadFilter.connect(this.master);
    this.leadFilter.connect(this.reverbSend);

    this.noiseBuffer = this.createNoiseBuffer();
  }

  get isPlaying(): boolean {
    return this.timer !== null;
  }

  getTelemetry(): BandTelemetry {
    if (!this.isPlaying || this.context.state !== 'running') {
      return {
        isPlaying: false,
        bpm: this.bpm,
        currentStep: this.step,
        currentBar: this.bar,
        bassEnergy: 0,
        highEnergy: 0,
        kickPulse: 0,
        snarePulse: 0
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    let bassSum = 0;
    for (let i = 0; i < 6; i++) {
      bassSum += this.frequencyData[i];
    }
    const bassEnergy = bassSum / (6 * 255);

    let highSum = 0;
    for (let i = 10; i < 32; i++) {
      highSum += this.frequencyData[i];
    }
    const highEnergy = highSum / (22 * 255);

    const now = this.context.currentTime;

    const kickDelta = now - this.lastKickTime;
    const kickPulse =
      kickDelta >= 0 && kickDelta < 0.25 ? Math.exp(-kickDelta * 14) : 0;

    const snareDelta = now - this.lastSnareTime;
    const snarePulse =
      snareDelta >= 0 && snareDelta < 0.25 ? Math.exp(-snareDelta * 16) : 0;

    return {
      isPlaying: true,
      bpm: this.bpm,
      currentStep: this.step,
      currentBar: this.bar,
      bassEnergy,
      highEnergy,
      kickPulse,
      snarePulse
    };
  }

  async start(): Promise<void> {
    if (this.timer !== null) return;

    if (this.context.state === 'closed') {
      throw new Error('O contexto de áudio foi encerrado.');
    }

    await this.context.resume();

    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(0.78, this.context.currentTime, 0.04);

    this.step = 0;
    this.bar = 0;
    this.lastKickTime = -10;
    this.lastSnareTime = -10;

    this.nextStepTime = this.context.currentTime + 0.08;

    this.timer = window.setInterval(
      () => this.scheduler(),
      this.scheduleInterval
    );
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }

    if (this.context.state !== 'closed') {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.04);
    }
  }

  async dispose(): Promise<void> {
    this.stop();

    if (this.context.state !== 'closed') {
      await this.context.close();
    }
  }

  private scheduler(): void {
    const currentTime = this.context.currentTime;

    while (this.nextStepTime < currentTime + this.lookAhead) {
      this.scheduleStep(this.step, this.bar, this.nextStepTime);

      this.nextStepTime += this.getStepDuration();
      this.step++;

      if (this.step >= 16) {
        this.step = 0;
        this.bar++;
      }
    }
  }

  private getStepDuration(): number {
    return 60 / this.bpm / 4;
  }

  private scheduleStep(step: number, bar: number, time: number): void {
    // Progressão: Am (45) -> F (41) -> C (48) -> G/Em (43)
    const progression = [
      { root: 45, isMinor: true },
      { root: 41, isMinor: false },
      { root: 48, isMinor: false },
      { root: 43, isMinor: false }
    ];
    const currentChord = progression[bar % progression.length];
    const isFillBar = bar % 4 === 3;
    const stepDur = this.getStepDuration();

    // 1. Bumbo pulsante (estilo Indie/Post-Punk dançante)
    if (
      step === 0 ||
      step === 6 ||
      step === 8 ||
      step === 14 ||
      (isFillBar && step === 15)
    ) {
      this.playKick(time);
      this.lastKickTime = time;
    }

    // 2. Caixa nos tempos 2 e 4 + virada no 4º compasso
    if (step === 4 || step === 12 || (isFillBar && (step === 14 || step === 15))) {
      const accent = step === 4 || step === 12 ? 1.0 : 0.65;
      this.playSnare(time, accent);
      this.lastSnareTime = time;
    }

    // 3. Chimbal em semicolcheias com acento no contratempo e abertura no step 10
    const isOpenHat = step === 10 && !isFillBar;
    const hatAccent = step % 4 === 2 ? 0.11 : step % 2 === 0 ? 0.065 : 0.032;
    this.playHiHat(time, hatAccent, isOpenHat);

    // 4. Linha de baixo melódica e caminhante
    if (step % 2 === 0) {
      const bassWalk = [0, 0, 12, 10, 7, 7, 5, 7];
      const offset = bassWalk[step / 2];
      this.playBass(
        this.midiToFrequency(currentChord.root + offset),
        time,
        stepDur * 1.85
      );
    }

    // 5. Guitarra base (power chords sincopados)
    if (step === 0 || step === 6 || step === 8 || step === 12) {
      const chordLen = step === 0 || step === 8 ? stepDur * 4.5 : stepDur * 2.2;
      this.playRhythmGuitar(currentChord.root, time, chordLen);
    }

    // 6. Guitarra solo / arpejo hipnótico agudo (16 steps)
    const arpeggioIntervals = currentChord.isMinor
      ? [24, 19, 15, 19, 22, 19, 15, 12, 24, 19, 15, 19, 26, 24, 19, 15]
      : [24, 19, 16, 19, 21, 19, 16, 12, 24, 19, 16, 19, 24, 21, 19, 16];

    const leadMidi = currentChord.root + arpeggioIntervals[step];
    this.playLeadArpeggio(this.midiToFrequency(leadMidi), time, stepDur * 1.4);
  }

  private playKick(time: number): void {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.14);

    gain.gain.setValueAtTime(0.92, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.master);

    osc.start(time);
    osc.stop(time + 0.23);
  }

  private playSnare(time: number, intensity = 1): void {
    // Esteira da caixa (ruído filtrado)
    const noise = this.context.createBufferSource();
    const noiseFilter = this.context.createBiquadFilter();
    const noiseGain = this.context.createGain();

    noise.buffer = this.noiseBuffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1950;
    noiseFilter.Q.value = 0.9;

    noiseGain.gain.setValueAtTime(0.36 * intensity, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.19);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.master);
    noiseGain.connect(this.reverbSend);

    noise.start(time);
    noise.stop(time + 0.2);

    // Corpo tonal do tambor da caixa
    const bodyOsc = this.context.createOscillator();
    const bodyGain = this.context.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(195, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(115, time + 0.08);

    bodyGain.gain.setValueAtTime(0.28 * intensity, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.master);

    bodyOsc.start(time);
    bodyOsc.stop(time + 0.12);
  }

  private playHiHat(time: number, level: number, open: boolean): void {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = open ? 6500 : 8200;

    const decay = open ? 0.16 : 0.042;
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + decay);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    source.start(time);
    source.stop(time + decay + 0.01);
  }

  private playBass(frequency: number, time: number, duration: number): void {
    const subOsc = this.context.createOscillator();
    const biteOsc = this.context.createOscillator();
    const gain = this.context.createGain();

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(frequency, time);

    biteOsc.type = 'sawtooth';
    biteOsc.frequency.setValueAtTime(frequency, time);

    const biteGain = this.context.createGain();
    biteGain.gain.value = 0.35;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.34, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    subOsc.connect(gain);
    biteOsc.connect(biteGain);
    biteGain.connect(gain);
    gain.connect(this.bassFilter);

    subOsc.start(time);
    biteOsc.start(time);
    subOsc.stop(time + duration + 0.02);
    biteOsc.stop(time + duration + 0.02);
  }

  private playRhythmGuitar(
    rootMidi: number,
    time: number,
    duration: number
  ): void {
    const intervals = [0, 7, 12];

    for (const interval of intervals) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = this.midiToFrequency(rootMidi + interval);
      osc.detune.value = (Math.random() - 0.5) * 8;

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.048, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(this.guitarDrive);

      osc.start(time);
      osc.stop(time + duration + 0.03);
    }
  }

  private playLeadArpeggio(
    frequency: number,
    time: number,
    duration: number
  ): void {
    const oscA = this.context.createOscillator();
    const oscB = this.context.createOscillator();
    const gain = this.context.createGain();

    oscA.type = 'triangle';
    oscA.frequency.setValueAtTime(frequency, time);

    oscB.type = 'sawtooth';
    oscB.frequency.setValueAtTime(frequency, time);
    oscB.detune.value = 9;

    const oscBGain = this.context.createGain();
    oscBGain.gain.value = 0.28;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.055, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    oscA.connect(gain);
    oscB.connect(oscBGain);
    oscBGain.connect(gain);
    gain.connect(this.leadFilter);

    oscA.start(time);
    oscB.start(time);
    oscA.stop(time + duration + 0.02);
    oscB.stop(time + duration + 0.02);
  }

  private midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private createNoiseBuffer(): AudioBuffer {
    const length = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  private createRoomImpulse(duration: number, decay: number): AudioBuffer {
    const rate = this.context.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.context.createBuffer(2, length, rate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const envelope = Math.pow(1 - i / length, decay);
        channelData[i] = (Math.random() * 2 - 1) * envelope;
      }
    }

    return impulse;
  }

  private createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 2048;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh((x * amount) / 30);
    }

    return curve;
  }
}
