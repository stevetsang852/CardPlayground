let ctx: AudioContext | null = null;

export function playPackTone(kind: "tick" | "hit" | "chase", muted: boolean) {
  if (muted || typeof window === "undefined") return;
  const AudioCtx = window.AudioContext;
  if (!ctx) ctx = new AudioCtx();
  void ctx.resume();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = kind === "chase" ? 740 : kind === "hit" ? 520 : 320;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === "tick" ? 0.03 : 0.05, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "chase" ? 0.28 : 0.12));
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}
