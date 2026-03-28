import { X, Type, AlignJustify, Palette, Play, Pause } from 'lucide-react'
import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useLearner } from '../../contexts/LearnerContext'

interface DisplayModalProps {
  onClose: () => void
  questionText: string
}

const OVERLAY_COLORS = [
  { label: 'None', value: null },
  { label: 'Yellow', value: '#FFF3B0' },
  { label: 'Blue', value: '#B0D4FF' },
  { label: 'Green', value: '#B0FFD4' },
  { label: 'Pink', value: '#FFB0D4' },
  { label: 'Grey', value: '#E0E0E0' },
]

// ── Bionic reading helper ────────────────────────────────────────────────────
function BionicWord({ word }: { word: string }) {
  const splitAt = Math.ceil(word.length / 2)
  return <span><strong>{word.slice(0, splitAt)}</strong>{word.slice(splitAt)}</span>
}
function BionicText({ text }: { text: string }) {
  return <>{text.split(/(\s+)/).map((p, i) => /\s+/.test(p) ? <span key={i}>{p}</span> : <BionicWord key={i} word={p} />)}</>
}

// ── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors flex-shrink-0 ${value ? 'bg-primary-500' : 'bg-gray-300'}`}
      role="switch" aria-checked={value}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

// ── Icon setting row ─────────────────────────────────────────────────────────
function SettingRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 min-h-[36px]">
      <div className="flex-shrink-0 w-7 flex flex-col items-center gap-0.5" title={label}>
        <span className="text-gray-400">{icon}</span>
        <span className="text-[9px] text-gray-400 leading-none text-center">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default function DisplayModal({ onClose, questionText }: DisplayModalProps) {
  const { preferences, updatePreferences } = useLearner()

  // SWReader state
  const words = questionText.split(/\s+/).filter(Boolean)
  const [srIndex, setSrIndex] = useState(0)
  const [srPlaying, setSrPlaying] = useState(false)
  const [srHalf, setSrHalf] = useState(false) // false = full (150wpm), true = half (75wpm)
  const srIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const srAdvance = useCallback(() => {
    setSrIndex(prev => {
      if (prev >= words.length - 1) { setSrPlaying(false); return prev }
      return prev + 1
    })
  }, [words.length])

  useEffect(() => {
    if (srPlaying) {
      const wpm = srHalf ? 75 : 150
      srIntervalRef.current = setInterval(srAdvance, Math.round(60000 / wpm))
    } else {
      if (srIntervalRef.current) clearInterval(srIntervalRef.current)
    }
    return () => { if (srIntervalRef.current) clearInterval(srIntervalRef.current) }
  }, [srPlaying, srHalf, srAdvance])

  // Stop playing when SWReader is toggled off
  useEffect(() => {
    if (!preferences.swReader) {
      setSrPlaying(false)
      setSrIndex(0)
    }
  }, [preferences.swReader])

  const fontSizeMap: Record<number, string> = { 1: '0.9rem', 2: '1rem', 3: '1.125rem', 4: '1.25rem', 5: '1.5rem' }
  const lineSpacingMap: Record<number, string> = { 1: '1.5', 2: '1.875', 3: '2.25' }

  const previewStyle = {
    fontSize: fontSizeMap[preferences.fontSize] || '1.125rem',
    lineHeight: lineSpacingMap[preferences.lineSpacing] || '1.875',
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Display &amp; Reader</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings - top half */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 border-b border-gray-200">

          <SettingRow icon={<Type className="w-4 h-4" />} label="Size">
            <input type="range" min={1} max={5} value={preferences.fontSize}
              onChange={e => updatePreferences({ fontSize: Number(e.target.value) })}
              className="w-full accent-primary-500" />
          </SettingRow>

          <SettingRow icon={<AlignJustify className="w-4 h-4" />} label="Spacing">
            <input type="range" min={1} max={3} value={preferences.lineSpacing}
              onChange={e => updatePreferences({ lineSpacing: Number(e.target.value) })}
              className="w-full accent-primary-500" />
          </SettingRow>

          {/* Three toggles in one row: Bionic | Ruler | SWReader */}
          <div className="flex items-center gap-4">
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-500 font-medium">Bionic</span>
              <Toggle value={preferences.bionicReading} onChange={v => updatePreferences({ bionicReading: v })} />
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-500 font-medium">Ruler</span>
              <Toggle value={preferences.readingRuler} onChange={v => updatePreferences({ readingRuler: v })} />
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-500 font-medium">SWReader</span>
              <Toggle value={preferences.swReader} onChange={v => updatePreferences({ swReader: v })} />
            </div>
          </div>

          <SettingRow icon={<Palette className="w-4 h-4" />} label="Overlay">
            <div className="flex items-center gap-1.5 flex-wrap">
              {OVERLAY_COLORS.map(c => (
                <button
                  key={String(c.value)}
                  onClick={() => updatePreferences({ overlayColor: c.value })}
                  title={c.label}
                  className={`w-6 h-6 rounded-md border-2 transition-all flex-shrink-0 ${preferences.overlayColor === c.value ? 'border-primary-500 scale-110' : 'border-gray-200'}`}
                  style={{ backgroundColor: c.value ?? 'white' }}
                  aria-label={c.label}
                >
                  {c.value === null && <span className="text-[9px] text-gray-400 leading-none flex items-center justify-center h-full">✕</span>}
                </button>
              ))}
              {preferences.overlayColor && (
                <input type="range" min={0} max={50}
                  value={Math.round(preferences.overlayOpacity * 100)}
                  onChange={e => updatePreferences({ overlayOpacity: Number(e.target.value) / 100 })}
                  className="flex-1 min-w-[60px] accent-primary-500" />
              )}
            </div>
          </SettingRow>

        </div>

        {/* Preview - bottom section */}
        <div className="flex-shrink-0 px-4 py-3" style={{ maxHeight: '40%' }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview</div>

          {preferences.swReader ? (
            /* SWReader view */
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-center mb-2" style={{ minHeight: '64px', fontSize: '2.25rem' }}>
                <span className="font-semibold text-gray-900">{words[srIndex] || '···'}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1 mb-3">
                <div className="h-1 bg-primary-500 rounded-full transition-all"
                  style={{ width: `${words.length ? ((srIndex + 1) / words.length) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                  <button onClick={() => setSrHalf(false)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${!srHalf ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    Full
                  </button>
                  <button onClick={() => setSrHalf(true)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${srHalf ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    ½
                  </button>
                </div>
                <button onClick={() => { if (!srPlaying) { setSrIndex(0) } setSrPlaying(p => !p) }}
                  className="flex-1 py-1.5 bg-yellow-400 text-gray-900 rounded-lg font-medium hover:bg-yellow-500 transition-colors flex items-center justify-center gap-1.5 text-sm">
                  {srPlaying ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4" />Play</>}
                </button>
              </div>
            </div>
          ) : (
            /* Text preview */
            <div className="relative rounded-xl overflow-hidden border border-gray-100">
              <div className="p-3" style={previewStyle}>
                {preferences.bionicReading
                  ? <BionicText text={questionText} />
                  : questionText}
              </div>
              {preferences.overlayColor && (
                <div className="absolute inset-0 pointer-events-none rounded-xl"
                  style={{ backgroundColor: preferences.overlayColor, opacity: preferences.overlayOpacity }} />
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
