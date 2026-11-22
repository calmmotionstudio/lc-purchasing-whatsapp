import React, { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { BRANCHES } from '../data/seedData'

export default function ShortagesView({ state, branchFilter, role, lang }) {
  const canSeePrices = role.canViewPrices
  const activeBranch = branchFilter === 'all' ? 'boho' : branchFilter
  const branchObj = BRANCHES.find((b) => b.id === activeBranch) || BRANCHES[0]
  const branchTitle = lang === 'ar' ? branchObj.nameAr : branchObj.name

  const [statusFilter, setStatusFilter] = useState('All') // All | Open | Closed

  const shortages = state.discrepancies
    .filter((d) => d.branchId === activeBranch)
    .filter((d) => (statusFilter === 'All' ? true : statusFilter === 'Open' ? d.status !== 'Closed' : d.status === 'Closed'))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {lang === 'ar' ? `النواقص (وصل أقل من المطلوب) · ${branchTitle}` : `Arrived Less / Shortages · ${branchTitle}`}
          </h1>
          <p className="page-subtitle">
            {lang === 'ar'
              ? 'الأصناف اللي وصلت بكمية أقل من المطلوب ومتابعة حلها'
              : 'Dedicated view of items delivered in a smaller quantity than ordered'}
          </p>
        </div>

        <div className="seg-group">
          {['All', 'Open', 'Closed'].map((f) => (
            <button key={f} className={`seg-btn ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {shortages.length === 0 ? (
        <div className="card">
          <div className="notice notice-green">
            <CheckCircle2 size={18} />
            <span>{lang === 'ar' ? `مفيش نواقص في ${branchTitle}` : `No shortages recorded for ${branchTitle}.`}</span>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID / Order</th>
                <th>Item</th>
                <th>Ordered</th>
                <th>Arrived</th>
                <th>Missing</th>
                {canSeePrices && <th>Unmatched Value</th>}
                <th>Responsible</th>
                <th>Resolution / Next Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shortages.map((s) => {
                const missing = Math.max(0, Number((s.expectedQty - s.actualQty).toFixed(3)))
                return (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.id}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.refDoc}</div>
                    </td>
                    <td><strong>{s.itemName}</strong></td>
                    <td>{s.expectedQty > 0 ? `${s.expectedQty} ${s.unit}` : '—'}</td>
                    <td>{s.expectedQty > 0 ? `${s.actualQty} ${s.unit}` : '—'}</td>
                    <td>
                      {missing > 0 ? (
                        <span className="pill pill-red">
                          <AlertTriangle size={12} /> −{missing} {s.unit}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    {canSeePrices && (
                      <td>{s.unmatchedEgp > 0 ? <strong>EGP {s.unmatchedEgp.toLocaleString()}</strong> : '—'}</td>
                    )}
                    <td>{s.owner}</td>
                    <td style={{ maxWidth: 260, fontSize: 13 }}>{s.nextAction}</td>
                    <td>
                      <span className={`pill ${s.status === 'Closed' ? 'pill-green' : 'pill-amber'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
