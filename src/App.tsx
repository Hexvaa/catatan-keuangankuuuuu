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
  bg:       "#020b18",
  surface:  "#061425",
  card:     "#081c32",
  border:   "rgba(0,220,255,0.12)",
  text:     "#e0f7ff",
  sub:      "rgba(180,240,255,0.55)",
  muted:    "rgba(140,210,255,0.35)",
  green:    "#00ffb3",
  greenDim: "rgba(0,255,179,0.12)",
  red:      "#ff6baa",
  redDim:   "rgba(255,107,170,0.12)",
  accent:   "#00dcff",
  accentDim:"rgba(0,220,255,0.14)",
  grad:     "linear-gradient(135deg,#0ea5e9 0%,#6366f1 45%,#a855f7 80%,#ec4899 100%)",
  meshA:    "rgba(0,220,255,0.22)",
  meshB:    "rgba(168,85,247,0.18)",
  meshC:    "rgba(236,72,153,0.12)",
  gridColor:"rgba(0,220,255,0.9)",
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

function SpendBar({ income, expense }: { income: number; expense: number }) {
  const pct  = income > 0 ? Math.min((expense / income) * 100, 100) : 0
  const safe = pct < 70
  const barGrad = safe
    ? "linear-gradient(90deg,#34d399,#06b6d4,#34d399)"
    : "linear-gradient(90deg,#f87171,#fb923c,#f87171)"

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 10 }}>
        <span style={{ fontSize:11, fontWeight:600, color: C.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>Penggunaan bulan ini</span>
        <span style={{ fontFamily:"DM Mono, monospace", fontSize:13, fontWeight:700,
          color: safe ? C.green : C.red,
          background: safe ? C.greenDim : C.redDim,
          padding:"2px 8px", borderRadius:6 }}>{pct.toFixed(0)}%</span>
      </div>
      {/* Track */}
      <div style={{ height:6, borderRadius:6, background:"rgba(255,255,255,0.06)", overflow:"hidden", position:"relative" }}>
        <div style={{
          height:"100%", borderRadius:6, width:`${pct}%`,
          background:`${barGrad} center/200% auto`,
          animation:"bar-shine 2s linear infinite",
          transition:"width 1s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: safe ? "0 0 12px rgba(74,222,128,0.6)" : "0 0 12px rgba(248,113,113,0.6)",
        }}/>
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
    <div className="ai fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="au w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>

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
              <input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)}/>
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
    <div className="ai fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="au w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background:C.card, border:`1px solid ${C.border}` }}>

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
            style={{ flex:1, padding:11, borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", color:C.sub, fontSize:13, cursor:"pointer", fontFamily:"Instrument Sans, sans-serif" }}>
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

export default function App() {
  const now = new Date()
  const [month, setMonth]   = useState(now.getMonth())
  const [year]              = useState(now.getFullYear())
  const [user, setUser]     = useState<User|null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [txns, setTxns]     = useState<Transaction[]>([])
  const [welcomeName, setWelcomeName] = useState<string|null>(null)
  const [showAdd, setAdd]   = useState(false)
  const [filter, setFilter] = useState<"all"|"income"|"expense">("all")
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark")
  const [showCal, setShowCal]     = useState(true)
  const [showAmounts, setShowAmounts] = useState(true)
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
  const isAuto = themeMode === "system"

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

  const THEME_OPTS: {mode: ThemeMode; label: string; icon: string}[] = [
    {mode:"light",  label:"Light",  icon:"☀️"},
    {mode:"dark",   label:"Dark",   icon:"🌙"},
    {mode:"system", label:"Auto",   icon:"💻"},
  ]

  if (!authReady) return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ color:"rgba(238,238,255,0.3)", fontFamily:"Instrument Sans, sans-serif", fontSize:14 }}>Memuat...</p>
    </div>
  )

  if (!user) return <AuthScreen onAuth={async (name: string) => {
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
      {P === AUTO && <>
        <div className="aurora-orb aurora-1"/>
        <div className="aurora-orb aurora-2"/>
        <div className="aurora-orb aurora-3"/>
        <div className="aurora-orb aurora-4"/>
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
        <div className="au" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:11, color:P.muted, fontFamily:"Instrument Sans, sans-serif" }}>
              {user.user_metadata?.name || user.user_metadata?.username || user.email}
            </span>
            <button onClick={logout}
              style={{ padding:"4px 10px", fontSize:11, fontWeight:600, border:`1px solid ${P.border}`, borderRadius:8,
                background:"transparent", color:P.muted, cursor:"pointer", fontFamily:"Instrument Sans, sans-serif", transition:"all 0.15s" }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color=P.red}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color=P.muted}>
              Keluar
            </button>
          </div>
          <div style={{ display:"flex", gap:2, padding:3, borderRadius:12, background:P.card, border:`1px solid ${P.border}` }}>
            {THEME_OPTS.map(o=>(
              <button key={o.mode} onClick={()=>setThemeMode(o.mode)}
                title={o.label}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:9, border:"none", cursor:"pointer",
                  fontFamily:"Instrument Sans, sans-serif", fontSize:12, transition:"all 0.15s",
                  background: themeMode===o.mode ? P.accentDim : "transparent",
                  color: themeMode===o.mode ? P.accent : P.muted,
                  boxShadow: themeMode===o.mode ? `0 0 0 1px ${P.accent}44` : "none",
                }}>
                <span style={{fontSize:13}}>{o.icon}</span>
                <span>{o.label}</span>
              </button>
            ))}
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
                    background:P.accentDim, border:`1px solid ${P.accent}55`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:`0 4px 16px ${P.accent}33` }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Cards sticking out */}
                      <rect x="6" y="3" width="11" height="6" rx="1.5" fill={P.accent} opacity="0.5" transform="rotate(-8 6 3)"/>
                      <rect x="8" y="3.5" width="10" height="5.5" rx="1.5" fill={P.accent} opacity="0.7" transform="rotate(-3 8 3.5)"/>
                      {/* Wallet body */}
                      <rect x="2" y="8" width="20" height="13" rx="2.5" fill={P.accent}/>
                      {/* Clasp */}
                      <circle cx="18.5" cy="14.5" r="2" fill={P.accentDim} stroke={P.accent} strokeWidth="1.2"/>
                    </svg>
                  </div>
                </div>
                <p style={{ fontFamily:"Fraunces, serif", fontSize:34, fontWeight:700, fontStyle:"italic",
                  lineHeight:1.05, letterSpacing:"-0.5px", color:P.accent }}>
                  Keuanganku
                </p>
              </div>
            </div>
          </div>
          <button onClick={()=>setAdd(true)}
            style={{ marginTop:38, padding:"10px 18px", fontSize:13, fontWeight:600, border:"none", cursor:"pointer",
              fontFamily:"Instrument Sans, sans-serif", borderRadius:12, color:"#fff", flexShrink:0,
              background:P.grad, boxShadow:"0 4px 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
              transition:"transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLElement).style.boxShadow="0 8px 28px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.15)"}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(0)";(e.currentTarget as HTMLElement).style.boxShadow="0 4px 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"}}>
            + Tambah
          </button>
        </div>

        {/* Month nav */}
        <div className="au d1" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <button onClick={()=>setMonth(m=>m===0?11:m-1)}
            style={{ width:32, height:32, borderRadius:8, border:`1px solid ${P.border}`, background:P.card, cursor:"pointer", color:P.sub, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s" }}>‹</button>
          <p style={{ fontSize:15, fontWeight:700, color:P.text }}>{MONTHS[month]} {year}</p>
          <button onClick={()=>setMonth(m=>m===11?0:m+1)}
            style={{ width:32, height:32, borderRadius:8, border:`1px solid ${P.border}`, background:P.card, cursor:"pointer", color:P.sub, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s" }}>›</button>
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
            <div key={s.label} className={`grad-border${isAuto?" rainbow-border holo-card":""}`}
              style={{ background:`linear-gradient(145deg,${s.dim} 0%,${C.card} 55%)`,
                borderRadius:16, padding:"18px 13px 14px",
                boxShadow: isAuto ? `0 6px 28px ${C.accent}33` : s.glow,
                transition:"transform 0.25s, box-shadow 0.25s",
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-4px)";(e.currentTarget as HTMLElement).style.boxShadow=s.glowHover}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(0)";(e.currentTarget as HTMLElement).style.boxShadow=s.glow}}>
              <div style={{ height:2.5, borderRadius:3, background:s.gradLine, marginBottom:13,
                boxShadow:`0 0 8px ${s.color}55` }}/>
              <p style={{ fontSize:10, color:C.muted, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:9, fontWeight:600 }}>{s.label}</p>
              <p style={{ fontFamily:"DM Mono, monospace", fontSize:14, color:s.color, lineHeight:1, fontWeight:500,
                letterSpacing: showAmounts ? "normal" : "0.12em" }}>
                {showAmounts ? <Counter value={s.value}/> : "••••••"}
              </p>
              <p style={{ fontSize:15, color:s.color, marginTop:10, opacity:0.45, lineHeight:1 }}>{s.icon}</p>
            </div>
          ))}
        </div>

        {/* Spend bar */}
        <div className={`au d3 grad-border${isAuto?" rainbow-border holo-card":""}`} style={{ background:C.card, borderRadius:16, padding:"20px 20px", marginBottom:24 }}>
          <SpendBar income={income} expense={expense}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              {label:"Terbesar masuk",  value:Math.max(0,...monthTxns.filter(t=>t.type==="income" ).map(t=>t.amount)), color:C.green, bg:C.greenDim},
              {label:"Terbesar keluar", value:Math.max(0,...monthTxns.filter(t=>t.type==="expense").map(t=>t.amount)), color:C.red,   bg:C.redDim},
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:"12px 14px", border:"1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6, fontWeight:600 }}>{s.label}</p>
                <p style={{ fontFamily:"DM Mono, monospace", fontSize:14, color:s.color, fontWeight:500,
                  letterSpacing: showAmounts ? "normal" : "0.12em" }}>
                  {showAmounts ? rp(s.value) : "••••••"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar indicator */}
        <div className="au" style={{ animationDelay:"0.32s" }}>
          <div className={`grad-border${isAuto?" rainbow-border holo-card":""}`} style={{ background:C.card, borderRadius:16, padding:"18px 18px 14px", marginBottom:24 }} data-cal>
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
              <button onClick={()=>setShowAmounts(v=>!v)}
                title={showAmounts ? "Sembunyikan nominal" : "Tampilkan nominal"}
                style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:C.muted,
                  display:"flex", alignItems:"center", borderRadius:6, transition:"color 0.2s" }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color=C.accent}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color=C.muted}>
                {showAmounts ? (
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
                    background: filter===f ? (f==="income"?C.greenDim:f==="expense"?C.redDim:C.accentDim) : "transparent",
                    color: filter===f ? (f==="income"?C.green:f==="expense"?C.red:C.accent) : C.muted,
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
                style={{ padding:"5px 11px", fontSize:11, fontWeight:600, border:`1px solid ${period===p.key ? C.accent+"88" : C.border}`,
                  borderRadius:20, cursor:"pointer", transition:"all 0.15s",
                  fontFamily:"Instrument Sans, sans-serif",
                  background: period===p.key ? C.accentDim : "transparent",
                  color: period===p.key ? C.accent : C.muted,
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

          <div className={`grad-border${isAuto?" rainbow-border holo-card":""}`} style={{ background:C.card, borderRadius:16, overflow:"hidden" }}>
            {visible.length===0 ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:C.muted, fontSize:13 }}>Belum ada catatan.</div>
            ) : visible.map((t,i)=>{
              const d = new Date(t.date+"T00:00:00")
              const isIncome = t.type==="income"
              return (
                <div key={t.id} className="au shimmer-row"
                  style={{ animationDelay:`${0.2+i*0.04}s`, position:"relative",
                    display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
                    borderBottom: i<visible.length-1 ? `1px solid ${C.border}` : "none",
                    transition:"background 0.2s",
                  }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=isIncome?"rgba(52,211,153,0.06)":"rgba(248,113,113,0.06)"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>

                  {/* Left color bar */}
                  <div style={{ width:3, height:36, borderRadius:3, flexShrink:0,
                    background: isIncome
                      ? "linear-gradient(180deg,#34d399,#06b6d4)"
                      : "linear-gradient(180deg,#f87171,#fb923c)",
                    boxShadow:`0 0 10px ${isIncome?"rgba(52,211,153,0.7)":"rgba(248,113,113,0.7)"}`,
                  }}/>

                  {/* Icon bubble */}
                  <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                    background: isIncome ? C.greenDim : C.redDim,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:17 }}>
                    {CAT_ICON[t.category] ?? "📦"}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:3 }}>{t.label}</p>
                    <p style={{ fontSize:11, fontWeight:500, color:C.muted }}>{t.category} · {d.getDate()} {MONTHS_S[d.getMonth()]}</p>
                  </div>

                  <div style={{ textAlign:"right", flexShrink:0, display:"flex", alignItems:"center", gap:6 }}>
                    <p style={{ fontFamily:"DM Mono, monospace", fontSize:13, fontWeight:500,
                      color:isIncome?C.green:C.red, letterSpacing: showAmounts ? "normal" : "0.15em",
                      textShadow: isIncome?`0 0 12px rgba(52,211,153,0.5)`:`0 0 12px rgba(248,113,113,0.5)` }}>
                      {showAmounts ? `${isIncome?"+":"−"}${rp(t.amount)}` : "••••••"}
                    </p>
                    <button onClick={()=>setEditTxn(t)}
                      title="Edit transaksi"
                      style={{ background:"none", border:"none", cursor:"pointer", padding:3,
                        color:C.muted, opacity:0, transition:"opacity 0.15s",
                        display:"flex", alignItems:"center" }}
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
