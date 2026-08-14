import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://qppqqswrwryxbuymesyl.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcHFxc3dyd3J5eGJ1eW1lc3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjkzMzIsImV4cCI6MjEwMTYwNTMzMn0.UvupOMRtTLcGoVo6pMjB4_zLgzUDFUz9va7w7v1FO_4"

// Singleton agar tidak ada multiple GoTrueClient instances
const key = "__supabase_singleton__"
declare global { interface Window { [key]: ReturnType<typeof createClient> } }
export const supabase = (window as any)[key] ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
