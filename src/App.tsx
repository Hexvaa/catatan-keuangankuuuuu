import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { supabase } from "./lib/supabase"
import type { User } from "@supabase/supabase-js"
import AuthScreen from "./AuthScreen"

type TransType = "income" | "expense"
interface Transaction {
  id: string; type: TransType; category: string; label: string; amount: number; date: string
}

const INCOME_CATS  = ["Gaji","Freelance","Investasi","Bisnis","Bonus","Hadiah","Sewa","Lainnya"]
const EXPENSE_CATS = ["Makan","Transportasi","Belanja","Tagihan","Hiburan","Kesehatan","Pendidikan","Tabungan","Donasi","Lainnya"]

const CAT_ICON: Record<string, string> = {
  Gaji: "💼", Freelance: "🖥️", Investasi: "📈", Bisnis: "🏢", Bonus: "🎯", Hadiah: "🎁", Sewa: "🏠",
  Makan: "🍜", Transportasi: "🚗", Belanja: "🛍️", Tagihan: "⚡", Hiburan: "🎬",
  Kesehatan: "💊", Pendidikan: "📚", Tabungan: "🏦", Donasi: "❤️", Lainnya: "📦",
}
const MONTHS   = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]
const MONTHS_S = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]

// ─── Themes ───────────────────────────────────────────────────────────────────

type ThemeMode = "dark" | "light" | "system"

const DARK = {
  bg:       "#080810",
  surface:  "#0f0f1a",
  card:     "#131320",
  border:   "rgba(255,255,255,0.06)",
  text:     "#eeeeff",
  sub:      "rgba(238,238,255,0.5)",
  muted:    "rgba(238,238,255,0.28)",
  green:    "#34d399",
  greenDim: "rgba(52,211,153,0.13)",
  red:      "#f87171",
  redDim:   "rgba(248,113,113,0.13)",
  accent:   "#a78bfa",
  accentDim:"rgba(167,139,250,0.16)",
  grad:     "linear-gradient(135deg,#6d28d9 0%,#7c3aed 50%,#a78bfa 100%)",
  meshA:    "rgba(109,40,217,0.28)",
  meshB:    "rgba(16,185,129,0.12)",
  meshC:    "rgba(79,70,229,0.1)",
  gridColor:"rgba(255,255,255,0.8)",
}

const LIGHT = {
  bg:       "#f4f3f8",
  surface:  "#ebe9f4",
  card:     "#ffffff",
  border:   "rgba(109,40,217,0.1)",
  text:     "#18162a",
  sub:      "rgba(24,22,42,0.55)",
  muted:    "rgba(24,22,42,0.38)",
  green:    "#059669",
  greenDim: "rgba(5,150,105,0.1)",
  red:      "#dc2626",
  redDim:   "rgba(220,38,38,0.09)",
  accent:   "#6d28d9",
  accentDim:"rgba(109,40,217,0.12)",
  grad:     "linear-gradient(135deg,#5b21b6 0%,#7c3aed 60%,#a78bfa 100%)",
  meshA:    "rgba(109,40,217,0.1)",
  meshB:    "rgba(5,150,105,0.07)",
  meshC:    "rgba(79,70,229,0.06)",
  gridColor:"rgba(0,0,0,0.55)",
}

const AUTO = {
  bg:       "#0d0d0d",
  surface:  "#141414",
  card:     "#1a1a1a",
  border:   "rgba(255,255,255,0.07)",
  text:     "#ffffff",
  sub:      "rgba(255,255,255,0.55)",
  muted:    "rgba(255,255,255,0.32)",
  green:    "#22c55e",
  greenDim: "rgba(34,197,94,0.12)",
  red:      "#ef4444",
  redDim:   "rgba(239,68,68,0.12)",
  accent:   "#f59e0b",
  accentDim:"rgba(245,158,11,0.14)",
  grad:     "linear-gradient(135deg,#f59e0b 0%,#f97316 100%)",
  meshA:    "rgba(245,158,11,0.1)",
  meshB:    "rgba(249,115,22,0.07)",
  meshC:    "rgba(234,179,8,0.06)",
  gridColor:"rgba(255,255,255,0.8)",
}

function useThemePalette(mode: ThemeMode) {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    if (mode === "dark")   { setIsDark(true);  return }
    if (mode === "light")  { setIsDark(false); return }
    if (mode === "system") { return }
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    setIsDark(mq.matches)
    const fn = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [mode])
  if (mode === "system") return AUTO
  return isDark ? DARK : LIGHT
}

interface Toast { id: string; type: TransType; amount: number }

// keep C as alias — replaced dynamically in App
let C = DARK

// ─── Seed ─────────────────────────────────────────────────────────────────────

