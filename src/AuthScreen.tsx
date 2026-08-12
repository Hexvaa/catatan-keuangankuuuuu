import { useState } from "react"
import { supabase } from "./lib/supabase"

interface Props { onAuth: (name: string) => void; onBack?: () => void }

const inp: React.CSSProperties = {
  width: "100%", padding: "12px 16px", fontSize: 14,
  border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 12,
  background: "#fff", color: "#1a1a2e", outline: "none",
  fontFamily: "Instrument Sans, sans-serif", transition: "border-color 0.2s",
}

const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

function PwField({ label, val, setVal, show, setShow, onEnter }: {
  label: string; val: string; setVal: (v: string) => void
  show: boolean; setShow: (v: boolean) => void; onEnter: () => void
}) {
  return (
    <div>
      <p style={{ fontSize:11, color:"#888", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>{label}</p>
      <div style={{ position:"relative" }}>
        <input style={{ ...inp, paddingRight:44 }} type={show?"text":"password"} value={val}
          onChange={e=>setVal(e.target.value)} placeholder="Minimal 6 karakter"
          onKeyDown={e=>e.key==="Enter"&&onEnter()}
          onFocus={e=>(e.target as HTMLInputElement).style.borderColor="rgba(0,0,0,0.35)"}
          onBlur={e=>(e.target as HTMLInputElement).style.borderColor="rgba(0,0,0,0.12)"}/>
        <button type="button" onClick={()=>setShow(!show)}
          style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
            background:"none", border:"none", cursor:"pointer", padding:4,
            color:"#aaa", display:"flex", alignItems:"center" }}>
          {show ? <EyeOpen/> : <EyeOff/>}
        </button>
      </div>
    </div>
  )
}

const WalletSVG = () => (
  <svg width="52" height="40" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="10" width="72" height="46" rx="10" fill="#7B5B3A"/>
    <rect x="4" y="10" width="72" height="46" rx="10" fill="url(#wg2)"/>
    <rect x="4" y="10" width="72" height="18" rx="10" fill="#8D6843"/>
    <rect x="4" y="20" width="72" height="8" fill="#8D6843"/>
    <rect x="10" y="13" width="30" height="4" rx="2" fill="rgba(255,255,255,0.15)"/>
    <rect x="44" y="28" width="26" height="18" rx="6" fill="rgba(0,0,0,0.18)"/>
    <circle cx="57" cy="37" r="6" fill="#22c55e"/>
    <circle cx="57" cy="37" r="4" fill="#4ade80"/>
    <circle cx="55" cy="35" r="1.5" fill="rgba(255,255,255,0.5)"/>
    <defs>
      <linearGradient id="wg2" x1="4" y1="10" x2="76" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="rgba(255,255,255,0.1)"/>
        <stop offset="100%" stopColor="rgba(0,0,0,0.08)"/>
      </linearGradient>
    </defs>
  </svg>
)

