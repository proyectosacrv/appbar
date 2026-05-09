// Audio notification used by the admin/staff orders board when a new order
// arrives. Kept as a separate util so it can be reused (e.g. on the kitchen
// view) and easily replaced with a different sound later.
export function playNewOrderSound(): void {
  try {
    type AudioContextCtor = typeof AudioContext;
    const Ctor: AudioContextCtor | undefined =
      typeof window !== "undefined"
        ? (window.AudioContext ??
            (window as unknown as { webkitAudioContext?: AudioContextCtor })
              .webkitAudioContext)
        : undefined;
    if (!Ctor) return;

    const ctx = new Ctor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext not available — silent fail
  }
}
