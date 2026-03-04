import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { UploadSimple, FilePdf, X, Check, Spinner, CheckCircle, WarningCircle, MagnifyingGlass } from 'phosphor-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSession } from '../../context/SessionContext'
import { publicApi, projectsApi, usersApi, aiApi } from '../../lib/api'
import type { Department, Supervisor } from '../../lib/types'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { DashboardLayout } from '../components/layout/DashboardLayout'

// ─── Progress indicator ───────────────────────────────────────────────────────

function ProgressIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const completed = step < currentStep
        const active = step === currentStep
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <motion.div
                animate={active ? { boxShadow: '0 0 0 4px rgba(0,102,255,0.2)' } : { boxShadow: 'none' }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] transition-all duration-200 ${completed ? 'bg-[#0066FF] text-white' : active ? 'bg-[#0066FF] text-white' : 'bg-[#F0F2F5] dark:bg-[#181818] text-[#9CA3AF]'
                  }`}
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
              >
                {completed ? <Check size={14} weight="bold" /> : step}
              </motion.div>
              <span className={`text-[10px] mt-1 ${active ? 'text-[#0066FF]' : 'text-[#9CA3AF]'}`}
                style={{ fontFamily: 'var(--font-body)', fontWeight: active ? 600 : 400 }}>
                {['Files', 'Metadata', 'Team', 'Supervisor', 'Review'][i]}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div className={`h-px flex-1 mx-2 mb-4 transition-colors duration-200 ${step < currentStep ? 'bg-[#0066FF]' : 'bg-[#E5E7EB] dark:bg-[#1C1C1C]'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Drag drop zone ───────────────────────────────────────────────────────────

function DropZone({ file, onFile, accept = 'application/pdf', label = 'Drop your PDF here or click to browse' }: {
  file: File | null; onFile: (f: File | null) => void; accept?: string; label?: string
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFile(dropped)
  }

  if (file) {
    return (
      <div className="rounded-2xl border border-[#0066FF] bg-[#0066FF08] p-5 flex items-center gap-3">
        <FilePdf size={28} className="text-[#0066FF] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[#0A0A0A] dark:text-[#F5F5F5] truncate" style={{ fontFamily: 'var(--font-body)' }}>{file.name}</p>
          <p className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
        <button onClick={() => onFile(null)} className="p-1.5 rounded-full hover:bg-[#F0F2F5] dark:hover:bg-[#181818]"><X size={14} className="text-[#9CA3AF]" /></button>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-150 ${dragging ? 'border-[#0066FF] bg-[#0066FF08]' : 'border-[#E5E7EB] dark:border-[#1C1C1C] hover:border-[#0066FF] hover:bg-[#0066FF08]'
        }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <UploadSimple size={32} className={`mx-auto mb-3 ${dragging ? 'text-[#0066FF]' : 'text-[#9CA3AF]'}`} />
      <p className="text-[14px] text-[#5C6370] dark:text-[#8B8FA8]" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className="text-[12px] text-[#9CA3AF] mt-1" style={{ fontFamily: 'var(--font-body)' }}>PDF only, max 50MB</p>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </div>
  )
}

// ─── Step card wrapper ────────────────────────────────────────────────────────

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  )
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onAdd, onRemove }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] p-3 bg-white dark:bg-[#101010] focus-within:border-[#0066FF]">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 px-3 py-1 rounded-full text-[12px] bg-[#0066FF1A] text-[#0066FF]" style={{ fontFamily: 'var(--font-body)' }}>
            {t}<button onClick={() => onRemove(t)}><X size={10} /></button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && val.trim() && tags.length < 5) {
            onAdd(val.trim())
            setVal('')
          }
        }}
        placeholder={tags.length < 5 ? "Type a tag and press Enter" : "Max 5 tags reached"}
        disabled={tags.length >= 5}
        className="w-full bg-transparent outline-none text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#9CA3AF]"
        style={{ fontFamily: 'var(--font-body)' }}
      />
    </div>
  )
}

// ─── Floating label input ─────────────────────────────────────────────────────

