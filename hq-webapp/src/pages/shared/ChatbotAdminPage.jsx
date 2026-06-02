import { useState, useEffect } from 'react'
import api, { chatbotAdminApi } from '../../services/api'
import styles from './ChatbotAdminPage.module.css'

const CATEGORIES = ['General Info', 'Queue Information', 'Appointments', 'Account', 'Clinic']
const CAT_BADGE  = {
  'Queue Information': 'badge-blue',
  'Appointments':      'badge-green',
  'General Info':      'badge-teal',
  'Account':           'badge-purple',
  'Clinic':            'badge-orange',
}
const EMPTY_FORM = { question: '', answer: '', category: 'General Info', keywords: '', isActive: true,  errors: {} }

export default function ChatbotAdminPage() {
  const [tab,      setTab]     = useState('Responses')
  const [faqs,     setFaqs]    = useState([])
  const [logs,     setLogs]    = useState([])
  const [analytics,setAnalytics] = useState(null)
  const [loading,  setLoading] = useState(true)
  const [search,   setSearch]  = useState('')
  const [catFilter,setCat]     = useState('All')
  const [modal,    setModal]   = useState(null)   // null | 'add' | 'edit'
  const [editing,  setEditing] = useState(null)
  const [form,     setForm]    = useState(EMPTY_FORM)
  const [saving,   setSaving]  = useState(false)
  const [toast,    setToast]   = useState('')

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const loadFAQs = () => {
    setLoading(true)
    chatbotAdminApi.getFAQs()
      .then(r => setFaqs(r.data || []))
      .catch(() => showToast('Failed to load responses'))
      .finally(() => setLoading(false))
  }

  const loadLogs = () => {
    chatbotAdminApi.getLogs()
      .then(r => setLogs(r.data || []))
      .catch(() => {})
  }

  const loadAnalytics = () => {
    // GET /api/chatbot-admin/analytics
    api.get('/api/chatbot-admin/analytics').then(r => setAnalytics(r.data)).catch(() => {})
  }

  useEffect(() => { loadFAQs() }, [])
  useEffect(() => { if (tab === 'Analytics') { loadLogs(); loadAnalytics() } }, [tab])

  const openAdd  = () => { setEditing(null); setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (faq) => {
    setEditing(faq)
    setForm({
      question:  faq.question,
      answer:    faq.answer,
      category:  faq.category,
      keywords:  (faq.keywords || []).join(', '),
      isActive:  faq.isActive,
    })
    setModal('edit')
  }
  const close = () => { setModal(null); setEditing(null), setForm(EMPTY_FORM) }

  const save = async () => {
    const errors = {}
      if (!form.question.trim()) {
        errors.question = 'Question / Intent is required'
      }

      if (!form.answer.trim()) {
        errors.answer = 'Answer is required'
      }

      if (Object.keys(errors).length > 0) {
        setForm(f => ({ ...f, errors }))
        return
      }
    setSaving(true)
    try {
      const payload = {
        question:  form.question.trim(),
        answer:    form.answer.trim(),
        category:  form.category,
        keywords:  form.keywords,   // controller handles split
        isActive:  form.isActive,
      }
      if (editing) await chatbotAdminApi.updateFAQ(editing._id, payload)
      else         await chatbotAdminApi.createFAQ(payload)
      showToast(editing ? 'Response updated' : 'Response added successfully')
      close(); loadFAQs()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this response?')) return
    try {
      await chatbotAdminApi.deleteFAQ(id)
      showToast('Response deleted'); loadFAQs()
    } catch { showToast('Failed to delete') }
  }

  const toggleActive = async (faq) => {
    try {
      await chatbotAdminApi.updateFAQ(faq._id, { isActive: !faq.isActive })
      showToast(faq.isActive ? 'Response disabled' : 'Response enabled')
      loadFAQs()
    } catch { showToast('Failed to update') }
  }

  const activeFAQs = faqs.filter(f => f.isActive).length

  const filtered = faqs.filter(f => {
    const matchCat    = catFilter === 'All' || f.category === catFilter
    const q           = search.toLowerCase()
    const matchSearch = !q || f.question?.toLowerCase().includes(q) ||
                        f.answer?.toLowerCase().includes(q) ||
                        f.keywords?.some(k => k.includes(q))
    return matchCat && matchSearch
  })

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Page header card */}
      <div className={`card ${styles.pageHeader}`}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <div className={styles.headerTitle}>Chatbot Administration</div>
            <div className={styles.headerSub}>Manage automated responses and chatbot settings</div>
          </div>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          Chatbot Status: <strong>Active</strong>
          <span className="badge badge-green" style={{marginLeft:6}}>Active</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {['Responses','Settings','Analytics'].map(t => (
          <button key={t} className={`${styles.tab} ${tab===t?styles.tabActive:''}`} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── RESPONSES TAB ── */}
      {tab === 'Responses' && (
        <>
          <div className={styles.toolbar}>
            <div className="search-bar" style={{flex:1,maxWidth:320}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search responses..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="dropdown-select" value={catFilter} onChange={e=>setCat(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <button className="btn btn-outline btn-sm" onClick={loadFAQs}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Response
            </button>
          </div>

          {loading
            ? <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Loading responses…</div>
            : filtered.length === 0
              ? <div className="card" style={{padding:40,textAlign:'center',color:'var(--muted)'}}>No responses found. Click "Add Response" to create one.</div>
              : <div className={styles.faqList}>
                  {filtered.map(faq => (
                    <div key={faq._id} className={`card ${styles.faqCard}`}>
                      <div className={styles.faqTop}>
                        <div className={styles.faqMeta}>
                          <span className={styles.faqQuestion}>{faq.question}</span>
                          <span className={`badge ${CAT_BADGE[faq.category]||'badge-gray'}`}>{faq.category}</span>
                          <span className={`badge ${faq.isActive?'badge-green':'badge-gray'}`}>{faq.isActive?'Active':'Disabled'}</span>
                        </div>
                      </div>

                      {/* Keywords row */}
                      {faq.keywords?.length > 0 && (
                        <div className={styles.keywordsRow}>
                          <span className={styles.kwLabel}>Keywords:</span>
                          {faq.keywords.map(k => (
                            <span key={k} className={styles.kwTag}>{k}</span>
                          ))}
                        </div>
                      )}

                      {/* Answer */}
                      <div className={styles.faqAnswer}>{faq.answer}</div>

                      {/* Usage */}
                      <div className={styles.faqFooter}>
                        <span className={styles.usageText}>Used {faq.usageCount||0} times</span>
                        <div className={styles.faqActions}>
                          <button className={styles.actionBtn} onClick={()=>openEdit(faq)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </button>
                          <button className={styles.actionBtn} onClick={()=>toggleActive(faq)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            {faq.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={()=>remove(faq._id)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
          }
        </>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'Settings' && (
        <div className="card" style={{padding:28}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:20}}>Chatbot Settings</div>
          <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:480}}>
            {[
              ['Chatbot Mode', 'FAQ Fallback (No Rasa server configured)'],
              ['Default Language', 'Filipino / English (Bilingual)'],
              ['Max Response Length', '500 characters'],
              ['Fallback Message', '"Sorry, I didn\'t understand. Please visit our reception desk."'],
            ].map(([label, value]) => (
              <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border-lt)'}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text-2)'}}>{label}</div>
                <div style={{fontSize:13,color:'var(--muted)',maxWidth:260,textAlign:'right'}}>{value}</div>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border-lt)'}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text-2)'}}>Active Responses</div>
              <span className="badge badge-green">{activeFAQs} / {faqs.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === 'Analytics' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
            {[
              ['Total Responses', analytics?.totalFAQs ?? faqs.length,       '#2563EB'],
              ['Active Responses', analytics?.activeFAQs ?? activeFAQs,       '#16A34A'],
              ['Total Interactions', analytics?.totalLogs ?? logs.length,     '#D97706'],
              ['This Month',        logs.filter(l=>new Date(l.createdAt)>new Date(Date.now()-30*86400000)).length, '#7C3AED'],
            ].map(([label,val,color]) => (
              <div key={label} className="card" style={{padding:'18px 20px'}}>
                <div style={{fontSize:24,fontWeight:800,color}}>{val}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Top FAQs */}
          <div className="card" style={{padding:20}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Most Used Responses</div>
            {(analytics?.topFAQs || faqs.slice(0,5)).map((f,i) => (
              <div key={f._id||i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:'1px solid var(--border-lt)'}}>
                <span style={{width:22,height:22,borderRadius:'50%',background:'#EFF6FF',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</span>
                <div style={{flex:1,fontSize:13}}>{f.question}</div>
                <span className={`badge ${CAT_BADGE[f.category]||'badge-gray'}`}>{f.category}</span>
                <span style={{fontSize:12,fontWeight:700,color:'var(--muted)'}}>{f.usageCount||0}x</span>
              </div>
            ))}
          </div>

          {/* Recent logs */}
          {logs.length > 0 && (
            <div className="card" style={{padding:20}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Recent Interactions</div>
              <div className="table-wrap" style={{border:'none',borderRadius:0}}>
                <table>
                  <thead><tr><th>Patient</th><th>Message</th><th>Response</th><th>Time</th></tr></thead>
                  <tbody>
                    {logs.slice(0,10).map(l=>(
                      <tr key={l._id}>
                        <td style={{fontSize:12}}>{l.patient?.fullName||'Anonymous'}</td>
                        <td style={{fontSize:12,maxWidth:200}}>{l.message?.slice(0,60)}{l.message?.length>60?'…':''}</td>
                        <td style={{fontSize:12,maxWidth:200}}>{l.response?.slice(0,60)}{l.response?.length>60?'…':''}</td>
                        <td style={{fontSize:11,color:'var(--muted)'}}>{new Date(l.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="modal" style={{maxWidth:500}}>
            <div className="modal-header">
              <div className="modal-title">{modal==='edit' ? 'Edit Response' : 'Add New Response'}</div>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Question / Intent *</label>
                <input className="form-input" value={form.question} 
                  style={{ border: form.errors?.question ? '1px solid #DC2626' : undefined }}
                    onChange={e => setForm(f => ({ ...f, question: e.target.value, errors: { ...f.errors, question: '' } }))}
                    placeholder="e.g. How do I book an appointment?"  />
                  {form.errors?.question && ( <div style={{ color:'#DC2626', fontSize:12, marginTop:6, fontWeight:500, }} >
                      {form.errors.question}
                    </div>
                  )}
              </div>
              <div className="form-group">
                <label className="form-label">Answer *</label>
                <textarea
                  className="form-textarea" rows={4} value={form.answer}
                  style={{ border: form.errors?.answer ? '1px solid #DC2626' : undefined }}
                  onChange={e => setForm(f => ({ ...f,  answer: e.target.value, errors: { ...f.errors, answer: '' }
                  }))}
                  placeholder="Type the chatbot's response…"
                />

                {form.errors?.answer && (
                  <div style={{ color:'#DC2626', fontSize:12, marginTop:6, fontWeight:500, }}>
                    {form.errors.answer}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Keywords</label>
                <input className="form-input" value={form.keywords}
                  onChange={e=>setForm(f=>({...f,keywords:e.target.value}))}
                  placeholder="appointment, schedule, booking  (comma-separated)" />
                <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>
                  Separate keywords with commas. The chatbot uses these to match patient messages.
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{display:'flex',alignItems:'center',gap:10}}>
                <input type="checkbox" id="isActive" checked={form.isActive}
                  onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))} style={{width:16,height:16}} />
                <label htmlFor="isActive" style={{fontSize:13,color:'var(--text-2)',cursor:'pointer'}}>Active (visible to patients)</label>
              </div>

              {/* Live keyword preview */}
              {form.keywords.trim() && (
                <div style={{padding:'10px 12px',background:'var(--border-lt)',borderRadius:8,marginTop:4}}>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:6}}>Keyword preview:</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {form.keywords.split(',').map(k=>k.trim()).filter(Boolean).map(k=>(
                      <span key={k} className={styles.kwTag}>{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : modal==='edit' ? 'Save Changes' : 'Add Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
