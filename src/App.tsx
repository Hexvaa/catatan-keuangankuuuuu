import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { supabase } from "./lib/supabase"
import type { User } from "@supabase/supabase-js"
import AuthScreen from "./AuthScreen"

type TransType = "income" | "expense"
interface Transaction {
  id: string; type: TransType; category: string; label: string; amount: number; date: string; time?: string; photo?: string
}

interface Bill {
  id: string
  name: string
  amount: number
  dueDay: number
  icon: string
  wallet?: string
  category?: string
  note?: string
  paidMonths: string[]
}

const INCOME_CATS  = ["Gaji","Freelance","Investasi","Bisnis","Bonus","Hadiah","Sewa","Lainnya"]
const EXPENSE_CATS = ["Makan","Transportasi","Belanja","Tagihan","Hiburan","Kesehatan","Pendidikan","Tabungan","Donasi","Lainnya"]
const BILL_ICONS = ["⚡","💧","📱","🌐","📺","🏠","🏦","💳","🚗","🎓","💊","🛡️","🎵","☁️"]

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
  bg:       "#f0ede8",
  surface:  "#e8e4de",
  card:     "#ffffff",
  border:   "rgba(0,0,0,0.08)",
  text:     "#1a1a1a",
  sub:      "rgba(26,26,26,0.55)",
  muted:    "rgba(26,26,26,0.38)",
  green:    "#16a34a",
  greenDim: "rgba(22,163,74,0.1)",
  red:      "#dc2626",
  redDim:   "rgba(220,38,38,0.09)",
  accent:   "#1a1a1a",
  accentDim:"rgba(0,0,0,0.07)",
  grad:     "linear-gradient(135deg,#1a1a1a 0%,#333 100%)",
  meshA:    "rgba(0,0,0,0.03)",
  meshB:    "rgba(22,163,74,0.05)",
  meshC:    "rgba(0,0,0,0.02)",
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
    <div style={{ display:"flex", alignItems:"center", gap:24 }}>
      {/* Donut */}
      <div style={{ position:"relative", flexShrink:0, width:110, height:110 }}>
        <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11"/>
          <circle cx="55" cy="55" r={r} fill="none"
            stroke={C.green} strokeWidth="11" strokeLinecap="butt"
            strokeDasharray={`${incDash} ${circ - incDash}`}
            strokeDashoffset="0"
            style={{ transition:"stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}/>
          <circle cx="55" cy="55" r={r} fill="none"
            stroke={C.red} strokeWidth="11" strokeLinecap="butt"
            strokeDasharray={`${expDash} ${circ - expDash}`}
            strokeDashoffset={`${-incDash}`}
            style={{ transition:"stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <p style={{ fontFamily:"DM Mono, monospace", fontSize:14, fontWeight:700,
            color: safe ? C.green : C.red, lineHeight:1 }}>{pct.toFixed(0)}%</p>
          <p style={{ fontSize:9, color:C.muted, marginTop:3, fontWeight:600, letterSpacing:"0.05em" }}>terpakai</p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12 }}>
        {[
          { label:"Pemasukan",   value:income,  color:C.green },
          { label:"Pengeluaran", value:expense, color:C.red   },
          { label:"Saldo",       value:saldo,   color: saldo>=0 ? C.green : C.red },
        ].map(s=>(
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
            <p style={{ fontSize:11, color:C.muted, fontWeight:600, minWidth:72 }}>{s.label}</p>
            <p style={{ fontFamily:"DM Mono, monospace", fontSize:12, fontWeight:700,
              color:plain?C.text:s.color, whiteSpace:"nowrap", marginLeft:"auto" }}>
              {showAmounts ? rp(Math.abs(s.value)) : "••••••"}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function parseReceiptAmount(text: string): number {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  const totalKw = /total|grand|jumlah|bayar|tunai|transfer|dibayar|pembayaran|charge|amount/i

  // Step 1: extract every valid amount from the full text
  const allNums: number[] = []
  for (const line of lines) {
    const clean = line.replace(/[Rr][Pp]\.?\s*/g, " ")
    const m = clean.match(/\d{1,3}(?:[.,]\d{3})+/g) ?? []      // only formatted numbers like 231.400
    for (const s of m) {
      const n = parseInt(s.replace(/[.,]/g, ""))
      if (n >= 1000 && n <= 9_999_999) allNums.push(n)
    }
  }
  if (!allNums.length) return 0

  // Step 2: count frequency — the TOTAL repeats (Total = Grand Total = NON TUNAI = Transfer)
  const freq: Record<number, number> = {}
  for (const n of allNums) freq[n] = (freq[n] ?? 0) + 1

  // Step 3: bonus score for numbers found on keyword lines
  const kwBonus: Record<number, number> = {}
  for (const line of lines) {
    if (!totalKw.test(line)) continue
    const clean = line.replace(/[Rr][Pp]\.?\s*/g, " ")
    const m = clean.match(/\d{1,3}(?:[.,]\d{3})+/g) ?? []
    for (const s of m) {
      const n = parseInt(s.replace(/[.,]/g, ""))
      if (n >= 1000 && n <= 9_999_999) kwBonus[n] = (kwBonus[n] ?? 0) + 3
    }
  }

  // Step 4: rank by (frequency × 2 + kwBonus), break ties by larger amount
  const ranked = Object.entries(freq)
    .map(([k]) => { const n = Number(k); return { n, score: freq[n]*2 + (kwBonus[n]??0) } })
    .sort((a, b) => b.score - a.score || b.n - a.n)

  return ranked[0].n
}

function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 800
      let { width: w, height: h } = img
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement("canvas")
      canvas.width = w; canvas.height = h
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.82))
    }
    img.src = url
  })
}

// Prepare TWO crops: bottom-half (where TOTAL usually is) and full image fallback

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
  const [photo, setPhoto] = useState(txn.photo || "")
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
    onSave({ ...txn, type, category: cat, label: label || cat, amount: parseInt(rawAmount), date, photo: photo || undefined })
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

            {/* Foto Struk */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>
                Foto Struk
                <span style={{ marginLeft:6, fontSize:10, fontStyle:"italic", color:C.muted, textTransform:"none", letterSpacing:0 }}>· opsional</span>
              </p>
              {photo ? (
                <div style={{ position:"relative", display:"inline-block" }}>
                  <img src={photo} alt="struk" style={{ width:"100%", maxHeight:140, objectFit:"cover", borderRadius:10, border:`1px solid ${C.border}` }}/>
                  <button onClick={()=>setPhoto("")}
                    style={{ position:"absolute", top:6, right:6, width:24, height:24, borderRadius:"50%",
                      background:"rgba(0,0,0,0.6)", border:"none", cursor:"pointer", color:"#fff", fontSize:13,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                </div>
              ) : (
                <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
                  border:`1px dashed ${C.border}`, borderRadius:10, cursor:"pointer",
                  background:"rgba(255,255,255,0.03)", transition:"border-color 0.15s" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span style={{ fontSize:13, color:C.muted, fontFamily:"Instrument Sans, sans-serif" }}>Upload foto struk</span>
                  <input type="file" accept="image/*" style={{ display:"none" }}
                    onChange={async e=>{ const f=e.target.files?.[0]; if(f) setPhoto(await compressImage(f)) }}/>
                </label>
              )}
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
  const [photo, setPhoto]           = useState("")
  const [tried, setTried]           = useState(false)
  const [ocrStatus, setOcrStatus]   = useState<"idle"|"loading"|"found"|"notfound">("idle")
  const [ocrAmount, setOcrAmount]   = useState<number|null>(null)

  const applyOcr = () => {
    if (ocrAmount) { setAmt(ocrAmount.toLocaleString("id-ID")); setOcrStatus("idle") }
  }

  const runOcr = async (dataUrl: string) => {
    setOcrStatus("loading"); setOcrAmount(null)
    try {
      // Try OCR.space API first (more accurate for receipts)
      const found = await ocrWithApi(dataUrl)
      if (found > 0) { setOcrAmount(found); setOcrStatus("found"); setAmt(found.toLocaleString("id-ID")) }
      else setOcrStatus("notfound")
    } catch(err) {
      console.error("[OCR error]", err)
      setOcrStatus("notfound")
    }
  }

  const cropDataUrl = (dataUrl: string, yStart: number, yEnd: number): Promise<string> =>
    new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const sy = Math.round(img.height * yStart)
        const sh = Math.round(img.height * (yEnd - yStart))
        const c = document.createElement("canvas")
        c.width = img.width; c.height = sh
        c.getContext("2d")!.drawImage(img, 0, sy, img.width, sh, 0, 0, img.width, sh)
        resolve(c.toDataURL("image/jpeg", 0.85))
      }
      img.src = dataUrl
    })

  const callOcrApi = async (imageData: string): Promise<string> => {
    const body = new URLSearchParams()
    body.append("apikey", "helloworld")
    body.append("base64Image", imageData)
    body.append("language", "eng")
    body.append("OCREngine", "2")
    body.append("scale", "true")
    const res = await fetch("https://api.ocr.space/parse/image", { method:"POST", body })
    const json = await res.json()
    return json?.ParsedResults?.[0]?.ParsedText ?? ""
  }

  const ocrWithApi = async (dataUrl: string): Promise<number> => {
    try {
      // Try bottom 45% first (where TOTAL always appears), then full if needed
      const crops: [number,number][] = [[0.45, 1.0], [0.0, 1.0]]
      for (const [y0, y1] of crops) {
        const cropped = await cropDataUrl(dataUrl, y0, y1)
        const text = await callOcrApi(cropped)
        console.log(`[OCR.space ${y0}-${y1}]`, text)
        const found = parseReceiptAmount(text)
        if (found > 0) return found
      }
      return 0
    } catch { return 0 }
  }