function FloatingLabel({ id, label, value, onChange, type = 'text' }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string }) {
  const [f, setF] = useState(false)
  const raised = f || value.length > 0
  return (
    <div className={`relative rounded-full border transition-all duration-150 bg-white dark:bg-[#101010] ${f ? 'border-[#0066FF] shadow-[0_0_0_3px_rgba(0,102,255,0.15)]' : 'border-[#E5E7EB] dark:border-[#1C1C1C]'}`}>
      <label htmlFor={id} className={`absolute left-4 transition-all duration-150 pointer-events-none ${raised ? 'top-1.5 text-[11px] text-[#9CA3AF]' : 'top-1/2 -translate-y-1/2 text-[14px] text-[#9CA3AF]'}`}
        style={{ fontFamily: 'var(--font-body)', fontWeight: raised ? 500 : 400 }}>{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        className={`w-full bg-transparent outline-none px-4 rounded-full text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] ${raised ? 'pt-5 pb-2' : 'py-3.5'}`}
        style={{ fontFamily: 'var(--font-body)' }} />
    </div>
  )
}

// ─── Upload page ──────────────────────────────────────────────────────────────

export function UploadPage() {
  const { user, isLoading } = useSession()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  // Step 1
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [extractedPdfText, setExtractedPdfText] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [githubUrl, setGithubUrl] = useState('')
  const [liveUrl, setLiveUrl] = useState('')

  // Step 2
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string; category?: string; suggested_prompt?: string; pdfText?: string; plagiarismData?: { score: number, similarProjectId?: string, similarityReason?: string } } | null>(null)
  const [validatedContent, setValidatedContent] = useState<{ title: string; abstract: string } | null>(null)

  // Step 3 — track teammates as { id, name, matric } so we can send matric numbers to the backend
  const [teammates, setTeammates] = useState<{ id: string; name: string; matric: string; role: string }[]>([])
  const [searchMatric, setSearchMatric] = useState('')
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; matric: string } | null>(null)
  const [searching, setSearching] = useState(false)

  // Step 4
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [selectedSupervisor, setSelectedSupervisor] = useState('')

  // Step 5
  const [submitting, setSubmitting] = useState(false)
  const [showSimilarityWarning, setShowSimilarityWarning] = useState(false)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'student')) navigate('/login?return=/upload')
  }, [user, isLoading, navigate])

  useEffect(() => {
    publicApi.supervisors().then((r) => { if (r.success) setSupervisors(r.data) })
  }, [])

  /**
   * We run extraction in Step 1 immediately upon file drop.
   * Then in Step 2, validation is fast and we can provide the full text to Elara instantly.
   */
  const handleFileDrop = async (file: File | null) => {
    setPdfFile(file)
    setExtractedPdfText('')

    if (!file) return

    setIsExtracting(true)
    const toastId = toast.loading('Reading PDF contents...')

    const res = await aiApi.extract(file)
    if (res.success && res.data?.text) {
      setExtractedPdfText(res.data.text)
      toast.success('PDF read successfully.', { id: toastId })
    } else {
      const errorMessage = !res.success ? res.error : 'Invalid response';
      toast.error(errorMessage || 'Failed to read PDF text. You can still proceed, but Elara won\'t have context.', { id: toastId })
    }

    setIsExtracting(false)
  }

  const handleValidate = async () => {
    if (!title || abstract.length < 50) return
    setValidating(true)
    setValidationResult(null)

    // Send the pre-extracted string instead of making the backend parse the heavy file again
    const res = await aiApi.validate(title, abstract, extractedPdfText || pdfFile)
    if (res.success) {
      if (res.data.valid === false) {
        setValidationResult({
          success: false,
          message: res.data.message || 'The abstract does not seem to match the title or is of low quality.',
          suggested_prompt: res.data.suggested_prompt,
          pdfText: res.data.pdfText || extractedPdfText, // Fallback to our state if backend didn't echo it
          plagiarismData: res.data.plagiarismData
        })
        setValidatedContent(null)
      } else {
        setValidationResult({
          success: true,
          message: res.data.message || 'Content looks good!',
          category: res.data.category,
          plagiarismData: res.data.plagiarismData
        })
        setValidatedContent({ title, abstract })
      }
    } else {
      setValidationResult({
        success: false,
        message: res.error || 'Failed to validate with AI.',
      })
      setValidatedContent(null)
    }
    setValidating(false)
  }

  const handleSearchTeammate = async () => {
    const matric = searchMatric.trim()
    if (!matric) return
    setSearching(true)
    setSearchResult(null)
    const res = await usersApi.lookup(matric)
    if (res.success) {
      if (res.data) {
        setSearchResult({
          id: res.data.id,
          name: res.data.display_name ?? res.data.full_name,
          matric: res.data.matric_no,
        })
      }
    } else {
      toast.error(res.error ?? 'No student found with that matric number.')
    }
    setSearching(false)
  }

  const handleAddTeammate = (member: { id: string; name: string; matric: string }) => {
    if (!teammates.find((t) => t.id === member.id)) {
      setTeammates((prev) => [...prev, { id: member.id, name: member.name, matric: member.matric, role: '' }])
    }
    setSearchResult(null)
    setSearchMatric('')
  }

  const handleSubmit = async (bypassWarning = false) => {
    if (!pdfFile) { toast.error('Please upload a PDF file.'); return }
    if (!selectedSupervisor) { toast.error('Please select a supervisor.'); return }

    // Similarity Warning Check
    const simScore = validationResult?.plagiarismData?.score || 0;
    if (simScore > 15 && !bypassWarning) {
      setShowSimilarityWarning(true);
      return;
    }

    setSubmitting(true)

    // Build the metadata object that the backend's Zod schema expects.
    // The `file` blob is sent separately; everything else goes into `metadata`.
    const metadata: Record<string, unknown> = {
      title,
      abstract,
      supervisor_id: selectedSupervisor,
      student_tags: tags,
      // Backend expects co_authors as an array of matriculation number strings.
      co_authors: teammates.map((t) => t.matric),
      // Pass the locally extracted text string so backend skips the heavy pdf-parse and avoids the 60s timeout
      pdfText: extractedPdfText || undefined,
    }
    if (githubUrl) metadata.github_url = githubUrl
    if (liveUrl) metadata.live_url = liveUrl

    const res = await projectsApi.create(pdfFile, metadata)
    if (res.success) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      toast.success('Project submitted! Your supervisor will be notified to review it.')
      navigate('/dashboard')
    } else {
      console.error('Submission failed:', res)
      toast.error(res.error ?? 'Submission failed. Please try again.')
      setSubmitting(false)
    }
  }

  const isContentValidated =
    validatedContent !== null &&
    validatedContent.title === title &&
    validatedContent.abstract === abstract &&
    validationResult?.success === true

  const canProceed = [
    pdfFile !== null && !isExtracting, // Step 1: require file and wait for extraction
    title.length >= 5 && abstract.length >= 50 && isContentValidated, // Step 2 — require AI validation
    true, // Step 3 — teammates optional
    selectedSupervisor.length > 0, // Step 4
  ]

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 rounded-full border-2 border-[#E5E7EB] border-t-[#0066FF] animate-spin" /></div>

  return (
    <DashboardLayout activeSection="upload">
      <div className="max-w-[600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5] mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em' }}>
            Submit a Project
          </h1>
          <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>Complete all steps to submit your final year project.</p>
        </div>

        <ProgressIndicator currentStep={step} totalSteps={5} />

        <AnimatePresence mode="wait">
          {/* Step 1 — Files */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <StepCard>
                <h2 className="mb-5 text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }}>Upload Files</h2>
                <div className="space-y-4">
                  <DropZone file={pdfFile} onFile={handleFileDrop} />
                  {isExtracting && (
                    <div className="flex justify-center items-center py-2 text-[#9CA3AF] text-[12px] gap-2 animate-pulse" style={{ fontFamily: 'var(--font-body)' }}>
                      <Spinner size={14} className="animate-spin" /> Extracting text for Elara context...
                    </div>
                  )}
                  <FloatingLabel id="github" label="GitHub URL (optional)" value={githubUrl} onChange={setGithubUrl} type="url" />
                  <FloatingLabel id="live" label="Live Demo URL (optional)" value={liveUrl} onChange={setLiveUrl} type="url" />
                </div>
              </StepCard>
            </motion.div>
          )}

          {/* Step 2 — Metadata */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <StepCard>
                <h2 className="mb-5 text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }}>Project Details</h2>
                <div className="space-y-4">
                  <FloatingLabel id="title" label="Project title" value={title} onChange={setTitle} />
                  <div className="relative rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] p-4">
                    <textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={5} placeholder="Project abstract (min. 50 characters)"
                      className="w-full bg-transparent outline-none text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] resize-none"
                      style={{ fontFamily: 'var(--font-body)' }} />
                    <span className={`text-[11px] absolute bottom-3 right-3 ${abstract.length < 50 ? 'text-red-400' : 'text-[#9CA3AF]'}`} style={{ fontFamily: 'var(--font-body)' }}>
                      {abstract.length} chars
                    </span>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#9CA3AF] mb-2" style={{ fontFamily: 'var(--font-body)' }}>Tags (max 5, press Enter to add)</p>
                    <TagInput tags={tags} onAdd={(t) => setTags((prev) => prev.includes(t) ? prev : [...prev, t])} onRemove={(t) => setTags((prev) => prev.filter((x) => x !== t))} />
                  </div>
                  <button onClick={() => void handleValidate()} disabled={!title || abstract.length < 50 || validating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 transition-colors"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                    {validating ? <><Spinner size={14} className="animate-spin" />Validating...</> : 'Validate with Elara'}
                  </button>
                  <AnimatePresence>
                    {validationResult && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`rounded-2xl p-4 flex flex-col gap-3 ${validationResult.success ? (isContentValidated ? 'bg-[#F0FDF4] border border-[#22C55E]/30' : 'bg-[#FFFBEB] border border-[#F59E0B]/30') : 'bg-[#FEF2F2] border border-red-200'}`}>
                        <div className="flex gap-3">
                          {validationResult.success ? (
                            isContentValidated ? <CheckCircle size={20} className="text-[#22C55E] flex-shrink-0" /> : <WarningCircle size={20} className="text-[#F59E0B] flex-shrink-0" />
                          ) : (
                            <WarningCircle size={20} className="text-red-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-[13px] font-medium" style={{ fontFamily: 'var(--font-body)', color: validationResult.success ? (isContentValidated ? '#16A34A' : '#B45309') : '#DC2626' }}>
                              {validationResult.success ? (isContentValidated ? 'Validation Passed' : 'Validation Outdated') : 'Validation Failed'}
                            </p>
                            <p className="text-[12px] mt-0.5" style={{ fontFamily: 'var(--font-body)', color: validationResult.success ? (isContentValidated ? '#15803D' : '#92400E') : '#B91C1C' }}>
                              {isContentValidated ? validationResult.message : (validationResult.success ? 'Content has changed. Please re-validate before continuing.' : validationResult.message)}
                              {isContentValidated && validationResult.category && ` Category: ${validationResult.category}`}
                            </p>
                          </div>
                        </div>
                        {validationResult.success === false && validationResult.suggested_prompt && (
                          <div className="ml-8 mt-1">
                            <button
                              onClick={() => {
                                const event = new CustomEvent('open-elara', { detail: { prompt: validationResult.suggested_prompt, context: validationResult.pdfText || extractedPdfText } })
                                window.dispatchEvent(event)
                              }}
                              className="px-4 py-2 rounded-full border border-red-200 bg-white hover:bg-red-50 text-red-600 text-[12px] font-medium transition-colors flex items-center gap-2">
                              ✨ Ask Elara for Help
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StepCard>
            </motion.div>
          )}

          {/* Step 3 — Team */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <StepCard>
                <h2 className="mb-5 text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }}>Team Members</h2>
                {/* Uploading student */}
                <div className="rounded-2xl border border-[#0066FF] bg-[#0066FF08] p-4 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0066FF] flex items-center justify-center text-white text-[11px]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {user ? user.full_name?.[0] ?? 'Y' : 'Y'}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)' }}>{user?.full_name ?? 'You'}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#0066FF1A] text-[#0066FF]" style={{ fontFamily: 'var(--font-body)' }}>Team Lead</span>
                  </div>
                </div>
                {/* Search */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 flex items-center gap-2 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] px-4 py-2.5">
                    <MagnifyingGlass size={15} className="text-[#9CA3AF] flex-shrink-0" />
                    <input value={searchMatric} onChange={(e) => setSearchMatric(e.target.value)} placeholder="Search by matric number"
                      className="flex-1 bg-transparent outline-none text-[13px] placeholder-[#9CA3AF] text-[#0A0A0A] dark:text-[#F5F5F5]"
                      style={{ fontFamily: 'var(--font-body)' }} />
                  </div>
                  <button onClick={handleSearchTeammate} disabled={!searchMatric.trim() || searching}
                    className="px-4 py-2.5 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 transition-colors"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                    {searching ? <Spinner size={14} className="animate-spin" /> : 'Search'}
                  </button>
                </div>
                {searchResult && (
                  <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] p-3 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)' }}>{searchResult.name}</p>
                      <p className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-mono)' }}>{searchResult.matric}</p>
                    </div>
                    <button onClick={() => handleAddTeammate(searchResult)} className="px-3 py-1.5 rounded-full text-[12px] text-white bg-[#0066FF] hover:bg-[#0052CC] transition-colors"
                      style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>Add</button>
                  </div>
                )}
                {teammates.map((t, i) => (
                  <div key={t.id} className="rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] p-4 mb-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F0F2F5] dark:bg-[#181818] flex items-center justify-center text-[#9CA3AF] text-[11px]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      {t.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)' }}>{t.name}</p>
                      <input value={t.role} onChange={(e) => setTeammates((prev) => prev.map((m, mi) => mi === i ? { ...m, role: e.target.value } : m))}
                        placeholder="What did they contribute?" className="w-full bg-transparent outline-none text-[12px] text-[#9CA3AF] placeholder-[#C0C0C0] mt-0.5"
                        style={{ fontFamily: 'var(--font-body)' }} />
                    </div>
                    <button onClick={() => setTeammates((prev) => prev.filter((_, mi) => mi !== i))} className="p-1.5 rounded-full hover:bg-[#F0F2F5] dark:hover:bg-[#181818]">
                      <X size={13} className="text-[#9CA3AF]" />
                    </button>
                  </div>
                ))}
              </StepCard>
            </motion.div>
          )}

          {/* Step 4 — Supervisor */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <StepCard>
                <h2 className="mb-5 text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }}>Select Supervisor</h2>
                <div className="space-y-3">
                  {supervisors.map((s) => (
                    <label key={s.id} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-150 ${selectedSupervisor === s.id ? 'border-[#0066FF] bg-[#0066FF08]' : 'border-[#E5E7EB] dark:border-[#1C1C1C] hover:border-[#0066FF]/40'
                      }`}>
                      <input type="radio" name="supervisor" value={s.id} checked={selectedSupervisor === s.id} onChange={() => setSelectedSupervisor(s.id)} className="mt-1 accent-[#0066FF]" />
                      <div>
                        <p className="text-[14px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)' }}>{s.full_name}</p>
                        <p className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{s.degrees}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </StepCard>
            </motion.div>
          )}

          {/* Step 5 — Review */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <StepCard>
                <h2 className="mb-5 text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }}>Review & Submit</h2>
                <div className="space-y-4">
                  {[
                    { label: 'PDF File', value: pdfFile?.name ?? '—' },
                    { label: 'Title', value: title || '—' },
                    { label: 'Team', value: `${1 + teammates.length} member${teammates.length > 0 ? 's' : ''}` },
                    { label: 'Supervisor', value: supervisors.find((s) => s.id === selectedSupervisor)?.full_name ?? '—' },
                    { label: 'Tags', value: tags.join(', ') || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3 rounded-2xl bg-[#F7F8FA] dark:bg-[#181818] p-4">
                      <p className="text-[12px] text-[#9CA3AF] w-24 flex-shrink-0" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
                      <p className="text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-body)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </StepCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-5 py-2.5 rounded-full text-[13px] border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#5C6370] disabled:opacity-40 hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
          >
            Back
          </button>
          {step < 5 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed[step - 1]}
              className="px-6 py-2.5 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="px-6 py-2.5 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 transition-colors flex items-center gap-2"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
            >
              {submitting ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Submitting...</> : 'Submit Project'}
            </button>
          )}
        </div>
      </div>

      {/* Similarity Warning Modal */}
      <AnimatePresence>
        {showSimilarityWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSimilarityWarning(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-[500px] bg-white dark:bg-[#101010] rounded-3xl shadow-xl overflow-hidden shadow-black/10 border border-[#E5E7EB] dark:border-[#1C1C1C]">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB] dark:border-[#1C1C1C]">
                <h3 className="text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }}>Similarity Warning</h3>
                <button onClick={() => setShowSimilarityWarning(false)} className="p-2 -mr-2 text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5] transition-colors"><X size={20} /></button>
              </div>
              {/* Body */}
              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 flex items-center justify-center flex-shrink-0">
                    <WarningCircle size={24} weight="fill" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] mb-1" style={{ fontFamily: 'var(--font-display)' }}>High Similarity Detected ({validationResult?.plagiarismData?.score}%)</h4>
                    <p className="text-[13px] text-[#5C6370] leading-relaxed mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                      Your submission has a high similarity score. Submitting projects with severe overlaps may lead to rejection by your supervisor.
                    </p>
                    {validationResult?.plagiarismData?.similarityReason && (
                      <div className="bg-[#FEF2F2] dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-3 text-[12px] text-red-800 dark:text-red-400">
                        <strong>AI Reason:</strong> {validationResult.plagiarismData.similarityReason}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowSimilarityWarning(false)} className="px-5 py-2.5 rounded-full text-[13px] font-medium text-[#5C6370] bg-[#F0F2F5] dark:bg-[#181818] hover:bg-[#E5E7EB] dark:hover:bg-[#2A2A2A] transition-colors">Go Back & Edit</button>
                  <button onClick={() => { setShowSimilarityWarning(false); void handleSubmit(true); }} disabled={submitting} className="px-5 py-2.5 rounded-full text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {submitting ? 'Submitting...' : 'Yes, Submit Anyway'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  )
}