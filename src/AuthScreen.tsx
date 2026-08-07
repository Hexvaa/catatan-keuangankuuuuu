import { useState } from "react"
import { supabase } from "./lib/supabase"

interface Props { onAuth: (name: string) => void; onBack?: () => void }

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
  const [showPw, setShowPw]     = useState(false)

  const submitReset = async () => {
    setError(""); setSuccess("")
    if (!username.trim()) { setError("Username wajib diisi."); return }
    if (newPassword.length < 6) { setError("Password minimal 6 karakter."); return }
    if (newPassword !== confirmPassword) { setError("Konfirmasi password tidak cocok."); return }
    setLoading(true)
    const res = await fetch("https://qppqqswrwryxbuymesyl.supabase.co/functions/v1/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), newPassword }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || "Gagal mengubah password."); return }
    setSuccess("Password berhasil diubah! Silakan masuk.")
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

      // Check username taken
      const { data: existing } = await supabase
        .from("profiles").select("username").eq("username", username.trim()).maybeSingle()
      if (existing) { setError("Username sudah dipakai, coba yang lain."); setLoading(false); return }

      const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password })
      if (e) { setError(e.message); setLoading(false); return }

      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          username: username.trim(),
          name: name.trim(),
          email: email.trim(),
        })
        // Update user metadata
        await supabase.auth.updateUser({ data: { username: username.trim(), name: name.trim() } })
      }

      onAuth(name.trim())

    } else {
      // Login: find email from username
      const { data: profile } = await supabase
        .from("profiles").select("email, name").eq("username", username.trim()).maybeSingle()
      if (!profile) { setError("Username tidak ditemukan."); setLoading(false); return }

      const { error: e } = await supabase.auth.signInWithPassword({ email: profile.email, password })
      if (e) { setError("Password salah."); setLoading(false); return }

      onAuth(profile.name)
    }

    setLoading(false)
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 14px", fontSize: 14,
    border: "1px solid rgba(167,139,250,0.25)", borderRadius: 12,
    background: "rgba(255,255,255,0.05)", color: "#eeeeff", outline: "none",
    fontFamily: "Instrument Sans, sans-serif",
  }

  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden" }}>
      <div className="orb orb-1"/><div className="orb orb-2"/><div className="orb orb-3"/>

      <div className="au" style={{ width:"100%", maxWidth:380, position:"relative", zIndex:1 }}>
        {onBack && (
          <button onClick={onBack} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, cursor:"pointer", padding:"7px 14px", marginBottom:24,
            color:"rgba(238,238,255,0.5)", fontSize:12, fontFamily:"Instrument Sans, sans-serif",
            display:"flex", alignItems:"center", gap:6, transition:"all 0.15s" }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.25)"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.1)"}>
            ← Kembali
          </button>
        )}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <p style={{ fontSize:11, color:"rgba(238,238,255,0.4)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Keuangan Pribadi</p>
          <p style={{ fontFamily:"Fraunces, serif", fontSize:36, fontWeight:700, fontStyle:"italic", color:"#eeeeff", lineHeight:1.1, marginBottom:2 }}>Catatan</p>
          <p style={{ fontFamily:"Fraunces, serif", fontSize:36, fontWeight:700, fontStyle:"italic", color:"#a78bfa", lineHeight:1.1 }}>Keuanganku</p>
        </div>

        <div className="grad-border" style={{ background:"#131320", borderRadius:20, padding:"30px 28px" }}>
          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:10, padding:3, marginBottom:24 }}>
            {(["login","register"] as const).map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");setSuccess("")}}
                style={{ flex:1, padding:"8px 0", fontSize:13, fontWeight:600, border:"none", cursor:"pointer",
                  fontFamily:"Instrument Sans, sans-serif", borderRadius:7, transition:"all 0.15s",
                  background: mode===m||mode==="reset"&&m==="login" ? "rgba(167,139,250,0.18)" : "transparent",
                  color: mode===m||mode==="reset"&&m==="login" ? "#a78bfa" : "rgba(238,238,255,0.4)",
                }}>
                {m==="login" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {mode==="register" && (
              <div>
                <p style={{ fontSize:11, color:"rgba(238,238,255,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Nama</p>
                <input style={inp} type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nama lengkap" onKeyDown={e=>e.key==="Enter"&&submit()}/>
              </div>
            )}

            <div>
              <p style={{ fontSize:11, color:"rgba(238,238,255,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Username</p>
              <input style={inp} type="text" value={username} onChange={e=>setUsername(e.target.value.replace(/\s/g,""))} placeholder="username" onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </div>

            {mode==="register" && (
              <div>
                <p style={{ fontSize:11, color:"rgba(238,238,255,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Email</p>
                <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@kamu.com" onKeyDown={e=>e.key==="Enter"&&submit()}/>
              </div>
            )}

            {mode !== "reset" && <div>
              <p style={{ fontSize:11, color:"rgba(238,238,255,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Password</p>
              <div style={{ position:"relative" }}>
                <input style={{ ...inp, paddingRight:42 }} type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter" onKeyDown={e=>e.key==="Enter"&&submit()}/>
                <button type="button" onClick={()=>setShowPw(v=>!v)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", padding:4,
                    color:"rgba(238,238,255,0.35)", display:"flex", alignItems:"center",
                    transition:"color 0.15s" }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="rgba(238,238,255,0.7)"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="rgba(238,238,255,0.35)"}>
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>}

            {mode==="login" && (
              <div style={{ textAlign:"right", marginTop:-6 }}>
                <button onClick={()=>{setMode("reset");setError("");setSuccess("")}}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:12,
                    color:"rgba(167,139,250,0.7)", fontFamily:"Instrument Sans, sans-serif",
                    textDecoration:"underline", textUnderlineOffset:2, padding:0 }}>
                  Lupa Password?
                </button>
              </div>
            )}

            {mode==="reset" && (
              <>
                <div>
                  <p style={{ fontSize:11, color:"rgba(238,238,255,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Password Baru</p>
                  <input style={inp} type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" onKeyDown={e=>e.key==="Enter"&&submitReset()}/>
                </div>
                <div>
                  <p style={{ fontSize:11, color:"rgba(238,238,255,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Konfirmasi Password Baru</p>
                  <input style={inp} type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" onKeyDown={e=>e.key==="Enter"&&submitReset()}/>
                </div>
              </>
            )}

            {error && (
              <p style={{ fontSize:12, color:"#f87171", background:"rgba(248,113,113,0.1)", padding:"10px 12px", borderRadius:8, margin:0 }}>{error}</p>
            )}

            {success && (
              <p style={{ fontSize:12, color:"#34d399", background:"rgba(52,211,153,0.1)", padding:"10px 12px", borderRadius:8, margin:0 }}>{success}</p>
            )}

            <button onClick={mode==="reset" ? submitReset : submit} disabled={loading}
              style={{ padding:"13px 0", borderRadius:12, border:"none", fontSize:14, fontWeight:700,
                cursor:loading?"not-allowed":"pointer", marginTop:4,
                background:"linear-gradient(135deg,#6d28d9 0%,#7c3aed 50%,#a78bfa 100%)",
                color:"#fff", fontFamily:"Instrument Sans, sans-serif",
                boxShadow:"0 4px 20px rgba(124,58,237,0.4)",
                opacity:loading?0.7:1, transition:"opacity 0.15s",
              }}>
              {loading ? "Memproses..." : mode==="login" ? "Masuk" : mode==="register" ? "Daftar" : "Ubah Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