function seed(): Transaction[] {
  const now = new Date()
  const y  = now.getFullYear()
  const cm = String(now.getMonth()+1).padStart(2,"0")
  const pm = String(now.getMonth()===0 ? 12 : now.getMonth()).padStart(2,"0")
  const py = now.getMonth()===0 ? y-1 : y
  return [
    {id:"1",  type:"income",  category:"Gaji",         label:"Gaji Bulanan",        amount:8500000, date:`${y}-${cm}-01`},
    {id:"2",  type:"income",  category:"Freelance",    label:"Proyek Website",       amount:2750000, date:`${y}-${cm}-07`},
    {id:"3",  type:"income",  category:"Investasi",    label:"Dividen Reksa Dana",   amount:450000,  date:`${y}-${cm}-12`},
    {id:"4",  type:"expense", category:"Makan",        label:"Groceries & Warung",   amount:820000,  date:`${y}-${cm}-04`},
    {id:"5",  type:"expense", category:"Transportasi", label:"Bensin & Parkir",      amount:310000,  date:`${y}-${cm}-08`},
    {id:"6",  type:"expense", category:"Tagihan",      label:"Listrik & Internet",   amount:580000,  date:`${y}-${cm}-10`},
    {id:"7",  type:"expense", category:"Hiburan",      label:"Netflix & Spotify",    amount:180000,  date:`${y}-${cm}-14`},
    {id:"8",  type:"expense", category:"Belanja",      label:"Pakaian",              amount:650000,  date:`${y}-${cm}-17`},
    {id:"9",  type:"expense", category:"Kesehatan",    label:"Vitamin & Apotek",     amount:220000,  date:`${y}-${cm}-20`},
    {id:"10", type:"income",  category:"Bisnis",       label:"Penjualan Online",     amount:1200000, date:`${y}-${cm}-22`},
    {id:"11", type:"expense", category:"Makan",        label:"Makan Bersama Teman", amount:430000,  date:`${y}-${cm}-25`},
    {id:"12", type:"income",  category:"Gaji",         label:"Gaji Bulanan",         amount:8500000, date:`${py}-${pm}-01`},
    {id:"13", type:"expense", category:"Makan",        label:"Groceries",            amount:890000,  date:`${py}-${pm}-06`},
    {id:"14", type:"expense", category:"Tagihan",      label:"Semua Tagihan",        amount:610000,  date:`${py}-${pm}-09`},
    {id:"15", type:"income",  category:"Freelance",    label:"Desain Logo",          amount:1800000, date:`${py}-${pm}-15`},
    {id:"16", type:"expense", category:"Belanja",      label:"Gadget Aksesoris",     amount:960000,  date:`${py}-${pm}-22`},
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const idr = (n: number) => new Intl.NumberFormat("id-ID").format(n)
const rp  = (n: number) => "Rp " + idr(n)

// ─── Animated counter ─────────────────────────────────────────────────────────

function Counter({ value }: { value: number }) {
  const [cur, setCur] = useState(0)
  const prev = useRef(0), raf = useRef(0)
  useEffect(() => {
    const from=prev.current, t0=performance.now()
    const tick=(now:number)=>{
      const p=Math.min((now-t0)/700,1), e=1-Math.pow(1-p,3)
      setCur(Math.round(from+(value-from)*e))
      if(p<1) raf.current=requestAnimationFrame(tick); else prev.current=value
    }
    raf.current=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf.current)
  },[value])
  return <>{idr(cur)}</>
}

// ─── Calendar Indicator ───────────────────────────────────────────────────────

const DAYS_LABEL = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"]

function CalendarIndicator({ year, month, txns }: { year:number; month:number; txns:Transaction[] }) {
  const [tooltip, setTooltip] = useState<{day:number; x:number; y:number} | null>(null)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = new Date(year, month, 1).getDay()

  const byDate = useMemo(() => {
    const map: Record<number, {inc:number; exp:number; count:number}> = {}
    txns.forEach(t => {
      const d = new Date(t.date + "T00:00:00")
      if (d.getMonth() !== month || d.getFullYear() !== year) return
      const day = d.getDate()
      if (!map[day]) map[day] = {inc:0, exp:0, count:0}
      map[day].count++
      if (t.type === "income")  map[day].inc  += t.amount
      else                       map[day].exp  += t.amount
    })
    return map
  }, [txns, year, month])

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const cells: (number|null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
  ]
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const tooltipData = tooltip ? byDate[tooltip.day] : null

  return (
    <div style={{ position:"relative" }}>
      {/* Day labels */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
        {DAYS_LABEL.map(d => (
          <p key={d} style={{ textAlign:"center", fontSize:9, fontWeight:600, color:C.muted,
            letterSpacing:"0.05em", textTransform:"uppercase" }}>{d}</p>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i}/>
          const data   = byDate[day]
          const isToday = isCurrentMonth && today.getDate() === day
          const hasInc  = data && data.inc  > 0
          const hasExp  = data && data.exp  > 0
          const hasBoth = hasInc && hasExp

          let bg = "transparent"
          let border = `1px solid ${C.border}`
          let textColor = C.muted
          if (hasBoth)  { bg = "rgba(167,139,250,0.15)"; border = `1px solid rgba(167,139,250,0.4)`; textColor = C.accent }
          else if (hasInc) { bg = C.greenDim; border = `1px solid rgba(74,222,128,0.35)`; textColor = C.green }
          else if (hasExp) { bg = C.redDim;   border = `1px solid rgba(248,113,113,0.35)`; textColor = C.red }

          return (
            <div key={i}
              onMouseEnter={e => {
                if (!data) return
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const parent = (e.currentTarget as HTMLElement).closest("[data-cal]")?.getBoundingClientRect()
                setTooltip({ day, x: r.left - (parent?.left ?? 0) + r.width/2, y: r.top - (parent?.top ?? 0) })
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ position:"relative", aspectRatio:"1", borderRadius:7, border,
                background: isToday ? C.accentDim : bg,
                outline: isToday ? `2px solid ${C.accent}` : "none",
                outlineOffset:1, cursor: data ? "default" : "default",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:2, transition:"transform 0.15s",
              }}>
              <span style={{ fontSize:10, fontWeight: data ? 700 : 500, color: isToday ? C.accent : textColor, lineHeight:1 }}>{day}</span>
              {/* Dot indicators */}
              {data && (
                <div style={{ display:"flex", gap:2 }}>
                  {hasInc && <span style={{ width:3, height:3, borderRadius:"50%", background:C.green, boxShadow:`0 0 4px ${C.green}` }}/>}
                  {hasExp && <span style={{ width:3, height:3, borderRadius:"50%", background:C.red,   boxShadow:`0 0 4px ${C.red}` }}/>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tooltip */}
      {tooltip && tooltipData && (
        <div style={{ position:"absolute", top: tooltip.y - 72, left: Math.min(Math.max(tooltip.x - 72, 0), 290),
          width:144, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
          padding:"10px 12px", zIndex:20, pointerEvents:"none",
          boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.text, marginBottom:6 }}>
            {tooltip.day} {MONTHS_S[month]} {year}
          </p>
          {tooltipData.inc > 0 && (
            <p style={{ fontSize:11, color:C.green, fontFamily:"DM Mono, monospace", marginBottom:2 }}>
              +{rp(tooltipData.inc)}
            </p>
          )}
          {tooltipData.exp > 0 && (
            <p style={{ fontSize:11, color:C.red, fontFamily:"DM Mono, monospace" }}>
              −{rp(tooltipData.exp)}
            </p>
          )}
          <p style={{ fontSize:10, color:C.muted, marginTop:4 }}>{tooltipData.count} transaksi</p>
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", gap:12, marginTop:10, justifyContent:"flex-end" }}>
        {[
          {color:C.green, label:"Pemasukan"},
          {color:C.red,   label:"Pengeluaran"},
        ].map(l => (
          <span key={l.label} style={{ display:"flex", alignItems:"center", gap:4, fontSize:9, color:C.muted }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:l.color, display:"inline-block" }}/>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Spend bar ────────────────────────────────────────────────────────────────

function MonthChart({ income, expense, showAmounts, plain }: { income: number; expense: number; showAmounts: boolean; plain: boolean }) {
  const total   = income + expense
  const pct     = income > 0 ? Math.min((expense / income) * 100, 100) : 0
  const safe    = pct < 70
  const r       = 44
  const circ    = 2 * Math.PI * r
  const incPct  = total > 0 ? income / total : 0.5
  const expPct  = total > 0 ? expense / total : 0
  const incDash = incPct * circ
  const expDash = expPct * circ
  const saldo   = income - expense

  return (
    <div style={{ display:"flex", alignItems:"center", gap:20 }}>
      {/* Donut */}
      <div style={{ position:"relative", flexShrink:0, width:100, height:100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform:"rotate(-90deg)" }}>
          {/* Track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10"/>
          {/* Income arc */}
          <circle cx="50" cy="50" r={r} fill="none"
            stroke={C.green} strokeWidth="10" strokeLinecap="butt"
            strokeDasharray={`${incDash} ${circ - incDash}`}
            strokeDashoffset="0"
            style={{ transition:"stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}/>
          {/* Expense arc */}
          <circle cx="50" cy="50" r={r} fill="none"
            stroke={C.red} strokeWidth="10" strokeLinecap="butt"
            strokeDasharray={`${expDash} ${circ - expDash}`}
            strokeDashoffset={`${-incDash}`}
            style={{ transition:"stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}/>
        </svg>
        {/* Center label */}
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <p style={{ fontFamily:"DM Mono, monospace", fontSize:13, fontWeight:700,
            color: safe ? C.green : C.red, lineHeight:1 }}>{pct.toFixed(0)}%</p>
          <p style={{ fontSize:9, color:C.muted, marginTop:3, fontWeight:600, letterSpacing:"0.05em" }}>terpakai</p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { label:"Pemasukan",   value:income,  color:C.green, dot:C.green },
          { label:"Pengeluaran", value:expense, color:C.red,   dot:C.red   },
        ].map(s=>(
          <div key={s.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:s.dot, flexShrink:0 }}/>
              <p style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{s.label}</p>
            </div>
            <p style={{ fontFamily:"DM Mono, monospace", fontSize:12, fontWeight:600, color:plain?C.text:s.color }}>
              {showAmounts ? rp(Math.abs(s.value)) : "••••••"}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ txn, onSave, onDelete, onClose }: {
  txn: Transaction
  onSave: (t: Transaction) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [type,  setType]  = useState<TransType>(txn.type)
  const [cat,   setCat]   = useState(txn.category)
  const [label, setLabel] = useState(txn.label)
  const [amount, setAmt]  = useState(idr(txn.amount))
  const [date,  setDate]  = useState(txn.date)
  const [confirmDel, setConfirmDel] = useState(false)

  const cats     = type === "income" ? INCOME_CATS : EXPENSE_CATS
  const rawAmount = amount.replace(/\./g, "")
  const valid     = !!cat && parseInt(rawAmount) > 0

  const handleAmount = (val: string) => {
    const digits = val.replace(/\D/g, "")
    setAmt(digits === "" ? "" : parseInt(digits).toLocaleString("id-ID"))
  }

  const save = () => {
    if (!valid) return
    onSave({ ...txn, type, category: cat, label: label || cat, amount: parseInt(rawAmount), date })
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", fontSize: 14,
    border: `1px solid ${C.border}`, borderRadius: 10,
    background: "rgba(255,255,255,0.05)", color: C.text, outline: "none",
    fontFamily: "Instrument Sans, sans-serif",
  }

  return (
    <div className="ai" style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center",
      background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)", padding:"20px" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="au" style={{ width:"100%", maxWidth:360, borderRadius:20, overflow:"hidden",
        background:C.card, border:`1px solid ${C.border}`,
        boxShadow:"0 24px 60px rgba(0,0,0,0.35)" }}>

        <div style={{ padding: "22px 22px 0", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: C.grad, borderRadius: "16px 16px 0 0" }}/>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <p style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 400, color: C.text }}>Edit Transaksi</p>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 16 }}>✕</button>
          </div>

          {/* Type toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 3, marginBottom: 18 }}>
            {(["expense", "income"] as TransType[]).map(t => (
              <button key={t} onClick={() => { setType(t); setCat("") }}
                style={{ flex: 1, padding: "7px 0", fontSize: 13, border: "none", cursor: "pointer",
                  fontFamily: "Instrument Sans, sans-serif", borderRadius: 7, transition: "all 0.15s",
                  background: type === t ? (t === "income" ? C.greenDim : C.redDim) : "transparent",
                  color: type === t ? (t === "income" ? C.green : C.red) : C.muted,
                  boxShadow: type === t ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
                }}>
                {t === "income" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 22 }}>
            {/* Kategori */}
            <div>
              <p style={{ fontSize: 11, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Kategori</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${cat === c ? C.accent : C.border}`,
                      background: cat === c ? C.accentDim : "transparent",
                      color: cat === c ? C.accent : C.sub,
                      fontFamily: "Instrument Sans, sans-serif", transition: "all 0.12s",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                    <span>{CAT_ICON[c] ?? "📦"}</span><span>{c}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <p style={{ fontSize: 11, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>
                Keterangan
                <span style={{ marginLeft: 6, fontSize: 10, fontStyle: "italic", color: C.muted, textTransform: "none", letterSpacing: 0 }}>· opsional</span>
              </p>
              <input style={inp} type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Opsional"/>
            </div>

            {/* Jumlah */}
            <div>
              <p style={{ fontSize: 11, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>Jumlah (Rp)</p>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 600, color: C.sub, pointerEvents: "none", fontFamily: "DM Mono, monospace" }}>Rp</span>
                <input
                  style={{ ...inp, paddingLeft: 38, fontFamily: "DM Mono, monospace", fontSize: 15, fontWeight: 500 }}
                  type="text" inputMode="numeric"
                  value={amount}
                  onChange={e => handleAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Tanggal */}
            <div>
              <p style={{ fontSize: 11, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>Tanggal</p>
              <input style={{ ...inp, fontSize:15, fontWeight:600, color:C.text }} type="date" value={date} onChange={e => setDate(e.target.value)}/>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
          {/* Delete */}
          {confirmDel ? (
            <>
              <button onClick={() => onDelete(txn.id)}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: C.red, color: "#fff", fontFamily: "Instrument Sans, sans-serif" }}>
                Hapus!
              </button>
              <button onClick={() => setConfirmDel(false)}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.sub, fontSize: 13, cursor: "pointer", fontFamily: "Instrument Sans, sans-serif" }}>
                Batal
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmDel(true)}
                title="Hapus transaksi"
                style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${C.red}44`, background: C.redDim, cursor: "pointer", color: C.red, display: "flex", alignItems: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
              <button onClick={onClose}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.sub, fontSize: 13, cursor: "pointer", fontFamily: "Instrument Sans, sans-serif" }}>
                Batal
              </button>
              <button onClick={save} disabled={!valid}
                style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: valid ? "pointer" : "not-allowed",
                  background: valid ? C.grad : "rgba(255,255,255,0.06)",
                  color: valid ? "#fff" : C.muted,
                  fontFamily: "Instrument Sans, sans-serif",
                  boxShadow: valid ? "0 4px 20px rgba(124,58,237,0.4)" : "none",
                }}>
                Simpan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Add Modal ────────────────────────────────────────────────────────────────

function AddModal({ onSave, onClose }: { onSave:(t:Transaction)=>void; onClose:()=>void }) {
  const [type, setType]   = useState<TransType>("expense")
  const [cat,  setCat]    = useState("")
  const [label, setLabel] = useState("")
  const [amount, setAmt]  = useState("")
  const [date,  setDate]  = useState(new Date().toISOString().slice(0,10))

  const cats  = type==="income" ? INCOME_CATS : EXPENSE_CATS
  const rawAmount = amount.replace(/\./g, "")
  const valid = !!cat && parseInt(rawAmount) > 0

  const handleAmount = (val: string) => {
    const digits = val.replace(/\D/g, "")
    const formatted = digits === "" ? "" : parseInt(digits).toLocaleString("id-ID")
    setAmt(formatted)
  }

  const save  = () => {
    if(!valid) return
    onSave({id:Date.now().toString(), type, category:cat, label:label||cat, amount:parseInt(rawAmount), date})
  }

  const inp: React.CSSProperties = {
    width:"100%", padding:"10px 12px", fontSize:14,
    border:`1px solid ${C.border}`, borderRadius:10,
    background:"rgba(255,255,255,0.05)", color:C.text, outline:"none",
    fontFamily:"Instrument Sans, sans-serif",
  }

  return (
    <div className="ai" style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center",
      background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)", padding:"20px" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="au" style={{ width:"100%", maxWidth:360, borderRadius:20, overflow:"hidden",
        background:C.card, border:`1px solid ${C.border}`,
        boxShadow:"0 24px 60px rgba(0,0,0,0.35)" }}>

        <div style={{ padding:"22px 22px 0" }}>
          {/* Top border accent */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:C.grad, borderRadius:"16px 16px 0 0" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <p style={{ fontFamily:"Fraunces, serif", fontSize:20, fontWeight:400, color:C.text }}>Transaksi Baru</p>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:16 }}>✕</button>
          </div>

          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:10, padding:3, marginBottom:18 }}>
            {(["expense","income"] as TransType[]).map(t=>(
              <button key={t} onClick={()=>{setType(t);setCat("")}}
                style={{ flex:1, padding:"7px 0", fontSize:13, border:"none", cursor:"pointer",
                  fontFamily:"Instrument Sans, sans-serif", borderRadius:7, transition:"all 0.15s",
                  background: type===t ? (t==="income"?C.greenDim:C.redDim) : "transparent",
                  color: type===t ? (t==="income"?C.green:C.red) : C.muted,
                  boxShadow: type===t ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
                }}>
                {t==="income" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14, paddingBottom:22 }}>
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Kategori</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {cats.map(c=>(
                  <button key={c} onClick={()=>setCat(c)}
                    style={{ padding:"6px 12px", fontSize:12, borderRadius:8, cursor:"pointer",
                      border:`1px solid ${cat===c ? C.accent : C.border}`,
                      background: cat===c ? C.accentDim : "transparent",
                      color: cat===c ? C.accent : C.sub,
                      fontFamily:"Instrument Sans, sans-serif", transition:"all 0.12s",
                      display:"flex", alignItems:"center", gap:5,
                    }}>
                    <span>{CAT_ICON[c] ?? "📦"}</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>
                Keterangan
                <span style={{ marginLeft:6, fontSize:10, color:C.muted, textTransform:"none", letterSpacing:0, fontStyle:"italic" }}>· opsional</span>
              </p>
              <input style={inp} type="text" value={label} onChange={e=>setLabel(e.target.value)} placeholder="Opsional"/>
            </div>

            {/* Jumlah */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Jumlah (Rp)</p>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, fontWeight:600, color:C.sub, pointerEvents:"none", fontFamily:"DM Mono, monospace" }}>Rp</span>
                <input
                  style={{ ...inp, paddingLeft:38, fontFamily:"DM Mono, monospace", fontSize:15, fontWeight:500, letterSpacing:"0.02em" }}
                  type="text" inputMode="numeric"
                  value={amount}
                  onChange={e => handleAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Tanggal */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Tanggal</p>
              <input style={inp} type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
          </div>
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:11, borderRadius:10, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.07)", color:"#ef4444", fontSize:13, cursor:"pointer", fontFamily:"Instrument Sans, sans-serif" }}>
            Batal
          </button>
          <button onClick={save} disabled={!valid}
            style={{ flex:2, padding:11, borderRadius:10, border:"none", fontSize:13, fontWeight:600, cursor:valid?"pointer":"not-allowed",
              background: valid ? C.grad : "rgba(255,255,255,0.06)",
              color: valid ? "#fff" : C.muted,
              fontFamily:"Instrument Sans, sans-serif", transition:"opacity 0.15s",
              boxShadow: valid ? "0 4px 20px rgba(124,58,237,0.4)" : "none",
            }}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

// ─── Landing Page ─────────────────────────────────────────────────────────────

function ReviewCarousel() {
  const reviews = [
    { name:"Andi S.", text:"Akhirnya bisa tahu uang kemana aja!", stars:5, avatar:"👨‍💼" },
    { name:"Rina D.", text:"Simpel banget, cocok buat harian!", stars:5, avatar:"👩‍🎓" },
    { name:"Budi K.", text:"Grafik donutnya keren, mudah dipahami.", stars:5, avatar:"👨‍🍳" },
    { name:"Sari W.", text:"Suka banget fitur kalender aktivitasnya!", stars:5, avatar:"👩‍💻" },
    { name:"Dani R.", text:"Akhirnya nabung lebih disiplin!", stars:5, avatar:"👨‍🎨" },
    { name:"Maya T.", text:"Laporan bulanannya sangat membantu!", stars:5, avatar:"👩‍🏫" },
    { name:"Reza F.", text:"Desainnya cantik, enak dipandang!", stars:5, avatar:"👨‍💻" },
    { name:"Nisa A.", text:"Ga perlu Excel lagi, ini lebih praktis!", stars:5, avatar:"👩‍🍳" },
    { name:"Heru M.", text:"Fitur multi tema-nya keren banget!", stars:5, avatar:"👨‍🔧" },
    { name:"Dewi P.", text:"Catat pengeluaran jadi kebiasaan baik!", stars:5, avatar:"👩‍🎤" },
  ]
  const doubled = [...reviews, ...reviews]
  return (
    <div style={{ width:"100vw", marginLeft:"calc(-50vw + 50%)", marginTop:48, overflow:"hidden" }}>
      <p style={{ fontFamily:"Fraunces, serif", fontStyle:"italic", fontSize:13,
        color:"rgba(0,0,0,0.35)", marginBottom:16, textAlign:"center" }}>
        ⭐ Dipercaya pengguna setiap hari
      </p>
      <div style={{ display:"flex", gap:12, animation:"marquee-scroll 28s linear infinite", width:"max-content", padding:"4px 0 12px" }}>
        {doubled.map((r,i) => (
          <div key={i} style={{
            background:"rgba(255,255,255,0.8)", border:"1px solid rgba(0,0,0,0.07)",
            borderRadius:16, padding:"14px 16px", backdropFilter:"blur(10px)",
            boxShadow:"0 4px 20px rgba(0,0,0,0.06)", width:220, flexShrink:0,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ fontSize:24 }}>{r.avatar}</span>
              <div>
                <p style={{ fontFamily:"Fraunces, serif", fontWeight:700, fontSize:13, color:"#1a1a1a" }}>{r.name}</p>
                <p style={{ fontSize:11, color:"#c8a84b", letterSpacing:1 }}>{"★".repeat(r.stars)}</p>
              </div>
            </div>
            <p style={{ fontFamily:"Fraunces, serif", fontStyle:"italic", fontSize:12, color:"rgba(0,0,0,0.5)", lineHeight:1.65 }}>"{r.text}"</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function LandingPage({ onStart }: { onStart: () => void }) {
  const features = [
    { icon:"📊", title:"Ringkasan Visual", desc:"Grafik bulanan yang jelas" },
    { icon:"📅", title:"Kalender Aktivitas", desc:"Pantau aktivitas tiap hari" },
    { icon:"🔒", title:"Akun Pribadi", desc:"Data aman, tiap user terpisah" },
    { icon:"🌙", title:"3 Tema Tampilan", desc:"Dark, Light, dan Auto mode" },
  ]
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#faf7f2 0%,#f0ebe3 40%,#e8e0d5 100%)", fontFamily:"Instrument Sans, sans-serif", overflowX:"hidden" }}>
      <div style={{ position:"fixed", width:500, height:500, borderRadius:"50%", top:-180, right:-150,
        background:"radial-gradient(circle,rgba(210,190,160,0.35) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>
      <div style={{ position:"fixed", width:350, height:350, borderRadius:"50%", bottom:-120, left:-80,
        background:"radial-gradient(circle,rgba(180,200,180,0.25) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>

      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center",
        padding:"64px 24px 60px", textAlign:"center" }}>

        {/* Badge */}
        <div className="au" style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"5px 16px",
          borderRadius:99, border:"1px solid rgba(0,0,0,0.12)", background:"rgba(0,0,0,0.06)", marginBottom:36 }}>
          <span style={{ fontSize:11 }}>✦</span>
          <span style={{ fontSize:11, color:"rgba(0,0,0,0.5)", fontWeight:600, letterSpacing:"0.08em" }}>GRATIS · MUDAH · AMAN</span>
        </div>

        {/* Title */}
        <div className="au" style={{ animationDelay:"0.07s", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center" }}>
            <p style={{ fontFamily:"Fraunces, serif", fontSize:"clamp(40px,9vw,68px)", fontWeight:700, fontStyle:"italic",
              color:"#1a1a1a", lineHeight:1.05, letterSpacing:"-1px" }}>Catatan</p>
            <div style={{ position:"relative", width:52, height:60, flexShrink:0 }}>
              {/* Flying money bills */}
              <svg className="money-1" width="20" height="12" viewBox="0 0 20 12" style={{ position:"absolute", top:8, left:6, zIndex:2 }}>
                <rect width="20" height="12" rx="2" fill="#4ade80"/>
                <text x="3" y="9" fontSize="6" fill="#15803d" fontWeight="bold">Rp</text>
              </svg>
              <svg className="money-2" width="18" height="11" viewBox="0 0 18 11" style={{ position:"absolute", top:10, right:4, zIndex:2 }}>
                <rect width="18" height="11" rx="2" fill="#22c55e"/>
                <text x="2" y="8" fontSize="5" fill="#14532d" fontWeight="bold">Rp</text>
              </svg>
              <svg className="money-3" width="14" height="9" viewBox="0 0 14 9" style={{ position:"absolute", top:12, left:16, zIndex:2 }}>
                <rect width="14" height="9" rx="2" fill="#86efac"/>
                <text x="2" y="7" fontSize="4" fill="#15803d" fontWeight="bold">$</text>
              </svg>
              {/* Wallet */}
              <svg className="wallet-anim" width="52" height="44" viewBox="0 0 72 58" fill="none" style={{ position:"absolute", bottom:0 }}>
                <rect x="4" y="10" width="64" height="44" rx="9" fill="#8B5E3C"/>
                <rect x="4" y="10" width="64" height="44" rx="9" fill="url(#ws3)"/>
                <path d="M4 20 Q4 10 13 10 H59 Q68 10 68 20 H4Z" fill="#A0714F"/>
                <rect x="46" y="24" width="22" height="18" rx="5" fill="#6B4226"/>
                <circle className="coin-anim" cx="57" cy="33" r="5" fill="#22c55e" style={{ transformOrigin:"57px 33px" }}/>
                <circle cx="57" cy="33" r="3" fill="#16a34a"/>
                <defs>
                  <linearGradient id="ws3" x1="4" y1="10" x2="4" y2="54" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="rgba(255,255,255,0.1)"/>
                    <stop offset="1" stopColor="rgba(0,0,0,0.18)"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <p style={{ fontFamily:"Fraunces, serif", fontSize:"clamp(40px,9vw,68px)", fontWeight:700, fontStyle:"italic",
            color:"#1a1a1a", lineHeight:1.05, letterSpacing:"-1px" }}>Keuanganku</p>
        </div>

        {/* Tagline */}
        <p className="au" style={{ animationDelay:"0.13s", fontFamily:"Fraunces, serif", fontStyle:"italic",
          fontSize:16, color:"rgba(0,0,0,0.4)", maxWidth:320, lineHeight:1.8, marginBottom:36 }}>
          Catat pemasukan & pengeluaran harian.<br/>Lihat kemana uangmu pergi.
        </p>

        {/* CTA */}
        <div className="au" style={{ animationDelay:"0.18s", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <button onClick={onStart}
            style={{ padding:"14px 44px", fontSize:15, fontWeight:700, border:"none", cursor:"pointer",
              borderRadius:14, color:"#fff", fontFamily:"Fraunces, serif", fontStyle:"italic",
              background:"#1a1a1a",
              boxShadow:"0 8px 28px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
              transition:"transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-3px)";(e.currentTarget as HTMLElement).style.boxShadow="0 14px 36px rgba(0,0,0,0.3)"}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(0)";(e.currentTarget as HTMLElement).style.boxShadow="0 8px 28px rgba(0,0,0,0.2)"}}>
            Mulai Sekarang →
          </button>
          <p style={{ fontSize:11, color:"rgba(0,0,0,0.3)" }}>Daftar Gratis · Langsung Pakai</p>
        </div>

        {/* Stats */}
        <div className="au" style={{ animationDelay:"0.25s", display:"flex", gap:0, marginTop:52, borderRadius:16,
          background:"rgba(255,255,255,0.6)", border:"1px solid rgba(0,0,0,0.08)", overflow:"hidden",
          backdropFilter:"blur(8px)" }}>
          {[
            { value:"100%", label:"Gratis Selamanya", icon:"🎉" },
            { value:"🔒", label:"Privasi Terjaga", icon:"" },
            { value:"∞", label:"Banyak Pengguna", icon:"👥" },
          ].map((s,i)=>(
            <div key={s.label} style={{ textAlign:"center", padding:"18px 22px",
              borderRight: i<2 ? "1px solid rgba(0,0,0,0.07)" : "none" }}>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:26, fontWeight:700, fontStyle:"italic", color:"#1a1a1a", marginBottom:6, lineHeight:1 }}>{s.value}</p>
              <p style={{ fontFamily:"Instrument Sans, sans-serif", fontSize:10, fontWeight:700, color:"rgba(0,0,0,0.4)", letterSpacing:"0.08em", textTransform:"uppercase" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:44, width:"100%", maxWidth:400 }}>
          {features.map((f,i)=>(
            <div key={f.title} className="au feature-card"
              style={{ animationDelay:`${0.3+i*0.07}s`,
                background:"rgba(255,255,255,0.6)", border:"1px solid rgba(0,0,0,0.07)",
                borderRadius:16, padding:"18px 16px", textAlign:"left", backdropFilter:"blur(10px)",
                boxShadow:"0 2px 12px rgba(0,0,0,0.05)", cursor:"default",
                transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background 0.3s ease",
                position:"relative", overflow:"hidden" }}
              onMouseEnter={e=>{
                const el = e.currentTarget as HTMLElement
                el.style.transform="translateY(-6px) scale(1.03)"
                el.style.boxShadow="0 16px 40px rgba(0,0,0,0.13)"
                el.style.background="rgba(255,255,255,0.92)"
              }}
              onMouseLeave={e=>{
                const el = e.currentTarget as HTMLElement
                el.style.transform="translateY(0) scale(1)"
                el.style.boxShadow="0 2px 12px rgba(0,0,0,0.05)"
                el.style.background="rgba(255,255,255,0.6)"
              }}>
              <div className="feature-shimmer"/>
              <span style={{ fontSize:24, display:"block", marginBottom:10 }}>{f.icon}</span>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:13, fontWeight:700, fontStyle:"italic", color:"#1a1a1a", marginBottom:5 }}>{f.title}</p>
              <p style={{ fontFamily:"Instrument Sans, sans-serif", fontSize:11, color:"rgba(0,0,0,0.45)", lineHeight:1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <ReviewCarousel />

        <p className="au" style={{ animationDelay:"0.72s", marginTop:44, fontSize:14, color:"rgba(0,0,0,0.35)", fontFamily:"Fraunces, serif", fontStyle:"italic" }}>
          Sudah punya akun?{" "}
          <button onClick={onStart} style={{ background:"none", border:"none", cursor:"pointer",
            color:"#1a1a1a", fontSize:15, fontFamily:"Fraunces, serif", fontStyle:"italic",
            fontWeight:700, textDecoration:"underline", textUnderlineOffset:3 }}>
            Masuk di sini
          </button>
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const now = new Date()
  const [month, setMonth]   = useState(now.getMonth())
  const [year]              = useState(now.getFullYear())
  const [user, setUser]         = useState<User|null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [txns, setTxns]     = useState<Transaction[]>([])
  const [welcomeName, setWelcomeName] = useState<string|null>(null)
  const [showAdd, setAdd]   = useState(false)
  const [filter, setFilter] = useState<"all"|"income"|"expense">("all")
  const [themeMode, setThemeMode] = useState<ThemeMode>("light")
  const [showCal, setShowCal]         = useState(true)
  const [showAmounts, setShowAmounts] = useState(true)
  const [showRingkasan, setShowRingkasan] = useState(true)
  const [showTxnList, setShowTxnList]     = useState(true)
  const [editTxn, setEditTxn] = useState<Transaction|null>(null)
  const [period,  setPeriod]    = useState<"all"|"today"|"week"|"lastweek"|"month3"|"custom">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo,   setDateTo]   = useState("")
  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load transactions from Supabase
  const loadTxns = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", uid)
      .order("date", { ascending: false })
    if (data) setTxns(data as Transaction[])
  }, [])

  useEffect(() => {
    if (user) loadTxns(user.id)
    else setTxns([])
  }, [user, loadTxns])

  const P = useThemePalette(themeMode)
  C = P
  const isAuto  = themeMode === "system"
  const isLight = themeMode === "light"
  const isPlain = isAuto || isLight

  const mKey = `${year}-${String(month+1).padStart(2,"0")}`
  const monthTxns = useMemo(()=>
    txns.filter(t=>t.date.startsWith(mKey)).sort((a,b)=>b.date.localeCompare(a.date)),
    [txns,mKey]
  )
  const income  = useMemo(()=>monthTxns.filter(t=>t.type==="income" ).reduce((s,t)=>s+t.amount,0),[monthTxns])
  const expense = useMemo(()=>monthTxns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0),[monthTxns])
  const balance = income - expense
  // period filter
  const periodFiltered = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const dow   = today.getDay()
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - dow)
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(weekStart.getDate() - 7)
    const lastWeekEnd   = new Date(weekStart); lastWeekEnd.setDate(weekStart.getDate() - 1)
    const month3Start   = new Date(today); month3Start.setMonth(today.getMonth() - 3)

    const source = period === "month3" ? txns : monthTxns
    return source.filter(t => {
      const d = new Date(t.date + "T00:00:00")
      if (period === "today")    return t.date === today.toISOString().slice(0,10)
      if (period === "week")     return d >= weekStart && d <= today
      if (period === "lastweek") return d >= lastWeekStart && d <= lastWeekEnd
      if (period === "month3")   return d >= month3Start && d <= today
      if (period === "custom") {
        const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null
        const to   = dateTo   ? new Date(dateTo   + "T00:00:00") : null
        if (from && to)   return d >= from && d <= to
        if (from)         return d >= from
        if (to)           return d <= to
      }
      return true
    })
  }, [monthTxns, txns, period, dateFrom, dateTo])

  const visible = (filter==="all" ? periodFiltered : periodFiltered.filter(t=>t.type===filter))

  // months that have data
  const monthHasData = useMemo(()=>
    Array.from({length:12},(_,i)=>{
      const k=`${year}-${String(i+1).padStart(2,"0")}`
      return txns.some(t=>t.date.startsWith(k))
    }),[txns,year]
  )

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([])
  const addToast = (type: TransType, amount: number) => {
    const id = Date.now().toString()
    setToasts(p => [...p, {id, type, amount}])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2800)
  }

  const addTxn = async (t: Transaction) => {
    if (!user) return
    await supabase.from("transactions").insert({ ...t, user_id: user.id })
    setTxns(p => [t, ...p])
    setAdd(false)
    addToast(t.type, t.amount)
  }
  const saveTxn = async (t: Transaction) => {
    if (!user) return
    await supabase.from("transactions").update({ type: t.type, category: t.category, label: t.label, amount: t.amount, date: t.date }).eq("id", t.id)
    setTxns(p => p.map(x => x.id === t.id ? t : x))
    setEditTxn(null)
  }
  const deleteTxn = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id)
    setTxns(p => p.filter(x => x.id !== id))
    setEditTxn(null)
  }
  const logout = async () => { await supabase.auth.signOut() }

  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab]   = useState<"nama"|"username"|"password">("nama")
  const [settingsName, setSettingsName] = useState(user?.user_metadata?.name || "")
  const [settingsUsername, setSettingsUsername] = useState(user?.user_metadata?.username || "")
  const [settingsNewPw, setSettingsNewPw]       = useState("")
  const [settingsConfirmPw, setSettingsConfirmPw] = useState("")
  const [settingsLoading, setSettingsLoading]   = useState(false)
  const [settingsMsg, setSettingsMsg]           = useState<{type:"ok"|"err"; text:string}|null>(null)

  const saveSettings = async () => {
    setSettingsMsg(null)
    setSettingsLoading(true)
    try {
      if (settingsTab === "nama") {
        if (!settingsName.trim()) { setSettingsMsg({type:"err", text:"Nama tidak boleh kosong."}); return }
        await supabase.auth.updateUser({ data: { name: settingsName.trim() } })
        await supabase.from("profiles").update({ name: settingsName.trim() }).eq("id", user.id)
        const { data: refreshed } = await supabase.auth.getUser()
        if (refreshed?.user) setUser(refreshed.user)
        setSettingsMsg({type:"ok", text:"Nama berhasil diubah."})
        setTimeout(()=>setShowSettings(false), 1000)
      } else if (settingsTab === "username") {
        if (!settingsUsername.trim()) { setSettingsMsg({type:"err", text:"Username tidak boleh kosong."}); return }
        const { data: ex } = await supabase.from("profiles").select("id").eq("username", settingsUsername.trim()).maybeSingle()
        if (ex && ex.id !== user.id) { setSettingsMsg({type:"err", text:"Username sudah dipakai."}); return }
        await supabase.auth.updateUser({ data: { username: settingsUsername.trim() } })
        const { error: upErr } = await supabase.from("profiles").update({ username: settingsUsername.trim() }).eq("id", user.id)
        if (upErr) { setSettingsMsg({type:"err", text:"Gagal menyimpan — cek RLS policy di Supabase."}); return }
        const { data: refreshed2 } = await supabase.auth.getUser()
        if (refreshed2?.user) { setUser(refreshed2.user); setSettingsUsername(refreshed2.user.user_metadata?.username || settingsUsername) }
        setSettingsMsg({type:"ok", text:"Username berhasil diubah."})
        setTimeout(()=>setShowSettings(false), 1000)
      } else {
        if (settingsNewPw.length < 6) { setSettingsMsg({type:"err", text:"Password minimal 6 karakter."}); return }
        if (settingsNewPw !== settingsConfirmPw) { setSettingsMsg({type:"err", text:"Konfirmasi password tidak cocok."}); return }
        const { error } = await supabase.auth.updateUser({ password: settingsNewPw })
        if (error) { setSettingsMsg({type:"err", text:"Gagal mengubah password."}); return }
        setSettingsMsg({type:"ok", text:"Password berhasil diubah."})
        setSettingsNewPw(""); setSettingsConfirmPw("")
        setTimeout(()=>setShowSettings(false), 1000)
      }
    } finally {
      setSettingsLoading(false)
    }
  }

  const THEME_OPTS: {mode: ThemeMode; label: string; icon: string}[] = [
    {mode:"light",  label:"Light",  icon:"☀️"},
    {mode:"dark",   label:"Dark",   icon:"🌙"},
    {mode:"system", label:"Auto",   icon:"💻"},
  ]
  const [themeOpen, setThemeOpen] = useState(false)
  const themeIcon = themeMode==="dark"?"🌙":themeMode==="system"?"💻":"☀️"

  if (!authReady) return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ color:"rgba(238,238,255,0.3)", fontFamily:"Instrument Sans, sans-serif", fontSize:14 }}>Memuat...</p>
    </div>
  )

  if (!user && showLanding) return <LandingPage onStart={()=>setShowLanding(false)}/>

  if (!user) return <AuthScreen onBack={()=>setShowLanding(true)} onAuth={async (name: string) => {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id
    if (uid) { setUser(data.session!.user); loadTxns(uid); setWelcomeName(name) }
  }} />

  return (
    <div style={{ minHeight:"100vh", background:P.bg, transition:"background 0.4s" }}>

      {/* Floating orbs */}
      {P === DARK && <>
        <div className="orb orb-1"/>
        <div className="orb orb-2"/>
        <div className="orb orb-3"/>
      </>}

      {/* Subtle dot grid */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background:`radial-gradient(circle, ${P.gridColor} 1px, transparent 1px) center/28px 28px`,
        opacity: P === DARK ? 0.025 : 0.06,
        transition:"opacity 0.4s" }}/>

      {/* Top gradient bloom */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"40vh", pointerEvents:"none", zIndex:0,
        background: isAuto
          ? `radial-gradient(ellipse 110% 70% at 30% -10%, ${P.meshA} 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 80% -5%, ${P.meshB} 0%, transparent 55%)`
          : `radial-gradient(ellipse 90% 60% at 50% -5%, ${P.meshA} 0%, transparent 65%)`,
        transition:"background 0.4s" }}/>

      <div style={{ maxWidth:520, margin:"0 auto", padding:"48px 20px 80px", position:"relative" }}>

        {/* Theme switcher + logout */}
        <div className="au" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, position:"relative", zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:13, fontWeight:600, color:P.text, fontFamily:"Instrument Sans, sans-serif" }}>
              {user.user_metadata?.name || user.user_metadata?.username || user.email}
            </span>
            <button onClick={()=>{setShowSettings(true);setSettingsMsg(null)}}
              style={{ padding:"6px 12px", fontSize:13, fontWeight:600, border:`1px solid ${P.border}`,
                borderRadius:10, background:P.surface, color:P.sub, cursor:"pointer",
                fontFamily:"Instrument Sans, sans-serif", transition:"all 0.15s",
                display:"flex", alignItems:"center", gap:5 }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="0.75"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="1"}>
              ⚙️
            </button>
            <button onClick={logout}
              style={{ padding:"6px 14px", fontSize:13, fontWeight:600, border:`1px solid ${P.red}44`,
                borderRadius:10, background:P.redDim, color:P.red, cursor:"pointer",
                fontFamily:"Instrument Sans, sans-serif", transition:"all 0.15s" }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="0.75"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="1"}>
              Keluar
            </button>
          </div>
          <div style={{ position:"relative" }}>
            <button onClick={()=>setThemeOpen(v=>!v)}
              style={{ width:36, height:36, borderRadius:10, border:`1px solid ${P.border}`,
                background:P.card, cursor:"pointer", fontSize:17, display:"flex",
                alignItems:"center", justifyContent:"center", transition:"all 0.15s",
                boxShadow: themeOpen?`0 0 0 2px ${P.accent}44`:"none" }}>
              {themeIcon}
            </button>
            {themeOpen && (
              <>
                <div style={{ position:"fixed", inset:0, zIndex:998 }} onClick={()=>setThemeOpen(false)}/>
                <div className="ai" style={{ position:"absolute", right:0, top:42, zIndex:999,
                  background:P.card, border:`1px solid ${P.border}`, borderRadius:12,
                  padding:6, display:"flex", flexDirection:"column", gap:2,
                  boxShadow:`0 8px 24px rgba(0,0,0,0.18)`, minWidth:110 }}>
                {THEME_OPTS.map(o=>(
                  <button key={o.mode} onClick={()=>{setThemeMode(o.mode);setThemeOpen(false)}}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px",
                      borderRadius:8, border:"none", cursor:"pointer", width:"100%", textAlign:"left",
                      fontFamily:"Instrument Sans, sans-serif", fontSize:12, fontWeight:600,
                      transition:"all 0.1s",
                      background: themeMode===o.mode ? P.accentDim : "transparent",
                      color: themeMode===o.mode ? P.accent : P.sub,
                    }}>
                    <span style={{fontSize:14}}>{o.icon}</span>
                    <span>{o.label}</span>
                  </button>
                ))}
              </div>
              </>
            )}
          </div>
        </div>


        {/* Header */}
        <div className="au d1" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:36 }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, color:P.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Keuangan Pribadi</p>
            <div style={{ display:"flex", alignItems:"flex-end", gap:12 }}>
              {/* Title — two lines with accent color on second word */}
              <div>
                {/* "Catatan" + wallet icon sejajar */}
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <p style={{ fontFamily:"Fraunces, serif", fontSize:34, fontWeight:700, fontStyle:"italic",
                    lineHeight:1.05, letterSpacing:"-0.5px", color:P.text }}>
                    Catatan
                  </p>
                  <div style={{ width:40, height:40, borderRadius:12, flexShrink:0,
                    background:"rgba(161,100,50,0.15)",
                    border:"1px solid rgba(161,100,50,0.35)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:"0 4px 16px rgba(161,100,50,0.2)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="6" y="3" width="11" height="6" rx="1.5" fill="#22c55e" opacity="0.6" transform="rotate(-8 6 3)"/>
                      <rect x="8" y="3.5" width="10" height="5.5" rx="1.5" fill="#16a34a" opacity="0.85" transform="rotate(-3 8 3.5)"/>
                      <rect x="2" y="8" width="20" height="13" rx="2.5" fill="#92400e"/>
                      <circle cx="18.5" cy="14.5" r="2" fill="rgba(161,100,50,0.3)" stroke="#b45309" strokeWidth="1.2"/>
                    </svg>
                  </div>
                </div>
                <p style={{ fontFamily:"Fraunces, serif", fontSize:34, fontWeight:700, fontStyle:"italic",
                  lineHeight:1.05, letterSpacing:"-0.5px", color:isLight?P.text:P.accent }}>
                  Keuanganku
                </p>
              </div>
            </div>
          </div>
          <button onClick={()=>setAdd(true)}
            style={{ marginTop:38, padding:"10px 18px", fontSize:13, fontWeight:600, border:"none", cursor:"pointer",
              fontFamily:"Instrument Sans, sans-serif", borderRadius:12, color:"#fff", flexShrink:0,
              background:isLight?"linear-gradient(135deg,#16a34a,#22c55e)":P.grad,
              boxShadow:isLight?"0 4px 24px rgba(34,197,94,0.35), inset 0 1px 0 rgba(255,255,255,0.15)":"0 4px 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
              transition:"transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLElement).style.boxShadow="0 8px 28px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.15)"}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(0)";(e.currentTarget as HTMLElement).style.boxShadow="0 4px 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"}}>
            + Tambah
          </button>
        </div>

        {/* Month nav */}
        <div className="au d1" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <button onClick={()=>setMonth(m=>m===0?11:m-1)}
            style={{ width:34, height:34, borderRadius:9, border:`1px solid ${P.border}`, background:P.surface, cursor:"pointer", color:P.text, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=P.accentDim}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=P.surface}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <p style={{ fontSize:15, fontWeight:700, color:P.text }}>{MONTHS[month]} {year}</p>
          <button onClick={()=>setMonth(m=>m===11?0:m+1)}
            style={{ width:34, height:34, borderRadius:9, border:`1px solid ${P.border}`, background:P.surface, cursor:"pointer", color:P.text, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=P.accentDim}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=P.surface}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Month indicator dots */}
        <div className="au d2" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginBottom:24 }}>
          {MONTHS_S.map((m,i)=>{
            const isActive  = i === month
            const hasData   = monthHasData[i]
            return (
              <button key={m} onClick={()=>setMonth(i)} title={MONTHS[i]}
                style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:"2px 0" }}>
                {/* Dot */}
                <div style={{ transition:"all 0.25s cubic-bezier(0.22,1,0.36,1)",
                  width: isActive ? 20 : 6,
                  height: 6, borderRadius: 3,
                  background: isActive
                    ? P.grad
                    : hasData ? P.accent+"66" : P.border,
                  boxShadow: isActive ? `0 0 8px ${P.accent}88` : "none",
                }}/>
              </button>
            )
          })}
        </div>

        {/* Stat cards */}
        <div className="au d2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
          {([
            { label:"Pemasukan",  value:income,  color:C.green,  dim:C.greenDim,
              glow:`0 6px 28px rgba(52,211,153,0.22)`, glowHover:`0 12px 40px rgba(52,211,153,0.42)`,
              gradLine:"linear-gradient(90deg,#34d399,#06b6d4)", icon:"↑" },
            { label:"Pengeluaran",value:expense, color:C.red,    dim:C.redDim,
              glow:`0 6px 28px rgba(248,113,113,0.22)`, glowHover:`0 12px 40px rgba(248,113,113,0.42)`,
              gradLine:"linear-gradient(90deg,#f87171,#fb923c)", icon:"↓" },
            { label:"Saldo", value:balance, color:balance>=0?C.accent:C.red,
              dim:balance>=0?C.accentDim:C.redDim,
              glow:`0 6px 28px rgba(167,139,250,0.22)`, glowHover:`0 12px 40px rgba(167,139,250,0.42)`,
              gradLine:balance>=0?"linear-gradient(90deg,#a78bfa,#6366f1)":"linear-gradient(90deg,#f87171,#fb923c)", icon:"◈" },
          ] as const).map(s=>(
            <div key={s.label} className={`grad-border${isAuto?" auto-border":""}`}
              style={{ background:isPlain?C.card:`linear-gradient(145deg,${s.dim} 0%,${C.card} 55%)`,
                borderRadius:16, padding:"18px 13px 14px",
                boxShadow: isPlain ? "none" : s.glow,
                transition:"transform 0.25s, box-shadow 0.25s",
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-4px)";(e.currentTarget as HTMLElement).style.boxShadow=s.glowHover}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(0)";(e.currentTarget as HTMLElement).style.boxShadow=s.glow}}>
              {!isPlain && <div style={{ height:2.5, borderRadius:3, background:s.gradLine, marginBottom:13,
                boxShadow:`0 0 8px ${s.color}55` }}/>}
              <p style={{ fontSize:10, color:C.muted, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:9, fontWeight:600 }}>{s.label}</p>
              <p style={{ fontFamily:"DM Mono, monospace", fontSize:14, color:isPlain?C.text:s.color, lineHeight:1, fontWeight:500, letterSpacing: showAmounts?"normal":"0.12em" }}>
                {showAmounts ? <Counter value={s.value}/> : "••••••"}
              </p>
              <p style={{ fontSize:15, color:s.color, marginTop:10, opacity:isAuto?0.8:0.45, lineHeight:1 }}>{s.icon}</p>
            </div>
          ))}
        </div>

        {/* Month chart */}
        <div className={`au d3 grad-border${isAuto?" auto-border":""}`} style={{ background:C.card, borderRadius:16, padding:"20px 20px", marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: showRingkasan ? 16 : 0 }}>
            <p style={{ fontSize:11, fontWeight:600, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>Ringkasan Bulan Ini</p>
            <button onClick={()=>setShowRingkasan(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:C.muted, display:"flex", alignItems:"center" }}>
              {showRingkasan ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              )}
            </button>
          </div>
          {showRingkasan && <MonthChart income={income} expense={expense} showAmounts={showAmounts} plain={isPlain}/>}
        </div>

        {/* Calendar indicator */}
        <div className="au" style={{ animationDelay:"0.32s" }}>
          <div className={`grad-border${isAuto?" auto-border":""}`} style={{ background:C.card, borderRadius:16, padding:"18px 18px 14px", marginBottom:24 }} data-cal>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: showCal ? 14 : 0 }}>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:15, fontWeight:700, color:C.text }}>Kalender Aktivitas</p>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {showCal && (
                  <span style={{ fontSize:11, fontWeight:600, color:C.muted }}>
                    {Object.keys(monthTxns.reduce((a,t)=>{ a[t.date.slice(8,10)]=1; return a },{}as Record<string,number>)).length} hari aktif
                  </span>
                )}
                {/* Toggle mata */}
                <button onClick={()=>setShowCal(v=>!v)}
                  title={showCal ? "Sembunyikan kalender" : "Tampilkan kalender"}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:C.muted,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"color 0.2s", borderRadius:6 }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color=C.accent}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color=C.muted}>
                  {showCal ? (
                    /* Eye open */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    /* Eye closed */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {showCal && <CalendarIndicator year={year} month={month} txns={txns}/>}
          </div>
        </div>

        {/* Transaction list */}
        <div className="au d4">
          {/* Row 1: title + tipe filter */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:18, fontWeight:700, color:C.text }}>Transaksi</p>
              <button onClick={()=>setShowTxnList(v=>!v)}
                title={showTxnList ? "Sembunyikan transaksi" : "Tampilkan transaksi"}
                style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:C.muted,
                  display:"flex", alignItems:"center", borderRadius:6, transition:"color 0.2s" }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color=C.accent}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color=C.muted}>
                {showTxnList ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>
            </div>
            <div style={{ display:"flex", gap:2, background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:3 }}>
              {(["all","income","expense"] as const).map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{ padding:"5px 11px", fontSize:12, border:"none", cursor:"pointer",
                    fontFamily:"Instrument Sans, sans-serif", borderRadius:6, transition:"all 0.12s",
                    background: filter===f ? (isLight?"rgba(0,0,0,0.08)":(f==="income"?C.greenDim:f==="expense"?C.redDim:C.accentDim)) : "transparent",
                    color: filter===f ? (isLight?C.text:(f==="income"?C.green:f==="expense"?C.red:C.accent)) : C.muted,
                  }}>
                  {f==="all"?"Semua":f==="income"?"Masuk":"Keluar"}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: periode filter */}
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:14, flexWrap:"wrap" }}>
            {([
              {key:"all",      label:"Bulan ini"},
              {key:"today",    label:"Hari ini"},
              {key:"week",     label:"Minggu ini"},
              {key:"lastweek", label:"Minggu lalu"},
              {key:"month3",   label:"3 Bulan"},
              {key:"custom",   label:"📅 Tanggal"},
            ] as const).map(p=>(
              <button key={p.key} onClick={()=>{ setPeriod(p.key); if(p.key!=="custom"){ setDateFrom(""); setDateTo("") } }}
                style={{ padding:"5px 11px", fontSize:11, fontWeight:600,
                  border:`1px solid ${period===p.key ? (isLight?"rgba(0,0,0,0.25)":C.accent+"88") : C.border}`,
                  borderRadius:20, cursor:"pointer", transition:"all 0.15s",
                  fontFamily:"Instrument Sans, sans-serif",
                  background: period===p.key ? (isLight?"rgba(0,0,0,0.07)":C.accentDim) : "transparent",
                  color: period===p.key ? (isLight?C.text:C.accent) : C.muted,
                }}>
                {p.label}
              </button>
            ))}

            {period==="custom" && (
              <div style={{ display:"flex", alignItems:"center", gap:6, width:"100%", marginTop:4 }}>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                  style={{ flex:1, padding:"6px 10px", fontSize:12, fontWeight:500,
                    border:`1px solid ${C.accent}55`, borderRadius:10,
                    background:C.accentDim, color:C.accent, outline:"none",
                    fontFamily:"Instrument Sans, sans-serif", cursor:"pointer" }}/>
                <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>→</span>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  style={{ flex:1, padding:"6px 10px", fontSize:12, fontWeight:500,
                    border:`1px solid ${C.accent}55`, borderRadius:10,
                    background:C.accentDim, color:C.accent, outline:"none",
                    fontFamily:"Instrument Sans, sans-serif", cursor:"pointer" }}/>
              </div>
            )}

            <span style={{ marginLeft:"auto", fontSize:11, color:C.muted, fontWeight:500 }}>
              {visible.length} transaksi
            </span>
          </div>

          {showTxnList && <div className={`grad-border${isAuto?" auto-border":""}`} style={{ background:C.card, borderRadius:16, overflow:"hidden", paddingBottom:2 }}>
            {visible.length===0 ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:C.muted, fontSize:13 }}>Belum ada catatan.</div>
            ) : (() => {
              // Group by date
              const groups: { date: string; txns: typeof visible }[] = []
              visible.forEach(t => {
                const last = groups[groups.length-1]
                if (last && last.date === t.date) last.txns.push(t)
                else groups.push({ date: t.date, txns: [t] })
              })
              let rowIdx = 0
              return groups.map((g, gi) => {
                const d = new Date(g.date+"T00:00:00")
                const dayInc = g.txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0)
                const dayExp = g.txns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)
                const isLastGroup = gi === groups.length-1
                return (
                  <div key={g.date} style={{ margin:"0 12px", marginBottom: gi<groups.length-1 ? 10 : 12,
                    marginTop: gi===0 ? 12 : 0,
                    borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}` }}>
                    {/* Date header */}
                    <div style={{ padding:"9px 14px 8px", background:C.surface, borderBottom:`1px solid ${C.border}` }}>
                      <p style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom: (dayInc>0||dayExp>0) ? 6 : 0 }}>
                        {d.getDate()} {MONTHS_S[d.getMonth()]} {d.getFullYear()}
                      </p>
                      {(dayInc>0 || dayExp>0) && (
                        <div style={{ display:"flex", gap:12 }}>
                          {dayInc>0 && (
                            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                              <span style={{ fontSize:9, fontWeight:700, color:C.muted, letterSpacing:"0.06em", textTransform:"uppercase" }}>Masuk</span>
                              <span style={{ fontFamily:"DM Mono, monospace", fontSize:11, fontWeight:600, color:isLight?C.text:C.green }}>
                                {showAmounts ? `+${rp(dayInc)}` : "••••"}
                              </span>
                            </div>
                          )}
                          {dayExp>0 && (
                            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                              <span style={{ fontSize:9, fontWeight:700, color:C.muted, letterSpacing:"0.06em", textTransform:"uppercase" }}>Keluar</span>
                              <span style={{ fontFamily:"DM Mono, monospace", fontSize:11, fontWeight:600, color:isLight?C.text:C.red }}>
                                {showAmounts ? `−${rp(dayExp)}` : "••••"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Transactions in this group */}
                    {g.txns.map((t, ti) => {
                      const isIncome = t.type==="income"
                      const isLast = isLastGroup && ti===g.txns.length-1
                      const idx = rowIdx++
                      return (
                        <div key={t.id} className="au shimmer-row"
                          style={{ animationDelay:`${0.2+idx*0.04}s`, position:"relative",
                            display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
                            borderBottom: isLast ? "none" : `1px solid ${C.border}`,
                            transition:"background 0.2s",
                          }}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=isIncome?"rgba(52,211,153,0.06)":"rgba(248,113,113,0.06)"}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>

                          <div style={{ width:3, height:36, borderRadius:3, flexShrink:0,
                            background: isLight ? "rgba(0,0,0,0.15)" : (isIncome ? "linear-gradient(180deg,#34d399,#06b6d4)" : "linear-gradient(180deg,#f87171,#fb923c)"),
                            boxShadow: isLight ? "none" : `0 0 10px ${isIncome?"rgba(52,211,153,0.7)":"rgba(248,113,113,0.7)"}`,
                          }}/>

                          <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                            background: isLight ? "rgba(0,0,0,0.05)" : (isIncome ? C.greenDim : C.redDim),
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>
                            {CAT_ICON[t.category] ?? "📦"}
                          </div>

                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:14, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:3 }}>{t.label}</p>
                            <p style={{ fontSize:11, fontWeight:500, color:C.muted }}>{t.category}</p>
                          </div>

                          <div style={{ textAlign:"right", flexShrink:0, display:"flex", alignItems:"center", gap:6 }}>
                            <p style={{ fontFamily:"DM Mono, monospace", fontSize:13, fontWeight:500,
                              color:isLight?C.text:(isIncome?C.green:C.red), letterSpacing: showAmounts?"normal":"0.15em",
                              textShadow: isLight ? "none" : (isIncome?`0 0 12px rgba(52,211,153,0.5)`:`0 0 12px rgba(248,113,113,0.5)`) }}>
                              {showAmounts ? `${isIncome?"+":"−"}${rp(t.amount)}` : "••••••"}
                            </p>
                            <button onClick={()=>setEditTxn(t)} title="Edit transaksi"
                              style={{ background:"none", border:"none", cursor:"pointer", padding:3,
                                color:C.muted, opacity:0, transition:"opacity 0.15s", display:"flex", alignItems:"center" }}
                              className="edit-btn">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            })()}
          </div>}
        </div>

      </div>

      {showAdd  && <AddModal onSave={addTxn} onClose={()=>setAdd(false)}/>}
      {editTxn  && <EditModal txn={editTxn} onSave={saveTxn} onDelete={deleteTxn} onClose={()=>setEditTxn(null)}/>}

      {/* Welcome modal */}
      {welcomeName && (
        <div className="ai" style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.65)", backdropFilter:"blur(8px)" }}>
          <div style={{ animation:"welcome-in 0.5s cubic-bezier(0.22,1,0.36,1) both",
            background:P.card, border:`1px solid ${P.accent}44`, borderRadius:24,
            padding:"40px 36px", textAlign:"center", maxWidth:320, width:"90%",
            boxShadow:`0 24px 60px rgba(0,0,0,0.5), 0 0 40px ${P.accent}22` }}>
            <div style={{ fontSize:56, marginBottom:16, lineHeight:1 }}>
              <span className="wave-hand">👋</span>
            </div>
            <p style={{ fontFamily:"Fraunces, serif", fontSize:13, fontStyle:"italic", color:P.muted, marginBottom:8 }}>Selamat datang,</p>
            <p style={{ fontFamily:"Fraunces, serif", fontSize:28, fontWeight:700, color:P.text, marginBottom:6, letterSpacing:"-0.3px" }}>{welcomeName}</p>
            <p style={{ fontSize:13, color:P.muted, marginBottom:28 }}>Yuk mulai catat keuanganmu!</p>
            <button onClick={()=>setWelcomeName(null)}
              style={{ padding:"11px 32px", borderRadius:12, border:"none", fontSize:13, fontWeight:700,
                cursor:"pointer", background:P.grad, color:"#fff",
                fontFamily:"Instrument Sans, sans-serif",
                boxShadow:"0 4px 20px rgba(124,58,237,0.4)", width:"100%" }}>
              Mulai →
            </button>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowSettings(false) }}>
          <div style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:24,
            padding:"28px 28px 24px", width:"90%", maxWidth:360,
            boxShadow:"0 24px 60px rgba(0,0,0,0.4)", animation:"welcome-in 0.35s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:20, fontWeight:700, color:P.text }}>Pengaturan</p>
              <button onClick={()=>setShowSettings(false)}
                style={{ background:"none", border:"none", cursor:"pointer", color:P.muted, fontSize:18, lineHeight:1, padding:4 }}>✕</button>
            </div>
            {/* Tabs */}
            <div style={{ display:"flex", background:isPlain ? `${P.border}55` : "rgba(255,255,255,0.06)", borderRadius:10, padding:3, marginBottom:22, gap:2 }}>
              {(["nama","username","password"] as const).map(tab=>(
                <button key={tab} onClick={()=>{setSettingsTab(tab);setSettingsMsg(null)}}
                  style={{ flex:1, padding:"7px 0", fontSize:12, fontWeight:600, border:"none", cursor:"pointer",
                    fontFamily:"Instrument Sans, sans-serif", borderRadius:7, transition:"all 0.15s",
                    background: settingsTab===tab ? (isPlain ? P.surface : "rgba(167,139,250,0.18)") : "transparent",
                    color: settingsTab===tab ? (isPlain ? P.text : P.accent) : P.muted,
                    boxShadow: settingsTab===tab ? `0 1px 4px rgba(0,0,0,0.12)` : "none",
                  }}>
                  {tab==="nama" ? "Nama" : tab==="username" ? "Username" : "Password"}
                </button>
              ))}
            </div>
            {/* Fields */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {settingsTab==="nama" && (
                <div>
                  <p style={{ fontSize:11, color:P.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Nama baru</p>
                  <input value={settingsName} onChange={e=>setSettingsName(e.target.value)}
                    placeholder="Masukkan nama baru"
                    onKeyDown={e=>e.key==="Enter"&&saveSettings()}
                    style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${P.border}`,
                      borderRadius:10, background:P.surface, color:P.text, outline:"none",
                      fontFamily:"Instrument Sans, sans-serif" }}/>
                </div>
              )}
              {settingsTab==="username" && (
                <div>
                  <p style={{ fontSize:11, color:P.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Username baru</p>
                  <input value={settingsUsername} onChange={e=>setSettingsUsername(e.target.value.replace(/\s/g,""))}
                    placeholder="Masukkan username baru"
                    onKeyDown={e=>e.key==="Enter"&&saveSettings()}
                    style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${P.border}`,
                      borderRadius:10, background:P.surface, color:P.text, outline:"none",
                      fontFamily:"Instrument Sans, sans-serif" }}/>
                </div>
              )}
              {settingsTab==="password" && (
                <>
                  <div>
                    <p style={{ fontSize:11, color:P.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Password baru</p>
                    <input type="password" value={settingsNewPw} onChange={e=>setSettingsNewPw(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${P.border}`,
                        borderRadius:10, background:P.surface, color:P.text, outline:"none",
                        fontFamily:"Instrument Sans, sans-serif" }}/>
                  </div>
                  <div>
                    <p style={{ fontSize:11, color:P.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Konfirmasi password</p>
                    <input type="password" value={settingsConfirmPw} onChange={e=>setSettingsConfirmPw(e.target.value)}
                      placeholder="Ulangi password baru"
                      onKeyDown={e=>e.key==="Enter"&&saveSettings()}
                      style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${P.border}`,
                        borderRadius:10, background:P.surface, color:P.text, outline:"none",
                        fontFamily:"Instrument Sans, sans-serif" }}/>
                  </div>
                </>
              )}
              {settingsMsg && (
                <p style={{ fontSize:12, padding:"10px 12px", borderRadius:8, margin:0,
                  color: settingsMsg.type==="ok" ? P.green : P.red,
                  background: settingsMsg.type==="ok" ? `${P.green}18` : `${P.red}18` }}>
                  {settingsMsg.text}
                </p>
              )}
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button onClick={()=>setShowSettings(false)}
                  style={{ flex:1, padding:"11px 0", borderRadius:10, fontSize:13, fontWeight:600,
                    cursor:"pointer", fontFamily:"Instrument Sans, sans-serif",
                    border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.07)", color:"#ef4444" }}>
                  Batal
                </button>
                <button onClick={saveSettings} disabled={settingsLoading}
                  style={{ flex:2, padding:"11px 0", borderRadius:10, fontSize:13, fontWeight:700,
                    cursor:settingsLoading?"not-allowed":"pointer", fontFamily:"Instrument Sans, sans-serif",
                    border:"none", background:P.grad, color:"#fff", opacity:settingsLoading?0.7:1,
                    boxShadow:"0 4px 16px rgba(124,58,237,0.3)", transition:"opacity 0.15s" }}>
                  {settingsLoading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)",
        display:"flex", flexDirection:"column", alignItems:"center", gap:10, zIndex:100, pointerEvents:"none" }}>
        {toasts.map(t => {
          const isInc = t.type === "income"
          return (
            <div key={t.id}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"12px 20px", borderRadius:40,
                background: isInc
                  ? "linear-gradient(135deg,rgba(52,211,153,0.18),rgba(6,182,212,0.12))"
                  : "linear-gradient(135deg,rgba(248,113,113,0.18),rgba(251,146,60,0.12))",
                border: `1px solid ${isInc ? "rgba(52,211,153,0.45)" : "rgba(248,113,113,0.45)"}`,
                backdropFilter:"blur(12px)",
                boxShadow: isInc
                  ? "0 8px 32px rgba(52,211,153,0.25)"
                  : "0 8px 32px rgba(248,113,113,0.25)",
                animation:"toast-rise 0.45s cubic-bezier(0.22,1,0.36,1) both, toast-fade 0.4s ease 2.4s both",
                whiteSpace:"nowrap",
              }}>
              <span style={{ fontFamily:"Instrument Sans, sans-serif", fontSize:13, fontWeight:700,
                color: isInc ? P.green : P.red }}>
                {isInc ? "Saldo ditambahkan" : "Saldo terpakai"}
              </span>
              <span style={{ fontFamily:"DM Mono, monospace", fontSize:13, fontWeight:500,
                color: isInc ? P.green : P.red }}>
                {isInc ? "+" : "−"}{rp(t.amount)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