export default function AuthScreen({ onAuth, onBack }: Props) {
  const [mode, setMode]         = useState<"login"|"register"|"reset">("login")
  const [name, setName]         = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [success, setSuccess]   = useState("")
  const [showPw, setShowPw]         = useState(false)
  const [showNewPw, setShowNewPw]   = useState(false)
  const [showConfPw, setShowConfPw] = useState(false)

  const submitReset = async () => {
    setError(""); setSuccess("")
    if (!username.trim()) { setError("Username wajib diisi."); return }
    if (newPassword.length < 6) { setError("Password minimal 6 karakter."); return }
    if (newPassword !== confirmPassword) { setError("Konfirmasi password tidak cocok."); return }
    setLoading(true)
    try {
      const res = await fetch("https://qppqqswrwryxbuymesyl.supabase.co/functions/v1/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcHFxc3dyd3J5eGJ1eW1lc3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDUxNjUsImV4cCI6MjA2NTIyMTE2NX0.TkbDI46PdCEMjdJNdXbqxs0WZX_GXkEIaVZHZfkSJTs",
        },
        body: JSON.stringify({ username: username.trim(), newPassword }),
      })
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch { data = { error: text } }
      setLoading(false)
      if (!res.ok) { setError(data.error || `Error ${res.status}`); return }
      setSuccess("Password berhasil diubah! Silakan masuk.")
    } catch (e) {
      setLoading(false)
      setError("Network error: " + String(e))
    }
    setTimeout(() => { setMode("login"); setSuccess(""); setNewPassword(""); setConfirmPassword("") }, 2000)
  }

  const submit = async () => {
    setError("")
    if (!username.trim()) { setError("Username wajib diisi."); return }
    if (password.length < 6) { setError("Password minimal 6 karakter."); return }
    setLoading(true)
    if (mode === "register") {
      if (!name.trim()) { setError("Nama wajib diisi."); setLoading(false); return }
      if (!email.trim()) { setError("Email wajib diisi."); setLoading(false); return }
      const { data: existing } = await supabase.from("profiles").select("username").eq("username", username.trim()).maybeSingle()
      if (existing) { setError("Username sudah dipakai, coba yang lain."); setLoading(false); return }
      const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password })
      if (e) { setError(e.message); setLoading(false); return }
      if (data.user) {
        await supabase.from("profiles").insert({ id: data.user.id, username: username.trim(), name: name.trim(), email: email.trim() })
        await supabase.auth.updateUser({ data: { username: username.trim(), name: name.trim() } })
      }
      onAuth(name.trim())
    } else {
      const { data: profile } = await supabase.from("profiles").select("email, name").eq("username", username.trim()).maybeSingle()
      if (!profile) { setError("Username tidak ditemukan."); setLoading(false); return }
      const { error: e } = await supabase.auth.signInWithPassword({ email: profile.email, password })
      if (e) { setError("Password salah."); setLoading(false); return }
      onAuth(profile.name)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f0ede8", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px 20px", fontFamily:"Instrument Sans, sans-serif" }}>


      {/* Kembali button */}
      {onBack && (
        <button onClick={onBack} style={{
          position:"fixed", top:18, left:20,
          background:"rgba(220,38,38,0.07)", border:"1px solid rgba(220,38,38,0.2)",
          borderRadius:10, cursor:"pointer", padding:"7px 14px",
          color:"rgba(220,38,38,0.75)", fontSize:12, fontWeight:600,
          fontFamily:"Instrument Sans, sans-serif",
          display:"flex", alignItems:"center", gap:5,
        }}>
          ← Kembali
        </button>
      )}

      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Hero title */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
            <p style={{ fontFamily:"Fraunces, serif", fontSize:52, fontWeight:700, fontStyle:"italic",
              color:"#1a1a1a", lineHeight:1.1, margin:0 }}>
              Catatan
            </p>
            <div className="wallet-badge" style={{ marginTop:6 }}><WalletSVG/></div>
          </div>
          <p style={{ fontFamily:"Fraunces, serif", fontSize:52, fontWeight:700, fontStyle:"italic",
            color:"#1a1a1a", lineHeight:1.1, marginTop:4 }}>
            Keuanganku
          </p>
          <p style={{ fontSize:14, color:"#888", marginTop:14, lineHeight:1.6 }}>
            Catat pemasukan & pengeluaran harian.<br/>Lihat kemana uangmu pergi.
          </p>
        </div>

        {/* Card */}
        <div style={{ background:"#fff", borderRadius:20, padding:"28px 24px",
          boxShadow:"0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          border:"1px solid rgba(0,0,0,0.06)" }}>

          {/* Tabs */}
          {mode !== "reset" && (
            <div style={{ display:"flex", background:"#f5f4f0", borderRadius:12, padding:4, marginBottom:22, gap:3 }}>
              {(["login","register"] as const).map(m => (
                <button key={m} onClick={()=>{setMode(m);setError("");setSuccess("")}}
                  style={{ flex:1, padding:"9px 0", fontSize:13, fontWeight:700, border:"none", cursor:"pointer",
                    fontFamily:"Instrument Sans, sans-serif", borderRadius:9,
                    background: mode===m ? "#1a1a1a" : "transparent",
                    color: mode===m ? "#fff" : "#999",
                    boxShadow: mode===m ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                    transition:"all 0.2s",
                  }}>
                  {m==="login" ? "Masuk" : "Daftar"}
                </button>
              ))}
            </div>
          )}

          {mode==="reset" && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
              <button onClick={()=>{setMode("login");setError("");setSuccess("")}}
                style={{ background:"#f5f4f0", border:"none", borderRadius:8,
                  padding:"6px 12px", cursor:"pointer", color:"#666", fontSize:12,
                  fontFamily:"Instrument Sans, sans-serif", fontWeight:600 }}>
                ← Balik
              </button>
              <p style={{ fontSize:14, fontWeight:700, color:"#1a1a1a",
                fontFamily:"Instrument Sans, sans-serif" }}>Reset Password</p>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {mode==="register" && (
              <div>
                <p style={{ fontSize:11, color:"#888", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>Nama</p>
                <input style={inp} type="text" value={name} onChange={e=>setName(e.target.value)}
                  placeholder="Nama lengkap kamu" onKeyDown={e=>e.key==="Enter"&&submit()}
                  onFocus={e=>(e.target as HTMLInputElement).style.borderColor="rgba(0,0,0,0.35)"}
                  onBlur={e=>(e.target as HTMLInputElement).style.borderColor="rgba(0,0,0,0.12)"}/>
              </div>
            )}

            <div>
              <p style={{ fontSize:11, color:"#888", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>Username</p>
              <input style={inp} type="text" value={username}
                onChange={e=>setUsername(e.target.value.replace(/\s/g,""))}
                placeholder="username_kamu"
                onKeyDown={e=>e.key==="Enter"&&(mode==="reset"?submitReset():submit())}
                onFocus={e=>(e.target as HTMLInputElement).style.borderColor="rgba(0,0,0,0.35)"}
                onBlur={e=>(e.target as HTMLInputElement).style.borderColor="rgba(0,0,0,0.12)"}/>
            </div>

            {mode==="register" && (
              <div>
                <p style={{ fontSize:11, color:"#888", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>Email</p>
                <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="email@kamu.com" onKeyDown={e=>e.key==="Enter"&&submit()}
                  onFocus={e=>(e.target as HTMLInputElement).style.borderColor="rgba(0,0,0,0.35)"}
                  onBlur={e=>(e.target as HTMLInputElement).style.borderColor="rgba(0,0,0,0.12)"}/>
              </div>
            )}

            {mode !== "reset" && (
              <PwField label="Password" val={password} setVal={setPassword}
                show={showPw} setShow={setShowPw} onEnter={submit}/>
            )}

            {mode==="login" && (
              <div style={{ textAlign:"right", marginTop:-6 }}>
                <button onClick={()=>{setMode("reset");setError("");setSuccess("")}}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:12,
                    color:"#999", fontFamily:"Instrument Sans, sans-serif",
                    textDecoration:"underline", textUnderlineOffset:2, padding:0 }}>
                  Lupa Password?
                </button>
              </div>
            )}

            {mode==="reset" && (
              <>
                <PwField label="Password Baru" val={newPassword} setVal={setNewPassword}
                  show={showNewPw} setShow={setShowNewPw} onEnter={submitReset}/>
                <PwField label="Konfirmasi Password Baru" val={confirmPassword} setVal={setConfirmPassword}
                  show={showConfPw} setShow={setShowConfPw} onEnter={submitReset}/>
              </>
            )}

            {error && (
              <p style={{ fontSize:12, color:"#dc2626", background:"rgba(220,38,38,0.06)",
                padding:"10px 14px", borderRadius:10, margin:0,
                border:"1px solid rgba(220,38,38,0.15)" }}>{error}</p>
            )}
            {success && (
              <p style={{ fontSize:12, color:"#16a34a", background:"rgba(22,163,74,0.06)",
                padding:"10px 14px", borderRadius:10, margin:0,
                border:"1px solid rgba(22,163,74,0.15)" }}>{success}</p>
            )}

            <button onClick={mode==="reset" ? submitReset : submit} disabled={loading}
              style={{ padding:"14px 0", borderRadius:12, border:"none", fontSize:14, fontWeight:700,
                cursor:loading?"not-allowed":"pointer", marginTop:4,
                background: loading ? "#555" : "#1a1a1a",
                color:"#fff", fontFamily:"Instrument Sans, sans-serif",
                boxShadow: loading ? "none" : "0 4px 16px rgba(0,0,0,0.2)",
                transition:"all 0.2s",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              }}>
              {loading ? (
                <>
                  <div style={{ width:14, height:14, borderRadius:"50%", border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", animation:"spin 0.7s linear infinite" }}/>
                  Memproses...
                </>
              ) : mode==="login" ? "Masuk Sekarang →"
                : mode==="register" ? "Buat Akun →"
                : "Ubah Password →"}
            </button>
          </div>
        </div>

        <p style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#bbb" }}>
          Daftar Gratis · Langsung Pakai
        </p>
      </div>
    </div>
  )
}
