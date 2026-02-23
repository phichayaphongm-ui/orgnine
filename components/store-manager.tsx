"use client"

import { useState, useMemo } from "react"
import type { OrgRecord, AgmRecord } from "@/lib/types"
import {
  Building2,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  Search,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  ChevronRight,
  Filter,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  User,
} from "lucide-react"
import { uploadAndSaveImage } from "@/lib/store"
import Image from "next/image"

interface StoreManagerProps {
  orgData: OrgRecord[]
  agmData: AgmRecord[]
  imageCache: Record<string, string>
  onAdd: (row: OrgRecord) => Promise<void>
  onUpdate: (idx: number, row: OrgRecord) => Promise<void>
  onDelete: (idx: number) => Promise<void>
  onBulkImport: (rows: OrgRecord[]) => Promise<void>
  onRefresh: () => Promise<void>
  actionLoading: boolean
}

export default function StoreManager({
  orgData,
  agmData,
  imageCache,
  onAdd,
  onUpdate,
  onDelete,
  onBulkImport,
  onRefresh,
  actionLoading,
}: StoreManagerProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editingRow, setEditingRow] = useState<OrgRecord | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAgm, setSelectedAgm] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isNew, setIsNew] = useState(false)

  const [pageSize, setPageSize] = useState(50)

  const filteredStores = useMemo(() => {
    return orgData.filter(s => {
      // 1. AGM Filter
      if (selectedAgm !== "all" && s["AGM Name"] !== selectedAgm) return false

      // 2. Search Term
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      const sid = String(s["Store ID"] || "").toLowerCase()
      const sthair = String(s["Store Name Thai"] || "").toLowerCase()
      const seng = String(s["Store Name"] || "").toLowerCase()
      const agm = String(s["AGM Name"] || "").toLowerCase()

      return sid.includes(search) || sthair.includes(search) || seng.includes(search) || agm.includes(search)
    })
  }, [orgData, searchTerm, selectedAgm])

  const getImg = (url?: string) => {
    if (!url) return null
    return url.startsWith("localdb://") ? imageCache[url.replace("localdb://", "")] || null : url
  }

  const visibleStores = useMemo(() => {
    return filteredStores.slice(0, pageSize)
  }, [filteredStores, pageSize])

  const openEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditingRow({ ...orgData[idx] })
    setIsNew(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editingRow) return
    const file = e.target.files[0]
    try {
      const refId = editingRow["Store ID"] || "new-store"
      const { url } = await uploadAndSaveImage(file, refId, "store")
      setEditingRow({ ...editingRow, "Image URL": url })
    } catch (err) {
      alert("Error uploading image")
    }
  }

  const openNew = () => {
    setEditingRow({
      "Store ID": "",
      "Location Code": "",
      "Store Name": "",
      "Store Name Thai": "",
      "AGM Name": agmData[0]?.["AGM Name"] || "",
      "AGM ZONE": agmData[0]?.["AGM ZONE"] || "",
      "GPM Name": "",
      "Store Manager Name": "",
      position: "",
      "Province": "",
      "SM Phone": "",
      "Store Phone": "",
      "Mobile Phone": "",
      "Yr of Service in TL": "",
      "Service in Position": "",
      "Image URL": "",
    })
    setIsNew(true)
  }

  const handleSave = async () => {
    if (!editingRow) return
    if (isNew) {
      await onAdd(editingRow)
    } else if (editingIdx !== null) {
      await onUpdate(editingIdx, editingRow)
    }
    setEditingRow(null)
    setEditingIdx(null)
  }


  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Main Controls */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">จัดการข้อมูลสาขา</h2>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">Store & personnel Management</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white shadow-xl shadow-primary/20 premium-button"
          >
            <Plus className="h-4 w-4" />
            เพิ่มสาขาใหม่
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="glass-card flex flex-col gap-4 p-5 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหารหัสสาขา / ชื่อสาขา / AGM..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border-none bg-white py-3 pl-11 pr-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <select
              value={selectedAgm}
              onChange={e => setSelectedAgm(e.target.value)}
              className="rounded-2xl border-none bg-white py-3 pl-4 pr-10 text-sm font-bold shadow-sm appearance-none focus:ring-2 focus:ring-primary/20 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.2em_1.2em] bg-[right_0.75rem_center] bg-no-repeat"
            >
              <option value="all">ทุก AGM</option>
              {[...new Set(orgData.map(s => s["AGM Name"]).filter(Boolean))].sort().map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-border text-muted-foreground transition-all hover:text-primary ${isRefreshing ? "bg-primary/5" : ""}`}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
          <div className="flex items-center gap-2 rounded-2xl bg-secondary/50 px-5 py-2.5">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-black text-primary uppercase tracking-widest">{filteredStores.length} Stores Found</span>
          </div>
        </div>
      </div>

      {/* Store Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleStores.map((s, i) => (
          <div key={i} className="glass-card group flex flex-col p-5 hover-lift bg-white/70">
            <div className="flex items-start justify-between">
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-widest text-primary">
                {s["Store ID"]}
              </span>
              <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    const idx = orgData.findIndex(x => x["Store ID"] === s["Store ID"])
                    if (idx >= 0) openEdit(idx)
                  }}
                  className="p-2 rounded-lg bg-secondary text-primary hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-2 px-3"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span className="text-[0.65rem] font-black uppercase">แก้ไข</span>
                </button>
              </div>
            </div>

            <div className="mt-4 flex-1 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl border-2 border-primary/10 overflow-hidden flex-shrink-0 bg-muted">
                {getImg(s["Image URL"]) ? (
                  <Image src={getImg(s["Image URL"])!} alt="SM" width={48} height={48} className="object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-primary/30">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-foreground truncate">{s["Store Name Thai"] || s["Store Name"]}</h4>
                <div className="mt-0.5 flex flex-col">
                  <p className="text-[0.6rem] font-black text-primary/60 uppercase tracking-tighter truncate">Manager: {s["Store Manager Name"] || "N/A"}</p>
                  <p className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-widest truncate">{s["AGM Name"]}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-dashed border-border pt-4">
              <div className="flex items-center justify-between text-[0.65rem]">
                <span className="font-bold text-muted-foreground">ตำแหน่ง:</span>
                <span className="font-black text-primary">{s.position || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between text-[0.65rem] mt-1">
                <span className="font-bold text-muted-foreground">อายุงาน:</span>
                <span className="font-black text-slate-500">{s["Yr of Service in TL"] || "N/A"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {pageSize < filteredStores.length && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => setPageSize(prev => prev + 50)}
            className="flex items-center gap-2 rounded-2xl bg-white border border-border px-8 py-4 text-sm font-black text-primary hover:bg-primary hover:text-white transition-all shadow-xl shadow-primary/5 active:scale-95"
          >
            แสดงข้อมูลเพิ่ม (+50 สาขา)
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setEditingRow(null)} />
          <div className="relative w-full max-w-2xl glass-card p-6 md:p-10 shadow-4xl animate-in zoom-in-95 duration-300 flex flex-col bg-white">
            <h3 className="text-lg md:text-xl font-black text-foreground mb-6 md:mb-8 text-center uppercase tracking-widest">
              {isNew ? "เพิ่มข้อมูลสาขาใหม่" : "แก้ไขข้อมูลสาขา"}
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-h-[65vh] overflow-y-auto pr-2 px-1">
              {/* Image Upload Section */}
              <div className="md:col-span-2 flex flex-col items-center gap-4 py-6 bg-muted/30 rounded-3xl border border-dashed border-border mb-4">
                <div className="relative h-32 w-32 overflow-hidden rounded-3xl shadow-premium ring-4 ring-primary/10 bg-white">
                  {getImg(editingRow["Image URL"]) ? (
                    <Image src={getImg(editingRow["Image URL"])!} alt="Preview" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <ImageIcon className="h-10 w-10 text-muted-foreground opacity-20" />
                    </div>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                    <Camera className="h-8 w-8 text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
                <div className="text-center">
                  <p className="text-[0.65rem] font-black uppercase text-primary tracking-widest leading-none">รูปถ่ายผู้จัดการสาขา</p>
                  <p className="text-[0.55rem] font-bold text-muted-foreground uppercase mt-1.5 tracking-tight">คลิกที่รูปเพื่ออัปโหลด (JPG/PNG)</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">Store ID</label>
                  <input
                    type="text"
                    value={editingRow["Store ID"]}
                    onChange={e => setEditingRow({ ...editingRow, "Store ID": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">ชื่อสาขา (Thai)</label>
                  <input
                    type="text"
                    value={editingRow["Store Name Thai"]}
                    onChange={e => setEditingRow({ ...editingRow, "Store Name Thai": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">ชื่อสาขา (Eng)</label>
                  <input
                    type="text"
                    value={editingRow["Store Name"]}
                    onChange={e => setEditingRow({ ...editingRow, "Store Name": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">Store Manager</label>
                  <input
                    type="text"
                    value={(editingRow as any)["Store Manager Name"] || ""}
                    onChange={e => setEditingRow({ ...editingRow, "Store Manager Name": e.target.value } as any)}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                    placeholder="ชื่อผู้จัดการสาขา"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">AGM ผู้ดูแล</label>
                  <select
                    value={editingRow["AGM Name"]}
                    onChange={e => {
                      const a = agmData.find(x => x["AGM Name"] === e.target.value)
                      setEditingRow({ ...editingRow, "AGM Name": e.target.value, "AGM ZONE": a?.["AGM ZONE"] || "" })
                    }}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner appearance-none"
                  >
                    {agmData.map(a => <option key={a["AGM Name"]} value={a["AGM Name"]}>{a["AGM Name"]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">ตำแหน่ง (Position)</label>
                  <input
                    type="text"
                    value={editingRow.position}
                    onChange={e => setEditingRow({ ...editingRow, position: e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">จังหวัด</label>
                  <input
                    type="text"
                    value={editingRow["Province"]}
                    onChange={e => setEditingRow({ ...editingRow, "Province": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">SM Phone</label>
                  <input
                    type="text"
                    value={editingRow["SM Phone"]}
                    onChange={e => setEditingRow({ ...editingRow, "SM Phone": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                    placeholder="000-000-0000"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">Store Phone</label>
                  <input
                    type="text"
                    value={editingRow["Store Phone"]}
                    onChange={e => setEditingRow({ ...editingRow, "Store Phone": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                    placeholder="00-000-0000"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground ml-2">อายุงาน (Yr of Service)</label>
                  <input
                    type="text"
                    value={editingRow["Yr of Service in TL"]}
                    onChange={e => setEditingRow({ ...editingRow, "Yr of Service in TL": e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button
                onClick={() => setEditingRow(null)}
                className="flex-1 rounded-2xl py-4 text-sm font-black text-muted-foreground hover:bg-muted transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading || !editingRow["Store ID"]}
                className="flex-1 rounded-2xl bg-primary py-4 text-sm font-black text-white shadow-xl shadow-primary/20 premium-button disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredStores.length === 0 && !isRefreshing && (
        <div className="flex flex-col items-center justify-center py-32 glass-card border-dashed">
          <Building2 className="h-12 w-12 text-muted-foreground opacity-20" />
          <p className="mt-4 text-base font-bold text-muted-foreground">ไม่พบข้อมูลสาขาที่ค้นหา</p>
        </div>
      )}
    </div>
  )
}
