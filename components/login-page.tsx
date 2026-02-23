"use client"

import { useState } from "react"
import { Lock, User, LogIn, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react"
import Image from "next/image"

interface LoginPageProps {
    onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(false)

        setTimeout(() => {
            if (username === "Maw" && password === "4289") {
                localStorage.setItem("lotus_auth", "true")
                onLogin()
            } else {
                setError(true)
                setLoading(false)
            }
        }, 800)
    }

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
            {/* LEFT SIDE: Brand Image & Welcome (Desktop Only) */}
            <div className="hidden md:flex md:w-[55%] relative items-center justify-center bg-slate-900">
                <Image
                    src="/images/employees.png"
                    alt="Lotus's Team"
                    fill
                    className="object-cover opacity-60"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                <div className="relative z-10 px-12 lg:px-20 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-[0.7rem] font-black uppercase tracking-[0.25em] text-white/90 backdrop-blur-md border border-white/10">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Secure Personnel System
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight">
                        Lotus{"'"}s <br />
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                            Operation Map
                        </span>
                    </h1>
                    <p className="mt-6 text-slate-300 text-lg font-medium leading-relaxed max-w-lg">
                        ระบบบริหารจัดการโครงสร้างบุคลากรและผังองค์กรอัจฉริยะ
                        ออกแบบมาเพื่อสนับสนุนการทำงานของทีม Operation ทั่วประเทศ
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: Login Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 relative bg-slate-900 md:bg-slate-50">
                {/* Mobile Background (Shown only on small screens) */}
                <div className="md:hidden absolute inset-0 z-0">
                    <Image
                        src="/images/employees.png"
                        alt="Lotus's Team"
                        fill
                        className="object-cover opacity-100"
                    />
                </div>

                <div className="w-full max-w-[400px] relative z-10 animate-in fade-in slide-in-from-right-8 duration-700">
                    {/* Logo */}
                    <div className="flex justify-center mb-12">
                        <div className="relative h-14 w-14 rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 bg-white p-2">
                            <Image
                                src="/images/logo.jpg"
                                alt="Lotus's Logo"
                                fill
                                className="object-cover scale-90"
                            />
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-white md:text-slate-900 mb-3 tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">เข้าสู่ระบบ</h2>
                        <p className="text-white/80 md:text-slate-500 font-bold text-sm drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">Operation Intelligence Portal</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[0.7rem] font-black uppercase tracking-[0.15em] text-white/60 md:text-slate-400 ml-1 drop-shadow-md">Username</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-primary">
                                    <User className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-primary" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-100 rounded-[1.25rem] py-4 pl-12 pr-4 text-slate-900 font-bold placeholder:text-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none shadow-sm"
                                    placeholder="กรอกชื่อผู้ใช้"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[0.7rem] font-black uppercase tracking-[0.15em] text-white/60 md:text-slate-400 ml-1 drop-shadow-md">Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-primary">
                                    <Lock className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-primary" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-100 rounded-[1.25rem] py-4 pl-12 pr-4 text-slate-900 font-bold placeholder:text-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none shadow-sm"
                                    placeholder="กรอกรหัสผ่าน"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-600 text-xs font-black animate-in fade-in slide-in-from-top-2">
                                <div className="bg-rose-100 p-1.5 rounded-lg">
                                    <AlertCircle className="h-4 w-4" />
                                </div>
                                ข้อมูลเข้าสู่ระบบไม่ถูกต้อง กรุณาลองใหม่
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 rounded-[1.25rem] bg-slate-900 py-4.5 text-base font-black text-white shadow-2xl shadow-slate-900/20 hover:bg-primary hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 group overflow-hidden relative"
                        >
                            {loading ? (
                                <div className="h-6 w-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    เข้าสู่ระบบ
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                        <p className="text-[0.65rem] text-slate-400 font-black uppercase tracking-[0.2em]">
                            © 2026 Lotus{"'"}s Thailand
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