const cats  = type==="income" ? INCOME_CATS : EXPENSE_CATS
  const rawAmount = amount.replace(/\./g, "")
  const noAmt  = !(parseInt(rawAmount) > 0)
  const valid  = !noAmt

  const handleAmount = (val: string) => {
    const digits = val.replace(/\D/g, "")
    const formatted = digits === "" ? "" : parseInt(digits).toLocaleString("id-ID")
    setAmt(formatted)
  }

  const save  = () => {
    setTried(true)
    if(!valid) return
    onSave({id:Date.now().toString(), type, category:cat||"Lainnya", label:label||(cat||"Lainnya"), amount:parseInt(rawAmount), date, time: new Date().toLocaleTimeString("id-ID", {hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"}), photo: photo || undefined})
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
        boxShadow:"0 24px 60px rgba(0,0,0,0.35)",
        display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 100px)" }}>

        <div style={{ padding:"22px 22px 0", position:"relative", flexShrink:0 }}>
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

          <div style={{ display:"flex", flexDirection:"column", gap:14, paddingBottom:22, overflowY:"auto", maxHeight:"60vh" }}>
            {/* Foto Struk — di atas agar OCR bisa auto-isi jumlah */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>
                Foto Struk
                <span style={{ marginLeft:6, fontSize:10, fontStyle:"italic", color:C.muted, textTransform:"none", letterSpacing:0 }}>· opsional · OCR otomatis</span>
              </p>
              {photo ? (
                <div style={{ position:"relative" }}>
                  <img src={photo} alt="struk" style={{ width:"100%", maxHeight:160, objectFit:"cover", borderRadius:10, border:`1px solid ${C.border}` }}/>
                  <button onClick={()=>{ setPhoto(""); setOcrStatus("idle"); setOcrAmount(null) }}
                    style={{ position:"absolute", top:6, right:6, width:26, height:26, borderRadius:"50%",
                      background:"rgba(0,0,0,0.65)", border:"none", cursor:"pointer", color:"#fff", fontSize:14,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                </div>
              ) : (
                <div style={{ display:"flex", gap:8 }}>
                  <label style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5, padding:"12px 8px",
                    border:`1px dashed ${C.border}`, borderRadius:10, cursor:"pointer",
                    background:"rgba(255,255,255,0.03)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <div style={{ fontSize:12, color:C.text, fontFamily:"Instrument Sans, sans-serif", fontWeight:500 }}>Kamera</div>
                    <input type="file" accept="image/*" capture="environment" style={{ display:"none" }}
                      onChange={async e=>{ const f=e.target.files?.[0]; if(!f) return; const d=await compressImage(f); setPhoto(d); runOcr(d) }}/>
                  </label>
                  <label style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5, padding:"12px 8px",
                    border:`1px dashed ${C.border}`, borderRadius:10, cursor:"pointer",
                    background:"rgba(255,255,255,0.03)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <div style={{ fontSize:12, color:C.text, fontFamily:"Instrument Sans, sans-serif", fontWeight:500 }}>Pilih File</div>
                    <input type="file" accept="image/*" style={{ display:"none" }}
                      onChange={async e=>{ const f=e.target.files?.[0]; if(!f) return; const d=await compressImage(f); setPhoto(d); runOcr(d) }}/>
                  </label>
                </div>
              )}

              {/* OCR status chips — shown below photo */}
              {ocrStatus === "loading" && (
                <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
                  borderRadius:10, background:`rgba(124,58,237,0.1)`, border:`1px solid rgba(124,58,237,0.2)` }}>
                  <div style={{ width:14, height:14, flexShrink:0, borderRadius:"50%", border:`2.5px solid ${C.accent}`, borderTopColor:"transparent", animation:"spin 0.75s linear infinite" }}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:C.accent, fontFamily:"Instrument Sans, sans-serif" }}>Membaca struk...</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>Harap tunggu, OCR sedang berjalan</div>
                  </div>
                </div>
              )}

              {ocrStatus === "found" && ocrAmount !== null && (
                <div style={{ marginTop:8, borderRadius:10, overflow:"hidden", border:"1.5px solid rgba(16,185,129,0.4)", background:"rgba(16,185,129,0.07)", display:"flex", alignItems:"center" }}>
                  <div style={{ padding:"6px 10px", display:"flex", alignItems:"center", gap:6, flex:1 }}>
                    <span style={{ fontSize:13 }}>🎯</span>
                    <div>
                      <div style={{ fontSize:10, color:"#10b981", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>Terdeteksi</div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#10b981", fontFamily:"DM Mono, monospace", letterSpacing:"-0.02em" }}>
                        Rp {ocrAmount.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                  <button onClick={()=>setOcrStatus("idle")}
                    style={{ padding:"6px 12px", border:"none", borderLeft:"1px solid rgba(16,185,129,0.2)", background:"transparent", cursor:"pointer",
                      fontSize:11, color:C.muted, fontFamily:"Instrument Sans, sans-serif", whiteSpace:"nowrap" }}>
                    Ubah
                  </button>
                </div>
              )}

              {ocrStatus === "notfound" && (
                <div style={{ marginTop:10, padding:"9px 14px", borderRadius:10,
                  background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)",
                  display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ fontSize:14 }}>⚠️</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#f59e0b", fontFamily:"Instrument Sans, sans-serif" }}>Nominal tidak terbaca</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>Usahakan foto dengan jelas atau masukkan jumlah secara manual</div>
                  </div>
                </div>
              )}
            </div>

            {/* Kategori */}
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>Kategori</p>
                <span style={{ fontSize:10, fontStyle:"italic", color:C.muted, textTransform:"none", letterSpacing:0 }}>· opsional</span>
              </div>
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
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                <p style={{ fontSize:11, color: tried&&noAmt ? C.red : C.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>Jumlah (Rp)</p>
                {tried && noAmt && <span style={{ fontSize:10, color:C.red, fontFamily:"Instrument Sans, sans-serif" }}>· wajib diisi</span>}
              </div>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, fontWeight:600, color:C.sub, pointerEvents:"none", fontFamily:"DM Mono, monospace" }}>Rp</span>
                <input
                  style={{ ...inp, paddingLeft:38, fontFamily:"DM Mono, monospace", fontSize:15, fontWeight:500, letterSpacing:"0.02em",
                    border:`1px solid ${tried&&noAmt ? C.red+"88" : C.border}` }}
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

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8, flexShrink:0 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:11, borderRadius:10, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.07)", color:"#ef4444", fontSize:13, cursor:"pointer", fontFamily:"Instrument Sans, sans-serif" }}>
            Batal
          </button>
          <button onClick={save} disabled={ocrStatus==="loading"}
            style={{ flex:2, padding:11, borderRadius:10, border:"none", fontSize:13, fontWeight:600,
              cursor:ocrStatus==="loading"?"not-allowed":"pointer",
              background: C.grad, color:"#fff", opacity:ocrStatus==="loading"?0.7:1,
              fontFamily:"Instrument Sans, sans-serif", transition:"opacity 0.15s",
              boxShadow:"0 4px 20px rgba(124,58,237,0.4)",
            }}>
            {ocrStatus === "loading" ? "Membaca struk..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  )
}

const BILL_CATS = ["Utilitas","Langganan","Cicilan","Asuransi","Sewa","Komunikasi","Lainnya"]
const BILL_CAT_ICON: Record<string,string> = {
  Utilitas:"⚡", Langganan:"📺", Cicilan:"💳", Asuransi:"🛡️", Sewa:"🏠", Komunikasi:"📱", Lainnya:"📦"
}

function BillModal({ bill, onSave, onClose }: {
  bill?: Bill
  onSave: (b: Bill) => void
  onClose: () => void
}) {
  const [name, setName]       = useState(bill?.name || "")
  const [amount, setAmt]      = useState(bill ? idr(bill.amount) : "")
  const [dueDay, setDueDay]   = useState(bill?.dueDay?.toString() || "1")
  const [icon, setIcon]       = useState(bill?.icon || "⚡")
  const [wallet, setWallet]   = useState(bill?.wallet || "")
  const [category, setCat]    = useState(bill?.category || "")
  const [note, setNote]       = useState(bill?.note || "")

  const rawAmount = amount.replace(/\./g, "")
  const valid = !!name.trim() && parseInt(rawAmount) > 0 && parseInt(dueDay) >= 1 && parseInt(dueDay) <= 31

  const handleAmount = (val: string) => {
    const digits = val.replace(/\D/g, "")
    setAmt(digits === "" ? "" : parseInt(digits).toLocaleString("id-ID"))
  }

  const save = () => {
    if (!valid) return
    onSave({
      id: bill?.id || Date.now().toString(),
      name: name.trim(),
      amount: parseInt(rawAmount),
      dueDay: parseInt(dueDay),
      icon,
      wallet: wallet || undefined,
      category: category || undefined,
      note: note.trim() || undefined,
      paidMonths: bill?.paidMonths || [],
    })
  }

  const inp: React.CSSProperties = {
    width:"100%", padding:"10px 12px", fontSize:14,
    border:`1px solid ${C.border}`, borderRadius:10,
    background:"rgba(255,255,255,0.05)", color:C.text, outline:"none",
    fontFamily:"Instrument Sans, sans-serif",
  }

  return (
    <div className="ai" style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center",
      background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)", padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="au" style={{ width:"100%", maxWidth:360, borderRadius:20, overflow:"hidden",
        background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 24px 60px rgba(0,0,0,0.4)",
        display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 80px)" }}>

        {/* Header */}
        <div style={{ padding:"22px 22px 0", position:"relative", flexShrink:0 }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:C.grad, borderRadius:"16px 16px 0 0" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <p style={{ fontFamily:"Fraunces, serif", fontSize:20, fontWeight:700, color:C.text }}>{bill ? "Edit Tagihan" : "Tagihan Baru"}</p>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:16 }}>✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY:"auto", padding:"0 22px", flex:1 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16, paddingBottom:24 }}>

            {/* Icon picker */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Ikon</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {BILL_ICONS.map(ic=>(
                  <button key={ic} onClick={()=>setIcon(ic)}
                    style={{ width:38, height:38, borderRadius:10, border:`1px solid ${icon===ic?C.accent:C.border}`,
                      background:icon===ic?C.accentDim:"transparent", cursor:"pointer", fontSize:18,
                      display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.12s" }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Nama */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Nama Tagihan</p>
              <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Listrik, Internet, dll"/>
            </div>

            {/* Kategori */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>
                Kategori
                <span style={{ marginLeft:6, fontSize:10, fontStyle:"italic", textTransform:"none", letterSpacing:0 }}>· opsional</span>
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {BILL_CATS.map(c=>(
                  <button key={c} onClick={()=>setCat(category===c?"":c)}
                    style={{ padding:"5px 11px", fontSize:12, borderRadius:8, cursor:"pointer", transition:"all 0.12s",
                      border:`1px solid ${category===c?C.accent:C.border}`,
                      background:category===c?C.accentDim:"transparent",
                      color:category===c?C.accent:C.sub,
                      fontFamily:"Instrument Sans, sans-serif",
                      display:"flex", alignItems:"center", gap:5 }}>
                    <span>{BILL_CAT_ICON[c]}</span><span>{c}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Jumlah */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Jumlah (Rp)</p>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, fontWeight:600, color:C.sub, pointerEvents:"none", fontFamily:"DM Mono, monospace" }}>Rp</span>
                <input style={{ ...inp, paddingLeft:38, fontFamily:"DM Mono, monospace", fontSize:15, fontWeight:500 }}
                  type="text" inputMode="numeric" value={amount} onChange={e=>handleAmount(e.target.value)} placeholder="0"/>
              </div>
            </div>

            {/* Tanggal jatuh tempo */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Tanggal Jatuh Tempo</p>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input style={{ ...inp, width:80, textAlign:"center" }}
                  type="number" min="1" max="31" value={dueDay}
                  onChange={e=>setDueDay(e.target.value)} placeholder="1"/>
                <span style={{ fontSize:13, color:C.muted, fontFamily:"Instrument Sans, sans-serif" }}>setiap bulan</span>
              </div>
            </div>

            {/* Bank / E-Wallet */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>
                Bank / E-Wallet
                <span style={{ marginLeft:6, fontSize:10, fontStyle:"italic", textTransform:"none", letterSpacing:0 }}>· opsional</span>
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                {["BCA","BRI","Mandiri","OVO","GoPay","Dana","ShopeePay"].map(w=>(
                  <button key={w} onClick={()=>setWallet(wallet===w?"":w)}
                    style={{ padding:"4px 10px", fontSize:11, borderRadius:8, cursor:"pointer", transition:"all 0.12s",
                      border:`1px solid ${wallet===w?C.accent:C.border}`,
                      background:wallet===w?C.accentDim:"transparent",
                      color:wallet===w?C.accent:C.sub,
                      fontFamily:"DM Mono, monospace", fontWeight:600 }}>
                    {w}
                  </button>
                ))}
              </div>
              <input style={{ ...inp, fontSize:13 }} value={wallet} onChange={e=>setWallet(e.target.value)} placeholder="Atau ketik nama bank/e-wallet..."/>
            </div>

            {/* Catatan */}
            <div>
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>
                Catatan
                <span style={{ marginLeft:6, fontSize:10, fontStyle:"italic", textTransform:"none", letterSpacing:0 }}>· opsional</span>
              </p>
              <textarea style={{ ...inp, resize:"none", minHeight:72, fontSize:13, lineHeight:1.6 }}
                value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Nomor rekening, kode pelanggan, dll..."/>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8, flexShrink:0 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:11, borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", color:C.sub, fontSize:13, cursor:"pointer", fontFamily:"Instrument Sans, sans-serif" }}>
            Batal
          </button>
          <button onClick={save} disabled={!valid}
            style={{ flex:2, padding:11, borderRadius:10, border:"none", fontSize:13, fontWeight:600,
              cursor:valid?"pointer":"not-allowed",
              background:valid?C.grad:"rgba(255,255,255,0.06)",
              color:valid?"#fff":C.muted, fontFamily:"Instrument Sans, sans-serif",
              boxShadow:valid?"0 4px 20px rgba(124,58,237,0.4)":"none" }}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
      <span style={{ fontSize:10 }}>🕐</span>
      <span style={{ fontSize:16, fontWeight:700, fontFamily:"DM Mono, monospace", letterSpacing:"0.04em" }}>
        {t.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", second:"2-digit", timeZone:"Asia/Jakarta" })}
      </span>
      <span style={{ fontSize:11, fontFamily:"Instrument Sans, sans-serif", fontWeight:600 }}>WIB</span>
    </div>
  )
}

function PhotoViewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="ai" style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"center", justifyContent:"center",
      background:"rgba(0,0,0,0.85)", backdropFilter:"blur(12px)", padding:20 }}
      onClick={onClose}>
      <div className="au" style={{ position:"relative", maxWidth:480, width:"100%" }} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute", top:-14, right:-14, width:32, height:32, borderRadius:"50%",
          background:"rgba(255,255,255,0.15)", border:"none", cursor:"pointer", color:"#fff", fontSize:16,
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 }}>✕</button>
        <img src={src} alt="struk" style={{ width:"100%", borderRadius:16, boxShadow:"0 24px 60px rgba(0,0,0,0.5)" }}/>
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
  const [activeTab, setActiveTab] = useState<"home"|"txn"|"settings">("home")
  const [txns, setTxns]     = useState<Transaction[]>([])
  const [welcomeName, setWelcomeName] = useState<string|null>(null)
  const [showAdd, setAdd]   = useState(false)
  const [filter, setFilter] = useState<"all"|"income"|"expense">("all")
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => (localStorage.getItem("themeMode") as ThemeMode) || "light"
  )
  const [showCal, setShowCal]         = useState(true)
  const [showBills, setShowBills]     = useState(false)
  const [showAmounts, setShowAmounts] = useState(true)
  const [showRingkasan, setShowRingkasan] = useState(true)
  const [showTxnList, setShowTxnList]     = useState(true)

  // Target keuangan
  type TopupEntry = { id:string; amount:number; note:string; date:string }
  type Target = { id:string; name:string; icon:string; targetAmount:number; savedAmount:number; dateStart?:string; dateEnd?:string; history?:TopupEntry[]; wallet?:string }
  const storageKey = `targets_${user?.id || "guest"}`
  const [targets, setTargets] = useState<Target[]>(() => {
    try {
      const raw: any[] = JSON.parse(localStorage.getItem(`targets_${user?.id||"guest"}`) || "[]")
      return raw.map(t => ({ ...t, icon: typeof t.icon === "object" ? "🎯" : t.icon }))
    } catch { return [] }
  })
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [showAddTarget, setShowAddTarget] = useState(false)
  const [editTarget, setEditTarget] = useState<Target|null>(null)
  const [targetName, setTargetName] = useState("")
  const [targetIcon, setTargetIcon] = useState("🎯")
  const [targetAmount, setTargetAmount] = useState("")
  const [targetSaved, setTargetSaved] = useState("")
  const [targetDateStart, setTargetDateStart] = useState("")
  const [targetDateEnd, setTargetDateEnd] = useState("")
  const [targetWallet, setTargetWallet] = useState("")
  const WALLETS = ["BCA","BRI","BNI","Mandiri","BSI","CIMB","Jenius","Krom Bank","SeaBank","GoPay","OVO","Dana","ShopeePay","Flip","Lainnya"]
  const [topupTarget, setTopupTarget] = useState<Target|null>(null)
  const [topupAmount, setTopupAmount] = useState("")
  const [topupNote, setTopupNote] = useState("")
  const [topupDate, setTopupDate] = useState(new Date().toISOString().slice(0,10))
  const [editTopupEntry, setEditTopupEntry] = useState<{targetId:string; entry:TopupEntry}|null>(null)
  const [editTopupAmt, setEditTopupAmt] = useState("")
  const [editTopupNote, setEditTopupNote] = useState("")
  const [showHistory, setShowHistory] = useState<string|null>(null)
  const [showTargets, setShowTargets] = useState(false)
  const [showTargetStats, setShowTargetStats] = useState(false)
  const [savingsFx, setSavingsFx] = useState<{id:string; amt:number; done:boolean}[]>([])

  const saveTargets = (list: Target[]) => {
    setTargets(list)
    localStorage.setItem(storageKey, JSON.stringify(list))
  }
  const openAddTarget = () => {
    setEditTarget(null); setTargetName(""); setTargetIcon("🎯")
    setTargetAmount(""); setTargetSaved(""); setTargetDateStart(""); setTargetDateEnd(""); setTargetWallet("")
    setShowAddTarget(true)
  }
  const openEditTarget = (t: Target) => {
    setEditTarget(t); setTargetName(t.name); setTargetIcon(t.icon)
    setTargetAmount(String(t.targetAmount)); setTargetSaved(String(t.savedAmount))
    setTargetDateStart(t.dateStart || ""); setTargetDateEnd(t.dateEnd || ""); setTargetWallet(t.wallet||""); setShowAddTarget(true)
  }
  const submitTarget = () => {
    if (!targetAmount) return
    const finalName = targetName.trim() || targetIcon
    const amt = parseInt(targetAmount.replace(/\./g,"")) || 0
    const saved = parseInt(targetSaved.replace(/\./g,"")) || 0
    if (editTarget) {
      saveTargets(targets.map(t => t.id===editTarget.id ? {...t, name:finalName, icon:targetIcon, targetAmount:amt, savedAmount:saved, dateStart:targetDateStart||undefined, dateEnd:targetDateEnd||undefined, wallet:targetWallet||undefined} : t))
    } else {
      saveTargets([...targets, { id:Date.now().toString(), name:finalName, icon:targetIcon, targetAmount:amt, savedAmount:saved, dateStart:targetDateStart||undefined, dateEnd:targetDateEnd||undefined, wallet:targetWallet||undefined }])
    }
    setShowAddTarget(false)
  }
  const deleteTarget = (id: string) => saveTargets(targets.filter(t=>t.id!==id))
  const submitTopup = () => {
    if (!topupTarget) return
    const amt = parseInt(topupAmount.replace(/\./g,"")) || 0
    if (!amt) return
    const entry: TopupEntry = { id:Date.now().toString(), amount:amt, note:topupNote.trim(), date:topupDate }
    const newSaved = Math.min(topupTarget.savedAmount+amt, topupTarget.targetAmount)
    const done = newSaved >= topupTarget.targetAmount
    saveTargets(targets.map(t => t.id===topupTarget.id ? {
      ...t, savedAmount: newSaved, history: [...(t.history||[]), entry]
    } : t))
    const fxId = Date.now().toString()
    setSavingsFx(fx => [...fx, {id:fxId, amt, done}])
    setTimeout(() => setSavingsFx(fx => fx.filter(f=>f.id!==fxId)), 1800)
    setTopupTarget(null); setTopupAmount(""); setTopupNote(""); setTopupDate(new Date().toISOString().slice(0,10))
  }
  const submitEditTopup = () => {
    if (!editTopupEntry) return
    const amt = parseInt(editTopupAmt.replace(/\./g,"")) || 0
    saveTargets(targets.map(t => {
      if (t.id !== editTopupEntry.targetId) return t
      const oldAmt = editTopupEntry.entry.amount
      const newHistory = (t.history||[]).map(h => h.id===editTopupEntry.entry.id ? {...h, amount:amt, note:editTopupNote.trim()} : h)
      const newSaved = Math.min(t.savedAmount - oldAmt + amt, t.targetAmount)
      return {...t, savedAmount: Math.max(0, newSaved), history: newHistory}
    }))
    setEditTopupEntry(null)
  }
  const deleteTopupEntry = (targetId:string, entry:TopupEntry) => {
    saveTargets(targets.map(t => {
      if (t.id !== targetId) return t
      return {...t, savedAmount: Math.max(0, t.savedAmount - entry.amount), history: (t.history||[]).filter(h=>h.id!==entry.id)}
    }))
  }
  const TARGET_ICONS: {icon:string; label:string}[] = [
    {icon:"🎯", label:"Lainnya"}, {icon:"🚗", label:"Mobil"}, {icon:"🏠", label:"Rumah"},
    {icon:"💰", label:"Emas"}, {icon:"🚲", label:"Motor"}, {icon:"💳", label:"Cicilan"},
    {icon:"✈️", label:"Liburan"}, {icon:"📲", label:"HP"}, {icon:"💻", label:"Laptop"},
    {icon:"🎓", label:"Pendidikan"}, {icon:"👶", label:"Anak"}, {icon:"🐖", label:"Tabungan"},
    {icon:"👑", label:"Pernikahan"}, {icon:"🏡", label:"Furnitur"},
  ]
  const [editTxn, setEditTxn] = useState<Transaction|null>(null)
  const [viewPhoto, setViewPhoto] = useState<string|null>(null)

  // Bills
  const billKey = `bills_${user?.id || "guest"}`
  const [bills, setBills] = useState<Bill[]>(() => {
    try { return JSON.parse(localStorage.getItem(`bills_${user?.id||"guest"}`) || "[]") } catch { return [] }
  })
  const [showBillModal, setShowBillModal] = useState(false)
  const [editBill, setEditBill] = useState<Bill|null>(null)
  const [confirmDelBill, setConfirmDelBill] = useState<string|null>(null)

  const saveBills = (list: Bill[]) => {
    setBills(list)
    localStorage.setItem(billKey, JSON.stringify(list))
  }
  const addBill = (b: Bill) => {
    saveBills([...bills, b])
    setShowBillModal(false)
  }
  const updateBill = (b: Bill) => {
    saveBills(bills.map(x => x.id === b.id ? b : x))
    setEditBill(null)
  }
  const deleteBill = (id: string) => {
    saveBills(bills.filter(x => x.id !== id))
    setConfirmDelBill(null)
  }
  const toggleBillPaid = (bill: Bill) => {
    const mk = `${year}-${String(month+1).padStart(2,"0")}`
    const alreadyPaid = bill.paidMonths.includes(mk)
    const updated = { ...bill, paidMonths: alreadyPaid ? bill.paidMonths.filter(m=>m!==mk) : [...bill.paidMonths, mk] }
    saveBills(bills.map(x => x.id === bill.id ? updated : x))
  }

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
  const isPlain = isLight  // AUTO uses its own dark styling, not the light/plain path

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

  const txnRef = useRef<HTMLDivElement>(null)
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
        await supabase.from("profiles").update({ name: settingsName.trim() }).eq("id", user!.id)
        const { data: refreshed } = await supabase.auth.getUser()
        if (refreshed?.user) setUser(refreshed.user)
        setSettingsMsg({type:"ok", text:"Nama berhasil diubah."})
        setTimeout(()=>setShowSettings(false), 1000)
      } else if (settingsTab === "username") {
        if (!settingsUsername.trim()) { setSettingsMsg({type:"err", text:"Username tidak boleh kosong."}); return }
        const { data: ex } = await supabase.from("profiles").select("id").eq("username", settingsUsername.trim()).maybeSingle()
        if (ex && ex.id !== user!.id) { setSettingsMsg({type:"err", text:"Username sudah dipakai."}); return }
        await supabase.auth.updateUser({ data: { username: settingsUsername.trim() } })
        const { error: upErr } = await supabase.from("profiles").update({ username: settingsUsername.trim() }).eq("id", user!.id)
        if (upErr) { setSettingsMsg({type:"err", text:"Gagal menyimpan — cek RLS policy di Supabase."}); return }
        const { data: refreshed2 } = await supabase.auth.getUser()
        if (refreshed2?.user) { setUser(refreshed2.user); setSettingsUsername(refreshed2.user.user_metadata?.username || settingsUsername) }
        setSettingsMsg({type:"ok", text:"Username berhasil diubah."})
        setTimeout(()=>setShowSettings(false), 1000)
      } else {
        if (settingsNewPw.length < 6) { setSettingsMsg({type:"err", text:"Password minimal 6 karakter."}); return }
        if (settingsNewPw !== settingsConfirmPw) { setSettingsMsg({type:"err", text:"Konfirmasi password tidak cocok."}); return }
        const currentUsername = user?.user_metadata?.username
        if (!currentUsername) { setSettingsMsg({type:"err", text:"Username tidak ditemukan."}); return }
        const res = await fetch("https://qppqqswrwryxbuymesyl.supabase.co/functions/v1/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcHFxc3dyd3J5eGJ1eW1lc3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDUxNjUsImV4cCI6MjA2NTIyMTE2NX0.TkbDI46PdCEMjdJNdXbqxs0WZX_GXkEIaVZHZfkSJTs",
          },
          body: JSON.stringify({ username: currentUsername, newPassword: settingsNewPw }),
        })
        const data = await res.json().catch(()=>({}))
        if (!res.ok) { setSettingsMsg({type:"err", text:data.error||"Gagal mengubah password."}); return }
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
    <div style={{ minHeight:"100vh", background:P.bg, paddingBottom:100 }}>


      {/* Subtle dot grid */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background:`radial-gradient(circle, ${P.gridColor} 1px, transparent 1px) center/28px 28px`,
        opacity: P === DARK ? 0.025 : 0.06,
        }}/>

      {/* Top gradient bloom */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"40vh", pointerEvents:"none", zIndex:0,
        background: isAuto
          ? `radial-gradient(ellipse 110% 70% at 30% -10%, ${P.meshA} 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 80% -5%, ${P.meshB} 0%, transparent 55%)`
          : `radial-gradient(ellipse 90% 60% at 50% -5%, ${P.meshA} 0%, transparent 65%)`,
        }}/>

      <div style={{ maxWidth:520, margin:"0 auto", padding:"48px 20px 80px", position:"relative" }}>

        {/* Top bar */}
        <div className="au" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, position:"relative", zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:P.accentDim,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>👤</div>
            <span style={{ fontSize:13, fontWeight:600, color:P.text, fontFamily:"Instrument Sans, sans-serif" }}>
              {user.user_metadata?.name || user.user_metadata?.username || user.email}
            </span>
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
                  <button key={o.mode} onClick={()=>{setThemeMode(o.mode);localStorage.setItem("themeMode",o.mode);setThemeOpen(false)}}
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


        {/* ── BERANDA ──────────────────────────────────────────── */}
        {activeTab === "home" && <>

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
                  <div className="wallet-badge" style={{ width:44, height:44, borderRadius:13, flexShrink:0,
                    background:"rgba(161,100,50,0.15)",
                    border:"1px solid rgba(161,100,50,0.35)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:"0 4px 16px rgba(161,100,50,0.25)",
                    position:"relative", overflow:"visible" }}>
                    {/* money coins flying out */}
                    <div className="badge-coin-1" style={{ position:"absolute", top:-6, left:4, fontSize:11, pointerEvents:"none" }}>🪙</div>
                    <div className="badge-coin-2" style={{ position:"absolute", top:-8, right:2, fontSize:10, pointerEvents:"none" }}>💵</div>
                    <svg className="wallet-svg-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                <LiveClock/>
              </div>
            </div>
          </div>
          <button onClick={()=>setAdd(true)}
            style={{ marginTop:38, padding:"10px 18px", fontSize:13, fontWeight:600, border:"none", cursor:"pointer",
              fontFamily:"Instrument Sans, sans-serif", borderRadius:12, color:"#fff", flexShrink:0,
              background:P.grad,
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
              style={{ background: C.card,
                borderRadius:16, padding:"18px 13px 14px",
                boxShadow: isPlain ? "none" : "none",
                transition:"transform 0.25s, box-shadow 0.25s",
              }}>
              <p style={{ fontSize:10, color:C.muted, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:9, fontWeight:600 }}>{s.label}</p>
              <p style={{ fontFamily:"DM Mono, monospace", fontSize:12, color:isPlain?C.text:s.color, lineHeight:1.2, fontWeight:600, letterSpacing: showAmounts?"normal":"0.12em", wordBreak:"break-all" }}>
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
        <div className="au" style={{ animationDelay:"0.3s", marginBottom:24 }}>
          <div className={`grad-border${isAuto?" auto-border":""}`} style={{ background:C.card, borderRadius:16, padding:"18px 18px 14px" }} data-cal>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: showCal ? 14 : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:C.accentDim,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p style={{ fontFamily:"Fraunces, serif", fontSize:15, fontWeight:700, color:C.text }}>Kalender Aktivitas</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {showCal && (
                  <span style={{ fontSize:11, fontWeight:600, color:C.muted }}>
                    {Object.keys(monthTxns.reduce((a,t)=>{ a[t.date.slice(8,10)]=1; return a },{}as Record<string,number>)).length} hari aktif
                  </span>
                )}
                <button onClick={()=>setShowCal(v=>!v)}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:C.muted, display:"flex", alignItems:"center", borderRadius:6, transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color=C.accent}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color=C.muted}>
                  {showCal ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  )}
                </button>
              </div>
            </div>
            {showCal && <CalendarIndicator year={year} month={month} txns={txns}/>}
          </div>
        </div>

        {/* Tagihan Bulanan */}
        <div className="au" style={{ animationDelay:"0.31s", marginBottom:24 }}>
          <div className={`grad-border${isAuto?" auto-border":""}`} style={{ background:C.card, borderRadius:16, padding:"18px 18px 14px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: showBills && bills.length>0 ? 16 : 0 }}>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:15, fontWeight:700, color:C.text }}>🧾 Tagihan</p>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {showBills && (
                  <button onClick={()=>setShowBillModal(true)}
                    style={{ padding:"5px 12px", fontSize:12, fontWeight:700, border:`1px solid ${C.accent}44`,
                      borderRadius:8, background:C.accentDim, color:C.accent, cursor:"pointer",
                      fontFamily:"Instrument Sans, sans-serif", display:"flex", alignItems:"center", gap:4 }}>
                    + Tambah
                  </button>
                )}
                <button onClick={()=>setShowBills(v=>!v)}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:C.muted, display:"flex", alignItems:"center", borderRadius:6, transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color=C.accent}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color=C.muted}>
                  {showBills ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  )}
                </button>
              </div>
            </div>
            {showBills && bills.length === 0 && (
              <div style={{ textAlign:"center", padding:"24px 0 8px", color:C.muted, fontSize:13,
                fontFamily:"Instrument Sans, sans-serif" }}>
                Belum ada tagihan. Tambahkan pengingat tagihan bulananmu.
              </div>
            )}
            {showBills && bills.length > 0 && (()=>{
              const mk = `${year}-${String(month+1).padStart(2,"0")}`
              const today = new Date().getDate()
              const sorted = [...bills].sort((a,b)=>a.dueDay-b.dueDay)
              return sorted.map((bill, idx) => {
                const isPaid = bill.paidMonths.includes(mk)
                const daysLeft = bill.dueDay - today
                const isOverdue = !isPaid && daysLeft < 0
                const isSoon   = !isPaid && daysLeft >= 0 && daysLeft <= 3
                const statusColor = isPaid ? C.green : isOverdue ? C.red : isSoon ? "#f59e0b" : C.muted
                const statusBg    = isPaid ? C.greenDim : isOverdue ? C.redDim : isSoon ? "rgba(245,158,11,0.12)" : "transparent"
                const statusLabel = isPaid ? "Lunas" : isOverdue ? `Lewat ${Math.abs(daysLeft)}h` : daysLeft === 0 ? "Hari ini!" : `${daysLeft}h lagi`
                return (
                  <div key={bill.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0",
                    borderBottom: idx < sorted.length-1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, fontSize:20,
                      background: isPaid ? C.greenDim : isOverdue ? C.redDim : C.accentDim,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {bill.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:2,
                        textDecoration: isPaid ? "line-through" : "none", opacity: isPaid ? 0.6 : 1 }}>{bill.name}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                        <p style={{ fontFamily:"DM Mono, monospace", fontSize:12, color:C.muted }}>Rp {bill.amount.toLocaleString("id-ID")}</p>
                        {bill.category && <span style={{ fontSize:10, fontWeight:600, color:C.accent, background:C.accentDim, padding:"1px 6px", borderRadius:6 }}>{bill.category}</span>}
                        {bill.wallet && <span style={{ fontSize:10, fontWeight:600, color:C.sub, background:"rgba(255,255,255,0.07)", padding:"1px 6px", borderRadius:6 }}>{bill.wallet}</span>}
                      </div>
                      {bill.note && <p style={{ fontSize:11, color:C.muted, marginTop:3, fontStyle:"italic", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{bill.note}</p>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:6,
                        background:statusBg, color:statusColor, fontFamily:"Instrument Sans, sans-serif" }}>
                        {statusLabel}
                      </span>
                      <div style={{ display:"flex", gap:4 }}>
                        <button onClick={()=>toggleBillPaid(bill)}
                          title={isPaid ? "Tandai belum bayar" : "Tandai lunas"}
                          style={{ width:28, height:28, borderRadius:8, border:`1px solid ${isPaid?C.green+"44":C.border}`,
                            background:isPaid?C.greenDim:"transparent", cursor:"pointer", color:isPaid?C.green:C.muted,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                        <button onClick={()=>setEditBill(bill)}
                          style={{ width:28, height:28, borderRadius:8, border:`1px solid ${C.border}`,
                            background:"transparent", cursor:"pointer", color:C.muted,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        {confirmDelBill === bill.id ? (
                          <>
                            <button onClick={()=>deleteBill(bill.id)}
                              style={{ padding:"0 8px", height:28, borderRadius:8, border:"none",
                                background:C.red, cursor:"pointer", color:"#fff", fontSize:11, fontWeight:700,
                                fontFamily:"Instrument Sans, sans-serif" }}>Hapus!</button>
                            <button onClick={()=>setConfirmDelBill(null)}
                              style={{ padding:"0 8px", height:28, borderRadius:8, border:`1px solid ${C.border}`,
                                background:"transparent", cursor:"pointer", color:C.muted, fontSize:11,
                                fontFamily:"Instrument Sans, sans-serif" }}>Batal</button>
                          </>
                        ) : (
                          <button onClick={()=>setConfirmDelBill(bill.id)}
                            style={{ width:28, height:28, borderRadius:8, border:`1px solid ${C.red}44`,
                              background:C.redDim, cursor:"pointer", color:C.red,
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* Tabungan */}
        <div className="au" style={{ animationDelay:"0.3s", marginBottom:24 }}>
          <div className={`grad-border${isAuto?" auto-border":""}`} style={{ background:C.card, borderRadius:16, padding:"18px 18px 14px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: showTargets ? 16 : 0 }}>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:15, fontWeight:700, color:C.text }}>🎯 Tabungan</p>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {showTargets && targets.length > 0 && (
                  <button onClick={()=>setShowTargetStats(true)}
                    style={{ padding:"5px 10px", fontSize:12, fontWeight:700, border:`1px solid ${C.border}`,
                      borderRadius:8, background:C.surface, color:C.muted, cursor:"pointer",
                      display:"flex", alignItems:"center", gap:4 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    Statistik
                  </button>
                )}
                {showTargets && (
                  <button onClick={openAddTarget}
                    style={{ padding:"5px 12px", fontSize:12, fontWeight:700, border:`1px solid ${C.accent}44`,
                      borderRadius:8, background:C.accentDim, color:C.accent, cursor:"pointer",
                      fontFamily:"Instrument Sans, sans-serif" }}>
                    + Tambah
                  </button>
                )}
                <button onClick={()=>setShowTargets(v=>!v)}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:C.muted, display:"flex", alignItems:"center" }}>
                  {showTargets ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  )}
                </button>
              </div>
            </div>
            {showTargets && targets.length === 0 ? (
              <div style={{ textAlign:"center", padding:"20px 0", color:C.muted }}>
                <p style={{ fontSize:28, marginBottom:8 }}>🎯</p>
                <p style={{ fontSize:13, fontFamily:"Fraunces, serif", fontStyle:"italic" }}>Belum ada tabungan. Yuk buat tabungan pertamamu!</p>
              </div>
            ) : showTargets ? (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {targets.map(t => {
                  const pct = Math.min(100, Math.round((t.savedAmount/t.targetAmount)*100))
                  const done = pct >= 100
                  return (
                    <div key={t.id} style={{ background:C.surface, borderRadius:12, padding:"14px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:20 }}>{t.icon}</span>
                          <div>
                            <p style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:"Instrument Sans, sans-serif" }}>{t.name}</p>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:2 }}>
                              {t.wallet && <span style={{ fontSize:10, fontWeight:700, color:C.accent, background:C.accentDim, padding:"1px 7px", borderRadius:99 }}>{t.wallet}</span>}
                              {(t.dateStart || t.dateEnd) && (
                                <span style={{ fontSize:10, color:C.muted }}>
                                  {t.dateStart ? new Date(t.dateStart).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}) : "—"}
                                  {" → "}
                                  {t.dateEnd ? new Date(t.dateEnd).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}) : "—"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          {!done && (
                            <button onClick={()=>{setTopupTarget(t);setTopupAmount("")}}
                              style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:7,
                                border:`1px solid ${C.green}44`, background:`${C.green}18`, color:C.green,
                                cursor:"pointer", fontFamily:"Instrument Sans, sans-serif" }}>
                              + Nabung
                            </button>
                          )}
                          <button onClick={()=>openEditTarget(t)}
                            style={{ padding:"5px 7px", borderRadius:7, border:`1px solid ${C.border}`,
                              background:"transparent", color:C.muted, cursor:"pointer", display:"flex", alignItems:"center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={()=>{ if(window.confirm("Yakin ingin menghapus tabungan ini?")) deleteTarget(t.id) }}
                            style={{ padding:"5px 7px", borderRadius:7, border:"1px solid rgba(239,68,68,0.3)",
                              background:"rgba(239,68,68,0.07)", color:"#ef4444", cursor:"pointer", display:"flex", alignItems:"center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height:9, background:C.border, borderRadius:99, overflow:"hidden", marginBottom:6, position:"relative" }}>
                        <div className={done?"progress-bar-glow":""} style={{ height:"100%", width:`${pct}%`, borderRadius:99,
                          background: done ? `linear-gradient(90deg,${C.green},#34d399)` : `linear-gradient(90deg,${C.accent},${C.green})`,
                          transition:"width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
                          position:"relative", overflow:"hidden" }}>
                          {pct > 10 && <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)", animation:"shimmer 2s ease-in-out infinite" }}/>}
                        </div>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <p style={{ fontSize:11, color: done ? C.green : C.muted, fontWeight:600 }}>
                          {done ? "✅ Tercapai!" : `${pct}% terkumpul`}
                        </p>
                        <p style={{ fontSize:11, color:C.muted }}>
                          {showAmounts ? `Rp ${t.savedAmount.toLocaleString("id-ID")} / Rp ${t.targetAmount.toLocaleString("id-ID")}` : "••• / •••"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
        </>} {/* end BERANDA */}

        {/* ── TRANSAKSI ────────────────────────────────────────── */}
        {activeTab === "txn" && <>

        {/* Txn page header */}
        <div className="au" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <p style={{ fontFamily:"Fraunces, serif", fontSize:26, fontWeight:700, fontStyle:"italic", color:C.text, lineHeight:1.1 }}>Riwayat Transaksi</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:3, fontFamily:"Instrument Sans, sans-serif" }}>{MONTHS[month]} {year}</p>
          </div>
          <button onClick={()=>setAdd(true)}
            style={{ padding:"10px 18px", fontSize:13, fontWeight:600, border:"none", cursor:"pointer",
              fontFamily:"Instrument Sans, sans-serif", borderRadius:12, color:"#fff",
              background:C.grad,
              boxShadow:"0 4px 20px rgba(124,58,237,0.35)", transition:"transform 0.2s" }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform="translateY(-2px)"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform="translateY(0)"}>
            + Tambah
          </button>
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
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <p style={{ fontSize:11, fontWeight:500, color:C.muted }}>{t.category}</p>
                              {t.time && <p style={{ fontSize:11, color:C.muted, fontFamily:"DM Mono, monospace" }}>· {t.time}</p>}
                            </div>
                          </div>

                          <div style={{ textAlign:"right", flexShrink:0, display:"flex", alignItems:"center", gap:6 }}>
                            <div>
                              <p style={{ fontFamily:"DM Mono, monospace", fontSize:13, fontWeight:500,
                                color:isLight?C.text:(isIncome?C.green:C.red), letterSpacing: showAmounts?"normal":"0.15em",
                                textShadow: isLight ? "none" : (isIncome?`0 0 12px rgba(52,211,153,0.5)`:`0 0 12px rgba(248,113,113,0.5)`) }}>
                                {showAmounts ? `${isIncome?"+":"−"}${rp(t.amount)}` : "••••••"}
                              </p>
                              {t.photo && (
                                <button onClick={()=>setViewPhoto(t.photo!)}
                                  style={{ background:"none", border:"none", cursor:"pointer", padding:0, marginTop:3,
                                    display:"flex", alignItems:"center", gap:3, color:C.muted }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                                  </svg>
                                  <span style={{ fontSize:10, fontFamily:"Instrument Sans, sans-serif" }}>Struk</span>
                                </button>
                              )}
                            </div>
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

        {/* ── RINGKASAN TAHUNAN ──────────────────────────────── */}
        {(() => {
          const thisYear = year
          const lastYear = year - 1
          const monthLabels = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
          const getData = (y: number) => monthLabels.map((_, i) => {
            const k = `${y}-${String(i+1).padStart(2,"0")}`
            const monthTxns = txns.filter(t => t.date.startsWith(k))
            const inc = monthTxns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0)
            const exp = monthTxns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)
            return { inc, exp, saldo: inc - exp }
          })
          const thisData = getData(thisYear)
          const lastData = getData(lastYear)
          const maxVal = Math.max(...thisData.map(d=>Math.max(d.inc,d.exp)), ...lastData.map(d=>Math.max(d.inc,d.exp)), 1)
          const barH = 90
          return (
            <div className="au" style={{ background:C.card, borderRadius:16, padding:"20px 18px", marginTop:16, border:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <p style={{ fontFamily:"Fraunces, serif", fontSize:16, fontWeight:700, color:C.text }}>Ringkasan Tahunan</p>
                <div style={{ display:"flex", gap:12, fontSize:10, color:C.muted, fontFamily:"Instrument Sans, sans-serif", fontWeight:600 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, borderRadius:2, background:C.green, display:"inline-block" }}/>{thisYear}</span>
                  <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, borderRadius:2, background:C.muted, display:"inline-block", opacity:0.4 }}/>{lastYear}</span>
                </div>
              </div>
              {/* Pemasukan */}
              <p style={{ fontSize:10, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>Pemasukan</p>
              <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:barH, marginBottom:16 }}>
                {monthLabels.map((m,i) => (
                  <div key={m} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                    <div style={{ width:"100%", display:"flex", gap:1, alignItems:"flex-end", height:barH-14 }}>
                      <div style={{ flex:1, background: `${C.muted}30`, borderRadius:"3px 3px 0 0", height:`${(lastData[i].inc/maxVal)*100}%`, minHeight:2 }} title={`${lastYear}: Rp ${rp(lastData[i].inc)}`}/>
                      <div style={{ flex:1, background: C.green, borderRadius:"3px 3px 0 0", height:`${(thisData[i].inc/maxVal)*100}%`, minHeight:2 }} title={`${thisYear}: Rp ${rp(thisData[i].inc)}`}/>
                    </div>
                    <span style={{ fontSize:8, color:C.muted, fontFamily:"Instrument Sans, sans-serif" }}>{m}</span>
                  </div>
                ))}
              </div>
              {/* Pengeluaran */}
              <p style={{ fontSize:10, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>Pengeluaran</p>
              <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:barH, marginBottom:16 }}>
                {monthLabels.map((m,i) => (
                  <div key={m} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                    <div style={{ width:"100%", display:"flex", gap:1, alignItems:"flex-end", height:barH-14 }}>
                      <div style={{ flex:1, background: `${C.muted}30`, borderRadius:"3px 3px 0 0", height:`${(lastData[i].exp/maxVal)*100}%`, minHeight:2 }}/>
                      <div style={{ flex:1, background: C.red, borderRadius:"3px 3px 0 0", height:`${(thisData[i].exp/maxVal)*100}%`, minHeight:2 }}/>
                    </div>
                    <span style={{ fontSize:8, color:C.muted, fontFamily:"Instrument Sans, sans-serif" }}>{m}</span>
                  </div>
                ))}
              </div>
              {/* Total perbandingan */}
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                {[{label:"Total Masuk", this: thisData.reduce((s,d)=>s+d.inc,0), last: lastData.reduce((s,d)=>s+d.inc,0), color:C.green},
                  {label:"Total Keluar", this: thisData.reduce((s,d)=>s+d.exp,0), last: lastData.reduce((s,d)=>s+d.exp,0), color:C.red}
                ].map(r => {
                  const diff = r.last > 0 ? Math.round((r.this - r.last)/r.last*100) : 0
                  return (
                    <div key={r.label} style={{ flex:1, background:C.surface, borderRadius:10, padding:"10px 12px" }}>
                      <p style={{ fontSize:10, color:C.muted, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>{r.label}</p>
                      <p style={{ fontSize:13, fontWeight:700, color:r.color, fontFamily:"DM Mono, monospace" }}>{showAmounts ? `Rp ${rp(r.this)}` : "••••••"}</p>
                      {r.last > 0 && <p style={{ fontSize:10, color: diff>=0 ? C.green : C.red, marginTop:3, fontWeight:600 }}>
                        {diff>=0?"↑":"↓"} {Math.abs(diff)}% vs {lastYear}
                      </p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        </>} {/* end TRANSAKSI */}

        {/* ── PENGATURAN ───────────────────────────────────────── */}
        {activeTab === "settings" && <>
          <div className="au">
            {/* Page header */}
            <div style={{ marginBottom:28 }}>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:26, fontWeight:700, fontStyle:"italic", color:C.text, lineHeight:1.1 }}>Pengaturan</p>
            </div>

            {/* Profile card */}
            <div className={`grad-border${isAuto?" auto-border":""}`}
              style={{ background:C.card, borderRadius:18, padding:"20px 20px", marginBottom:18,
                display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:C.accentDim, flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>👤</div>
              <div>
                <p style={{ fontFamily:"Fraunces, serif", fontSize:17, fontWeight:700, color:C.text, marginBottom:3 }}>
                  {user?.user_metadata?.name || "Pengguna"}
                </p>
                <p style={{ fontSize:12, color:C.muted, fontFamily:"Instrument Sans, sans-serif" }}>
                  @{user?.user_metadata?.username || user?.email?.split("@")[0] || "—"}
                </p>
              </div>
            </div>

            {/* Profil section */}
            <div className={`grad-border${isAuto?" auto-border":""}`}
              style={{ background:C.card, borderRadius:18, overflow:"hidden", marginBottom:18 }}>
              <div style={{ padding:"14px 18px 8px", borderBottom:`1px solid ${C.border}` }}>
                <p style={{ fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted,
                  fontFamily:"Instrument Sans, sans-serif", fontWeight:700 }}>Profil</p>
              </div>
              {([
                { label:"Ubah Nama", icon:"✏️", tab:"nama" as const },
                { label:"Ubah Username", icon:"🪪", tab:"username" as const },
                { label:"Ubah Password", icon:"🔑", tab:"password" as const },
              ]).map((item, idx, arr) => (
                <button key={item.tab} onClick={()=>{ setSettingsTab(item.tab); setSettingsMsg(null); setSettingsName(user?.user_metadata?.name||""); setSettingsUsername(user?.user_metadata?.username||""); setSettingsNewPw(""); setSettingsConfirmPw(""); setShowSettings(true) }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
                    background:"none", borderTop:"none", borderLeft:"none", borderRight:"none",
                    borderBottom: idx < arr.length-1 ? `1px solid ${C.border}` : "none",
                    cursor:"pointer", transition:"background 0.15s" }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=C.accentDim}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                  <span style={{ fontSize:18, width:28, textAlign:"center" }}>{item.icon}</span>
                  <span style={{ flex:1, fontFamily:"Instrument Sans, sans-serif", fontSize:14, fontWeight:500, color:C.text, textAlign:"left" }}>{item.label}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
            </div>

            {/* Tampilan section */}
            <div className={`grad-border${isAuto?" auto-border":""}`}
              style={{ background:C.card, borderRadius:18, overflow:"hidden", marginBottom:18 }}>
              <div style={{ padding:"14px 18px 8px", borderBottom:`1px solid ${C.border}` }}>
                <p style={{ fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted,
                  fontFamily:"Instrument Sans, sans-serif", fontWeight:700 }}>Tampilan</p>
              </div>
              <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:18, width:28, textAlign:"center" }}>🎨</span>
                  <span style={{ fontFamily:"Instrument Sans, sans-serif", fontSize:14, fontWeight:500, color:C.text }}>Tema</span>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {([{mode:"light" as ThemeMode, icon:"☀️", label:"Light"},{mode:"dark" as ThemeMode, icon:"🌙", label:"Dark"},{mode:"system" as ThemeMode, icon:"💻", label:"Auto"}]).map(t=>(
                    <button key={t.mode} onClick={()=>{ setThemeMode(t.mode); localStorage.setItem("themeMode",t.mode) }}
                      style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${themeMode===t.mode?C.accent:C.border}`,
                        background: themeMode===t.mode ? C.accentDim : "transparent",
                        cursor:"pointer", fontSize:12, color: themeMode===t.mode ? C.accent : C.muted,
                        fontFamily:"Instrument Sans, sans-serif", fontWeight:600, transition:"all 0.15s",
                        display:"flex", alignItems:"center", gap:4 }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Akun section */}
            <div className={`grad-border${isAuto?" auto-border":""}`}
              style={{ background:C.card, borderRadius:18, overflow:"hidden", marginBottom:18 }}>
              <div style={{ padding:"14px 18px 8px", borderBottom:`1px solid ${C.border}` }}>
                <p style={{ fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:C.muted,
                  fontFamily:"Instrument Sans, sans-serif", fontWeight:700 }}>Akun</p>
              </div>
              <button onClick={()=>{ logout(); setActiveTab("home") }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
                  background:"none", border:"none", cursor:"pointer", transition:"background 0.15s" }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.08)"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                <span style={{ fontSize:18, width:28, textAlign:"center" }}>🚪</span>
                <span style={{ fontFamily:"Instrument Sans, sans-serif", fontSize:14, fontWeight:600, color:C.red, textAlign:"left" }}>Keluar</span>
              </button>
            </div>
          </div>
        </>} {/* end PENGATURAN */}

      </div>

      {showAdd  && <AddModal onSave={addTxn} onClose={()=>setAdd(false)}/>}
      {editTxn  && <EditModal txn={editTxn} onSave={saveTxn} onDelete={deleteTxn} onClose={()=>setEditTxn(null)}/>}
      {viewPhoto && <PhotoViewModal src={viewPhoto} onClose={()=>setViewPhoto(null)}/>}
      {showBillModal && <BillModal onSave={addBill} onClose={()=>setShowBillModal(false)}/>}
      {editBill && <BillModal bill={editBill} onSave={updateBill} onClose={()=>setEditBill(null)}/>}

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

      {/* Add/Edit Target Modal */}
      {showAddTarget && (
        <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowAddTarget(false) }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:24,
            padding:"28px 24px", width:"90%", maxWidth:360,
            boxShadow:"0 24px 60px rgba(0,0,0,0.4)", animation:"welcome-in 0.35s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:18, fontWeight:700, color:C.text }}>{editTarget ? "Edit Tabungan" : "Tabungan Baru"}</p>
              <button onClick={()=>setShowAddTarget(false)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:18 }}>✕</button>
            </div>
            {/* Icon picker */}
            <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Pilih Ikon</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
              {TARGET_ICONS.map(({icon:ic, label}) => (
                <button key={ic} onClick={()=>setTargetIcon(ic)}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                    fontSize:20, padding:"8px 8px 6px", borderRadius:10, border:`2px solid ${targetIcon===ic ? C.accent : C.border}`,
                    background: targetIcon===ic ? C.accentDim : C.surface, cursor:"pointer", transition:"all 0.15s", minWidth:48 }}>
                  <span>{ic}</span>
                  <span style={{ fontSize:9, color: targetIcon===ic ? C.accent : C.muted, fontFamily:"Instrument Sans, sans-serif", fontWeight:600 }}>{label}</span>
                </button>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Nama Tabungan <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(opsional)</span></p>
                <input value={targetName} onChange={e=>setTargetName(e.target.value)} placeholder="Nama tabungan (opsional)"
                  style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${C.border}`,
                    borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Jumlah Tabungan (Rp)</p>
                <input value={targetAmount} onChange={e=>setTargetAmount(e.target.value.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,"."))} placeholder="Contoh: 15.000.000"
                  style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${C.border}`,
                    borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Sudah Terkumpul (Rp)</p>
                <input value={targetSaved} onChange={e=>setTargetSaved(e.target.value.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,"."))} placeholder="0"
                  style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${C.border}`,
                    borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Simpan di <span style={{ fontWeight:400, textTransform:"none" }}>(opsional)</span></p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {WALLETS.map(w=>(
                    <button key={w} onClick={()=>setTargetWallet(targetWallet===w&&w!=="Lainnya"?"":w)}
                      style={{ padding:"5px 12px", fontSize:12, fontWeight:600, borderRadius:20, cursor:"pointer",
                        fontFamily:"Instrument Sans, sans-serif", transition:"all 0.15s",
                        border:`1.5px solid ${(targetWallet===w||(w==="Lainnya"&&!WALLETS.slice(0,-1).includes(targetWallet)&&targetWallet)) ? C.accent : C.border}`,
                        background: (targetWallet===w||(w==="Lainnya"&&!WALLETS.slice(0,-1).includes(targetWallet)&&targetWallet)) ? C.accentDim : C.surface,
                        color: (targetWallet===w||(w==="Lainnya"&&!WALLETS.slice(0,-1).includes(targetWallet)&&targetWallet)) ? C.accent : C.muted }}>
                      {w}
                    </button>
                  ))}
                </div>
                {targetWallet==="Lainnya" && (
                  <input value="" onChange={e=>setTargetWallet(e.target.value)} placeholder="Tulis nama bank/e-wallet..." autoFocus
                    style={{ marginTop:8, width:"100%", padding:"9px 14px", fontSize:13, border:`1px solid ${C.border}`,
                      borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
                )}
                {targetWallet && targetWallet!=="Lainnya" && !WALLETS.includes(targetWallet) && (
                  <input value={targetWallet} onChange={e=>setTargetWallet(e.target.value)} placeholder="Tulis nama bank/e-wallet..."
                    style={{ marginTop:8, width:"100%", padding:"9px 14px", fontSize:13, border:`1px solid ${C.accent}44`,
                      borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
                )}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Mulai (opsional)</p>
                  <input value={targetDateStart} onChange={e=>setTargetDateStart(e.target.value)} type="date"
                    style={{ width:"100%", padding:"11px 10px", fontSize:13, border:`1px solid ${C.border}`,
                      borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Selesai (opsional)</p>
                  <input value={targetDateEnd} onChange={e=>setTargetDateEnd(e.target.value)} type="date"
                    style={{ width:"100%", padding:"11px 10px", fontSize:13, border:`1px solid ${C.border}`,
                      borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button onClick={()=>setShowAddTarget(false)}
                  style={{ flex:1, padding:"11px 0", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer",
                    border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.07)", color:"#ef4444",
                    fontFamily:"Instrument Sans, sans-serif" }}>Batal</button>
                <button onClick={submitTarget}
                  style={{ flex:2, padding:"11px 0", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer",
                    border:"none", background:C.grad, color:"#fff", fontFamily:"Instrument Sans, sans-serif",
                    boxShadow:"0 4px 16px rgba(124,58,237,0.3)" }}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topup Target Modal */}
      {topupTarget && (
        <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}
          onClick={e=>{ if(e.target===e.currentTarget) setTopupTarget(null) }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:24,
            padding:"28px 24px", width:"90%", maxWidth:360,
            boxShadow:"0 24px 60px rgba(0,0,0,0.4)", animation:"welcome-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
            maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <p style={{ fontSize:36, marginBottom:8 }}>{topupTarget.icon}</p>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:17, fontWeight:700, color:C.text }}>{topupTarget.name}</p>
              <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>
                Terkumpul: Rp {topupTarget.savedAmount.toLocaleString("id-ID")} / Rp {topupTarget.targetAmount.toLocaleString("id-ID")}
              </p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Nominal Nabung (Rp)</p>
                <input value={topupAmount} onChange={e=>setTopupAmount(e.target.value.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,"."))} placeholder="Nominal yang ditabung" autoFocus
                  style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${C.border}`,
                    borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}
                  onKeyDown={e=>e.key==="Enter"&&submitTopup()}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Tanggal Nabung</p>
                <input value={topupDate} onChange={e=>setTopupDate(e.target.value)} type="date"
                  style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${C.border}`,
                    borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Keterangan (opsional)</p>
                <input value={topupNote} onChange={e=>setTopupNote(e.target.value)} placeholder="Contoh: Gajian bulan ini"
                  style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${C.border}`,
                    borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}
                  onKeyDown={e=>e.key==="Enter"&&submitTopup()}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginBottom: (topupTarget.history||[]).length>0 ? 20 : 0 }}>
              <button onClick={()=>{ setTopupTarget(null); setTopupAmount(""); setTopupNote("") }}
                style={{ flex:1, padding:"11px 0", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer",
                  border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.07)", color:"#ef4444",
                  fontFamily:"Instrument Sans, sans-serif" }}>Batal</button>
              <button onClick={submitTopup}
                style={{ flex:2, padding:"11px 0", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer",
                  border:"none", background:C.grad, color:"#fff", fontFamily:"Instrument Sans, sans-serif",
                  boxShadow:"0 4px 16px rgba(124,58,237,0.3)" }}>+ Nabung</button>
            </div>
            {/* Riwayat nabung */}
            {(topupTarget.history||[]).length > 0 && (
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>Riwayat Nabung</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[...(topupTarget.history||[])].reverse().map(h => (
                    <div key={h.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      background:C.surface, borderRadius:10, padding:"10px 12px" }}>
                      <div>
                        <p style={{ fontSize:13, fontWeight:600, color:C.green }}>+Rp {h.amount.toLocaleString("id-ID")}</p>
                        <p style={{ fontSize:11, color:C.muted }}>{h.note || "—"} · {new Date(h.date).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</p>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>{ setEditTopupEntry({targetId:topupTarget.id, entry:h}); setEditTopupAmt(h.amount.toLocaleString("id-ID").replace(/,/g,".")); setEditTopupNote(h.note) }}
                          style={{ padding:"4px 7px", borderRadius:7, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", display:"flex", alignItems:"center" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={()=>{ if(window.confirm("Hapus riwayat nabung ini?")){ deleteTopupEntry(topupTarget.id, h); setTopupTarget({...topupTarget, savedAmount: Math.max(0,topupTarget.savedAmount-h.amount), history:(topupTarget.history||[]).filter(x=>x.id!==h.id)}) }}}
                          style={{ padding:"4px 7px", borderRadius:7, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.07)", color:"#ef4444", cursor:"pointer", display:"flex", alignItems:"center" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Topup Entry Modal */}
      {editTopupEntry && (
        <div style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}
          onClick={e=>{ if(e.target===e.currentTarget) setEditTopupEntry(null) }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20,
            padding:"24px 22px", width:"90%", maxWidth:320,
            boxShadow:"0 24px 60px rgba(0,0,0,0.4)", animation:"welcome-in 0.3s cubic-bezier(0.22,1,0.36,1) both" }}>
            <p style={{ fontFamily:"Fraunces, serif", fontSize:16, fontWeight:700, color:C.text, marginBottom:16 }}>Edit Riwayat</p>
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Nominal (Rp)</p>
                <input value={editTopupAmt} onChange={e=>setEditTopupAmt(e.target.value.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,"."))}
                  style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${C.border}`,
                    borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
              </div>
              <div>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Keterangan</p>
                <input value={editTopupNote} onChange={e=>setEditTopupNote(e.target.value)}
                  style={{ width:"100%", padding:"11px 14px", fontSize:14, border:`1px solid ${C.border}`,
                    borderRadius:10, background:C.surface, color:C.text, outline:"none", fontFamily:"Instrument Sans, sans-serif" }}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setEditTopupEntry(null)}
                style={{ flex:1, padding:"11px 0", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer",
                  border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.07)", color:"#ef4444",
                  fontFamily:"Instrument Sans, sans-serif" }}>Batal</button>
              <button onClick={submitEditTopup}
                style={{ flex:2, padding:"11px 0", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer",
                  border:"none", background:C.grad, color:"#fff", fontFamily:"Instrument Sans, sans-serif" }}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Savings FX overlay */}
      {savingsFx.map(fx => (
        <div key={fx.id} style={{ position:"fixed", inset:0, zIndex:500, pointerEvents:"none" }}>
          {fx.done ? (
            // Confetti burst untuk target tercapai
            <>
              {["#f59e0b","#10b981","#6366f1","#ec4899","#3b82f6","#f97316","#a855f7","#14b8a6"].map((color,i) => (
                <div key={i} style={{
                  position:"absolute",
                  left:`${20+Math.random()*60}%`, top:`${20+Math.random()*30}%`,
                  width:10, height:10, borderRadius: i%2===0 ? "50%" : 2,
                  background:color,
                  animation:`confetti-fall ${0.8+Math.random()*0.8}s ease-out ${i*0.05}s both`
                }}/>
              ))}
              <div style={{ position:"absolute", top:"35%", left:"50%", transform:"translateX(-50%)",
                fontFamily:"Fraunces, serif", fontSize:28, fontWeight:700, color:C.green,
                animation:"coin-float-up 1.5s ease-out both", textAlign:"center",
                textShadow:"0 2px 12px rgba(0,0,0,0.3)", whiteSpace:"nowrap" }}>
                🎉 Tabungan Tercapai!
              </div>
            </>
          ) : (
            // Koin mengambang untuk nabung biasa
            <>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  position:"absolute",
                  left:`${42+i*8}%`, top:"45%",
                  fontSize:18,
                  animation:`coin-float-up ${0.9+i*0.15}s ease-out ${i*0.1}s both`
                }}>🪙</div>
              ))}
              <div style={{ position:"absolute", top:"40%", left:"50%", transform:"translateX(-50%)",
                fontFamily:"Instrument Sans, sans-serif", fontSize:16, fontWeight:700,
                color:C.green, animation:"coin-float-up 1.2s ease-out both",
                background:C.card, padding:"6px 16px", borderRadius:99,
                boxShadow:"0 4px 20px rgba(0,0,0,0.2)", whiteSpace:"nowrap" }}>
                +Rp {fx.amt.toLocaleString("id-ID")}
              </div>
            </>
          )}
        </div>
      ))}

      {/* Statistik Tabungan Modal */}
      {showTargetStats && (()=>{
        const totalTarget = targets.reduce((a,t)=>a+t.targetAmount,0)
        const totalSaved  = targets.reduce((a,t)=>a+t.savedAmount,0)
        const totalDone   = targets.filter(t=>t.savedAmount>=t.targetAmount).length
        const overallPct  = totalTarget > 0 ? Math.min(100,Math.round((totalSaved/totalTarget)*100)) : 0
        const sisa        = totalTarget - totalSaved
        // Donut chart
        const r=44, circ=2*Math.PI*r
        const dash = (circ * overallPct) / 100
        const accentColors = ["#6366f1","#10b981","#f59e0b","#ec4899","#3b82f6","#a855f7","#14b8a6","#f97316"]
        return (
          <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(0,0,0,0.65)", backdropFilter:"blur(10px)" }}
            onClick={e=>{ if(e.target===e.currentTarget) setShowTargetStats(false) }}>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:28,
              padding:"28px 22px 24px", width:"92%", maxWidth:390,
              boxShadow:"0 32px 80px rgba(0,0,0,0.45)", animation:"welcome-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
              maxHeight:"88vh", overflowY:"auto" }}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <p style={{ fontFamily:"Fraunces, serif", fontSize:19, fontWeight:700, color:C.text }}>📊 Statistik Tabungan</p>
                <button onClick={()=>setShowTargetStats(false)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:20, lineHeight:1 }}>✕</button>
              </div>

              {/* Donut + stats */}
              <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:22,
                background:C.surface, borderRadius:18, padding:"20px 18px" }}>
                <svg width="110" height="110" viewBox="0 0 110 110" style={{ flexShrink:0 }}>
                  <circle cx="55" cy="55" r={r} fill="none" stroke={C.border} strokeWidth="10"/>
                  <circle cx="55" cy="55" r={r} fill="none" stroke={`url(#sg)`} strokeWidth="10"
                    strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
                    strokeDashoffset={circ/4} style={{ transition:"stroke-dasharray 1s ease" }}/>
                  <defs>
                    <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={C.accent}/>
                      <stop offset="100%" stopColor={C.green}/>
                    </linearGradient>
                  </defs>
                  <text x="55" y="50" textAnchor="middle" fontSize="18" fontWeight="700" fill={C.text} fontFamily="Fraunces, serif">{overallPct}%</text>
                  <text x="55" y="66" textAnchor="middle" fontSize="9" fill={C.muted} fontFamily="Instrument Sans, sans-serif">tercapai</text>
                </svg>
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    {label:"Total Tabungan", value:targets.length+"", unit:"tabungan", color:C.accent},
                    {label:"Tercapai", value:totalDone+"", unit:"tabungan", color:C.green},
                    {label:"Sisa Nabung", value:"Rp "+sisa.toLocaleString("id-ID"), unit:"", color:C.red},
                  ].map(s=>(
                    <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      padding:"8px 12px", borderRadius:10, background:C.card }}>
                      <p style={{ fontSize:11, color:C.muted, fontFamily:"Instrument Sans, sans-serif" }}>{s.label}</p>
                      <p style={{ fontSize:13, fontWeight:700, color:s.color, fontFamily:"Fraunces, serif" }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total collected hero */}
              <div style={{ background:`linear-gradient(135deg,${C.accent}22,${C.green}18)`,
                border:`1px solid ${C.accent}33`, borderRadius:16, padding:"16px 18px", marginBottom:22, textAlign:"center" }}>
                <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Total Terkumpul</p>
                <p style={{ fontFamily:"Fraunces, serif", fontSize:26, fontWeight:700, color:C.text, marginBottom:2 }}>
                  Rp {totalSaved.toLocaleString("id-ID")}
                </p>
                <p style={{ fontSize:11, color:C.muted }}>dari Rp {totalTarget.toLocaleString("id-ID")}</p>
              </div>

              {/* Per-tabungan */}
              <p style={{ fontSize:11, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14, fontWeight:700 }}>Rincian Per Tabungan</p>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {targets.map((t,i)=>{
                  const pct = Math.min(100, Math.round((t.savedAmount/t.targetAmount)*100))
                  const done = pct >= 100
                  const barColor = accentColors[i % accentColors.length]
                  return (
                    <div key={t.id} style={{ background:C.surface, borderRadius:14, padding:"14px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:32, height:32, borderRadius:10, background:`${barColor}22`,
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{t.icon}</div>
                          <div>
                            <p style={{ fontSize:13, fontWeight:700, color:C.text }}>{t.name}</p>
                            {(t.history||[]).length>0 && (
                              <p style={{ fontSize:10, color:C.muted }}>{(t.history||[]).length}x nabung</p>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <p style={{ fontSize:14, fontWeight:700, color: done ? C.green : barColor, fontFamily:"Fraunces, serif" }}>{pct}%</p>
                          {done && <p style={{ fontSize:10, color:C.green }}>✅ Selesai</p>}
                        </div>
                      </div>
                      <div style={{ height:8, background:C.border, borderRadius:99, overflow:"hidden", marginBottom:6 }}>
                        <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
                          background: done ? `linear-gradient(90deg,${C.green},#34d399)` : `linear-gradient(90deg,${barColor},${barColor}99)`,
                          transition:"width 1s cubic-bezier(0.34,1.56,0.64,1)", position:"relative", overflow:"hidden" }}>
                          <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)", animation:"shimmer 2s ease-in-out infinite" }}/>
                        </div>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <p style={{ fontSize:11, color:C.green, fontWeight:600 }}>Rp {t.savedAmount.toLocaleString("id-ID")}</p>
                        <p style={{ fontSize:11, color:C.muted }}>Rp {t.targetAmount.toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowSettings(false) }}>
          <div style={{ background:P.card, border:`1px solid ${P.border}`, borderRadius:24,
            padding:"28px 28px 24px", width:"90%", maxWidth:360,
            boxShadow:"0 24px 60px rgba(0,0,0,0.4)", animation:"welcome-in 0.35s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
              <p style={{ fontFamily:"Fraunces, serif", fontSize:20, fontWeight:700, color:P.text }}>
                {settingsTab==="nama" ? "Ubah Nama" : settingsTab==="username" ? "Ubah Username" : "Ubah Password"}
              </p>
              <button onClick={()=>setShowSettings(false)}
                style={{ background:"none", border:"none", cursor:"pointer", color:P.muted, fontSize:18, lineHeight:1, padding:4 }}>✕</button>
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

      {/* Bottom Navigation — floating pill */}
      <div style={{ position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)",
        width:"calc(100% - 32px)", maxWidth:400, zIndex:200,
        background: isLight
          ? "rgba(255,255,255,0.88)"
          : "rgba(18,18,32,0.88)",
        backdropFilter:"blur(28px) saturate(180%)",
        WebkitBackdropFilter:"blur(28px) saturate(180%)",
        border: `1px solid ${isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)"}`,
        borderRadius:28,
        display:"flex", alignItems:"center", justifyContent:"space-around",
        padding:"10px 8px",
        boxShadow: isLight
          ? "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)"
          : "0 8px 40px rgba(0,0,0,0.5), 0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)"
      }}>
        {([
          { id:"home" as const, label:"Beranda", icon:(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" opacity="0.9"/>
            </svg>
          ), iconOff:(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          )},
          { id:"txn" as const, label:"Riwayat", icon:(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" fill="currentColor" stroke="none" opacity="0"/>
              <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2.2" fill="none"/>
            </svg>
          ), iconOff:(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          )},
          { id:"settings" as const, label:"Pengaturan", icon:(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" opacity="0.9">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.04 7.04 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.37 1.04.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          ), iconOff:(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          )},
        ]).map(tab=>{
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={()=>{
              setActiveTab(tab.id)
              if(tab.id==="txn"){ setTimeout(()=>txnRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }),50) }
            }}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                background:"none", border:"none", cursor:"pointer", padding:"4px 0",
                position:"relative", WebkitTapHighlightColor:"transparent" }}>


              {/* Active dot indicator */}
              {isActive && (
                <div style={{
                  position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)",
                  width:4, height:4, borderRadius:"50%",
                  background: C.text, pointerEvents:"none",
                }}/>
              )}

              {/* Icon */}
              <div style={{
                color: isActive ? C.text : C.muted,
                position:"relative", zIndex:1,
              }}>
                {isActive ? tab.icon : tab.iconOff}
              </div>

              {/* Label */}
              <span style={{
                fontSize: 9.5, fontWeight: isActive ? 700 : 500,
                fontFamily:"Instrument Sans, sans-serif",
                letterSpacing:"0.02em",
                color: isActive ? C.text : C.muted,
                position:"relative", zIndex:1,
              }}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
