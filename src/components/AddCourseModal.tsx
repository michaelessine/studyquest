'use client'
// Client component: "Add Course" button opens a modal form;
// also handles PDF transcript upload to /api/parse-transcript.
import { useState } from 'react'
import { Plus, Upload, X, Loader2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const SUBJECTS = [
  { value: 'Mathematics',      label: 'Mathematics' },
  { value: 'ComputerScience',  label: 'Computer Science' },
  { value: 'Finance',          label: 'Finance' },
  { value: 'Economics',        label: 'Economics' },
  { value: 'QuantumMechanics', label: 'Quantum Mechanics' },
]

type Tab = 'manual' | 'upload'

export default function AddCourseModal() {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [tab, setTab]       = useState<Tab>('manual')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]   = useState('')

  // ── Manual form state ───────────────────────────────────────────────────
  const [form, setForm] = useState({
    code: '', name: '', subject: 'Mathematics',
    semester: '', year: new Date().getFullYear().toString(),
    status: 'active',
  })

  // ── PDF upload state ────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<string>('')

  async function submitManual(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: form.year ? parseInt(form.year) : null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSuccess(true)
      setTimeout(() => { setOpen(false); setSuccess(false); router.refresh() }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add course')
    } finally {
      setLoading(false)
    }
  }

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true); setError(''); setUploadResult('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parse-transcript', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setUploadResult(`Imported ${data.courses?.length ?? 0} course(s) successfully!`)
      setTimeout(() => { setOpen(false); setUploadResult(''); router.refresh() }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Trigger buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setOpen(true); setTab('manual') }}
          className="flex items-center gap-2 px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
        >
          <Plus size={15} /> Add Course
        </button>
        <button
          onClick={() => { setOpen(true); setTab('upload') }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg transition-colors border border-gray-700"
        >
          <Upload size={15} /> Upload Transcript
        </button>
      </div>

      {/* Modal backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="font-semibold text-gray-100">Add Course</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-gray-800">
              {(['manual', 'upload'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    tab === t ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t === 'manual' ? 'Manual Entry' : 'Upload PDF'}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* ── Manual form ──────────────────────────────────────────── */}
              {tab === 'manual' && (
                <form onSubmit={submitManual} className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Code (optional)</label>
                    <input
                      value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                      placeholder="CS 201"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Course Name *</label>
                    <input
                      required value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Linear Algebra"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Subject *</label>
                    <select
                      value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600"
                    >
                      {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Status *</label>
                      <select
                        value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600"
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="planned">Planned</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Semester</label>
                      <select
                        value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600"
                      >
                        <option value="">—</option>
                        <option>Fall</option>
                        <option>Spring</option>
                        <option>Summer</option>
                        <option>Winter</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Year</label>
                      <input
                        value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                        type="number" placeholder="2025"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    type="submit" disabled={loading}
                    className="w-full mt-1 py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : success ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                    {loading ? 'Adding...' : success ? 'Added!' : 'Add Course'}
                  </button>
                </form>
              )}

              {/* ── PDF upload form ───────────────────────────────────────── */}
              {tab === 'upload' && (
                <form onSubmit={submitUpload} className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Upload your academic transcript PDF. Claude will extract your courses, grades, and years automatically.
                  </p>

                  <label className="block cursor-pointer">
                    <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                      file ? 'border-purple-600 bg-purple-900/20' : 'border-gray-700 hover:border-gray-600'
                    }`}>
                      <Upload size={28} className="mx-auto mb-2 text-gray-500" />
                      {file ? (
                        <p className="text-sm text-purple-300 font-medium">{file.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-gray-400">Click to select a PDF</p>
                          <p className="text-xs text-gray-600 mt-1">Transcript, grade report, or course history</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file" accept=".pdf" className="hidden"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  {uploadResult && <p className="text-green-400 text-sm text-center">{uploadResult}</p>}
                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    type="submit" disabled={!file || loading}
                    className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {loading ? 'Parsing with AI...' : 'Upload & Import'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
