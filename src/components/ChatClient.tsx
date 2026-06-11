'use client'
// Full chat interface — streams responses from /api/chat using SSE,
// parses <actions> tags from the response, and applies them server-side.
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Zap, CheckCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from './ToastProvider'

type Message = { role: 'user' | 'assistant'; content: string }

type Action =
  | { type: 'markTopicDone'; topicId: string }
  | { type: 'logSession'; courseId?: string; durationMins: number; rawNote: string }
  | { type: 'addDeadline'; courseId: string; title: string; deadlineType: string; dueDate: string; xpValue: number }
  | { type: 'suggestTopics'; topicIds: string[] }

// Parse <actions>[...]</actions> out of assistant text
function extractActions(text: string): { clean: string; actions: Action[] } {
  const match = text.match(/<actions>([\s\S]*?)<\/actions>/)
  if (!match) return { clean: text, actions: [] }
  let actions: Action[] = []
  try { actions = JSON.parse(match[1]) } catch {}
  return { clean: text.replace(/<actions>[\s\S]*?<\/actions>/, '').trim(), actions }
}

// Render assistant message text (bold, code highlighting stripped, newlines respected)
function MessageContent({ text }: { text: string }) {
  const { clean } = extractActions(text)
  return (
    <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
      {clean}
    </div>
  )
}

export default function ChatClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState(searchParams.get('prefill') ?? '')
  const [streaming, setStreaming] = useState(false)
  const [appliedActions, setAppliedActions] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function applyActions(actions: Action[]) {
    if (!actions.length) return
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions }),
      })
      const data = await res.json()
      setAppliedActions(data.applied ?? [])

      // Show info toast for each applied action
      for (const a of data.applied ?? []) {
        showToast('info', a)
      }

      router.refresh()
    } catch {}
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setAppliedActions([])

    // Append placeholder for streaming assistant response
    setMessages(m => [...m, { role: 'assistant', content: '' }])

    let fullText = ''
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const { text: t } = JSON.parse(payload)
            if (t) {
              fullText += t
              setMessages(m => {
                const copy = [...m]
                copy[copy.length - 1] = { role: 'assistant', content: fullText }
                return copy
              })
            }
          } catch {}
        }
      }
    } catch {
      fullText = 'Sorry, something went wrong. Please try again.'
      setMessages(m => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', content: fullText }
        return copy
      })
    } finally {
      setStreaming(false)
      // Extract and apply any actions embedded in the response
      const { actions } = extractActions(fullText)
      if (actions.length) applyActions(actions)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Message list ───────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-orange-900/50 border border-orange-700 flex items-center justify-center">
              <Bot size={26} className="text-orange-400" />
            </div>
            <div>
              <p className="text-gray-300 font-medium">Your AI Study Assistant</p>
              <p className="text-sm text-gray-600 mt-1 max-w-sm">
                Ask about your courses, get study tips, log sessions, or mark topics done.
                Claude knows your full learning state.
              </p>
            </div>
            {/* Suggested starters */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "What should I study next?",
                "Log 60 mins of Linear Algebra",
                "What deadlines are coming up?",
                "Give me a study plan for this week",
              ].map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full text-gray-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              msg.role === 'user' ? 'bg-orange-800' : 'bg-gray-800'
            }`}>
              {msg.role === 'user'
                ? <User size={14} className="text-orange-300" />
                : <Bot size={14} className="text-gray-400" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-orange-900/60 border border-orange-800 text-orange-100 text-sm'
                : 'bg-gray-900 border border-gray-800'
            }`}>
              {msg.role === 'assistant' ? (
                msg.content === '' && streaming
                  ? <Loader2 size={16} className="animate-spin text-gray-500" />
                  : <MessageContent text={msg.content} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Applied actions notice */}
        {appliedActions.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 border border-green-900/40 rounded-lg px-3 py-2">
            <CheckCircle size={13} />
            Actions applied: {appliedActions.join(', ')}
            <Zap size={11} className="ml-1" />
          </div>
        )}
      </div>

      {/* ── Input area ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-gray-800 p-4">
        <div className="flex gap-3 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything about your studies... (Enter to send)"
            rows={1}
            style={{ resize: 'none', minHeight: '44px', maxHeight: '120px' }}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600 transition-colors"
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            className="shrink-0 w-11 h-11 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors"
          >
            {streaming
              ? <Loader2 size={18} className="animate-spin text-white" />
              : <Send size={16} className="text-white" />}
          </button>
        </div>
        <p className="text-xs text-gray-700 text-center mt-2">
          Shift+Enter for new line · Claude can take actions on your behalf
        </p>
      </div>
    </div>
  )
}
