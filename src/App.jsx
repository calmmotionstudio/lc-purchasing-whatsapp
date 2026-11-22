import React, { useState, useEffect } from 'react'
import {
  Home,
  ShoppingCart,
  Tag,
  Truck,
  History,
  PlusSquare,
  FileText,
  ClipboardList,
  ArrowRightLeft,
  Layers,
  Database,
  Calculator,
  Menu,
  RotateCcw,
  Store,
  UserCircle,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react'
import { INITIAL_STATE, ROLES, BRANCHES } from './data/seedData'
import { LABELS } from './data/i18n'
import OverviewView from './components/OverviewView'
import NewRequestView from './components/NewRequestView'
import PurchasingView from './components/PurchasingView'
import PriceReviewView from './components/PriceReviewView'
import ReceivingView from './components/ReceivingView'
import DailyPeriodicView from './components/DailyPeriodicView'
import ShortagesView from './components/ShortagesView'
import {
  MyRequestsView,
  TransfersView,
  NonFoodView,
  AccountingView,
  IntegrationsView,
  HistoryView,
  StockChecksView,
} from './components/OperationsTabs'

const STORAGE_KEY = 'lc_purchasing_v2_2_state_r3'

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
  const [roleId, setRoleId] = useState('owner')
  const [branchFilter, setBranchFilter] = useState('boho')
  const [lang, setLang] = useState('en')
  const [activeTab, setActiveTab] = useState('overview')
  const [navHistory, setNavHistory] = useState([])
  const [focusedLineId, setFocusedLineId] = useState(null)
  const [prefillOrderQty, setPrefillOrderQty] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const role = ROLES.find((r) => r.id === roleId) || ROLES[0]
  const t = LABELS[lang]

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    try {
      const { posterSnapshot, ...rest } = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    } catch (e) {
      // ignore quota errors
    }
  }, [state])

  const notify = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const nowStr = () => {
    const d = new Date()
    return d.toISOString().slice(0, 16).replace('T', ' ')
  }

  const appendAudit = (prev, branchId, action, rev = 'v1') => [
    {
      id: `AUD-${Date.now()}`,
      time: nowStr(),
      actor: role.actorName,
      role: role.id,
      branchId,
      action,
      rev,
    },
    ...prev.auditLog,
  ]

  useEffect(() => {
    const onPopState = (e) => {
      if (e.state && e.state.tab) {
        setActiveTab(e.state.tab)
        setFocusedLineId(e.state.lineId || null)
        setNavHistory((prev) => prev.slice(0, -1))
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleNavigate = (tab, lineId = null) => {
    if (tab !== activeTab) {
      setNavHistory((prev) => [...prev, { tab: activeTab, lineId: focusedLineId }])
      window.history.pushState({ tab, lineId }, '', `#${tab}`)
    }
    setActiveTab(tab)
    setFocusedLineId(lineId || null)
    setSidebarOpen(false)
  }

  const handleBack = () => {
    if (navHistory.length === 0) return
    const prev = navHistory[navHistory.length - 1]
    setNavHistory((h) => h.slice(0, -1))
    setActiveTab(prev.tab)
    setFocusedLineId(prev.lineId || null)
    setSidebarOpen(false)
  }

  const handleRoleChange = (newRoleId) => {
    const nextRole = ROLES.find((r) => r.id === newRoleId) || ROLES[0]
    setRoleId(newRoleId)
    setNavHistory([])
    setActiveTab(nextRole.defaultTab)
    setFocusedLineId(null)
    window.history.replaceState({ tab: nextRole.defaultTab, lineId: null }, '', `#${nextRole.defaultTab}`)
  }

  const handleResetDemo = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState(INITIAL_STATE)
    notify('Demo state reset to live Poster snapshot')
  }

  // Workflow handlers
  const handleSaveStockCheck = ({ branchId, item, countedQty, diff }) => {
    setState((prev) => ({
      ...prev,
      stockChecks: [
        {
          id: `CHK-${Date.now().toString().slice(-4)}`,
          branchId,
          itemId: item.id,
          itemName: item.name,
          posterStock: item.stock,
          countedQty,
          diff,
          unit: item.unit,
          countedBy: role.actorName,
          countedAt: nowStr(),
          assignedTo: 'Restaurant manager',
          status: diff === 0 ? 'Matched' : 'Open',
        },
        ...prev.stockChecks,
      ],
      auditLog: appendAudit(
        prev,
        branchId,
        `Physical count for ${item.name}: Poster ${item.stock} ${item.unit}, Counted ${countedQty} ${item.unit} (Diff: ${diff})`
      ),
    }))
    notify(`Count saved for ${item.name} (Poster stock unchanged)`)
  }

  const handleSubmitPR = ({ branchId, neededBy, priority, reason, lines }) => {
    const prId = `PR-${1043 + state.prs.length}`
    const newPR = {
      id: prId,
      branchId,
      requester: role.actorName,
      neededBy,
      priority,
      reason,
      createdAt: nowStr(),
      lines: lines.map((l, idx) => ({
        lineId: `${prId}-${idx + 1}`,
        itemId: l.id,
        itemName: l.name,
        itemNameAr: l.nameAr || l.name,
        category: l.category || 'Food',
        emoji: l.emoji || '📦',
        qty: l.qty,
        unit: l.unit,
        lastPaid: l.lastPaid || 0,
        ceiling: l.ceiling || l.lastPaid || 0,
        stage: role.canApproveNeed ? 'Need approved' : 'Need review',
        owner: role.canApproveNeed ? 'Mona' : 'Restaurant manager',
        due: 'Today 17:00',
        selectedSupplier: l.defaultSupplier || 'Approved Supplier',
        proposedPrice: l.lastPaid || 0,
        quotes: l.lastPaid
          ? [{ supplier: l.defaultSupplier || 'Approved Supplier', price: l.lastPaid, delivery: 'Included', taxBasis: 'Excluding tax', date: 'Today', pdf: 'ref.pdf' }]
          : [],
        needApproved: role.canApproveNeed,
        priceApproved: false,
        revision: 1,
      })),
    }

    setState((prev) => ({
      ...prev,
      prs: [newPR, ...prev.prs],
      auditLog: appendAudit(prev, branchId, `${prId} submitted (${lines.length} lines, Priority: ${priority})`),
    }))
    notify(`${prId} submitted for review`)
  }

  const handleApproveNeed = (prId, lineId) => {
    setState((prev) => ({
      ...prev,
      prs: prev.prs.map((pr) =>
        pr.id !== prId
          ? pr
          : {
              ...pr,
              lines: pr.lines.map((l) =>
                l.lineId === lineId ? { ...l, needApproved: true, stage: 'Need approved', owner: 'Mona' } : l
              ),
            }
      ),
      auditLog: appendAudit(prev, 'boho', `${prId} line ${lineId} need-approved`),
    }))
    notify('Line need approved & routed to Purchasing')
  }

  const handleSendQuoteToCostControl = (prId, lineId, { supplier, price }) => {
    setState((prev) => ({
      ...prev,
      prs: prev.prs.map((pr) =>
        pr.id !== prId
          ? pr
          : {
              ...pr,
              lines: pr.lines.map((l) => {
                if (l.lineId !== lineId) return l
                const withinCeiling = l.ceiling > 0 && price <= l.ceiling && price * l.qty <= 10000
                return {
                  ...l,
                  selectedSupplier: supplier,
                  proposedPrice: price,
                  quotes: [
                    { supplier, price, delivery: 'Included', taxBasis: 'Excluding tax', date: 'Today', pdf: 'quote-new.pdf' },
                    ...(l.quotes || []).filter((q) => q.supplier !== supplier),
                  ],
                  priceApproved: withinCeiling,
                  stage: withinCeiling ? 'Approved' : 'Price review',
                  owner: withinCeiling ? 'Mona' : 'Cost Control',
                }
              }),
            }
      ),
      auditLog: appendAudit(prev, 'all', `${prId} quote submitted (${supplier} @ EGP ${price})`),
    }))
    notify('Quote submitted')
  }

  const handleApprovePrice = (prId, lineId, { supplier, price, reason }) => {
    setState((prev) => ({
      ...prev,
      prs: prev.prs.map((pr) =>
        pr.id !== prId
          ? pr
          : {
              ...pr,
              lines: pr.lines.map((l) =>
                l.lineId === lineId
                  ? {
                      ...l,
                      selectedSupplier: supplier,
                      proposedPrice: price,
                      priceApproved: true,
                      escalatedToOwner: false,
                      stage: 'Approved',
                      owner: 'Mona',
                    }
                  : l
              ),
            }
      ),
      auditLog: appendAudit(prev, 'all', `${prId} price approved (${supplier} @ EGP ${price}). Note: ${reason}`),
    }))
    notify('Price approved — ready to create PO')
  }

  const handleReturnPrice = (prId, lineId, reason) => {
    setState((prev) => ({
      ...prev,
      prs: prev.prs.map((pr) =>
        pr.id !== prId
          ? pr
          : {
              ...pr,
              lines: pr.lines.map((l) =>
                l.lineId === lineId ? { ...l, stage: 'Returned', owner: 'Mona', priceApproved: false } : l
              ),
            }
      ),
      auditLog: appendAudit(prev, 'all', `${prId} returned to Purchasing: ${reason}`),
    }))
    notify('Returned to Purchasing')
  }

  const handleRejectPrice = (prId, lineId, reason) => {
    setState((prev) => ({
      ...prev,
      prs: prev.prs.map((pr) =>
        pr.id !== prId
          ? pr
          : {
              ...pr,
              lines: pr.lines.map((l) =>
                l.lineId === lineId ? { ...l, stage: 'Rejected', owner: 'Closed', priceApproved: false } : l
              ),
            }
      ),
      auditLog: appendAudit(prev, 'all', `${prId} rejected: ${reason}`),
    }))
    notify('Line rejected')
  }

  const handleApproveOwnerLine = (prId, lineId) => {
    setState((prev) => ({
      ...prev,
      prs: prev.prs.map((pr) =>
        pr.id !== prId
          ? pr
          : {
              ...pr,
              lines: pr.lines.map((l) =>
                l.lineId === lineId
                  ? { ...l, priceApproved: true, escalatedToOwner: false, stage: 'Approved', owner: 'Mona' }
                  : l
              ),
            }
      ),
      auditLog: appendAudit(prev, 'all', `Owner approved escalated spend for ${prId}`),
    }))
    notify('Escalated spend approved by Owner')
  }

  const handleCreatePO = (line) => {
    const poId = `PO-${2062 + state.pos.length}`
    const newPo = {
      id: poId,
      prId: line.prId,
      branchId: line.branchId,
      supplier: line.selectedSupplier || 'Approved Supplier',
      category: line.category || 'Food',
      itemId: line.itemId,
      itemName: line.itemName,
      itemNameAr: line.itemNameAr,
      spec: `Unit: ${line.unit}`,
      emoji: line.emoji,
      orderedQty: line.qty,
      receivedQty: 0,
      unit: line.unit,
      approvedPrice: line.proposedPrice,
      invoiceAmount: line.qty * line.proposedPrice,
      expectedDate: line.neededBy || '2026-11-22',
      revision: 1,
      status: 'Not sent',
      postingStatus: 'Pending validation',
    }
    setState((prev) => ({
      ...prev,
      pos: [newPo, ...prev.pos],
      prs: prev.prs.map((pr) =>
        pr.id !== line.prId
          ? pr
          : {
              ...pr,
              lines: pr.lines.map((l) => (l.lineId === line.lineId ? { ...l, stage: 'PO Created' } : l)),
            }
      ),
      auditLog: appendAudit(prev, line.branchId, `Created ${poId} from ${line.prId} (${newPo.supplier})`),
    }))
    notify(`${poId} created`)
    return newPo
  }

  const handleUpdatePOStatus = (poId, status) => {
    setState((prev) => ({
      ...prev,
      pos: prev.pos.map((p) => (p.id === poId ? { ...p, status, sentAt: nowStr() } : p)),
      auditLog: appendAudit(prev, 'all', `${poId} marked ${status}`),
    }))
    notify(`${poId} marked ${status}`)
  }

  const handleConfirmReceipt = (poId, { acceptedQty, stillDue, unmatchedEgp, deliveryNoteNo, missingAction, techAccepted, receiptSummary }) => {
    setState((prev) => {
      const targetPo = prev.pos.find((p) => p.id === poId)
      const newReceived = Number(((targetPo?.receivedQty || 0) + acceptedQty).toFixed(3))
      const fully = newReceived >= (targetPo?.orderedQty || 0)
      const nextDiscrepancies =
        stillDue > 0
          ? [
              {
                id: `ISS-${402 + prev.discrepancies.length}`,
                branchId: targetPo.branchId,
                type: 'Shortage',
                refDoc: poId,
                itemName: targetPo.itemName,
                expectedQty: targetPo.orderedQty,
                actualQty: newReceived,
                unit: targetPo.unit,
                unmatchedEgp,
                owner: 'Mona · Purchasing',
                due: 'Tomorrow 10:00',
                nextAction: missingAction,
                status: 'Open',
              },
              ...prev.discrepancies,
            ]
          : prev.discrepancies

      return {
        ...prev,
        pos: prev.pos.map((p) =>
          p.id !== poId
            ? p
            : {
                ...p,
                receivedQty: newReceived,
                status: !techAccepted ? 'On hold (Tech)' : fully ? 'Received' : 'Part received',
                postingStatus: 'Pending authorized review',
                lastReceiptNote: receiptSummary || `DN ${deliveryNoteNo} · Accepted ${acceptedQty} ${targetPo.unit}`,
              }
        ),
        discrepancies: nextDiscrepancies,
        auditLog: appendAudit(
          prev,
          targetPo.branchId,
          `Receipt on ${poId}: accepted ${acceptedQty} ${targetPo.unit} (DN: ${deliveryNoteNo}). Still due: ${stillDue} ${targetPo.unit}`
        ),
      }
    })
    notify(`Receipt saved & sent to Purchasing for ${poId}`)
  }

  const handleResolveDiscrepancy = (issueId, { outcome, docRef, note }) => {
    const summary = `${outcome} (Ref: ${docRef}) — ${note}`
    const nextStatus = outcome === 'Later delivery scheduled' ? 'Awaiting supplier' : 'Closed'
    setState((prev) => ({
      ...prev,
      discrepancies: prev.discrepancies.map((d) =>
        d.id === issueId ? { ...d, status: nextStatus, nextAction: summary } : d
      ),
      auditLog: appendAudit(prev, 'all', `${issueId} updated by Purchasing [${nextStatus}]: ${summary}`),
    }))
    notify(`${issueId} -> ${nextStatus}`)
  }

  const handleCreateTransfer = ({ sourceBranchId, destBranchId, type, itemName, qty, unit }) => {
    const trfId = `TRF-${303 + state.transfers.length}`
    setState((prev) => ({
      ...prev,
      transfers: [
        {
          id: trfId,
          type,
          sourceBranchId,
          destBranchId,
          itemName,
          emoji: '📦',
          dispatchedQty: qty,
          receivedQty: 0,
          unit,
          returnDueDate: type === 'Loan' ? '2026-11-25' : null,
          owner: role.actorName,
          status: 'Dispatched',
          notes: 'Dispatched from source custodian',
        },
        ...prev.transfers,
      ],
      auditLog: appendAudit(prev, sourceBranchId, `${trfId} dispatched ${qty} ${unit} ${itemName} -> ${destBranchId}`),
    }))
    notify(`${trfId} dispatched`)
  }

  const handleAcceptTransfer = (trfId) => {
    setState((prev) => ({
      ...prev,
      transfers: prev.transfers.map((tr) =>
        tr.id === trfId ? { ...tr, receivedQty: tr.dispatchedQty, status: 'Received' } : tr
      ),
      auditLog: appendAudit(prev, 'all', `${trfId} destination arrival confirmed`),
    }))
    notify(`${trfId} arrival confirmed`)
  }

  const handleMarkPosted = (poId) => {
    const supplyId = `SUP-${Math.floor(90500 + Math.random() * 900)}`
    setState((prev) => ({
      ...prev,
      pos: prev.pos.map((p) =>
        p.id === poId ? { ...p, postingStatus: 'Posted', posterSupplyId: supplyId } : p
      ),
      auditLog: appendAudit(prev, 'all', `${poId} reconciled to Poster Supply ID ${supplyId}`),
    }))
    notify(`${poId} reconciled (${supplyId})`)
  }

  const handleRequestReport = (prId, branchId, note) => {
    setState((prev) => ({
      ...prev,
      discrepancies: [
        {
          id: `RPT-${410 + prev.discrepancies.length}`,
          branchId,
          type: 'Owner Report Request',
          refDoc: prId,
          itemName: `${prId} Verification`,
          expectedQty: 0,
          actualQty: 0,
          unit: '',
          unmatchedEgp: 0,
          owner: 'Noman · Cost Control',
          due: 'Today 18:00',
          nextAction: note,
          status: 'Open',
        },
        ...prev.discrepancies,
      ],
      auditLog: appendAudit(prev, branchId, `Owner requested report on ${prId}: ${note}`),
    }))
    notify(`Report request sent to Noman & Cost Control for ${prId}`)
  }

  const handleResolveCheck = (checkId) => {
    setState((prev) => ({
      ...prev,
      stockChecks: prev.stockChecks.map((c) => (c.id === checkId ? { ...c, status: 'Resolved' } : c)),
      auditLog: appendAudit(prev, 'all', `Stock check ${checkId} reviewed and resolved`),
    }))
    notify(`Stock check ${checkId} marked resolved`)
  }

  const handleAskForUpdate = (orderId, itemName) => {
    setState((prev) => ({
      ...prev,
      auditLog: appendAudit(prev, branchFilter, `Update requested from Mohamed Noman on ${orderId} (${itemName})`),
    }))
    notify(`Update request sent to Mohamed Noman for ${itemName}`)
  }

  const handleApproveFoodBatch = (prId, lineIds) => {
    setState((prev) => ({
      ...prev,
      prs: prev.prs.map((pr) =>
        pr.id !== prId
          ? pr
          : {
              ...pr,
              lines: pr.lines.map((l) =>
                lineIds.includes(l.lineId)
                  ? { ...l, needApproved: true, stage: 'Need approved', owner: 'Mona' }
                  : l
              ),
            }
      ),
      auditLog: appendAudit(prev, branchFilter, `${prId}: Approved ${lineIds.length} food line(s) & sent to Purchasing (WF02)`),
    }))
    notify(`Approved ${lineIds.length} food item(s) — sent to Purchasing`)
  }

  const handleReturnPRForClarification = (prId, note) => {
    setState((prev) => ({
      ...prev,
      prs: prev.prs.map((pr) =>
        pr.id !== prId
          ? pr
          : {
              ...pr,
              lines: pr.lines.map((l) =>
                !l.needApproved ? { ...l, stage: 'Returned for clarification', owner: pr.requester } : l
              ),
            }
      ),
      auditLog: appendAudit(prev, branchFilter, `${prId} returned for clarification: ${note}`),
    }))
    notify(`${prId} returned for clarification`)
  }

  const handleAddOrderNote = (orderId, noteText) => {
    setState((prev) => ({
      ...prev,
      pos: prev.pos.map((p) =>
        p.id === orderId
          ? { ...p, extraNotes: [...(p.extraNotes || []), { time: nowStr(), text: noteText }] }
          : p
      ),
      auditLog: appendAudit(prev, branchFilter, `Note/photo added on ${orderId}: ${noteText}`),
    }))
    notify(`Note added to ${orderId}`)
  }

  const handleSubmitDaily = ({ branchId, date, department, requestedBy, items }) => {
    const id = `DR-${202 + state.dailyRequests.length}`
    setState((prev) => ({
      ...prev,
      dailyRequests: [
        {
          id,
          branchId,
          date,
          department,
          requestedBy,
          sentTo: 'Cost Control (WhatsApp)',
          status: 'Sent to Cost Control',
          items,
        },
        ...prev.dailyRequests,
      ],
      auditLog: appendAudit(prev, branchId, `Daily Request ${id} (${department}) saved with ${items.length} items`),
    }))
    notify(`Daily Request ${id} saved`)
  }

  const handleSavePeriodic = ({ branchId, id, date, department, items }) => {
    const newId = id || `PER-00${state.periodicRequests.length + 1}`
    setState((prev) => ({
      ...prev,
      periodicRequests: [
        {
          id: newId,
          branchId,
          date,
          department,
          status: 'Waiting Restaurant Manager',
          step1: { approved: false, name: '', sig: '', time: '' },
          step2: { approved: false, name: '', sig: '', time: '' },
          step3: { approved: false, name: '', sig: '', time: '' },
          items,
        },
        ...prev.periodicRequests,
      ],
      auditLog: appendAudit(prev, branchId, `Periodic Request ${newId} created (${items.length} items)`),
    }))
    notify(`Periodic Request ${newId} saved`)
    return newId
  }

  const handleApprovePeriodicStep = (perId, stepNum, name, sig) => {
    const time = nowStr().slice(11, 16)
    setState((prev) => ({
      ...prev,
      periodicRequests: prev.periodicRequests.map((p) => {
        if (p.id !== perId) return p
        const next = { ...p }
        if (stepNum === 1) {
          next.step1 = { approved: true, name, sig, time }
          next.status = 'Waiting Cost Control'
        } else if (stepNum === 2) {
          next.step2 = { approved: true, name, sig, time }
          next.status = 'Waiting Owner Final Approval'
        } else if (stepNum === 3) {
          next.step3 = { approved: true, name, sig, time }
          next.status = 'Fully Approved'
        }
        return next
      }),
      auditLog: appendAudit(prev, branchFilter, `Periodic ${perId} Step ${stepNum} approved by ${name}`),
    }))
    notify(`Step ${stepNum} approved for ${perId}`)
  }

  const allNavItems = [
    { id: 'overview', label: t.overview, icon: Home },
    { id: 'daily_periodic', label: role.id === 'staff' ? (lang === 'ar' ? 'طلب يومي (Daily)' : 'Daily Request') : role.id === 'owner' ? (lang === 'ar' ? 'سجل اليومي والدوري' : 'Daily & Periodic') : (lang === 'ar' ? 'يومي ودوري' : 'Daily & Periodic'), icon: MessageSquare },
    { id: 'shortages', label: lang === 'ar' ? 'النواقص (وصل أقل)' : 'Shortages', icon: AlertTriangle },
    { id: 'new_request', label: t.newRequest, icon: PlusSquare },
    { id: 'my_requests', label: role.id === 'owner' ? (lang === 'ar' ? 'الطلبات والأوامر' : 'Requests & Orders') : t.myRequests, icon: FileText },
    { id: 'purchasing', label: t.purchasing, icon: ShoppingCart },
    { id: 'price_review', label: t.priceReview, icon: Tag },
    { id: 'deliveries', label: role.id === 'purchasing' ? (lang === 'ar' ? 'متابعة التوريدات' : 'Delivery tracking') : t.deliveries, icon: Truck },
    { id: 'stock_checks', label: t.stockChecks, icon: ClipboardList },
    { id: 'transfers', label: t.transfers, icon: ArrowRightLeft },
    { id: 'non_food', label: t.nonFood, icon: Layers },
    { id: 'accounting', label: t.accounting, icon: Calculator },
    { id: 'integrations', label: t.integrations, icon: Database },
    { id: 'history', label: t.history, icon: History },
  ]
  const navItems = allNavItems.filter((item) => role.navTabs.includes(item.id))

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{t.brand}</span>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.72)' }}>{t.brandSub}</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleNavigate(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: 3 }}>
            {lang === 'ar' ? role.labelAr : role.labelEn}
          </div>
          <div>{lang === 'ar' ? role.scopeNoteAr : role.scopeNoteEn}</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen((v) => !v)}>
              <Menu size={20} />
            </button>
            <div className="select-pill">
              <Store size={15} color="var(--primary)" />
              <span>{t.restaurant}:</span>
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {lang === 'ar' ? b.nameAr : b.name} {b.pilot ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="topbar-right">
            <div className="lang-toggle">
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
              <button className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>مصري</button>
            </div>

            <div className="role-pill" title="Switch user role">
              <UserCircle size={15} />
              <select value={roleId} onChange={(e) => handleRoleChange(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {lang === 'ar' ? r.labelAr : r.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btn-outline" style={{ minHeight: 38 }} onClick={handleResetDemo}>
              <RotateCcw size={14} /> {t.resetDemo}
            </button>
          </div>
        </header>

        <main className="page-body">
          {navHistory.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <button className="btn btn-outline" style={{ minHeight: 36, fontSize: 13 }} onClick={handleBack}>
                ← {lang === 'ar' ? 'رجوع للشاشة اللي فاتت' : 'Back to previous screen'}
              </button>
            </div>
          )}
          {activeTab === 'overview' && (
            <OverviewView
              state={state}
              branchFilter={branchFilter}
              role={role}
              lang={lang}
              t={t}
              onNavigate={handleNavigate}
              onApproveOwnerLine={handleApproveOwnerLine}
            />
          )}
          {activeTab === 'daily_periodic' && (
            <DailyPeriodicView
              state={state}
              branchFilter={branchFilter}
              role={role}
              lang={lang}
              onSubmitDaily={handleSubmitDaily}
              onSavePeriodic={handleSavePeriodic}
              onApprovePeriodicStep={handleApprovePeriodicStep}
            />
          )}
          {activeTab === 'shortages' && (
            <ShortagesView state={state} branchFilter={branchFilter} role={role} lang={lang} />
          )}
          {activeTab === 'new_request' && (
            <NewRequestView
              state={state}
              branchFilter={branchFilter}
              role={role}
              lang={lang}
              t={t}
              prefillOrderQty={prefillOrderQty}
              onClearPrefill={() => setPrefillOrderQty(null)}
              onSaveStockCheck={handleSaveStockCheck}
              onSubmitPR={handleSubmitPR}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'my_requests' && (
            <MyRequestsView
              state={state}
              branchFilter={branchFilter}
              role={role}
              lang={lang}
              onApproveNeed={handleApproveNeed}
              onApproveFoodBatch={handleApproveFoodBatch}
              onReturnPRForClarification={handleReturnPRForClarification}
              onRequestReport={handleRequestReport}
              onAskForUpdate={handleAskForUpdate}
              onAddOrderNote={handleAddOrderNote}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'purchasing' && (
            <PurchasingView
              state={state}
              branchFilter={branchFilter}
              role={role}
              lang={lang}
              t={t}
              onSendQuoteToCostControl={handleSendQuoteToCostControl}
              onCreatePO={handleCreatePO}
              onUpdatePOStatus={handleUpdatePOStatus}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'price_review' && (
            <PriceReviewView
              state={state}
              branchFilter={branchFilter}
              focusedLineId={focusedLineId}
              role={role}
              lang={lang}
              t={t}
              onApprovePrice={handleApprovePrice}
              onReturnPrice={handleReturnPrice}
              onRejectPrice={handleRejectPrice}
            />
          )}
          {activeTab === 'deliveries' && (
            <ReceivingView
              state={state}
              branchFilter={branchFilter}
              role={role}
              lang={lang}
              t={t}
              onConfirmReceipt={handleConfirmReceipt}
              onResolveDiscrepancy={handleResolveDiscrepancy}
            />
          )}
          {activeTab === 'transfers' && (
            <TransfersView
              state={state}
              lang={lang}
              onCreateTransfer={handleCreateTransfer}
              onAcceptTransfer={handleAcceptTransfer}
            />
          )}
          {activeTab === 'non_food' && (
            <NonFoodView state={state} branchFilter={branchFilter} lang={lang} />
          )}
          {activeTab === 'accounting' && (
            <AccountingView state={state} role={role} lang={lang} onMarkPosted={handleMarkPosted} />
          )}
          {activeTab === 'integrations' && (
            <IntegrationsView state={state} role={role} />
          )}
          {activeTab === 'history' && (
            <HistoryView state={state} branchFilter={branchFilter} lang={lang} />
          )}
          {activeTab === 'stock_checks' && (
            <StockChecksView
              state={state}
              branchFilter={branchFilter}
              role={role}
              lang={lang}
              onResolveCheck={handleResolveCheck}
              onSaveStockCheck={handleSaveStockCheck}
              onApplySuggestedOrder={(itemId, qty) => {
                setPrefillOrderQty({ itemId, qty })
                handleNavigate('new_request')
              }}
              onNavigate={handleNavigate}
            />
          )}
        </main>

        <footer className="bottom-meta">
          <span>V2.2 PROTOTYPE · L&C RESTAURANT GROUP · BOHO PILOT SCOPE</span>
          <span className="pill pill-green">
            <ClipboardList size={13} /> Poster snapshot · {state.posterSnapshot?.fetched_at_utc} (4 accounts)
          </span>
        </footer>
      </div>

      {/* Mobile Monobank-style Bottom Nav */}
      <nav className="mobile-bottom-nav">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`mobile-bottom-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 22,
            insetInlineEnd: 22,
            background: '#0e3a2a',
            color: '#fff',
            padding: '11px 16px',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 100,
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
