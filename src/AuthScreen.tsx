import { useState } from "react"
import { supabase } from "./lib/supabase"

interface Props { onAuth: (name: string) => void }

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode]         = useState<"login"|"register">("login")
  const [name, setName]         = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

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
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <p style={{ fontSize:11, color:"rgba(238,238,255,0.4)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Keuangan Pribadi</p>
          <p style={{ fontFamily:"Fraunces, serif", fontSize:36, fontWeight:700, fontStyle:"italic", color:"#eeeeff", lineHeight:1.1, marginBottom:2 }}>Catatan</p>
          <p style={{ fontFamily:"Fraunces, serif", fontSize:36, fontWeight:700, fontStyle:"italic", color:"#a78bfa", lineHeight:1.1 }}>Keuanganku</p>
        </div>

        <div className="grad-border" style={{ background:"#131320", borderRadius:20, padding:"30px 28px" }}>
          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:10, padding:3, marginBottom:24 }}>
            {(["login","register"] as const).map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("")}}
                style={{ flex:1, padding:"8px 0", fontSize:13, fontWeight:600, border:"none", cursor:"pointer",
                  fontFamily:"Instrument Sans, sans-serif", borderRadius:7, transition:"all 0.15s",
                  background: mode===m ? "rgba(167,139,250,0.18)" : "transparent",
                  color: mode===m ? "#a78bfa" : "rgba(238,238,255,0.4)",
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

            <div>
              <p style={{ fontSize:11, color:"rgba(238,238,255,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Password</p>
              <input style={inp} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter" onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </div>

            {error && (
              <p style={{ fontSize:12, color:"#f87171", background:"rgba(248,113,113,0.1)", padding:"10px 12px", borderRadius:8, margin:0 }}>{error}</p>
            )}

            <button onClick={submit} disabled={loading}
              style={{ padding:"13px 0", borderRadius:12, border:"none", fontSize:14, fontWeight:700,
                cursor:loading?"not-allowed":"pointer", marginTop:4,
                background:"linear-gradient(135deg,#6d28d9 0%,#7c3aed 50%,#a78bfa 100%)",
                color:"#fff", fontFamily:"Instrument Sans, sans-serif",
                boxShadow:"0 4px 20px rgba(124,58,237,0.4)",
                opacity:loading?0.7:1, transition:"opacity 0.15s",
              }}>
              {loading ? "Memproses..." : mode==="login" ? "Masuk" : "Daftar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
