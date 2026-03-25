import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router'
import { Robot, X, PaperPlaneTilt, ChatCircle } from 'phosphor-react'
import { motion, AnimatePresence } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSession } from '../../context/SessionContext'
import { aiApi, projectsApi } from '../../lib/api'
import type { ChatMessage } from '../../lib/types'
import { ElaraLogo } from './ui/ElaraLogo'

// ─── Typewriter effect ────────────────────────────────────────────────────────

function useTypewriter(text: string, active: boolean, maxMs = 1400) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    if (!active) {
      setDisplayed(text)
      return
    }
    setDisplayed('')
    if (!text) return
    const msPerChar = Math.min(maxMs / text.length, 22)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, msPerChar)
    return () => clearInterval(interval)
  }, [text, active, maxMs])

  return displayed
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isLatestAI }: { msg: ChatMessage; isLatestAI: boolean }) {
  const isUser = msg.role === 'user'
  const displayed = useTypewriter(msg.content, !isUser && isLatestAI)

  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-[#0066FF] flex items-center justify-center flex-shrink-0 mb-1 overflow-hidden p-1.25">
          <ElaraLogo variant="blue" className="w-full h-full" />
        </div>
      )}
      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${isUser
          ? 'bg-[#0066FF] text-white rounded-2xl rounded-br-none'
          : 'bg-[#F0F2F5] dark:bg-[#181818] text-[#0A0A0A] dark:text-[#F5F5F5] rounded-2xl rounded-bl-none border border-[#E5E7EB] dark:border-[#1C1C1C]'
          }`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-xs dark:prose-invert max-w-none prose-p:leading-relaxed">
            {displayed ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayed}</ReactMarkdown>
            ) : (
              <span className="inline-flex gap-1 items-center py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function FloatingAssistantWrapper() {
  const { user } = useSession()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [latestAIId, setLatestAIId] = useState<string | null>(null)
  const [pagePdfText, setPagePdfText] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Global events (Suggested prompt dispatcher & logout clear)
  useEffect(() => {
    const handleOpenElara = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt: string, context?: string }>
      setOpen(true)

      // Slight delay to ensure animation completes and input mounts
      setTimeout(() => {
        if (customEvent.detail?.context) {
          setPagePdfText(customEvent.detail.context)
        }
        if (customEvent.detail?.prompt) {
          setInput(customEvent.detail.prompt)
          inputRef.current?.focus()
        }
      }, 300)
    }
    window.addEventListener('open-elara', handleOpenElara)

    // Clear history on logout (Session drops to null)
    if (!user) {
      setMessages([])
      setInput('')
      setLatestAIId(null)
    }

    return () => {
      window.removeEventListener('open-elara', handleOpenElara)
    }
  }, [user])

  // Focus input on open
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  const getContext = useCallback(() => {
    const path = location.pathname
    const isProjectPage = path.startsWith('/projects/') && !path.endsWith('/projects')
    const projectId = isProjectPage ? path.split('/')[2] : undefined

    return {
      path,
      role: user?.role || 'Guest',
      projectId,
      pdfText: pagePdfText || undefined
    }
  }, [location.pathname, user?.role, pagePdfText])

  // Role + page-aware suggestion chips
  const suggestions = (() => {
    const path = location.pathname
    const isProjectPage = path.startsWith('/projects/') && !path.endsWith('/projects')
    if (isProjectPage) {
      if (user?.role === 'supervisor') return ['Summarise this project', 'What are the weak points?', 'Compare versions', 'Suggest feedback']
      if (user?.role === 'student') return ['Explain the methodology', 'Summarise this project', 'What can I improve?', 'Find similar work']
      return ['Summarise this project', 'What is this about?', 'Find similar projects']
    }
    if (path.startsWith('/dashboard')) {
      if (user?.role === 'supervisor') return ['How many pending reviews?', 'What is a good plagiarism threshold?', 'How do I write good feedback?', 'What is version comparison?']
      if (user?.role === 'student') return ['How do I submit my project?', 'What does "changes requested" mean?', 'How do I add a co-author?', 'Where do I track my submissions?']
    }
    if (user?.role === 'supervisor') return ['How should I write useful feedback?', 'What makes a strong methodology?', 'How do I evaluate plagiarism scores?', 'What are common submission mistakes?']
    if (user?.role === 'admin') return ['How do I flag a comment?', 'What can admins do?', 'How are plagiarism scores calculated?', 'How do I manage users?']
    if (user?.role === 'student') return ['How do I submit my project?', 'What does "changes requested" mean?', 'How do I find a supervisor?', 'Can I edit after submitting?']
    return ['Find ML projects', 'How do I submit?', 'Browse by department']
  })()

  // Fetch project title for header if in project context
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  useEffect(() => {
    const ctx = getContext()
    if (ctx.projectId) {
      void projectsApi.get(ctx.projectId).then(res => {
        if (res.success) setProjectTitle(res.data.title)
      })
    } else {
      setProjectTitle(null)
    }
  }, [getContext])

  const send = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    // Add placeholder for AI response
    const aiId = `msg-${Date.now()}-ai`
    const aiMsg: ChatMessage = {
      id: aiId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, aiMsg])

    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    const res = await aiApi.assistant(trimmed, history, getContext())

    if (res.success) {
      const reply = res.data.reply
      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, content: reply } : m))
      )
      setLatestAIId(aiId)
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, content: 'Sorry, I encountered an issue. Please try again.' }
            : m
        )
      )
      setLatestAIId(aiId)
    }

    setSending(false)
  }, [input, sending, messages, getContext])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void send()
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-[70] w-14 h-14 rounded-full bg-[#0066FF] text-white shadow-[0_4px_24px_rgba(0,102,255,0.4)] hover:bg-[#0052CC] transition-colors duration-150 flex items-center justify-center pulse-ring"
            aria-label="Open Elara AI assistant"
          >
            <ElaraLogo variant="blue" className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[70] w-[calc(100vw-32px)] sm:w-[380px] h-[calc(100dvh-32px)] sm:h-[520px] max-h-[80dvh] sm:max-h-[80vh] rounded-2xl bg-white dark:bg-[#101010] shadow-[0_16px_64px_rgba(0,0,0,0.2)] border border-[#E5E7EB] dark:border-[#1C1C1C] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] dark:border-[#1C1C1C] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0066FF] flex items-center justify-center overflow-hidden p-1.5">
                  <ElaraLogo variant="blue" className="w-full h-full" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                    Elara
                  </p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-none truncate max-w-[200px]">
                    {projectTitle ? `Context: ${projectTitle}` : 'Inquisia Research Guide'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5] hover:bg-[#F0F2F5] dark:hover:bg-[#181818] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <ChatCircle size={40} weight="thin" className="text-[#9CA3AF] mb-3" />
                  <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
                    Ask Elara anything about Inquisia.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                        className="px-3 py-1.5 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] text-[12px] text-[#5C6370] dark:text-[#8B8FA8] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isLatestAI={msg.id === latestAIId}
                  />
                ))
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-3 pb-3 border-t border-[#E5E7EB] dark:border-[#1C1C1C] pt-3">
              {!user ? (
                <div className="text-center py-2">
                  <p className="text-[13px] text-[#9CA3AF]">
                    <Link to="/login" className="text-[#0066FF] hover:underline">Log in</Link> to chat with Elara
                  </p>
                </div>
              ) : (
                <div className="flex items-end gap-2 bg-[#F7F8FA] dark:bg-[#181818] rounded-2xl px-4 py-2.5 border border-[#E5E7EB] dark:border-[#1C1C1C] focus-within:border-[#0066FF] focus-within:shadow-[0_0_0_3px_rgba(0,102,255,0.15)] transition-all">
                  <textarea
                    ref={inputRef as any}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void send()
                      }
                    }}
                    placeholder="Ask Elara something..."
                    rows={1}
                    className="flex-1 bg-transparent outline-none text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] resize-none overflow-y-auto max-h-[120px]"
                    style={{ fontFamily: 'var(--font-body)', minHeight: '20px', padding: '0px' }}
                    disabled={sending}
                  />
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim() || sending}
                    className={`flex-shrink-0 transition-colors duration-150 mb-0.5 ${input.trim() ? 'text-[#0066FF]' : 'text-[#D1D5DB]'
                      }`}
                  >
                    <PaperPlaneTilt size={18} weight={input.trim() ? 'fill' : 'regular'} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
