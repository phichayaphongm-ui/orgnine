import { useMemo, useState } from "react"
import Image from "next/image"
import type { OrgRecord, AgmRecord, PageId } from "@/lib/types"
import {
  Users,
  Building2,
  LayoutDashboard,
  Plus,
  FileSpreadsheet,
  ChevronRight,
  Phone,
  MapPin,
  Globe,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
} from "lucide-react"

interface DashboardProps {
  orgData: OrgRecord[]
  agmData: AgmRecord[]
  imageCache: Record<string, string>
  onNavigate: (page: PageId) => void
  onOpenSheet: () => void
  onShowProvinceDetail: (province: string) => void
  connected: boolean
}

export default function Dashboard({
  orgData,
  agmData,
  imageCache,
  onNavigate,
  onOpenSheet,
  onShowProvinceDetail,
  connected
}: DashboardProps) {

  const getImg = (url?: string) => {
    if (!url) return null
    return url.startsWith("localdb://") ? imageCache[url.replace("localdb://", "")] || null : url
  }

  /* ── geo stats ─────────────────────────────────────── */
  const zoneSummary = useMemo(() => {
    const map: Record<string, { stores: number; provinces: Set<string>; agms: Set<string> }> = {}
    orgData.forEach(s => {
      const z = s["AGM ZONE"] || "Unknown"
      if (!map[z]) map[z] = { stores: 0, provinces: new Set(), agms: new Set() }
      map[z].stores++
      if (s["Province"]) map[z].provinces.add(s["Province"])
      if (s["AGM Name"]) map[z].agms.add(s["AGM Name"])
    })
    return Object.entries(map).map(([zone, d]) => ({
      zone, stores: d.stores, provinces: d.provinces.size, agms: d.agms.size,
    })).sort((a, b) => b.stores - a.stores)
  }, [orgData])

  const provinceCounts = useMemo(() => {
    const map: Record<string, { count: number; zone: string; agms: Set<string> }> = {}
    orgData.forEach(s => {
      if (!s["Province"]) return
      if (!map[s["Province"]]) map[s["Province"]] = { count: 0, zone: s["AGM ZONE"] || "", agms: new Set() }
      map[s["Province"]].count++
      if (s["AGM Name"]) map[s["Province"]].agms.add(s["AGM Name"])
    })
    return Object.entries(map)
      .map(([prov, d]) => ({ prov, count: d.count, zone: d.zone, agms: d.agms.size }))
      .sort((a, b) => b.count - a.count)
  }, [orgData])

  const agmStoreCount = useMemo(() => {
    const map: Record<string, number> = {}
    orgData.forEach(s => { if (s["AGM Name"]) map[s["AGM Name"]] = (map[s["AGM Name"]] || 0) + 1 })
    return map
  }, [orgData])

  const allAGMs = useMemo(() => [...new Set(orgData.map(s => s["AGM Name"]).filter(Boolean))], [orgData])
  const maxProv = provinceCounts[0]?.count || 1

  const zoneCfg: Record<string, { from: string; to: string; icon: string; label: string }> = {
    "North - H": { from: "from-sky-500", to: "to-blue-700", icon: "🧭", label: "North Zone" },
    "South - H": { from: "from-emerald-500", to: "to-teal-700", icon: "🏝️", label: "South Zone" },
  }

  /* AGM list for photo strip */
  const agmList = useMemo(() => {
    if (agmData.length > 0) return agmData
    return allAGMs.map(name => ({
      "AGM Name": name,
      "AGM ZONE": "",
      "Mobile Phone": "",
      Email: "",
      "Image URL": "",
      Remark: ""
    } as AgmRecord))
  }, [agmData, allAGMs])

  /* --- Grouped Provinces calculation --- */
  const groupedProvinces = useMemo(() => {
    const zoneMap: Record<string, Record<string, number>> = {}

    orgData.forEach(s => {
      const z = s["AGM ZONE"] || "Unknown"
      const p = s["Province"] || "ไม่ระบุ"
      if (!zoneMap[z]) zoneMap[z] = {}
      zoneMap[z][p] = (zoneMap[z][p] || 0) + 1
    })

    return Object.entries(zoneMap).map(([zone, provs]) => ({
      zone,
      provinces: Object.entries(provs)
        .map(([prov, count]) => ({ prov, count }))
        .sort((a, b) => b.count - a.count),
      totalStores: Object.values(provs).reduce((a, b) => a + b, 0)
    })).sort((a, b) => b.totalStores - a.totalStores)
  }, [orgData])

  const maxProvCount = useMemo(() => {
    let max = 1
    groupedProvinces.forEach(z => {
      z.provinces.forEach(p => { if (p.count > max) max = p.count })
    })
    return max
  }, [groupedProvinces])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ══ HERO SECTION - Clean & Focused ════════════════════════ */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-2xl px-10 py-16">
        {/* Abstract Background Decoration */}
        <div className="absolute inset-0 opacity-[0.06] z-0"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl z-0" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl z-0" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-[0.7rem] font-black uppercase tracking-[0.25em] text-white/80 backdrop-blur-md border border-white/10">
            <Globe className="h-4 w-4 text-blue-400" />
            Organization Intelligence
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight">
            Lotus{"'"}s <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              Operation Map
            </span>
          </h1>
          <p className="mt-6 text-slate-400 text-lg font-medium leading-relaxed">
            ภาพรวมโครงสร้างองค์กรทั่วประเทศ แบ่งตามภูมิภาคและรายจังหวัด
            ยกระดับการบริหารจัดการสาขาด้วยข้อมูลที่แม่นยำและเรียลไทม์
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onNavigate("org")}
              className="flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-8 py-4 text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
            >
              ดูผังองค์กร <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate("data")}
              className="flex items-center gap-2 rounded-2xl bg-white/10 text-white border border-white/20 px-8 py-4 text-sm font-black backdrop-blur-md transition-all hover:bg-white/20"
            >
              จัดการข้อมูลสาขา
            </button>
          </div>
        </div>
      </section>

      {/* ══ TEAM & STATISTICS SECTION ══════════════════════════════ */}
      <section className="group relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-3xl min-h-[650px] md:min-h-[550px] flex flex-col justify-end">
        {/* Background Image - High Clarity */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/employees.png"
            alt="Lotus's Operation Team"
            fill
            className="object-cover opacity-100 object-[center_20%] transition-transform duration-[3000ms] group-hover:scale-105"
            priority
          />
          {/* Subtle gradient to ensure stats readability - Lightened on mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent md:from-slate-950 md:via-slate-900/40" />
        </div>

        {/* Stats Overlay - Premium Glassmorphism */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/10 bg-slate-950/40 md:bg-slate-950/70 backdrop-blur-xl border-t border-white/10">
          {[
            { val: orgData.length, label: "Total Stores", sub: "สาขาทั้งหมด", icon: "🏪" },
            { val: allAGMs.length, label: "AGMs", sub: "ผู้บริหารเขต", icon: "👤" },
            { val: provinceCounts.length, label: "Provinces", sub: "จังหวัดที่ครอบคลุม", icon: "🗺️" },
            { val: zoneSummary.length, label: "Zones", sub: "เขตบริหาร", icon: "🌏" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center justify-center py-4 md:py-12 px-4 hover:bg-white/5 transition-all group/stat">
              <span className="text-2xl md:text-3xl mb-1 md:mb-3 transform transition-transform group-hover/stat:scale-125 duration-500">{s.icon}</span>
              <p className="text-2xl md:text-5xl font-black text-white tabular-nums drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">{s.val}</p>
              <p className="text-[0.6rem] md:text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/80 mt-1 md:mt-2">{s.label}</p>
              <p className="text-[0.55rem] md:text-[0.65rem] font-medium text-white/50">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PHOTO SHOWCASE (AGM & STAFF) ═══════════════════════════ */}
      <div className="glass-card px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-primary/60">Area General Managers</p>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {agmList.map(agm => {
                const img = getImg(agm["Image URL"])
                const zone = agm["AGM ZONE"] || (agm as any)[" AGM ZONE"] || orgData.find(s => s["AGM Name"] === agm["AGM Name"])?.["AGM ZONE"]
                const isSouth = (zone || "").includes("South")
                return (
                  <button key={agm["AGM Name"]} onClick={() => onNavigate("agm")} className="group flex flex-col items-center gap-2 hover:scale-110 transition-all">
                    <div className={`relative h-14 w-14 overflow-hidden rounded-2xl border-2 shadow-lg transition-all group-hover:border-primary ${isSouth ? "border-emerald-400/40" : "border-sky-400/40"}`}>
                      {img ? <Image src={img} alt={agm["AGM Name"]} fill className="object-cover" /> :
                        <div className={`flex h-full w-full items-center justify-center text-base font-black bg-gradient-to-br ${isSouth ? "from-emerald-800 to-teal-900" : "from-blue-800 to-sky-900"} text-white/50`}>
                          {agm["AGM Name"]?.[0]}
                        </div>}
                    </div>
                    <p className="text-[0.6rem] font-black text-primary/70 truncate max-w-[60px]">{agm["AGM Name"]}</p>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex-1 border-l border-border/30 pl-12 hidden lg:block">
            <div className="flex items-center gap-3 mb-6">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-primary/60">Staff Gallery</p>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {orgData.filter(s => s["Image URL"]).slice(0, 18).map((s, i) => (
                <div key={i} className="group relative h-12 w-12 overflow-hidden rounded-full border border-border shadow-sm transition-all hover:scale-110 hover:z-10 hover:border-primary">
                  <Image src={getImg(s["Image URL"])!} alt="Staff" fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              <div className="h-12 w-12 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[0.65rem] font-black text-slate-400">
                +{Math.max(0, orgData.filter(s => s["Image URL"]).length - 18)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ ZONE STATS CARDS ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {zoneSummary.map(z => {
          const isSouth = z.zone.includes("South")
          return (
            <div key={z.zone} className="glass-card p-6 group hover:translate-y-[-4px] transition-all">
              <div className="flex items-center justify-between mb-5">
                <div className={`p-3 rounded-2xl ${isSouth ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"}`}>
                  <MapPin className="h-6 w-6" />
                </div>
                <span className={`text-[0.6rem] font-black px-2.5 py-1 rounded-full ${isSouth ? "bg-emerald-100/50 text-emerald-700" : "bg-sky-100/50 text-sky-700"}`}>
                  {z.zone}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black text-primary tracking-tighter">{z.stores}</p>
                <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total Stores</p>
              </div>
              <div className="mt-6 pt-5 border-t border-border/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-primary">{z.agms} Persons</p>
                  <p className="text-[0.6rem] font-bold text-muted-foreground uppercase">AGM Level</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-primary">{z.provinces} Prov.</p>
                  <p className="text-[0.6rem] font-bold text-muted-foreground uppercase">Coverage</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ══ PROVINCE DISTRIBUTION Grouped by Zone ═════════════════ */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-10 py-6">
          <div>
            <h3 className="text-sm font-black text-primary uppercase tracking-widest">การกระจายสาขาแยกตามเขตและจังหวัด</h3>
            <p className="text-[0.65rem] font-medium text-muted-foreground">Store Distribution by Zone and Province</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[0.6rem] font-black text-muted-foreground uppercase">
              <div className="h-2 w-2 rounded-full bg-emerald-400" /> South Zone
            </div>
            <div className="flex items-center gap-1.5 text-[0.6rem] font-black text-muted-foreground uppercase">
              <div className="h-2 w-2 rounded-full bg-sky-400" /> North Zone
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/50">
          {groupedProvinces.map((zg, zIdx) => {
            const isSouth = zg.zone.includes("South")
            return (
              <div key={zg.zone} className="animate-in fade-in slide-in-from-top-2 duration-500" style={{ animationDelay: `${zIdx * 100}ms` }}>
                <div className={`px-10 py-3 flex items-center justify-between ${isSouth ? "bg-emerald-50/20" : "bg-sky-50/20"}`}>
                  <span className={`text-[0.7rem] font-black tracking-[0.2em] ${isSouth ? "text-emerald-700" : "text-sky-700"}`}>
                    REGION: {zg.zone}
                  </span>
                  <span className="text-[0.6rem] font-bold text-muted-foreground uppercase">
                    {zg.provinces.length} จังหวัด | {zg.totalStores} สาขา
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border/30">
                  {zg.provinces.map((p, pIdx) => {
                    const pct = Math.round((p.count / maxProvCount) * 100)
                    return (
                      <button
                        key={p.prov}
                        onClick={() => onShowProvinceDetail(p.prov)}
                        className="px-10 py-4 flex items-center justify-between hover:bg-blue-50/50 group transition-all w-full text-left active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-5">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-[0.7rem] font-black ${isSouth ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                            {pIdx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{p.prov}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <p className="text-sm font-black text-primary flex items-center gap-2">
                            {p.count} <span className="text-[0.6rem] font-bold text-muted-foreground uppercase">Stores</span>
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
                          </p>
                          <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${isSouth ? "bg-emerald-400" : "bg-sky-400"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ══ QUICK ACTIONS ═════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "ผังองค์กร", sub: "Org Chart", icon: LayoutDashboard, page: "org", color: "bg-blue-50 text-blue-600" },
          { label: "เพิ่มสาขา", sub: "Store Data", icon: Plus, page: "data", color: "bg-emerald-50 text-emerald-600" },
          { label: "จัดการ AGM", sub: "AGM Manager", icon: Users, page: "agm", color: "bg-amber-50 text-amber-600" },
          { label: "ฐานข้อมูล", sub: "Internal Sheet", icon: FileSpreadsheet, action: onOpenSheet, color: "bg-purple-50 text-purple-600" },
        ].map((qa) => (
          <button key={qa.label} onClick={() => qa.page ? onNavigate(qa.page as PageId) : qa.action?.()}
            className="flex flex-col items-center gap-3 rounded-[2rem] glass-card p-6 hover:translate-y-[-4px] transition-all group">
            <div className={`p-4 rounded-2xl ${qa.color.split(" ")[0]} group-hover:scale-110 transition-transform`}>
              <qa.icon className={`h-6 w-6 ${qa.color.split(" ")[1]}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-foreground">{qa.label}</p>
              <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest">{qa.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
