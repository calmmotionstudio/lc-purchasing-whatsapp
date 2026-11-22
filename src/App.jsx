import React, { useState, useEffect, useMemo } from 'react'
import { INITIAL_STATE, BRANCHES, CURATED_CATALOG } from './data/seedData'

const STORAGE_KEY = 'lc_wa_purchasing_v4'

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

  // Poster-linked stock lookup for Daily Requests
  const stockOptions = useMemo(() => {
    const posterItems = state.posterSnapshot?.branches?.[branchId]?.items || []
    return [
      ...CURATED_CATALOG.map((c) => ({
        name: c.name,
        nameAr: c.nameAr,
        stock: c.posterStock[branchId] ?? 0,
        unit: c.unit,
      })),
      ...posterItems.slice(0, 60).map((p) => ({
        name: p.name,
        nameAr: p.name,
        stock: p.poster_stock,
        unit: p.unit,
      })),
    ]
  }, [state.posterSnapshot, branchId])

  const findStock = (name) => {
    const q = (name || '').trim().toLowerCase()
    if (!q) return '—'
    const found = stockOptions.find((s) => s.name.toLowerCase() === q || s.nameAr === name.trim())
    return found ? `${found.stock} ${found.unit}` : '0 (Not in Poster)'
  }

  // ============ WHATSAPP NUMBERS ============
  const [waPhones, setWaPhones] = useState(() => ({
    office: localStorage.getItem('lc_wa_office') || '',
    costMgr: localStorage.getItem('lc_wa_costmgr') || '',
    owner: localStorage.getItem('lc_wa_owner') || '',
  }))

  const saveWaPhones = () => {
    localStorage.setItem('lc_wa_office', waPhones.office)
    localStorage.setItem('lc_wa_costmgr', waPhones.costMgr)
    localStorage.setItem('lc_wa_owner', waPhones.owner)
    notify(isAr ? '✅ تم حفظ أرقام الواتساب' : '✅ WhatsApp numbers saved')
  }

  const clearWaPhones = () => {
    setWaPhones({ office: '', costMgr: '', owner: '' })
    localStorage.removeItem('lc_wa_office')
    localStorage.removeItem('lc_wa_costmgr')
    localStorage.removeItem('lc_wa_owner')
    notify(isAr ? '🗑️ تم مسح الأرقام' : '🗑️ Numbers cleared')
  }

  const sendWhatsApp = (phone, msg) => {
    const clean = (phone || '').replace(/[^0-9]/g, '')
    if (!clean) {
      alert(isAr ? 'اكتب رقم الواتساب الأول واضغط حفظ' : 'Please enter and save the WhatsApp number first.')
      return
    }
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // ============ DAILY STATE ============
  const [dailyDate, setDailyDate] = useState('2026-11-22')
  const [dailyDept, setDailyDept] = useState('Kitchen')
  const [dailyRequester, setDailyRequester] = useState('Kitchen / Bar Lead')
  const [dailyRows, setDailyRows] = useState([
    { name: 'Tomatoes', qty: '10', notes: 'Fresh' },
    { name: 'Chicken breast', qty: '8', notes: 'Boneless' },
  ])

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
          sentTo: 'Cost Control Office (WhatsApp)',
          status: 'Waiting Cost Control Office',
          items,
        },
        ...prev.dailyRequests,
      ],
    }))
    notify(isAr ? `تم إرسال الطلب اليومي ${id} لمكتب Cost Control` : `Daily Request ${id} sent to Cost Control Office`)
  }

  const approveDailyByOffice = (dailyId) => {
    setState((prev) => ({
      ...prev,
      dailyRequests: prev.dailyRequests.map((d) =>
        d.id !== dailyId ? d : { ...d, status: 'Approved by Cost Control Office' }
      ),
    }))
    notify(`✅ ${dailyId} approved by Cost Control Office`)
  }

  // ============ PERIODIC STATE (NO PRICES, MANUAL INVENTORY FIRST -> NEED TO ORDER) ============
  const [perReqNo, setPerReqNo] = useState(`PER-00${state.periodicRequests.length + 1}`)
  const [perDate, setPerDate] = useState('2026-11-22')
  const [perDept, setPerDept] = useState('Restaurant')
  const [perRows, setPerRows] = useState([
    { name: 'Dinner plate 27 cm', specs: 'TW-027 Porcelain', category: 'China', inventory: '130', qty: '15' },
    { name: 'Nachos Skillet', specs: 'Cast iron', category: 'Kitchen Tools', inventory: '8', qty: '10' },
  ])

  const branchPeriodic = state.periodicRequests.filter((p) => p.branchId === branchId)
  const [selectedPerId, setSelectedPerId] = useState(branchPeriodic[0]?.id || state.periodicRequests[0]?.id)
  const activePer = state.periodicRequests.find((p) => p.id === selectedPerId && p.branchId === branchId) || branchPeriodic[0]

  const [stepInputs, setStepInputs] = useState({
    1: { name: '', sig: '', notes: '' },
    2: { name: '', sig: '', notes: '' },
    3: { name: '', sig: '', notes: '' },
  })

  const savePeriodic = () => {
    const items = perRows
      .filter((r) => r.name.trim() && Number(r.qty) > 0)
      .map((r) => ({
        name: r.name.trim(),
        specs: r.specs,
        category: r.category,
        inventory: Number(r.inventory || 0),
        qty: Number(r.qty),
      }))
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
          next.status = 'Waiting Cost Control Manager'
        } else if (stepNum === 2) {
          next.step2 = { approved: true, name: inp.name.trim(), sig: inp.sig.trim(), notes: inp.notes, time }
          next.status = 'Approved by Cost Control Manager (Sent to Office / Owner)'
        } else if (stepNum === 3) {
          next.step3 = { approved: true, name: inp.name.trim(), sig: inp.sig.trim(), notes: inp.notes, time }
          next.status = 'Fully Approved by Owner'
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
        next.status = stepNum === 3 ? `Rejected by Owner (${reason})` : `Rejected by Cost Control Manager (${reason})`
        if (stepNum === 2) {
          next.step2 = { approved: false, rejected: true, name: inp.name.trim() || 'Cost Control Manager', notes: reason, time }
        }
        if (stepNum === 3) {
          next.step3 = { approved: false, rejected: true, name: inp.name.trim() || 'Owner', notes: reason, time }
        }
        return next
      }),
    }))
    notify(isAr ? `❌ تم رفض الطلب ${activePer.id}` : `❌ ${activePer.id} rejected`)
  }

  const [historyFilter, setHistoryFilter] = useState('All')
  const branchShortages = state.discrepancies.filter((d) => d.branchId === branchId)

  return (
    <div className="wa-container">
      {/* Dark Green Header — removed للمطاعم */}
      <header className="wa-header">
        <h1>طلب شراء | Purchase Request</h1>
        <p>الاعتماد بيروح واتساب · WhatsApp Approval Flow</p>
      </header>

      {/* Top Controls Bar */}
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
            <small>{isAr ? 'خضار - فاكهة - ستوك يومي' : 'Kitchen · Bar · Cost Control Office (Info for Manager)'}</small>
          </button>
        )}
        {role.tabs.includes('periodic') && (
          <button className={activeTab === 'periodic' ? 'active' : ''} onClick={() => setActiveTab('periodic')}>
            🍽️ {isAr ? 'مشتريات دورية | Periodic' : 'Periodic Purchases'}
            <small>{isAr ? 'China · Glass · Silver · معدات' : 'Manager → Cost Control Manager → Office / Owner'}</small>
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
            <small>{branchShortages.filter((s) => s.status === 'Pending' || s.status === 'Open').length} pending</small>
          </button>
        )}
      </div>

      {/* Main Content Body */}
      <div className="wa-body">
        {/* ================= TAB 1: DAILY ================= */}
        {activeTab === 'daily' && (
          <div>
            <h2 style={{ marginTop: 0 }}>🥬 {isAr ? `طلب يومي · ${branchTitle}` : `Daily Purchase Request · ${branchTitle}`}</h2>

            {/* WhatsApp Numbers Box (Hidden for Owner) */}
            {roleId !== 'owner' && (
              <div className="wa-settings">
                <h3>📱 {isAr ? 'أرقام الواتساب (الطلب اليومي)' : 'Daily WhatsApp Numbers'}</h3>
                <div className="wa-grid">
                  <div className="wa-field">
                    <label>Cost Control Office WhatsApp</label>
                    <input placeholder="2010xxxxxxxx" value={waPhones.office} onChange={(e) => setWaPhones((p) => ({ ...p, office: e.target.value }))} />
                  </div>
                  {(roleId === 'cost_office' || roleId === 'cost_control') && (
                    <>
                      <div className="wa-field">
                        <label>Cost Control Manager WhatsApp</label>
                        <input placeholder="2010xxxxxxxx" value={waPhones.costMgr} onChange={(e) => setWaPhones((p) => ({ ...p, costMgr: e.target.value }))} />
                      </div>
                      <div className="wa-field">
                        <label>Owner WhatsApp (Rare Cases)</label>
                        <input placeholder="2010xxxxxxxx" value={waPhones.owner} onChange={(e) => setWaPhones((p) => ({ ...p, owner: e.target.value }))} />
                      </div>
                    </>
                  )}
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="wa-btn whatsapp" onClick={saveWaPhones}>💾 {isAr ? 'حفظ الأرقام' : 'Save Numbers'}</button>
                  <button className="wa-btn ghost" onClick={clearWaPhones}>🗑️ {isAr ? 'مسح' : 'Clear'}</button>
                </div>
              </div>
            )}

            {/* COST CONTROL OFFICE: Approve Daily OR send to Cost Control Manager / Owner (rare) */}
            {roleId === 'cost_office' && (
              <div className="wa-settings" style={{ background: '#f5f7f4', borderColor: '#0f3d2e' }}>
                <h3>👁️ Cost Control Office — Review & Approve Daily Requests</h3>
                <div className="wa-table-wrap" style={{ marginTop: 8 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID / Date</th>
                        <th>From</th>
                        <th>Items & Poster Stock</th>
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
                                <div key={idx}><strong>{i.name}</strong>: {i.qty} · <span className="wa-badge green">Stock: {i.stock}</span></div>
                              ))}
                            </td>
                            <td><span className={`wa-badge ${d.status.includes('Approved') ? 'green' : 'amber'}`}>{d.status}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button className="wa-btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => approveDailyByOffice(d.id)}>
                                  ✅ Approve
                                </button>
                                <button
                                  className="wa-btn whatsapp"
                                  style={{ padding: '6px 10px', fontSize: 12 }}
                                  onClick={() => sendWhatsApp(waPhones.costMgr, `🥬 Daily ${d.id} (${branchTitle} - ${d.department}):\n${d.items.map((i) => `- ${i.name}: ${i.qty}`).join('\n')}`)}
                                >
                                  📱 Cost Control Manager
                                </button>
                                <button
                                  className="wa-btn ghost"
                                  style={{ padding: '6px 10px', fontSize: 12 }}
                                  onClick={() => sendWhatsApp(waPhones.owner, `🥬 Daily ${d.id} (${branchTitle}) [Rare Escalation]:\n${d.items.map((i) => `- ${i.name}: ${i.qty}`).join('\n')}`)}
                                >
                                  📱 Owner (Rare)
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* COST CONTROL MANAGER: Daily is INFORMATION ONLY (no approve button, no order creation) */}
            {roleId === 'cost_control' && (
              <div className="wa-settings" style={{ background: '#f5f7f4', borderColor: '#0f3d2e' }}>
                <h3>👁️ Cost Control Manager — Daily Requests (Information Only)</h3>
                <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>
                  Daily requests are shown here for information only (Cost Control Manager approves Periodic Purchases only).
                </p>
                <div className="wa-table-wrap" style={{ marginTop: 8 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID / Date</th>
                        <th>From</th>
                        <th>Items & Poster Stock</th>
                        <th>Status</th>
                        <th>Forward (WhatsApp)</th>
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
                                <div key={idx}><strong>{i.name}</strong>: {i.qty} · <span className="wa-badge green">Stock: {i.stock}</span></div>
                              ))}
                            </td>
                            <td><span className={`wa-badge ${d.status.includes('Approved') ? 'green' : 'amber'}`}>{d.status}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  className="wa-btn whatsapp"
                                  style={{ padding: '6px 10px', fontSize: 12 }}
                                  onClick={() => sendWhatsApp(waPhones.office, `🥬 Daily ${d.id} (${branchTitle}):\n${d.items.map((i) => `- ${i.name}: ${i.qty}`).join('\n')}`)}
                                >
                                  📱 Cost Control Office
                                </button>
                                <button
                                  className="wa-btn ghost"
                                  style={{ padding: '6px 10px', fontSize: 12 }}
                                  onClick={() => sendWhatsApp(waPhones.owner, `🥬 Daily Info ${d.id} (${branchTitle}):\n${d.items.map((i) => `- ${i.name}: ${i.qty}`).join('\n')}`)}
                                >
                                  📱 Owner
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* KITCHEN / BAR / RESTAURANT MANAGER: Create Daily & send ONLY to Cost Control Office */}
            {(roleId === 'staff' || roleId === 'manager') && (
              <>
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
                    ✅ {isAr ? 'حفظ الطلب وإرساله لمكتب Cost Control' : 'Save Daily Request'}
                  </button>
                </div>

                <div className="wa-box">
                  <b>📱 {isAr ? 'إرسال الطلب اليومي لـ Cost Control Office فقط:' : 'Send Daily Request to Cost Control Office (Approval):'}</b>
                  <div style={{ marginTop: 10 }}>
                    <button
                      className="wa-btn whatsapp"
                      onClick={() => {
                        const lines = dailyRows
                          .filter((r) => r.name && r.qty)
                          .map((r) => `- ${r.name} | Stock: ${findStock(r.name)} | Order: ${r.qty} ${r.notes ? `(${r.notes})` : ''}`)
                          .join('\n')
                        sendWhatsApp(waPhones.office, `🥬 Daily Request\nRestaurant: ${branchTitle} (${dailyDept})\nBy: ${dailyRequester}\nDate: ${dailyDate}\n\n${lines}`)
                      }}
                    >
                      📱 {isAr ? 'ابعت لمكتب Cost Control للموافقة' : 'Send to Cost Control Office (WhatsApp)'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= TAB 2: PERIODIC (NO PRICES, MANUAL INVENTORY -> NEED TO ORDER) ================= */}
        {activeTab === 'periodic' && (
          <div>
            <h2 style={{ marginTop: 0 }}>
              🍽️ {isAr ? `مشتريات دورية · ${branchTitle}` : `Periodic Purchases · ${branchTitle}`}
              <div style={{ fontSize: 13, fontWeight: 500, color: '#666', marginTop: 4 }}>
                China · Glass · Silver · Kitchen & Bar Tools · Small Equipment · Spare Parts
              </div>
            </h2>

            {/* WhatsApp numbers (hidden for Owner since Owner does not send requests) */}
            {roleId !== 'owner' && (
              <div className="wa-settings">
                <h3>📱 {isAr ? 'أرقام الواتساب - الدوري' : 'Periodic WhatsApp Numbers'}</h3>
                <div className="wa-grid">
                  {roleId === 'manager' && (
                    <div className="wa-field">
                      <label>Cost Control Manager WhatsApp</label>
                      <input placeholder="2010xxxxxxxx" value={waPhones.costMgr} onChange={(e) => setWaPhones((p) => ({ ...p, costMgr: e.target.value }))} />
                    </div>
                  )}
                  {(roleId === 'cost_control' || roleId === 'cost_office') && (
                    <>
                      <div className="wa-field">
                        <label>Cost Control Office WhatsApp</label>
                        <input placeholder="2010xxxxxxxx" value={waPhones.office} onChange={(e) => setWaPhones((p) => ({ ...p, office: e.target.value }))} />
                      </div>
                      <div className="wa-field">
                        <label>Owner / Lyudmyla WhatsApp</label>
                        <input placeholder="2010xxxxxxxx" value={waPhones.owner} onChange={(e) => setWaPhones((p) => ({ ...p, owner: e.target.value }))} />
                      </div>
                    </>
                  )}
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="wa-btn whatsapp" onClick={saveWaPhones}>💾 Save Numbers</button>
                  <button className="wa-btn ghost" onClick={clearWaPhones}>🗑️ Clear</button>
                </div>
              </div>
            )}

            {/* Restaurant Manager ONLY: Create Periodic Request (Manual Inventory first -> Need to Order, NO PRICES!) */}
            {roleId === 'manager' && (
              <>
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
                        <th>Inventory (Have Now)</th>
                        <th>Need to Order</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {perRows.map((row, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              placeholder="e.g. Dinner plate"
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
                          <td>
                            <input
                              type="number"
                              placeholder="Have now"
                              value={row.inventory}
                              onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, inventory: e.target.value } : r)))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              placeholder="Need"
                              value={row.qty}
                              onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, qty: e.target.value } : r)))}
                            />
                          </td>
                          <td><button className="wa-btn ghost" style={{ padding: '6px 10px' }} onClick={() => setPerRows((p) => p.filter((_, i) => i !== idx))}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button className="wa-btn" onClick={() => setPerRows((p) => [...p, { name: '', specs: '', category: 'China', inventory: '', qty: '1' }])}>
                    + Add Item
                  </button>
                  <button className="wa-btn" onClick={savePeriodic}>
                    ✅ Save Periodic Request
                  </button>
                </div>
              </>
            )}

            {/* Approval Workflow */}
            {activePer && (
              <div style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ margin: 0 }}>Periodic Approval Workflow — {activePer.id}</h3>
                  <select className="wa-pill-select" value={activePer.id} onChange={(e) => setSelectedPerId(e.target.value)}>
                    {branchPeriodic.map((p) => (
                      <option key={p.id} value={p.id}>{p.id} · {p.status}</option>
                    ))}
                  </select>
                </div>

                <div style={{ background: '#fff3cd', padding: 12, borderRadius: 10, fontWeight: 700, marginTop: 10 }}>
                  Status: {activePer.status}
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>
                    {activePer.items.map((i) => `${i.name} (Inventory: ${i.inventory ?? 0} → Need: ${i.qty})`).join(' · ')}
                  </div>
                </div>

                {[
                  { num: 1, title: '1 - Restaurant Manager', data: activePer.step1, unlocked: true, canAct: roleId === 'manager' },
                  { num: 2, title: '2 - Cost Control Manager', data: activePer.step2, unlocked: activePer.step1.approved, canAct: roleId === 'cost_control' },
                  { num: 3, title: '3 - Owner (Lyudmyla)', data: activePer.step3, unlocked: activePer.step2.approved, canAct: roleId === 'owner' },
                ].map((st) => (
                  <div key={st.num} className={`wa-approval ${st.data.approved ? 'approved' : !st.unlocked ? 'locked' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <b>{st.title}</b>
                      <span className={`wa-badge ${st.data.approved ? 'green' : st.data.rejected ? 'red' : st.unlocked ? 'amber' : 'gray'}`}>
                        {st.data.approved
                          ? `✅ Approved - ${st.data.name} (${st.data.time})`
                          : st.data.rejected
                          ? `❌ Rejected - ${st.data.notes}`
                          : st.unlocked
                          ? 'Pending'
                          : '🔒 Locked'}
                      </span>
                    </div>

                    {!st.data.approved && !st.data.rejected && st.unlocked && st.canAct && (
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
                            ✅ {st.num === 3 ? 'Approve' : 'Approve'}
                          </button>
                          {(st.num === 2 || st.num === 3) && (
                            <button
                              className="wa-btn ghost"
                              style={{ background: '#fee4e2', color: '#b42318' }}
                              onClick={() => rejectPeriodicStep(st.num)}
                            >
                              ❌ Reject
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {/* WhatsApp forwarding: Step 1 -> Cost Control Manager; Step 2 -> Cost Control Office OR Owner; Step 3 (Owner) -> NO sending buttons! */}
                    {st.data.approved && st.num === 1 && roleId !== 'owner' && (
                      <div className="wa-box" style={{ marginTop: 8 }}>
                        <button
                          className="wa-btn whatsapp"
                          onClick={() =>
                            sendWhatsApp(
                              waPhones.costMgr,
                              `🍽️ Periodic Request ${activePer.id} (${branchTitle})\nApproved by Manager ${st.data.name}\n${activePer.items.map((i) => `- ${i.name} (Have: ${i.inventory ?? 0}, Need: ${i.qty})`).join('\n')}`
                            )
                          }
                        >
                          📱 Send to Cost Control Manager
                        </button>
                      </div>
                    )}

                    {st.data.approved && st.num === 2 && roleId !== 'owner' && (
                      <div className="wa-box" style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="wa-btn whatsapp"
                          onClick={() =>
                            sendWhatsApp(
                              waPhones.office,
                              `🍽️ Periodic Request ${activePer.id} (${branchTitle}) Approved by Cost Control Manager\n${activePer.items.map((i) => `- ${i.name} (Need: ${i.qty})`).join('\n')}`
                            )
                          }
                        >
                          📱 Send to Cost Control Office
                        </button>
                        <button
                          className="wa-btn ghost"
                          onClick={() =>
                            sendWhatsApp(
                              waPhones.owner,
                              `🍽️ Periodic Request ${activePer.id} (${branchTitle}) for Owner Check\n${activePer.items.map((i) => `- ${i.name} (Have: ${i.inventory ?? 0}, Need: ${i.qty})`).join('\n')}`
                            )
                          }
                        >
                          📱 Send to Owner (If Needed)
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
                    <th>Items Ordered</th>
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
                            items: p.items.map((i) => `${i.name}: Need ${i.qty} (Inv: ${i.inventory ?? 0})`).join(' · '),
                            status: p.status,
                          }))
                      : []),
                  ].map((r) => (
                    <tr key={r.id}>
                      <td><span className={`wa-badge ${r.type === 'Daily' ? 'green' : 'amber'}`}>{r.type}</span></td>
                      <td><strong>{r.id}</strong><div style={{ fontSize: 12, color: '#666' }}>{r.date}</div></td>
                      <td>{r.dept}</td>
                      <td>{r.items}</td>
                      <td><span className={`wa-badge ${r.status.includes('Waiting') ? 'amber' : r.status.includes('Rejected') ? 'red' : 'green'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SHORTAGES (FACTUAL ONLY, STATUS = PENDING) ================= */}
        {activeTab === 'shortages' && (
          <div>
            <h2 style={{ marginTop: 0 }}>⚠️ {isAr ? `وصل أقل من المطلوب · ${branchTitle}` : `Arrived Less Than Ordered · ${branchTitle}`}</h2>
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
                  </tr>
                </thead>
                <tbody>
                  {branchShortages.map((s) => {
                    const missing = Math.max(0, Number((s.expectedQty - s.actualQty).toFixed(3)))
                    const displayStatus = s.status === 'Open' ? 'Pending' : s.status
                    return (
                      <tr key={s.id}>
                        <td><strong>{s.id}</strong><div style={{ fontSize: 12, color: '#666' }}>{s.refDoc}</div></td>
                        <td><strong>{s.itemName}</strong></td>
                        <td>{s.expectedQty} {s.unit}</td>
                        <td>{s.actualQty} {s.unit}</td>
                        <td><span className="wa-badge red">−{missing} {s.unit}</span></td>
                        <td>{s.nextAction}</td>
                        <td><span className={`wa-badge ${displayStatus === 'Closed' ? 'green' : 'amber'}`}>{displayStatus}</span></td>
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
