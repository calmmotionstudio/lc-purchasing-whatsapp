import React, { useState } from 'react'
import { MessageSquare, Plus, Trash2, CheckCircle2, Lock, Save, Database } from 'lucide-react'
import { BRANCHES, CURATED_CATALOG } from '../data/seedData'

export default function DailyPeriodicView({
  state,
  branchFilter,
  role,
  lang,
  onSubmitDaily,
  onSavePeriodic,
  onApprovePeriodicStep,
}) {
  const activeBranch = branchFilter === 'all' ? 'boho' : branchFilter
  const branchObj = BRANCHES.find((b) => b.id === activeBranch) || BRANCHES[0]
  const branchTitle = lang === 'ar' ? branchObj.nameAr : branchObj.name

  const canSeeDaily = ['staff', 'manager', 'cost_control'].includes(role.id)
  const canSeePeriodic = ['manager', 'cost_control', 'owner'].includes(role.id)
  const canSeePrices = role.canViewPrices

  const [mode, setMode] = useState(role.id === 'owner' ? 'periodic' : 'daily')
  const effectiveMode =
    mode === 'daily' && !canSeeDaily
      ? 'periodic'
      : mode === 'periodic' && !canSeePeriodic
      ? 'daily'
      : mode

  // Poster items + curated items for stock lookup
  const posterItems = state.posterSnapshot?.branches?.[activeBranch]?.items || []
  const stockOptions = [
    ...CURATED_CATALOG.map((c) => ({
      name: c.name,
      nameAr: c.nameAr,
      stock: c.posterStock[activeBranch] ?? 0,
      unit: c.unit,
      category: c.subType || c.category,
      price: c.lastPaidPoster || 0,
    })),
    ...posterItems.slice(0, 40).map((p) => ({
      name: p.name,
      nameAr: p.name,
      stock: p.poster_stock,
      unit: p.unit,
      category: 'Poster',
      price: p.prime_cost || 0,
    })),
  ]

  const findStock = (itemName) => {
    const found = stockOptions.find(
      (s) => s.name.toLowerCase() === itemName.trim().toLowerCase() || s.nameAr === itemName.trim()
    )
    return found ? `${found.stock} ${found.unit}` : 'Not in Poster'
  }

  // Daily WhatsApp numbers (separate from Periodic)
  const [dailyPhones, setDailyPhones] = useState(() => ({
    manager: localStorage.getItem('lc_daily_ph_mgr') || '',
    office: localStorage.getItem('lc_daily_ph_office') || '',
    costMgr: localStorage.getItem('lc_daily_ph_cost') || '',
  }))
  const [dailyDept, setDailyDept] = useState('Kitchen')
  const [dailyDate, setDailyDate] = useState('2026-11-22')
  const [dailyRequester, setDailyRequester] = useState(role.actorName)
  const [dailyRows, setDailyRows] = useState([
    { name: 'Tomatoes', qty: '10', notes: 'Fresh Roma' },
    { name: 'Chicken breast', qty: '8', notes: 'Boneless' },
  ])

  // Periodic WhatsApp numbers (separate from Daily)
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

  // Active Periodic Request for 3-step approval
  const branchPeriodic = state.periodicRequests.filter((p) => p.branchId === activeBranch)
  const [selectedPerId, setSelectedPerId] = useState(branchPeriodic[0]?.id || state.periodicRequests[0]?.id)
  const activePer = state.periodicRequests.find((p) => p.id === selectedPerId) || branchPeriodic[0]
  const [sigName, setSigName] = useState(role.actorName)
  const [sigSign, setSigSign] = useState(role.actorName.split(' ')[0])

  const saveDailyPhones = () => {
    localStorage.setItem('lc_daily_ph_mgr', dailyPhones.manager)
    localStorage.setItem('lc_daily_ph_office', dailyPhones.office)
    localStorage.setItem('lc_daily_ph_cost', dailyPhones.costMgr)
  }

  const savePerPhones = () => {
    localStorage.setItem('lc_per_ph_mgr', perPhones.manager)
    localStorage.setItem('lc_per_ph_cost', perPhones.cost)
    localStorage.setItem('lc_per_ph_owner', perPhones.owner)
  }

  const sendWhatsApp = (phone, text) => {
    const clean = (phone || '').replace(/[^0-9]/g, '')
    if (!clean) {
      alert(lang === 'ar' ? 'اكتب رقم الواتساب الأول واضغط حفظ' : 'Please enter and save the WhatsApp number first.')
      return
    }
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {effectiveMode === 'daily'
              ? (lang === 'ar' ? '🥬 طلب يومي · Daily Request' : '🥬 Daily Purchase Request')
              : (lang === 'ar' ? '🍽️ مشتريات دورية · Periodic Purchases' : '🍽️ Periodic Purchases')}
          </h1>
          <p className="page-subtitle">
            {branchTitle} ·{' '}
            {effectiveMode === 'daily'
              ? 'Kitchen / Bar → Cost Control (No Owner in Daily)'
              : 'Restaurant Manager → Cost Control → Owner'}
          </p>
        </div>

        <div className="seg-group">
          {canSeeDaily && (
            <button
              className={`seg-btn ${effectiveMode === 'daily' ? 'active' : ''}`}
              onClick={() => setMode('daily')}
            >
              🥬 {lang === 'ar' ? 'طلب يومي | Daily' : 'Daily (Kitchen & Bar)'}
            </button>
          )}
          {canSeePeriodic && (
            <button
              className={`seg-btn ${effectiveMode === 'periodic' ? 'active' : ''}`}
              onClick={() => setMode('periodic')}
            >
              🍽️ {lang === 'ar' ? 'مشتريات دورية | Periodic' : 'Periodic Purchases'}
            </button>
          )}
        </div>
      </div>

      {/* ================= DAILY REQUEST ================= */}
      {effectiveMode === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Daily WhatsApp Numbers */}
          <div className="card" style={{ background: '#f0faf4', border: '2px dashed #25D366' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              📱 {lang === 'ar' ? 'أرقام الواتساب للطلب اليومي (بدون Owner)' : 'Daily WhatsApp Numbers (No Owner)'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>1. Manager / Exec Chef</label>
                <input className="input" style={{ width: '100%' }} placeholder="2010xxxxxxxx" value={dailyPhones.manager} onChange={(e) => setDailyPhones((p) => ({ ...p, manager: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>2. Cost Control Office</label>
                <input className="input" style={{ width: '100%' }} placeholder="2010xxxxxxxx" value={dailyPhones.office} onChange={(e) => setDailyPhones((p) => ({ ...p, office: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>3. Cost Control Manager</label>
                <input className="input" style={{ width: '100%' }} placeholder="2010xxxxxxxx" value={dailyPhones.costMgr} onChange={(e) => setDailyPhones((p) => ({ ...p, costMgr: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={saveDailyPhones}>
                <Save size={15} /> Save Daily Numbers
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setDailyPhones({ manager: '', office: '', costMgr: '' })
                  localStorage.removeItem('lc_daily_ph_mgr')
                  localStorage.removeItem('lc_daily_ph_office')
                  localStorage.removeItem('lc_daily_ph_cost')
                }}
              >
                Clear Numbers
              </button>
            </div>
          </div>

          {/* Daily Header Fields */}
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Date</label>
                <input type="date" className="input" style={{ width: '100%' }} value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Department</label>
                <select className="input" style={{ width: '100%' }} value={dailyDept} onChange={(e) => setDailyDept(e.target.value)}>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Bar">Bar</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Requested By</label>
                <input className="input" style={{ width: '100%' }} value={dailyRequester} onChange={(e) => setDailyRequester(e.target.value)} />
              </div>
            </div>

            {/* Daily Table WITH Poster Stock Column */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Name (Poster Linked)</th>
                    <th><Database size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />In Stock (Poster)</th>
                    <th>Order Qty</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <input
                          list="poster-stock-list"
                          className="input"
                          style={{ width: '100%' }}
                          placeholder="Type or select item..."
                          value={row.name}
                          onChange={(e) => {
                            const val = e.target.value
                            setDailyRows((prev) => prev.map((r, i) => (i === idx ? { ...r, name: val } : r)))
                          }}
                        />
                      </td>
                      <td>
                        <span className="pill pill-green">{findStock(row.name)}</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input"
                          style={{ width: 95, fontWeight: 700 }}
                          value={row.qty}
                          onChange={(e) => {
                            const val = e.target.value
                            setDailyRows((prev) => prev.map((r, i) => (i === idx ? { ...r, qty: val } : r)))
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          style={{ width: '100%' }}
                          placeholder="Optional"
                          value={row.notes}
                          onChange={(e) => {
                            const val = e.target.value
                            setDailyRows((prev) => prev.map((r, i) => (i === idx ? { ...r, notes: val } : r)))
                          }}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-outline"
                          style={{ minHeight: 34, padding: '0 10px' }}
                          onClick={() => setDailyRows((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <datalist id="poster-stock-list">
              {stockOptions.map((s, i) => (
                <option key={i} value={s.name}>{s.name} ({s.stock} {s.unit})</option>
              ))}
            </datalist>

            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                onClick={() => setDailyRows((p) => [...p, { name: '', qty: '', notes: '' }])}
              >
                <Plus size={15} /> Add Item
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
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
                  onSubmitDaily({ branchId: activeBranch, date: dailyDate, department: dailyDept, requestedBy: dailyRequester, items })
                }}
              >
                <CheckCircle2 size={15} /> Save Daily Request
              </button>
            </div>

            {/* WhatsApp Buttons */}
            <div className="notice notice-green" style={{ marginTop: 16, flexDirection: 'column', gap: 10 }}>
              <strong>📱 Send Daily Request via WhatsApp (Cost Control):</strong>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  style={{ background: '#25D366', color: '#fff' }}
                  onClick={() => {
                    const lines = dailyRows
                      .filter((r) => r.name && r.qty)
                      .map((r) => `- ${r.name} | Stock: ${findStock(r.name)} | Order: ${r.qty} ${r.notes ? `(${r.notes})` : ''}`)
                      .join('\n')
                    sendWhatsApp(
                      dailyPhones.office,
                      `🥬 Daily Request\nRestaurant: ${branchTitle} (${dailyDept})\nBy: ${dailyRequester}\nDate: ${dailyDate}\n\nItems:\n${lines}`
                    )
                  }}
                >
                  <MessageSquare size={15} /> 1. Send to Cost Control Office
                </button>
                <button
                  className="btn"
                  style={{ background: '#25D366', color: '#fff' }}
                  onClick={() => {
                    const lines = dailyRows
                      .filter((r) => r.name && r.qty)
                      .map((r) => `- ${r.name} | Stock: ${findStock(r.name)} | Order: ${r.qty}`)
                      .join('\n')
                    sendWhatsApp(
                      dailyPhones.costMgr,
                      `🥬 Daily Request Approval\nRestaurant: ${branchTitle} (${dailyDept})\nBy: ${dailyRequester}\n\nItems:\n${lines}`
                    )
                  }}
                >
                  <MessageSquare size={15} /> 2. Send to Cost Control Manager
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PERIODIC PURCHASES ================= */}
      {effectiveMode === 'periodic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Periodic WhatsApp Numbers */}
          <div className="card" style={{ background: '#f0faf4', border: '2px dashed #25D366' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              📱 Periodic Purchases WhatsApp Numbers (Manager, Cost Control, Owner)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Restaurant Manager</label>
                <input className="input" style={{ width: '100%' }} placeholder="2010xxxxxxxx" value={perPhones.manager} onChange={(e) => setPerPhones((p) => ({ ...p, manager: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Cost Control</label>
                <input className="input" style={{ width: '100%' }} placeholder="2010xxxxxxxx" value={perPhones.cost} onChange={(e) => setPerPhones((p) => ({ ...p, cost: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Owner / Lyudmyla</label>
                <input className="input" style={{ width: '100%' }} placeholder="2010xxxxxxxx" value={perPhones.owner} onChange={(e) => setPerPhones((p) => ({ ...p, owner: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={savePerPhones}>
              <Save size={15} /> Save Periodic Numbers
            </button>
          </div>

          {/* Create New Periodic Request (for Manager / Cost Control) */}
          {role.id !== 'owner' && (
            <div className="card">
              <div className="card-title">Create Periodic Purchase Request (China · Glass · Silver · Tools · Equipment)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Request No.</label>
                  <input className="input" style={{ width: '100%' }} value={perReqNo} onChange={(e) => setPerReqNo(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Date</label>
                  <input type="date" className="input" style={{ width: '100%' }} value={perDate} onChange={(e) => setPerDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Department</label>
                  <select className="input" style={{ width: '100%' }} value={perDept} onChange={(e) => setPerDept(e.target.value)}>
                    <option>Restaurant</option>
                    <option>Kitchen</option>
                    <option>Bar</option>
                    <option>Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Specs</th>
                      <th>Category</th>
                      <th>In Stock (Poster)</th>
                      <th>Qty</th>
                      {canSeePrices && <th>Price (EGP)</th>}
                      {canSeePrices && <th>Total</th>}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {perRows.map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            list="poster-stock-list"
                            className="input"
                            style={{ width: '100%' }}
                            value={row.name}
                            onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))}
                          />
                        </td>
                        <td>
                          <input className="input" style={{ width: '100%' }} value={row.specs} onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, specs: e.target.value } : r)))} />
                        </td>
                        <td>
                          <select className="input" value={row.category} onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, category: e.target.value } : r)))}>
                            <option>China</option>
                            <option>Glass</option>
                            <option>Silver</option>
                            <option>Kitchen Tools</option>
                            <option>Small Equipment</option>
                            <option>Linen & Textiles</option>
                            <option>Spare Parts</option>
                          </select>
                        </td>
                        <td><span className="pill pill-green">{findStock(row.name)}</span></td>
                        <td>
                          <input type="number" className="input" style={{ width: 75 }} value={row.qty} onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, qty: e.target.value } : r)))} />
                        </td>
                        {canSeePrices && (
                          <td>
                            <input type="number" className="input" style={{ width: 90 }} value={row.price} onChange={(e) => setPerRows((p) => p.map((r, i) => (i === idx ? { ...r, price: e.target.value } : r)))} />
                          </td>
                        )}
                        {canSeePrices && <td><strong>{(Number(row.qty || 0) * Number(row.price || 0)).toLocaleString()}</strong></td>}
                        <td>
                          <button className="btn btn-outline" style={{ minHeight: 34, padding: '0 10px' }} onClick={() => setPerRows((p) => p.filter((_, i) => i !== idx))}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline" onClick={() => setPerRows((p) => [...p, { name: '', specs: '', category: 'China', qty: '1', price: '0' }])}>
                    <Plus size={15} /> Add Item
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const items = perRows
                        .filter((r) => r.name.trim() && Number(r.qty) > 0)
                        .map((r) => ({ ...r, stock: findStock(r.name), qty: Number(r.qty), price: Number(r.price || 0) }))
                      if (items.length === 0) return
                      const createdId = onSavePeriodic({ branchId: activeBranch, id: perReqNo, date: perDate, department: perDept, items })
                      if (createdId) setSelectedPerId(createdId)
                    }}
                  >
                    <CheckCircle2 size={15} /> Save Periodic Request
                  </button>
                </div>
                {canSeePrices && (
                  <strong style={{ fontSize: 18 }}>
                    Total: {perRows.reduce((s, r) => s + Number(r.qty || 0) * Number(r.price || 0), 0).toLocaleString()} EGP
                  </strong>
                )}
              </div>
            </div>
          )}

          {/* 3-Step Periodic Approval Workflow */}
          {activePer && (
            <div className="card">
              <div className="card-title">
                <span>Periodic Approval Workflow — {activePer.id} ({branchTitle})</span>
                <select className="input" style={{ width: 'auto' }} value={activePer.id} onChange={(e) => setSelectedPerId(e.target.value)}>
                  {state.periodicRequests.filter((p) => p.branchId === activeBranch).map((p) => (
                    <option key={p.id} value={p.id}>{p.id} · {p.status}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 14 }}>
                {[
                  { num: 1, title: '1. Restaurant Manager', data: activePer.step1, allowed: role.id === 'manager', unlocked: true, waPhone: perPhones.cost, waLabel: 'Send to Cost Control' },
                  { num: 2, title: '2. Cost Control', data: activePer.step2, allowed: role.id === 'cost_control', unlocked: activePer.step1.approved, waPhone: perPhones.owner, waLabel: 'Send to Owner' },
                  { num: 3, title: '3. Owner Final Approval', data: activePer.step3, allowed: role.id === 'owner', unlocked: activePer.step2.approved, waPhone: perPhones.manager, waLabel: 'Send Confirmation to Manager' },
                ].map((st) => (
                  <div
                    key={st.num}
                    className="card"
                    style={{
                      background: st.data.approved ? '#f0fff4' : !st.unlocked ? '#f7f7f7' : '#fff',
                      borderColor: st.data.approved ? '#25D366' : 'var(--border)',
                      opacity: !st.unlocked ? 0.65 : 1,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{st.title}</div>
                    {st.data.approved ? (
                      <>
                        <div className="pill pill-green" style={{ marginBottom: 8 }}>✅ Approved · {st.data.name} ({st.data.time})</div>
                        <button
                          className="btn"
                          style={{ background: '#25D366', color: '#fff', width: '100%' }}
                          onClick={() =>
                            sendWhatsApp(
                              st.waPhone,
                              `🍽️ Periodic Request ${activePer.id} (${branchTitle})\nStep ${st.num} Approved by ${st.data.name}.\nItems: ${activePer.items.map((i) => `${i.name} x${i.qty}`).join(', ')}`
                            )
                          }
                        >
                          <MessageSquare size={15} /> {st.waLabel}
                        </button>
                      </>
                    ) : !st.unlocked ? (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        <Lock size={14} style={{ verticalAlign: 'middle' }} /> Locked until previous step approves
                      </div>
                    ) : st.allowed ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input className="input" placeholder="Name" value={sigName} onChange={(e) => setSigName(e.target.value)} />
                        <input className="input" placeholder="Signature" value={sigSign} onChange={(e) => setSigSign(e.target.value)} />
                        <button
                          className="btn btn-primary"
                          disabled={!sigName.trim() || !sigSign.trim()}
                          onClick={() => onApprovePeriodicStep(activePer.id, st.num, sigName.trim(), sigSign.trim())}
                        >
                          <CheckCircle2 size={15} /> Approve Step {st.num}
                        </button>
                      </div>
                    ) : (
                      <div className="pill pill-amber">Waiting for {st.title}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
