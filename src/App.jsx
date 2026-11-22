import React, { useState, useEffect, useMemo } from 'react'
import { INITIAL_STATE, BRANCHES, CURATED_CATALOG } from './data/seedData'

const STORAGE_KEY = 'lc_wa_purchasing_v3'

const SIMPLE_ROLES = [
  { id: 'staff', labelEn: 'Kitchen / Bar', labelAr: 'المطبخ / البار', tabs: ['daily'] },
  { id: 'manager', labelEn: 'Restaurant Manager', labelAr: 'مدير المطعم', tabs: ['periodic', 'daily', 'shortages'] },
  { id: 'cost_office', labelEn: 'Cost Control Office', labelAr: 'مكتب مراقبة التكاليف', tabs: ['daily', 'periodic', 'history', 'shortages'] },
  { id: 'cost_control', labelEn: 'Cost Control Manager', labelAr: 'مدير مراقبة التكاليف', tabs: ['daily', 'periodic', 'history', 'shortages'] },
  { id: 'owner', labelEn: 'Owner · Lyudmyla', labelAr: 'المالكة · ليودميلا', tabs: ['periodic', 'history', 'shortages'] },
]

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...INITIAL_STATE, ...parsed, posterSnapshot: INITIAL_STATE.posterSnapshot }
    }
  } catch (e) {
    // ignore
  }
  return INITIAL_STATE
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [branchId, setBranchId] = useState('boho')
  const [roleId, setRoleId] = useState('owner')
  const [lang, setLang] = useState('en')
  const [activeTab, setActiveTab] = useState('periodic')
  const [toast, setToast] = useState(null)

  const role = SIMPLE_ROLES.find((r) => r.id === roleId) || SIMPLE_ROLES[0]
  const branch = BRANCHES.find((b) => b.id === branchId) || BRANCHES[0]
  const branchTitle = lang === 'ar' ? branch.nameAr : branch.name
  const isAr = lang === 'ar'

  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr'
    document.documentElement.lang = isAr ? 'ar' : 'en'
  }, [isAr])

  useEffect(() => {
    try {
      const { posterSnapshot, ...rest } = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    } catch (e) {
      // ignore
    }
  }, [state])

  useEffect(() => {
    if (!role.tabs.includes(activeTab)) {
      setActiveTab(role.tabs[0])
    }
  }, [roleId, role.tabs, activeTab])

  const notify = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  // Poster-linked stock lookup for the selected restaurant
  const stockOptions = useMemo(() => {
    const posterItems = state.posterSnapshot?.branches?.[branchId]?.items || []
    return [
      ...CURATED_CATALOG.map((c) => ({
        name: c.name,
        nameAr: c.nameAr,
        stock: c.posterStock[branchId] ?? 0,
        unit: c.unit,
        price: c.lastPaidPoster || 0,
      })),
      ...posterItems.slice(0, 60).map((p) => ({
        name: p.name,
        nameAr: p.name,
        stock: p.poster_stock,
        unit: p.unit,
        price: p.prime_cost || 0,
      })),
    ]
  }, [state.posterSnapshot, branchId])

  const findStock = (name) => {
    const q = (name || '').trim().toLowerCase()
    if (!q) return '—'
    const found = stockOptions.find((s) => s.name.toLowerCase() === q || s.nameAr === name.trim())
    return found ? `${found.stock} ${found.unit}` : '0 (Not in Poster)'
  }

  // ============ DAILY STATE ============
  const [dailyPhones, setDailyPhones] = useState(() => ({
    manager: localStorage.getItem('lc_daily_ph_mgr') || '',
    office: localStorage.getItem('lc_daily_ph_office') || '',
    costMgr: localStorage.getItem('lc_daily_ph_cost') || '',
  }))
  const [dailyDate, setDailyDate] = useState('2026-11-22')
  const [dailyDept, setDailyDept] = useState('Kitchen')
  const [dailyRequester, setDailyRequester] = useState('Kitchen / Bar Lead')
  const [dailyRows, setDailyRows] = useState([
    { name: 'Tomatoes', qty: '10', notes: 'Fresh' },
    { name: 'Chicken breast', qty: '8', notes: 'Boneless' },
  ])

  const saveDailyPhones = () => {
    localStorage.setItem('lc_daily_ph_mgr', dailyPhones.manager)
    localStorage.setItem('lc_daily_ph_office', dailyPhones.office)
    localStorage.setItem('lc_daily_ph_cost', dailyPhones.costMgr)
    notify(isAr ? '✅ تم حفظ أرقام اليومي' : '✅ Daily WhatsApp numbers saved')
  }

  const clearDailyPhones = () => {
    setDailyPhones({ manager: '', office: '', costMgr: '' })
    localStorage.removeItem('lc_daily_ph_mgr')
    localStorage.removeItem('lc_daily_ph_office')
    localStorage.removeItem('lc_daily_ph_cost')
    notify(isAr ? '🗑️ تم مسح أرقام اليومي' : '🗑️ Daily numbers cleared')
  }

  const sendWhatsApp = (phone, msg) => {
    const clean = (phone || '').replace(/[^0-9]/g, '')
    if (!clean) {
      alert(isAr ? 'اكتب رقم الواتساب الأول واضغط حفظ' : 'Please enter and save the WhatsApp number first.')
      return
    }
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const submitDaily = () => {
    const items = dailyRows
      .filter((r) => r.name.trim() && Number(r.qty) > 0)
      .map((r) => ({
        name: r.name.trim(),
        stock: findStock(r.name),
        unit: '',
        qty: Number(r.qty),
        notes: r.notes,
      }))
    if (items.length === 0) return
    const id = `DR-${202 + state.dailyRequests.length}`
    setState((prev) => ({
      ...prev,
      dailyRequests: [
        {
          id,
          branchId,
          date: dailyDate,
          department: dailyDept,
          requestedBy: dailyRequester,
          sentTo: 'Cost Control (WhatsApp)',
          status: 'Sent to Cost Control',
          items,
        },
        ...prev.dailyRequests,
      ],
    }))
    notify(isAr ? `تم حفظ الطلب اليومي ${id}` : `Daily Request ${id} saved to history`)
  }

  // ============ PERIODIC STATE ============
  const [perPhones, setPerPhones] = useState(() => ({
    manager: localStorage.getItem('lc_per_ph_mgr') || '',
    cost: localStorage.getItem('lc_per_ph_cost') || '',
    owner: localStorage.getItem('lc_per_ph_owner') || '',
  }))
  const [perReqNo, setPerReqNo] = useState(`PER-00${state.periodicRequests.length + 1}`)
  const [perDate, setPerDate] = useState('2026-11-22')
  const [perDept, setPerDept] = useState('Restaurant')
  const [perRows, setPerRows] = useState([
    { name: 'Dinner plate 27 cm', specs: 'TW-027 Porcelain', category: 'China', qty: '15', price: '150' },
    { name: 'Nachos Skillet', specs: 'Cast iron', category: 'Kitchen Tools', qty: '10', price: '320' },
  ])

  const branchPeriodic = state.periodicRequests.filter((p) => p.branchId === branchId)
  const [selectedPerId, setSelectedPerId] = useState(branchPeriodic[0]?.id || state.periodicRequests[0]?.id)
  const activePer = state.periodicRequests.find((p) => p.id === selectedPerId && p.branchId === branchId) || branchPeriodic[0]

  const [stepInputs, setStepInputs] = useState({
    1: { name: '', sig: '', notes: '' },
    2: { name: '', sig: '', notes: '' },
    3: { name: '', sig: '', notes: '' },
  })

  const savePerPhones = () => {
    localStorage.setItem('lc_per_ph_mgr', perPhones.manager)
    localStorage.setItem('lc_per_ph_cost', perPhones.cost)
    localStorage.setItem('lc_per_ph_owner', perPhones.owner)
    notify(isAr ? '✅ تم حفظ أرقام الدوري' : '✅ Periodic WhatsApp numbers saved')
  }

  const clearPerPhones = () => {
    setPerPhones({ manager: '', cost: '', owner: '' })
    localStorage.removeItem('lc_per_ph_mgr')
    localStorage.removeItem('lc_per_ph_cost')
    localStorage.removeItem('lc_per_ph_owner')
    notify(isAr ? '🗑️ تم مسح أرقام الدوري' : '🗑️ Periodic numbers cleared')
  }

  const savePeriodic = () => {
    const items = perRows
      .filter((r) => r.name.trim() && Number(r.qty) > 0)
      .map((r) => ({ ...r, stock: findStock(r.name), qty: Number(r.qty), price: Number(r.price || 0) }))
    if (items.length === 0) return
    const newId = perReqNo.trim() || `PER-00${state.periodicRequests.length + 1}`
    setState((prev) => ({
      ...prev,
      periodicRequests: [
        {
          id: newId,
          branchId,
          date: perDate,
          department: perDept,
          status: 'Waiting Restaurant Manager',
          step1: { approved: false, name: '', sig: '', time: '' },
          step2: { approved: false, name: '', sig: '', time: '' },
          step3: { approved: false, name: '', sig: '', time: '' },
          items,
        },
        ...prev.periodicRequests,
      ],
    }))
    setSelectedPerId(newId)
    notify(isAr ? `تم حفظ طلب الدوري ${newId}` : `Periodic Request ${newId} saved`)
  }

  const approvePeriodicStep = (stepNum) => {
    if (!activePer) return
    const inp = stepInputs[stepNum]
    if (!inp.name.trim() || !inp.sig.trim()) {
      alert(isAr ? 'اكتب الاسم والتوقيع الأول' : 'Please enter Name and Signature first.')
      return
    }
    const time = new Date().toTimeString().slice(0, 5)
    setState((prev) => ({
      ...prev,
      periodicRequests: prev.periodicRequests.map((p) => {
        if (p.id !== activePer.id) return p
        const next = { ...p }
        if (stepNum === 1) {
          next.step1 = { approved: true, name: inp.name.trim(), sig: inp.sig.trim(), notes: inp.notes, time }
          next.status = 'Waiting Cost Control'
        } else if (stepNum === 2) {
          next.step2 = { approved: true, name: inp.name.trim(), sig: inp.sig.trim(), notes: inp.notes, time }
          next.status = 'Waiting Owner Final Approval'
        } else if (stepNum === 3) {
          next.step3 = { approved: true, name: inp.name.trim(), sig: inp.sig.trim(), notes: inp.notes, time }
          next.status = 'Fully Approved'
        }
        return next
      }),
    }))
    notify(isAr ? `✅ تم اعتماد المرحلة ${stepNum}` : `✅ Step ${stepNum} approved`)
  }

  const rejectPeriodicStep = (stepNum) => {
    if (!activePer) return
    const inp = stepInputs[stepNum]
    const reason = inp.notes?.trim() || (isAr ? 'مرفوض' : 'Rejected')
    const time = new Date().toTimeString().slice(0, 5)
    setState((prev) => ({
      ...prev,
      periodicRequests: prev.periodicRequests.map((p) => {
        if (p.id !== activePer.id) return p
        const next = { ...p }
        next.status = stepNum === 3 ? `Rejected by Owner (${reason})` : `Rejected by Cost Control (${reason})`
        if (stepNum === 2) {
          next.step2 = { approved: false, rejected: true, name: inp.name.trim() || 'Cost Control', notes: reason, time }
        }
        if (stepNum === 3) {
          next.step3 = { approved: false, rejected: true, name: inp.name.trim() || 'Owner', notes: reason, time }
        }
        return next
      }),
    }))
    notify(isAr ? `❌ تم رفض الطلب ${activePer.id}` : `❌ ${activePer.id} rejected`)
  }

  const approveDailyRequest = (dailyId, actionType) => {
    setState((prev) => ({
      ...prev,
      dailyRequests: prev.dailyRequests.map((d) =>
        d.id !== dailyId
          ? d
          : {
              ...d,
              status:
                actionType === 'office_ack'
                  ? 'Reviewed by Cost Control Office'
                  : actionType === 'office_fwd'
                  ? 'Forwarded to Cost Control Manager'
                  : actionType === 'office'
                  ? 'Sent to Cost Control Manager Office'
                  : 'Approved by Cost Control Manager',
            }
      ),
    }))
    notify(
      actionType === 'office_ack'
        ? `👁️ ${dailyId} marked reviewed by Cost Control Office`
        : actionType === 'office_fwd'
        ? `✅ ${dailyId} forwarded to Cost Control Manager`
        : actionType === 'office'
        ? `📱 ${dailyId} sent to Cost Control Manager Office`
        : `✅ ${dailyId} approved by Cost Control Manager`
    )
  }

  // ============ HISTORY ============
  const [historyFilter, setHistoryFilter] = useState('All')

  const resolveShortage = (id) => {
    setState((prev) => ({
      ...prev,
      discrepancies: prev.discrepancies.map((d) => (d.id === id ? { ...d, status: 'Closed' } : d)),
    }))
    notify(`${id} resolved`)
  }

  const periodicTotal = perRows.reduce((s, r) => s + Number(r.qty || 0) * Number(r.price || 0), 0)
  const branchShortages = state.discrepancies.filter((d) => d.branchId === branchId)

  return (
    <div className="wa-container">
      {/* Dark Green Header */}
      <header className="wa-header">
        <h1>طلب شراء للمطاعم | Purchase Request</h1>
        <p>الاعتماد بيروح واتساب · WhatsApp Approval Flow · Poster Stock Linked</p>
      </header>

      {/* Compact Top Controls Bar (No Sidebar!) */}
      <div className="wa-controls-bar">
        <div className="wa-control-group">
          <div className="wa-pill-select">
            <span>🏪 {isAr ? 'المطعم:' : 'Restaurant:'}</span>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {isAr ? b.nameAr : b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="wa-pill-select">
            <span>👤 {isAr ? 'الدور:' : 'Role:'}</span>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              {SIMPLE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {isAr ? r.labelAr : r.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="wa-control-group">
          <button className={`wa-lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
            EN
          </button>
          <button className={`wa-lang-btn ${lang === 'ar' ? 'active' : ''}`} onClick={() => setLang('ar')}>
            مصري
          </button>
          <button
            className="wa-btn ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY)
              setState(INITIAL_STATE)
              notify('Reset done')
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Horizontal Top Tabs */}
      <div className="wa-tabs">
        {role.tabs.includes('daily') && (
          <button className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}>
            🥬 {isAr ? 'طلب يومي | Daily' : 'Daily Request'}
            <small>{isAr ? 'خضار - فاكهة - ستوك يومي (Kitchen / Bar / Cost Control)' : 'Kitchen · Bar · Cost Control Office & Manager (No Owner)'}</small>
          </button>
        )}
        {role.tabs.includes('periodic') && (
          <button className={activeTab === 'periodic' ? 'active' : ''} onClick={() => setActiveTab('periodic')}>
            🍽️ {isAr ? 'مشتريات دورية | Periodic' : 'Periodic Purchases'}
            <small>{isAr ? 'China · Glass · Silver · معدات (Manager / Cost Control / Owner)' : 'Manager · Cost Control Manager · Owner'}</small>
          </button>
        )}
        {role.tabs.includes('history') && (
          <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
            📋 {isAr ? 'سجل اليومي والدوري' : 'Daily & Periodic History'}
            <small>{isAr ? `كل طلبات ${branchTitle}` : `All orders for ${branchTitle}`}</small>
          </button>
        )}
        {role.tabs.includes('shortages') && (
          <button className={activeTab === 'shortages' ? 'active' : ''} onClick={() => setActiveTab('shortages')}>
            ⚠️ {isAr ? 'وصل أقل من المطلوب (النواقص)' : 'Shortages (Arrived Less)'}
            <small>{branchShortages.filter((s) => s.status !== 'Closed').length} open</small>
          </button>
        )}
      </div>

      {/* Main Content Body */}
      <div className="wa-body">
        {/* ================= TAB 1: DAILY ================= */}
        {activeTab === 'daily' && (
          <div>
            <h2 style={{ marginTop: 0 }}>🥬 {isAr ? `طلب يومي · ${branchTitle}` : `Daily Purchase Request · ${branchTitle}`}</h2>

            {/* Cost Control Manager & Cost Control Office: REVIEW / APPROVE ONLY (NO ORDER CREATION!) */}
            {(roleId === 'cost_control' || roleId === 'cost_office') ? (
              <div className="wa-settings" style={{ background: '#f5f7f4', borderColor: '#0f3d2e' }}>
                <h3>
                  {roleId === 'cost_office'
                    ? (isAr ? '👁️ مراجعة مكتب مراقبة التكاليف (للاطلاع أو الاعتماد فقط — بدون إنشاء طلبات)' : '👁️ Cost Control Office — Review & Acknowledge Daily Orders (No Ordering)')
                    : (isAr ? '✅ مراجعة مدير مراقبة التكاليف (للاطلاع أو الاعتماد فقط — بدون إنشاء طلبات)' : '✅ Cost Control Manager — Review & Approve Daily Orders (No Ordering)')}
                </h3>
                <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>
                  {isAr
                    ? 'هنا بتشوف الطلبات اللي بعتها المطبخ أو البار أو مدير المطعم مع الكمية الموجودة في بوستر.'
                    : 'Orders submitted by Kitchen, Bar, or Restaurant Manager with current Poster stock shown per item.'}
                </p>
                <div className="wa-table-wrap" style={{ marginTop: 8 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID / Date</th>
                        <th>From (Dept)</th>
                        <th>Ordered Items & Current Poster Stock</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.dailyRequests
                        .filter((d) => d.branchId === branchId)
                        .map((d) => (
                          <tr key={d.id}>
                            <td><strong>{d.id}</strong><div style={{ fontSize: 12, color: '#666' }}>{d.date}</div></td>
                            <td>{d.department}<div style={{ fontSize: 12, color: '#666' }}>{d.requestedBy}</div></td>
                            <td>
                              {d.items.map((i, idx) => (
                                <div key={idx} style={{ marginBottom: 3 }}>
                                  <strong>{i.name}</strong>: Order <strong>{i.qty}</strong> ·{' '}
                                  <span className="wa-badge green">In Stock: {i.stock}</span>
                                </div>
                              ))}
                            </td>
                            <td><span className={`wa-badge ${d.status.includes('Approved') || d.status.includes('Reviewed') ? 'green' : 'amber'}`}>{d.status}</span></td>
                            <td>
                              {roleId === 'cost_office' ? (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  <button
                                    className="wa-btn ghost"
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => approveDailyRequest(d.id, 'office_ack')}
                                  >
                                    👁️ Acknowledge
                                  </button>
                                  <button
                                    className="wa-btn whatsapp"
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => {
                                      approveDailyRequest(d.id, 'office_fwd')
                                      const text = `🥬 Daily Request ${d.id} (${branchTitle} - ${d.department})\n${d.items.map((i) => `- ${i.name}: ${i.qty} (Stock: ${i.stock})`).join('\n')}`
                                      if (dailyPhones.costMgr) sendWhatsApp(dailyPhones.costMgr, text)
                                    }}
                                  >
                                    📱 Forward to Cost Control Manager
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  <button
                                    className="wa-btn"
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => approveDailyRequest(d.id, 'approve')}
                                  >
                                    ✅ Approve
                                  </button>
                                  <button
                                    className="wa-btn whatsapp"
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => {
                                      approveDailyRequest(d.id, 'office')
                                      const text = `🥬 Daily Request ${d.id} (${branchTitle} - ${d.department})\n${d.items.map((i) => `- ${i.name}: ${i.qty} (Stock: ${i.stock})`).join('\n')}`
                                      if (dailyPhones.office) sendWhatsApp(dailyPhones.office, text)
                                    }}
                                  >
                                    📱 Send to Cost Control Manager Office
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* Poster Stock Preview BEFORE Ordering (Kitchen / Bar / Manager) */}
                <div className="wa-settings" style={{ background: '#f5f7f4', borderColor: '#0f3d2e' }}>
                  <h3>📦 {isAr ? `الموجود حالياً في مخزن ${branchTitle} (Poster) قبل الطلب` : `Current Poster Stock in ${branchTitle} (Check Before Ordering)`}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {stockOptions.slice(0, 10).map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="wa-btn ghost"
                        style={{ padding: '6px 10px', fontSize: 12, background: '#fff', border: '1px solid #d5d1c8' }}
                        onClick={() => {
                          setDailyRows((p) => [...p, { name: s.name, qty: '1', notes: '' }])
                          notify(`Added ${s.name} (Stock: ${s.stock} ${s.unit})`)
                        }}
                      >
                        + {s.name}: <strong style={{ color: '#0f3d2e' }}>{s.stock} {s.unit}</strong>
                      </button>
                    ))}
                  </div>
                </div>

            <div className="wa-settings">
              <h3>📱 {isAr ? 'أرقام الطلب اليومي - Daily Only (من غير Owner)' : 'Daily WhatsApp Numbers (No Owner in Daily)'}</h3>
              <div className="wa-grid">
                <div className="wa-field">
                  <label>1. Manager / Executive Chef WhatsApp</label>
                  <input placeholder="2010xxxxxxxx" value={dailyPhones.manager} onChange={(e) => setDailyPhones((p) => ({ ...p, manager: e.target.value }))} />
                </div>
                <div className="wa-field">
                  <label>2. Cost Control Office WhatsApp</label>
                  <input placeholder="2010xxxxxxxx" value={dailyPhones.office} onChange={(e) => setDailyPhones((p) => ({ ...p, office: e.target.value }))} />
                </div>
                <div className="wa-field">
                  <label>3. Cost Control Manager WhatsApp</label>
                  <input placeholder="2010xxxxxxxx" value={dailyPhones.costMgr} onChange={(e) => setDailyPhones((p) => ({ ...p, costMgr: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="wa-btn whatsapp" onClick={saveDailyPhones}>💾 {isAr ? 'حفظ أرقام اليومي' : 'Save Daily Numbers'}</button>
                <button className="wa-btn ghost" onClick={clearDailyPhones}>🗑️ {isAr ? 'مسح الأرقام' : 'Clear Numbers'}</button>
              </div>
            </div>

            <div className="wa-grid">
              <div className="wa-field">
                <label>{isAr ? 'التاريخ / Date' : 'Date'}</label>
                <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
              </div>
              <div className="wa-field">
                <label>{isAr ? 'القسم / Department' : 'Department'}</label>
                <select value={dailyDept} onChange={(e) => setDailyDept(e.target.value)}>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Bar">Bar</option>
                </select>
              </div>
              <div className="wa-field">
                <label>{isAr ? 'اسم الطالب / Requested By' : 'Requested By'}</label>
                <input value={dailyRequester} onChange={(e) => setDailyRequester(e.target.value)} />
              </div>
            </div>

            <div className="wa-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{isAr ? 'اسم الصنف / Item' : 'Item Name'}</th>
                    <th>{isAr ? 'الموجود في بوستر / Poster Stock' : 'In Stock (Poster)'}</th>
                    <th>{isAr ? 'الكمية المطلوبة / Order Qty' : 'Order Qty'}</th>
                    <th>{isAr ? 'ملاحظات / Notes' : 'Notes'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <input
                          list="poster-stock-datalist"
                          placeholder="e.g. Tomatoes"
                          value={row.name}
                          onChange={(e) => setDailyRows((p) => p.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))}
                        />
                      </td>
                      <td>
                        <span className="wa-badge green">{findStock(row.name)}</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={row.qty}
                          onChange={(e) => setDailyRows((p) => p.map((r, i) => (i === idx ? { ...r, qty: e.target.value } : r)))}
                        />
                      </td>
                      <td>
                        <input
                          placeholder="Optional"
                          value={row.notes}
                          onChange={(e) => setDailyRows((p) => p.map((r, i) => (i === idx ? { ...r, notes: e.target.value } : r)))}
                        />
                      </td>
                      <td>
                        <button className="wa-btn ghost" style={{ padding: '6px 10px' }} onClick={() => setDailyRows((p) => p.filter((_, i) => i !== idx))}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <datalist id="poster-stock-datalist">
              {stockOptions.map((s, i) => (
                <option key={i} value={s.name}>{s.name} (Stock: {s.stock} {s.unit})</option>
              ))}
            </datalist>

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="wa-btn" onClick={() => setDailyRows((p) => [...p, { name: '', qty: '', notes: '' }])}>
                + {isAr ? 'إضافة صنف' : 'Add Item'}
              </button>
              <button className="wa-btn" onClick={submitDaily}>
                ✅ {isAr ? 'حفظ الطلب في السجل' : 'Save Daily Request'}
              </button>
            </div>

            <div className="wa-box">
              <b>📱 {isAr ? 'ابعت الطلب اليومي واتساب:' : 'Send Daily Request on WhatsApp:'}</b>
              <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="wa-btn whatsapp"
                  onClick={() => {
                    const lines = dailyRows
                      .filter((r) => r.name && r.qty)
                      .map((r) => `- ${r.name} | Stock: ${findStock(r.name)} | Order: ${r.qty} ${r.notes ? `(${r.notes})` : ''}`)
                      .join('\n')
                    sendWhatsApp(dailyPhones.office, `🥬 Daily Request\nRestaurant: ${branchTitle} (${dailyDept})\nBy: ${dailyRequester}\nDate: ${dailyDate}\n\n${lines}`)
                  }}
                >
                  📱 1 - {isAr ? 'ابعت لمكتب Cost Control' : 'Send to Cost Control Office'}
                </button>
                <button
                  className="wa-btn whatsapp"
                  onClick={() => {
                    const lines = dailyRows
                      .filter((r) => r.name && r.qty)
                      .map((r) => `- ${r.name} | Stock: ${findStock(r.name)} | Order: ${r.qty}`)
                      .join('\n')
                    sendWhatsApp(dailyPhones.costMgr, `🥬 Daily Request\nRestaurant: ${branchTitle} (${dailyDept})\nBy: ${dailyRequester}\n\n${lines}`)
                  }}
                >
                  📱 2 - {isAr ? 'ابعت لمدير Cost Control' : 'Send to Cost Control Manager'}
                </button>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* ================= TAB 2: PERIODIC ================= */}
        {activeTab === 'periodic' && (
          <div>
            <h2 style={{ marginTop: 0 }}>
              🍽️ {isAr ? `مشتريات دورية · ${branchTitle}` : `Periodic Purchases · ${branchTitle}`}
              <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginTop: 4 }}>
                China · Glass · Silver · Kitchen & Bar Tools · Small Equipment · Spare Parts
              </div>
            </h2>

            <div className="wa-settings">
              <h3>📱 {isAr ? 'أرقام الواتساب - الدوري فقط | Periodic Only' : 'Periodic WhatsApp Numbers (Manager, Cost Control, Owner)'}</h3>
              <div className="wa-grid">
                <div className="wa-field">
                  <label>1. Restaurant Manager WhatsApp</label>
                  <input placeholder="2010xxxxxxxx" value={perPhones.manager} onChange={(e) => setPerPhones((p) => ({ ...p, manager: e.target.value }))} />
                </div>
                <div className="wa-field">
                  <label>2. Cost Control WhatsApp</label>
                  <input placeholder="2010xxxxxxxx" value={perPhones.cost} onChange={(e) => setPerPhones((p) => ({ ...p, cost: e.target.value }))} />
                </div>
                <div className="wa-field">
                  <label>3. Owner / Lyudmyla WhatsApp</label>
                  <input placeholder="2010xxxxxxxx" value={perPhones.owner} onChange={(e) => setPerPhones((p) => ({ ...p, owner: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="wa-btn whatsapp" onClick={savePerPhones}>💾 {isAr ? 'حفظ أرقام الدوري' : 'Save Periodic Numbers'}</button>
                <button className="wa-btn ghost" onClick={clearPerPhones}>🗑️ {isAr ? 'مسح الأرقام' : 'Clear Numbers'}</button>
              </div>
            </div>

            {roleId === 'manager' && (
              <>
                <div className="wa-settings" style={{ background: '#f5f7f4', borderColor: '#0f3d2e' }}>
                  <h3>📦 {isAr ? `الموجود حالياً في ${branchTitle} (Poster) قبل الطلب الدوري` : `Current Poster Stock in ${branchTitle} (Check Before Ordering)`}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {CURATED_CATALOG.filter((c) => c.category === 'Non-food').slice(0, 10).map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="wa-btn ghost"
                        style={{ padding: '6px 10px', fontSize: 12, background: '#fff', border: '1px solid #d5d1c8' }}
                        onClick={() => {
                          setPerRows((p) => [...p, { name: s.name, specs: s.spec, category: s.subType || 'China', qty: '1', price: String(s.lastPaidPoster || 0) }])
                          notify(`Added ${s.name} (Stock: ${s.posterStock[branchId] ?? 0} ${s.unit})`)
                        }}
                      >
                        + {s.name}: <strong style={{ color: '#0f3d2e' }}>{s.posterStock[branchId] ?? 0} {s.unit}</strong>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="wa-grid">
                  <div className="wa-field">
                    <label>Request No.</label>
                    <input value={perReqNo} onChange={(e) => setPerReqNo(e.target.value)} />
                  </div>
                  <div className="wa-field">
                    <label>Date</label>
                    <input type="date" value={perDate} onChange={(e) => setPerDate(e.target.value)} />
                  </div>
                  <div className="wa-field">
                    <label>Department</label>
                    <select value={perDept} onChange={(e) => setPerDept(e.target.value)}>
                      <option>Restaurant</option>
                      <option>Kitchen</option>
                      <option>Bar</option>
                      <option>Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="wa-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Specs</th>
                        <th>Category</th>
                        <th>In Stock (Poster)</th>
                        <th>Qty</th>
                        <th>Price (EGP)</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {perRows.map((row, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              list="poster-stock-datalist"
                              value={row.name}
                              onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))}
                            />
                          </td>
                          <td>
                            <input value={row.specs} onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, specs: e.target.value } : r)))} />
                          </td>
                          <td>
                            <select value={row.category} onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, category: e.target.value } : r)))}>
                              <option>China</option>
                              <option>Glass</option>
                              <option>Silver</option>
                              <option>Kitchen Tools</option>
                              <option>Small Equipment</option>
                              <option>Linen & Textiles</option>
                              <option>Spare Parts</option>
                            </select>
                          </td>
                          <td><span className="wa-badge green">{findStock(row.name)}</span></td>
                          <td><input type="number" value={row.qty} onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, qty: e.target.value } : r)))} /></td>
                          <td><input type="number" value={row.price} onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, price: e.target.value } : r)))} /></td>
                          <td><strong>{(Number(row.qty || 0) * Number(row.price || 0)).toLocaleString()}</strong></td>
                          <td><button className="wa-btn ghost" style={{ padding: '6px 10px' }} onClick={() => setPerRows((p) => p.filter((_, i) => i !== idx))}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="wa-btn" onClick={() => setPerRows((p) => [...p, { name: '', specs: '', category: 'China', qty: '1', price: '0' }])}>
                      + Add Item
                    </button>
                    <button className="wa-btn" onClick={savePeriodic}>
                      ✅ Save Periodic Request
                    </button>
                  </div>
                  <div className="wa-total">Total: {periodicTotal.toLocaleString()} EGP</div>
                </div>
              </>
            )}

            {/* 3-Step Approval Workflow */}
            {activePer && (
              <div style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ margin: 0 }}>WhatsApp Approval Workflow — {activePer.id}</h3>
                  <select className="wa-pill-select" value={activePer.id} onChange={(e) => setSelectedPerId(e.target.value)}>
                    {branchPeriodic.map((p) => (
                      <option key={p.id} value={p.id}>{p.id} · {p.status}</option>
                    ))}
                  </select>
                </div>

                <div style={{ background: '#fff3cd', padding: 12, borderRadius: 10, fontWeight: 700, marginTop: 10 }}>
                  Status: {activePer.status} · Items: {activePer.items.map((i) => `${i.name} (x${i.qty}, Stock: ${i.stock})`).join(' · ')}
                </div>

                {[
                  { num: 1, title: '1 - Restaurant Manager', data: activePer.step1, unlocked: true, canAct: roleId === 'manager', waPhone: perPhones.cost, waLabel: 'Open WhatsApp & Send to Cost Control Manager' },
                  { num: 2, title: '2 - Cost Control Manager', data: activePer.step2, unlocked: activePer.step1.approved, canAct: roleId === 'cost_control', waPhone: perPhones.owner, waLabel: 'Open WhatsApp & Send to Owner' },
                  { num: 3, title: '3 - Owner (Lyudmyla)', data: activePer.step3, unlocked: activePer.step2.approved, canAct: roleId === 'owner', waPhone: perPhones.manager, waLabel: 'Send Final Confirmation to Manager' },
                ].map((st) => (
                  <div key={st.num} className={`wa-approval ${st.data.approved ? 'approved' : !st.unlocked ? 'locked' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <b>{st.title}</b>
                      <span className={`wa-badge ${st.data.approved ? 'green' : st.unlocked ? 'amber' : 'gray'}`}>
                        {st.data.approved ? `✅ Approved - ${st.data.name} (${st.data.time})` : st.unlocked ? 'Pending' : '🔒 Locked'}
                      </span>
                    </div>

                    {!st.data.approved && st.unlocked && st.canAct && (
                      <>
                        <div className="wa-grid">
                          <div className="wa-field">
                            <label>Name</label>
                            <input placeholder="Your name" value={stepInputs[st.num].name} onChange={(e) => setStepInputs((p) => ({ ...p, [st.num]: { ...p[st.num], name: e.target.value } }))} />
                          </div>
                          <div className="wa-field">
                            <label>Signature</label>
                            <input placeholder="Type name as signature" value={stepInputs[st.num].sig} onChange={(e) => setStepInputs((p) => ({ ...p, [st.num]: { ...p[st.num], sig: e.target.value } }))} />
                          </div>
                          <div className="wa-field">
                            <label>Notes</label>
                            <input placeholder="Optional" value={stepInputs[st.num].notes} onChange={(e) => setStepInputs((p) => ({ ...p, [st.num]: { ...p[st.num], notes: e.target.value } }))} />
                          </div>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="wa-btn" onClick={() => approvePeriodicStep(st.num)}>
                            ✅ {st.num === 3 ? (isAr ? 'موافقة نهائية' : 'Confirm / Approve') : 'Approve'}
                          </button>
                          {(st.num === 2 || st.num === 3) && (
                            <button
                              className="wa-btn ghost"
                              style={{ background: '#fee4e2', color: '#b42318' }}
                              onClick={() => rejectPeriodicStep(st.num)}
                            >
                              ❌ {isAr ? 'رفض الطلب' : 'Reject / Decline'}
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {st.data.approved && (
                      <div className="wa-box" style={{ marginTop: 8 }}>
                        <b>✅ Approved — Send on WhatsApp:</b><br /><br />
                        <button
                          className="wa-btn whatsapp"
                          onClick={() =>
                            sendWhatsApp(
                              st.waPhone,
                              `🍽️ Periodic Request ${activePer.id} (${branchTitle})\nApproved by ${st.data.name}\nItems: ${activePer.items.map((i) => `${i.name} x${i.qty}`).join(', ')}`
                            )
                          }
                        >
                          📱 {st.waLabel}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: DAILY & PERIODIC HISTORY ================= */}
        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ margin: 0 }}>📋 {isAr ? `سجل اليومي والدوري · ${branchTitle}` : `Daily & Periodic History · ${branchTitle}`}</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {['All', 'Daily', 'Periodic'].map((f) => (
                  <button
                    key={f}
                    className={`wa-lang-btn ${historyFilter === f ? 'active' : ''}`}
                    onClick={() => setHistoryFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="wa-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>ID / Date</th>
                    <th>Department</th>
                    <th>Items Ordered (with Poster Stock)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...(historyFilter !== 'Periodic'
                      ? state.dailyRequests
                          .filter((d) => d.branchId === branchId)
                          .map((d) => ({
                            type: 'Daily',
                            id: d.id,
                            date: d.date,
                            dept: `${d.department} (${d.requestedBy})`,
                            items: d.items.map((i) => `${i.name}: ${i.qty} (Stock: ${i.stock})`).join(' · '),
                            status: d.status,
                          }))
                      : []),
                    ...(historyFilter !== 'Daily'
                      ? state.periodicRequests
                          .filter((p) => p.branchId === branchId)
                          .map((p) => ({
                            type: 'Periodic',
                            id: p.id,
                            date: p.date,
                            dept: p.department,
                            items: p.items.map((i) => `${i.name}: ${i.qty} (Stock: ${i.stock})`).join(' · '),
                            status: p.status,
                          }))
                      : []),
                  ].map((r) => (
                    <tr key={r.id}>
                      <td><span className={`wa-badge ${r.type === 'Daily' ? 'green' : 'amber'}`}>{r.type}</span></td>
                      <td><strong>{r.id}</strong><div style={{ fontSize: 12, color: '#666' }}>{r.date}</div></td>
                      <td>{r.dept}</td>
                      <td>{r.items}</td>
                      <td><span className={`wa-badge ${r.status.includes('Waiting') ? 'amber' : 'green'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SHORTAGES (ARRIVED LESS - FACTUAL ONLY) ================= */}
        {activeTab === 'shortages' && (
          <div>
            <h2 style={{ marginTop: 0 }}>⚠️ {isAr ? `وصل أقل من المطلوب · ${branchTitle}` : `Arrived Less Than Ordered (Factual) · ${branchTitle}`}</h2>
            <p style={{ color: '#666', fontSize: 13.5, marginTop: 4 }}>
              {isAr
                ? 'عرض فعلي للأصناف التي وصلت بكمية أقل من المطلوب (بدون إدخال يدوي).'
                : 'Factual view of items that actually arrived in a smaller quantity than ordered (no manual entry).'}
            </p>

            <div className="wa-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID / Order</th>
                    <th>Item</th>
                    <th>Ordered</th>
                    <th>Arrived</th>
                    <th>Missing</th>
                    <th>Reason / Action</th>
                    <th>Status</th>
                    {roleId !== 'owner' && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {branchShortages.map((s) => {
                    const missing = Math.max(0, Number((s.expectedQty - s.actualQty).toFixed(3)))
                    return (
                      <tr key={s.id}>
                        <td><strong>{s.id}</strong><div style={{ fontSize: 12, color: '#666' }}>{s.refDoc}</div></td>
                        <td><strong>{s.itemName}</strong></td>
                        <td>{s.expectedQty} {s.unit}</td>
                        <td>{s.actualQty} {s.unit}</td>
                        <td><span className="wa-badge red">−{missing} {s.unit}</span></td>
                        <td>{s.nextAction}</td>
                        <td><span className={`wa-badge ${s.status === 'Closed' ? 'green' : 'amber'}`}>{s.status}</span></td>
                        {roleId !== 'owner' && (
                          <td>
                            {s.status !== 'Closed' && (
                              <button className="wa-btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => resolveShortage(s.id)}>
                                Resolve
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && <div className="wa-toast">{toast}</div>}
    </div>
  )
}
