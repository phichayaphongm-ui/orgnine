"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import Image from "next/image"
import type { OrgRecord, AgmRecord } from "@/lib/types"
import {
  FileDown,
  Search,
  Filter,
  User,
  Phone,
  Printer,
  MapPin,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react"
import { formatPhone } from "@/lib/utils"

interface OrgChartProps {
  orgData: OrgRecord[]
  agmData: AgmRecord[]
  imageCache: Record<string, string>
  onEditAgm: (name: string) => void
  onShowDetail: (s: OrgRecord) => void
  onExportPptx: () => void
  onFilteredDataChange?: (stores: OrgRecord[]) => void
}

export default function OrgChart({
  orgData,
  agmData,
  imageCache,
  onEditAgm,
  onShowDetail,
  onExportPptx,
  onFilteredDataChange,
}: OrgChartProps) {
  const [selectedZone, setSelectedZone] = useState<string>("all")
  const [selectedAgm, setSelectedAgm] = useState<string>("all")
  const [collapsedAgms, setCollapsedAgms] = useState<Set<string>>(new Set())
  const chartRef = useRef<HTMLDivElement>(null)

  /* ─── Build Region → AGM → [stores] tree ─────────────────── */
  const tree = useMemo(() => {
    const regionMap: Record<string, Record<string, OrgRecord[]>> = {}
    orgData.forEach(r => {
      const region = r["AGM ZONE"] || "Unknown Region"
      const agm = r["AGM Name"] || "Unknown AGM"
      if (!regionMap[region]) regionMap[region] = {}
      if (!regionMap[region][agm]) regionMap[region][agm] = []
      regionMap[region][agm].push(r)
    })
    return regionMap
  }, [orgData])

  const filteredTree = useMemo(() => {
    const result: typeof tree = {}
    for (const [region, agms] of Object.entries(tree)) {
      if (selectedZone !== "all" && region !== selectedZone) continue
      const filteredAgms: Record<string, OrgRecord[]> = {}
      for (const [agm, stores] of Object.entries(agms)) {
        if (selectedAgm !== "all" && agm !== selectedAgm) continue
        const matches = stores.filter(s =>
          selectedAgm === "all" || agm === selectedAgm
        )
        if (matches.length) filteredAgms[agm] = matches
      }
      if (Object.keys(filteredAgms).length) result[region] = filteredAgms
    }
    return result
  }, [tree, selectedZone, selectedAgm])

  const allRegions = useMemo(() => [...new Set(orgData.map(s => s["AGM ZONE"]).filter(Boolean))].sort(), [orgData])
  const allAgms = useMemo(() => [...new Set(orgData.map(s => s["AGM Name"]).filter(Boolean))].sort(), [orgData])
  const filteredStores = useMemo(() => Object.values(filteredTree).flatMap(a => Object.values(a).flat()), [filteredTree])
  const totalVisible = filteredStores.length

  // Notify parent whenever filter changes (for filter-aware export)
  useEffect(() => {
    onFilteredDataChange?.(filteredStores)
  }, [filteredStores, onFilteredDataChange])

  const toggleAgm = (agm: string) =>
    setCollapsedAgms(prev => { const n = new Set(prev); n.has(agm) ? n.delete(agm) : n.add(agm); return n })

  const getImg = (url?: string) => {
    if (!url) return null
    return url.startsWith("localdb://") ? imageCache[url.replace("localdb://", "")] || null : url
  }

  /* ─── Region style config ──────────────────────────────────── */
  const regionCfg: Record<string, { gradient: string; accent: string; icon: string; label: string }> = {
    "North - H": { gradient: "from-sky-600 to-blue-800", accent: "bg-sky-500", icon: "🧭", label: "ภาคเหนือ / North Zone" },
    "South - H": { gradient: "from-emerald-500 to-teal-800", accent: "bg-emerald-500", icon: "🏝️", label: "ภาคใต้ / South Zone" },
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 5mm; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="glass-card no-print flex flex-wrap gap-3 p-5 items-center">

        {/* Zone filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <select
            value={selectedZone}
            onChange={e => setSelectedZone(e.target.value)}
            className="rounded-2xl border-none bg-white py-3 pl-4 pr-8 text-sm font-bold shadow-sm appearance-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">ทุก Region</option>
            {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* AGM filter */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <select
            value={selectedAgm}
            onChange={e => setSelectedAgm(e.target.value)}
            className="rounded-2xl border-none bg-white py-3 pl-4 pr-8 text-sm font-bold shadow-sm appearance-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">ทุก AGM ({allAgms.length})</option>
            {allAgms.map(agm => (
              <option key={agm} value={agm}>{agm} ({orgData.filter(s => s["AGM Name"] === agm).length} สาขา)</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 rounded-2xl bg-secondary/50 px-4 py-2.5">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-black text-primary uppercase tracking-wider">{totalVisible} สาขา</span>
        </div>

        {/* Buttons */}
        <button onClick={onExportPptx}
          className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20">
          <FileDown className="h-4 w-4" /> PowerPoint
        </button>
      </div>

      {/* ── Hierarchy Legend ──────────────────────────────────── */}
      <div className="no-print flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground px-1 flex-wrap">
        <span className="rounded-lg bg-blue-100 text-blue-700 px-3 py-1.5">🌏 Region</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="rounded-lg bg-amber-100 text-amber-700 px-3 py-1.5">👤 AGM</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="rounded-lg bg-emerald-100 text-emerald-700 px-3 py-1.5">🧑‍💼 Store Manager</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="rounded-lg bg-slate-100 text-slate-700 px-3 py-1.5">🏪 Store Name</span>
      </div>


      {/* ── Org Chart Tree ─────────────────────────────────────── */}
      <div ref={chartRef} className="space-y-14">
        {Object.entries(filteredTree).sort().map(([region, agms]) => {
          const cfg = regionCfg[region]

          return (
            <div key={region} className="relative">
              <div className="flex flex-col items-center mb-8">
                <div className={`inline-flex items-center gap-3 rounded-3xl bg-gradient-to-r ${cfg?.gradient || "from-slate-600 to-slate-800"} px-8 py-4 shadow-2xl border border-white/10`}>
                  <div className="ml-4 flex gap-3">
                    <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
                      <p className={`font-black text-white text-2xl`}>{Object.values(agms).flat().length}</p>
                      <p className="text-[0.5rem] font-bold uppercase text-white/50">สาขา</p>
                    </div>
                    <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
                      <p className={`font-black text-white text-2xl`}>{Object.keys(agms).length}</p>
                      <p className="text-[0.5rem] font-bold uppercase text-white/50">AGM</p>
                    </div>
                  </div>
                </div>
                {/* connector down */}
                <div className={`w-0.5 bg-gradient-to-b from-primary/40 to-transparent h-8`} />
              </div>

              {/* ─ Level 2: AGMs ─ */}
              <div className="space-y-10">
                {Object.entries(agms).sort().map(([agmName, stores]) => {
                  const agmRec = agmData.find(a => a["AGM Name"] === agmName)
                  const agmImg = getImg(agmRec?.["Image URL"])
                  const isCollapsed = collapsedAgms.has(agmName)

                  return (
                    <div key={agmName}>
                      {/* AGM Node */}
                      <div className="flex flex-col items-center">
                        <div className={`glass-card border-2 border-amber-300/60 bg-gradient-to-br from-white to-amber-50 shadow-xl text-center transition-all hover:border-amber-400/80 p-6 w-60`}>
                          {/* AGM Photo */}
                          <div className={`relative mx-auto overflow-hidden rounded-2xl border-4 border-amber-200 shadow-lg h-24 w-24 mb-4`}>
                            {agmImg ? (
                              <Image src={agmImg} alt={agmName} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100">
                                <User className={`text-amber-300 h-10 w-10`} />
                              </div>
                            )}
                          </div>
                          {/* AGM label */}
                          <p className={`font-black text-amber-700 uppercase tracking-widest text-[0.55rem] mb-1.5`}>Area General Manager</p>
                          <h4 className={`font-black text-foreground leading-snug text-sm`}>{agmName}</h4>
                          {agmRec?.["Mobile Phone"] && (
                            <div className={`flex items-center justify-center gap-1 text-amber-600 mt-2`}>
                              <Phone className={"h-3.5 w-3.5"} />
                              <span className={`font-bold text-xs`}>{formatPhone(agmRec?.["Mobile Phone"])}</span>
                            </div>
                          )}
                          <div className="mt-4 flex gap-2">
                            <button onClick={() => onEditAgm(agmName)}
                              className="flex-1 rounded-xl bg-amber-100 py-2 text-[0.65rem] font-black text-amber-700 hover:bg-amber-200 transition-all">
                              แก้ไข
                            </button>
                            <button onClick={() => toggleAgm(agmName)}
                              className="rounded-xl bg-muted p-2 text-muted-foreground hover:text-primary transition-all">
                              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        {/* Connector down to SM level */}
                        {!isCollapsed && <div className={`w-0.5 bg-gradient-to-b from-amber-300 to-border h-8`} />}
                      </div>

                      {/* ─ Level 3+4: Store Manager + Store Name ─ */}
                      {!isCollapsed && (
                        <div className="relative">
                          {/* Horizontal bar across all SM cards */}
                          {stores.length > 1 && (
                            <div className="absolute top-0 left-[4%] right-[4%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />
                          )}

                          <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-3`}>
                            {stores.sort((a, b) => (a["Store Name"] || "").localeCompare(b["Store Name"] || "")).map((s, idx) => {
                              const smImg = getImg(s["Image URL"])
                              const smName = s["Store Manager Name"] || ""
                              const storeName = s["Store Name Thai"] || s["Store Name"] || ""

                              return (
                                <div
                                  key={idx}
                                  onClick={() => onShowDetail(s)}
                                  className={`relative flex flex-col items-center cursor-pointer group hover:z-10 transition-all text-center glass-card p-4 rounded-2xl bg-white/90 hover:ring-2 hover:ring-primary/20 hover:shadow-lg`}
                                >
                                  {/* Vertical connector from top bar */}
                                  <div className="absolute -top-3 left-1/2 w-0.5 h-3 bg-border -translate-x-1/2" />

                                  {/* ─ Level 3: Store Manager photo ─ */}
                                  <div className={`relative overflow-hidden border-2 border-emerald-200 bg-muted/30 h-20 w-20 rounded-2xl mb-2.5`}>
                                    {smImg ? (
                                      <Image src={smImg} alt={smName || storeName} fill className="object-cover group-hover:scale-105 transition-transform" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-50">
                                        <User className={`text-emerald-200 h-10 w-10`} />
                                      </div>
                                    )}
                                  </div>

                                  {/* ─ Level 3 label: SM Name ─ */}
                                  {smName ? (
                                    <p className={`font-black text-foreground group-hover:text-emerald-700 transition-colors leading-tight w-full truncate text-[0.72rem]`}>
                                      {smName}
                                    </p>
                                  ) : (
                                    <p className={`italic text-muted-foreground/50 w-full truncate text-[0.65rem]`}>— SM —</p>
                                  )}

                                  {/* SM Phone */}
                                  {(s["SM Phone"] || s["Mobile Phone"]) && (
                                    <div className={`flex items-center justify-center gap-0.5 text-emerald-600/80 mt-1`}>
                                      <Phone className={"h-2.5 w-2.5"} />
                                      <span className={`font-bold text-[0.58rem]`}>
                                        {formatPhone(s["SM Phone"] || s["Mobile Phone"])}
                                      </span>
                                    </div>
                                  )}

                                  {/* Divider */}
                                  <div className={`w-full border-t border-dashed border-border my-1.5`} />

                                  {/* ─ Level 4: Store Name ─ */}
                                  <div className={`flex items-center gap-1 w-full justify-start`}>
                                    <Building2 className={`flex-shrink-0 text-slate-400 h-3 w-3`} />
                                    <span className={`font-black text-slate-600 truncate leading-tight text-[0.65rem]`}>
                                      {storeName}
                                    </span>
                                  </div>

                                  {/* Position & Service Year */}
                                  {(s.position || s["Yr of Service in TL"]) && (
                                    <div className="w-full text-left mt-1 overflow-hidden">
                                      {s.position && (
                                        <p className={`text-slate-500 font-bold truncate text-[0.55rem]`}>
                                          {s.position}
                                        </p>
                                      )}
                                      {s["Yr of Service in TL"] && (
                                        <p className={`text-primary/70 font-black truncate text-[0.5rem] uppercase tracking-tighter`}>
                                          Exp: {s["Yr of Service in TL"]}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Store ID + Province */}
                                  <div className={`flex items-center justify-between w-full mt-1.5`}>
                                    <span className={`rounded bg-primary/10 text-primary font-black px-1 text-[0.55rem] py-0.5`}>
                                      #{s["Store ID"]}
                                    </span>
                                    {s["Province"] && (
                                      <div className="flex items-center gap-0.5 text-muted-foreground/60">
                                        <MapPin className="h-2.5 w-2.5" />
                                        <span className="text-[0.5rem] font-medium">{s["Province"]}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Empty state */}
        {Object.keys(filteredTree).length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 glass-card border-dashed border-2">
            <Search className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-base font-bold text-muted-foreground">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
          </div>
        )}
      </div>
    </div>
  )
}
