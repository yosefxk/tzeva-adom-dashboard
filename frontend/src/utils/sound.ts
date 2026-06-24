// Play the real Israeli air raid siren (צפירה) using the siren.mp3 static asset
export function playIsraeliSiren(volume: number = 0.8, onEnded?: () => void): HTMLAudioElement | undefined {
  try {
    const audio = new Audio('/siren.mp3');
    audio.volume = volume;
    if (onEnded) {
      audio.onended = onEnded;
    }
    audio.play();
    return audio;
  } catch (err) {
    console.error('Failed to play Israeli siren audio.', err);
    if (onEnded) onEnded();
  }
}

// Synthesize high-frequency warning beeps dynamically using the browser's Web Audio API
export function playBeepSound(volume: number = 0.8, duration: number = 3.0, onEnded?: () => void) {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);
    
    const frequency = 880; // A5 pitch
    const beepDuration = 0.25; // 250ms active beep
    const interval = 0.5; // 500ms cycle (250ms beep, 250ms pause)
    let time = audioCtx.currentTime;
    
    const oscCount = Math.floor(duration / interval);
    for (let i = 0; i < oscCount; i++) {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, time);
      osc.connect(gainNode);
      osc.start(time);
      osc.stop(time + beepDuration);
      time += interval;
    }
    if (onEnded) {
      setTimeout(onEnded, duration * 1000);
    }
  } catch (err) {
    console.error('Failed to play dynamic beep sound.', err);
    if (onEnded) onEnded();
  }
}
