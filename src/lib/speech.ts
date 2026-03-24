// ── Text to Speech ──────────────────────────────────────────────────────────

export function speak(
  text: string,
  voiceName: string | null = null,
  onBoundary?: (charIndex: number, charLength: number) => void,
  onEnd?: () => void
): void {
  if (!window.speechSynthesis) return
  stopSpeaking()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.9
  utterance.pitch = 1
  if (voiceName) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === voiceName)
    if (voice) utterance.voice = voice
  }
  if (onBoundary) {
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        onBoundary(event.charIndex, event.charLength ?? 1)
      }
    }
  }
  if (onEnd) {
    utterance.onend = onEnd
  }
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

