import React, { useState } from 'react'
import { CheckCircle2, AlertTriangle, ShoppingBag, Clock } from 'lucide-react'
import { BRANCHES } from '../data/seedData'

export default function OverviewView({ state, branchFilter, role, lang, t, onNavigate, onApproveOwnerLine }) {
  const canSeePrices = role.canViewPrices
  const branchObj = BRANCHES.find((x) => x.id === branchFilter) || BRANCHES[0]
  const branchTitle = lang === 'ar' ? branchObj.nameAr : branchObj.name
  const [orderTypeFilter, setOrderTypeFilter] = useState('All') // All | Daily | Periodic

  const restaurantLines = state.prs
    .filter((pr) => pr.branchId === branchObj.id)
    .flatMap((pr) => pr.lines.map((l) => ({ ...l, prId: pr.id, branchId: pr.branchId, createdAt: pr.createdAt })))

  const needsDecision = restaurantLines.filter(
    (l) => l.escalatedToOwner || (!l.priceApproved && l.proposedPrice * l.qty > 10000) || (!l.priceApproved && l.proposedPrice > l.ceiling)
  )
  const openShortages = state.discrepancies.filter(
    (d) => d.branchId === branchObj.id && d.status !== 'Closed'
  )
  const branchPOs = state.pos.filter((p) => p.branchId === branchObj.id)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{branchTitle}</h1>
          <p className="page-subtitle">
            {lang === 'ar'
              ? 'ملخص بسيط لهذا المطعم فقط — بدون دمج باقي المطاعم'
              : `Simple overview for ${branchTitle} only — each restaurant is separate`}
          </p>
        </div>
      </div>

      {/* 3 Simple KPI Cards for THIS restaurant only */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="kpi-card" onClick={() => onNavigate('price_review')}>
          <div className="kpi-icon"><Clock size={20} /></div>
          <div>
            <div className="kpi-label">{lang === 'ar' ? 'مستني قرارك' : 'Waiting for you'}</div>
            <div className="kpi-value">{needsDecision.length}</div>
          </div>
        </div>
        <div className={`kpi-card ${openShortages.length > 0 ? 'amber' : ''}`} onClick={() => onNavigate('my_requests')}>
          <div className="kpi-icon"><AlertTriangle size={20} /></div>
          <div>
            <div className="kpi-label">{lang === 'ar' ? 'مشاكل / نواقص' : 'Shortages & issues'}</div>
            <div className="kpi-value">{openShortages.length}</div>
          </div>
        </div>
        <div className="kpi-card" onClick={() => onNavigate('my_requests')}>
          <div className="kpi-icon"><ShoppingBag size={20} /></div>
          <div>
            <div className="kpi-label">{lang === 'ar' ? 'طلبات هذا المطعم' : 'Active orders'}</div>
            <div className="kpi-value">{branchPOs.length}</div>
          </div>
        </div>
      </div>

      {/* Needs your decision */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">
          <span>{lang === 'ar' ? 'محتاج موافقتك' : 'Needs your decision'}</span>
          <span className="pill pill-amber">{needsDecision.length}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {needsDecision.map((line) => (
            <div
              key={line.lineId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                background: '#fff9ee',
                border: '1px solid #f5d89a',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 26 }}>{line.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {lang === 'ar' ? line.itemNameAr : line.itemName} · {line.qty} {line.unit}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {line.escalationReason || line.stage}
                    {canSeePrices && ` · ${(line.proposedPrice * line.qty).toLocaleString()} EGP`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {role.canApproveBudget && (
                  <button
                    className="btn btn-primary"
                    onClick={() => onApproveOwnerLine(line.prId, line.lineId)}
                  >
                    <CheckCircle2 size={15} /> {lang === 'ar' ? 'موافقة' : 'Approve'}
                  </button>
                )}
                <button
                  className="btn btn-outline"
                  onClick={() => onNavigate('price_review', line.lineId)}
                >
                  {lang === 'ar' ? 'شوف التفاصيل' : 'Check price'}
                </button>
              </div>
            </div>
          ))}

          {openShortages.map((iss) => (
            <div
              key={iss.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                background: '#fff9ee',
                border: '1px solid #f5d89a',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={20} color="#a15206" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {iss.itemName} ({iss.refDoc})
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {iss.nextAction}
                  </div>
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => onNavigate('my_requests')}>
                {lang === 'ar' ? 'افتح' : 'Open'}
              </button>
            </div>
          ))}

          {needsDecision.length === 0 && openShortages.length === 0 && (
            <div className="notice notice-green">
              <CheckCircle2 size={18} />
              <span>{lang === 'ar' ? 'كله تمام في هذا المطعم!' : `Everything is clear in ${branchTitle}!`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Daily & Periodic History for this restaurant only */}
      <div className="card">
        <div className="card-title">
          <span>{lang === 'ar' ? `سجل الطلبات اليومية والدورية · ${branchTitle}` : `Daily & Periodic History · ${branchTitle}`}</span>
          <div className="seg-group">
            {['All', 'Daily', 'Periodic'].map((f) => (
              <button key={f} className={`seg-btn ${orderTypeFilter === f ? 'active' : ''}`} onClick={() => setOrderTypeFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>ID & Date</th>
                <th>Department</th>
                <th>Items Ordered (with Poster Stock)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...(orderTypeFilter !== 'Periodic'
                  ? state.dailyRequests
                      .filter((d) => d.branchId === branchObj.id)
                      .map((d) => ({
                        kind: 'Daily',
                        id: d.id,
                        date: d.date,
                        dept: `${d.department} (${d.requestedBy})`,
                        itemsText: d.items.map((i) => `${i.name}: ${i.qty} ${i.unit || ''} (Stock: ${i.stock})`).join(' · '),
                        status: d.status,
                      }))
                  : []),
                ...(orderTypeFilter !== 'Daily'
                  ? state.periodicRequests
                      .filter((p) => p.branchId === branchObj.id)
                      .map((p) => ({
                        kind: 'Periodic',
                        id: p.id,
                        date: p.date,
                        dept: p.department,
                        itemsText: p.items.map((i) => `${i.name}: ${i.qty} (Stock: ${i.stock})`).join(' · '),
                        status: p.status,
                      }))
                  : []),
              ].map((row) => (
                <tr key={row.id} className="clickable" onClick={() => onNavigate('daily_periodic')}>
                  <td>
                    <span className={`pill ${row.kind === 'Daily' ? 'pill-green' : 'pill-blue'}`}>{row.kind}</span>
                  </td>
                  <td><strong>{row.id}</strong><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.date}</div></td>
                  <td>{row.dept}</td>
                  <td style={{ fontSize: 13 }}>{row.itemsText}</td>
                  <td>
                    <span className={`pill ${row.status.includes('Waiting') ? 'pill-amber' : 'pill-green'}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
