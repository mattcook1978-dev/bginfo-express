import { useState } from 'react'
import { ShieldCheck, Copy, Check, Printer } from 'lucide-react'

interface RecoveryKeyModalProps {
  recoveryKey: string
  onConfirmed: () => void
}

export default function RecoveryKeyModal({ recoveryKey, onConfirmed }: RecoveryKeyModalProps) {
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(recoveryKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><body style="font-family:Arial;padding:40px;">
        <h2>BGInfo Express — Recovery Key</h2>
        <p>Keep this somewhere safe. If you ever forget your password and lose this key, your data cannot be recovered.</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px;margin:24px 0;">${recoveryKey}</p>
        <p style="color:#666;font-size:12px;">Printed: ${new Date().toLocaleDateString('en-GB')}</p>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full space-y-5">

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base">Save your recovery key</h2>
            <p className="text-gray-700 text-sm mt-1">
              This key is your backup if you ever forget your password. We store an encrypted copy so we can retrieve it for you — but please keep this safe too.
            </p>
          </div>
        </div>

        {/* The key */}
        <div className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-4 text-center">
          <p className="text-gray-900 font-mono text-lg font-bold tracking-widest select-all">
            {recoveryKey}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-primary-500"
          />
          <span className="text-sm text-gray-700">
            I have saved my recovery key. I understand that if I lose both my password and this key, my data cannot be recovered.
          </span>
        </label>

        <button
          onClick={onConfirmed}
          disabled={!confirmed}
          className="w-full px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          Continue to assessor area
        </button>
      </div>
    </div>
  )
}
