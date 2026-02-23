"use client"

import { useState, useEffect, useCallback, useSyncExternalStore } from "react"
import type { PageId, OrgRecord, AgmRecord } from "@/lib/types"
import {
  subscribe,
  getState,
  loadAllData,
  addRow,
  updateRow,
  deleteRow,
  saveAgm,
  deleteAgm,
  bulkImportOrg,
  getImageFromCache,
  uploadAndSaveImage,
} from "@/lib/store"
import { isConfigured } from "@/lib/google-apps-script"
import AppHeader from "@/components/app-header"
import Dashboard from "@/components/dashboard"
import OrgChart from "@/components/org-chart"
import AgmManager from "@/components/agm-manager"
import StoreManager from "@/components/store-manager"
import StoreDetailModal from "@/components/store-detail-modal"
import SettingsPanel from "@/components/settings-panel"
import MockSheet from "@/components/mock-sheet"
import ProvinceDetailModal from "@/components/province-detail-modal"
import LoginPage from "@/components/login-page"
import AppFooter from "@/components/app-footer"
import { Loader2, Settings, Wifi, WifiOff } from "lucide-react"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState<PageId | "sheet">("dash")
  const [detailStore, setDetailStore] = useState<OrgRecord | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [filteredOrgData, setFilteredOrgData] = useState<OrgRecord[]>([])

  const state = useSyncExternalStore(subscribe, getState, getState)
  const { orgData, agmData, loading, error, imageCache } = state

  // Load on mount
  useEffect(() => {
    setMounted(true)
    const auth = localStorage.getItem("lotus_auth")
    setIsAuthenticated(auth === "true")
    if (isConfigured()) {
      loadAllData()
    }
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem("lotus_auth")
    setIsAuthenticated(false)
    showToast("ออกจากระบบแล้ว")
  }, [])

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleRefresh = useCallback(async () => {
    await loadAllData()
    showToast("โหลดข้อมูลใหม่แล้ว")
  }, [])

  // CRUD Wrappers with loading + toast
  const handleAddRow = useCallback(async (row: OrgRecord) => {
    setActionLoading(true)
    try {
      await addRow(row)
      showToast("เพิ่มสาขาสำเร็จ")
    } catch { showToast("เพิ่มสาขาล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleUpdateRow = useCallback(async (idx: number, row: OrgRecord) => {
    setActionLoading(true)
    try {
      await updateRow(idx, row)
      showToast("บันทึกการแก้ไขแล้ว")
    } catch { showToast("แก้ไขล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleDeleteRow = useCallback(async (idx: number) => {
    setActionLoading(true)
    try {
      await deleteRow(idx)
      showToast("ลบสาขาสำเร็จ")
    } catch { showToast("ลบล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleSaveAgm = useCallback(async (row: AgmRecord) => {
    setActionLoading(true)
    try {
      await saveAgm(row)
      showToast("บันทึก AGM สำเร็จ")
    } catch { showToast("บันทึก AGM ล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleDeleteAgm = useCallback(async (name: string) => {
    setActionLoading(true)
    try {
      await deleteAgm(name)
      showToast("ลบ AGM สำเร็จ")
    } catch { showToast("ลบ AGM ล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  const handleBulkImport = useCallback(async (rows: OrgRecord[]) => {
    setActionLoading(true)
    try {
      await bulkImportOrg(rows)
      showToast(`นำเข้า ${rows.length} สาขาสำเร็จ`)
    } catch { showToast("นำเข้าข้อมูลล้มเหลว", "err") }
    setActionLoading(false)
  }, [])

  // Export handlers

  const handleExportPptx = useCallback(async () => {
    const PptxGenJS = (await import("pptxgenjs")).default
    const pptx = new PptxGenJS()
    pptx.layout = "LAYOUT_16x9"

    const exportData = filteredOrgData.length > 0 ? filteredOrgData : orgData
    const agmMap: Record<string, AgmRecord> = {}
    agmData.forEach((a) => { agmMap[a["AGM Name"]] = a })

    const groups: Record<string, { zone: string; stores: OrgRecord[] }> = {}
    exportData.forEach((r) => {
      const k = r["AGM Name"] || "N/A"
      if (!groups[k]) groups[k] = { zone: r["AGM ZONE"] || "", stores: [] }
      groups[k].stores.push(r)
    })

    // Helper: Resolve Base64
    const getBase64 = (url?: string) => {
      if (!url) return null
      if (url.startsWith("localdb://")) return imageCache[url.replace("localdb://", "")] || null
      if (url.startsWith("data:")) return url
      return null // We can't easily fetch external non-base64 without proxy
    }

    // Title slide
    const ts = pptx.addSlide()
    ts.background = { color: "1e40af" }
    ts.addText("Lotus's Thailand\nOperation Team Org-chart", {
      x: 0, y: 1.5, w: "100%", h: 2,
      fontSize: 36, fontFace: "Kanit", color: "FFFFFF", bold: true, align: "center",
    })
    ts.addText(`${exportData.length} Stores Found in ${Object.keys(groups).length} Area Managers`, {
      x: 0, y: 4, w: "100%", h: 0.5,
      fontSize: 16, fontFace: "Kanit", color: "e2e8f0", align: "center",
    })

    for (const [agmName, grp] of Object.entries(groups)) {
      const slide = pptx.addSlide()
      slide.background = { color: "F8FAFC" }

      // AGM Sidebar
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.2, y: 0.2, w: 2.4, h: 5.2,
        fill: { type: "solid", color: "1e40af" }, rectRadius: 0.1,
      })

      const agmRec = agmMap[agmName]
      const agmPic = getBase64(agmRec?.["Image URL"])
      if (agmPic) {
        slide.addImage({ data: agmPic, x: 0.6, y: 0.5, w: 1.6, h: 1.6, rounding: true })
      } else {
        slide.addShape(pptx.ShapeType.ellipse, { x: 0.6, y: 0.5, w: 1.6, h: 1.6, fill: { color: "3b82f6" } })
      }

      slide.addText("Area General Manager", {
        x: 0.2, y: 2.3, w: 2.4, h: 0.3,
        fontSize: 9, fontFace: "Kanit", color: "FFFFFF", bold: true, align: "center",
      })
      slide.addText(agmName, {
        x: 0.3, y: 2.7, w: 2.2, h: 0.6,
        fontSize: 14, fontFace: "Kanit", color: "FFFFFF", bold: true, align: "center", valign: "middle",
      })
      slide.addText(grp.zone, {
        x: 0.3, y: 3.3, w: 2.2, h: 0.3,
        fontSize: 10, fontFace: "Kanit", color: "e2e8f0", align: "center",
      })

      // Stores Grid
      const stores = grp.stores
      const cols = 5
      const cardW = 1.35
      const cardH = 1.6
      const startX = 2.8
      const startY = 0.2

      stores.forEach((s, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = startX + col * (cardW + 0.1)
        const y = startY + row * (cardH + 0.1)

        // Only draw if within slide bounds (rough check for 16:9)
        if (y + cardH > 5.6) return

        slide.addShape(pptx.ShapeType.roundRect, {
          x, y, w: cardW, h: cardH,
          fill: { type: "solid", color: "FFFFFF" },
          line: { color: "e2e8f0", width: 1 }, rectRadius: 0.05,
        })

        const smPic = getBase64(s["Image URL"])
        if (smPic) {
          slide.addImage({ data: smPic, x: x + 0.35, y: y + 0.1, w: 0.65, h: 0.65, rounding: true })
        }

        slide.addText(s["Store Manager Name"] || "N/A", {
          x: x + 0.05, y: y + 0.8, w: cardW - 0.1, h: 0.2,
          fontSize: 8, fontFace: "Kanit", color: "0f172a", bold: true, align: "center",
        })
        slide.addText(s.position || "Manager", {
          x: x + 0.05, y: y + 1.0, w: cardW - 0.1, h: 0.15,
          fontSize: 6, fontFace: "Kanit", color: "64748b", align: "center",
        })
        slide.addText(s["Store Name Thai"] || "", {
          x: x + 0.05, y: y + 1.2, w: cardW - 0.1, h: 0.2,
          fontSize: 7, fontFace: "Kanit", color: "1e40af", bold: true, align: "center", shrinkText: true,
        })
        slide.addText(`#${s["Store ID"]}`, {
          x: x + 0.05, y: y + 1.4, w: cardW - 0.1, h: 0.15,
          fontSize: 6, fontFace: "Kanit", color: "f59e0b", bold: true, align: "center",
        })
      })
    }

    await pptx.writeFile({ fileName: `Lotus_OrgChart_Export_${new Date().toISOString().slice(0, 10)}.pptx` })
  }, [orgData, agmData, filteredOrgData, imageCache])

  if (!mounted || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />
  }

  const connected = isConfigured()

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <AppHeader
        activePage={page as PageId}
        onNavigate={(p) => setPage(p as PageId | "sheet")}
        onOpenSheet={() => setPage("sheet")}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
        connected={connected}
      />

      <main className="flex-1 mx-auto w-full max-w-[1440px] px-5 py-8">
        {/* Connection banner when not configured */}
        {!connected && (
          <div className="mb-8 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-accent bg-accent/5 p-12 text-center animate-in fade-in zoom-in duration-500">
            <WifiOff className="h-16 w-16 text-accent animate-pulse" />
            <div className="max-w-md">
              <h3 className="text-2xl font-black text-foreground">ระบบจำลองฐานข้อมูล (Internal Mode)</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                เข้าถึงและจัดการข้อมูลทีมงานผ่านระบบจำลองภายใน Browser ข้อมูลทั้งหมดจะถูกบันทึกไว้อย่างปลอดภัยลบนเครื่องของคุณ
              </p>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white premium-button shadow-xl shadow-primary/20"
            >
              <Settings className="h-5 w-5" />
              จัดการข้อมูลระบบ
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && connected && (
          <div className="flex flex-col items-center justify-center gap-4 py-32 animate-in fade-in">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-base font-bold text-primary tracking-wide">กำลังประมวลผลข้อมูลทางสถิติ...</p>
          </div>
        )}

        {/* Error state */}
        {error && connected && !loading && (
          <div className="mb-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-6 border-l-4 border-l-destructive">
            <p className="text-sm font-bold text-destructive flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive animate-ping" />
              เกิดข้อผิดพลาด: {error}
            </p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => loadAllData()} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm">
                ลองอีกครั้ง
              </button>
              <button onClick={() => setSettingsOpen(true)} className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-muted-foreground">
                ตั้งค่า
              </button>
            </div>
          </div>
        )}

        {/* Content Views */}
        {(!loading || !connected) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {page === "dash" && (
              <Dashboard
                orgData={orgData}
                agmData={agmData}
                imageCache={imageCache}
                onNavigate={(p) => setPage(p as PageId)}
                onOpenSheet={() => setPage("sheet")}
                onShowProvinceDetail={setSelectedProvince}
                connected={connected}
              />
            )}

            {page === "org" && (
              <div id="org-export-target">
                <OrgChart
                  orgData={orgData}
                  agmData={agmData}
                  imageCache={imageCache}
                  onEditAgm={() => setPage("agm")}
                  onShowDetail={setDetailStore}
                  onExportPptx={handleExportPptx}
                  onFilteredDataChange={setFilteredOrgData}
                />
              </div>
            )}

            {page === "agm" && (
              <AgmManager
                agmData={agmData}
                imageCache={imageCache}
                onSave={handleSaveAgm}
                onDelete={handleDeleteAgm}
                onRefresh={handleRefresh}
                actionLoading={actionLoading}
              />
            )}

            {page === "data" && (
              <StoreManager
                orgData={orgData}
                agmData={agmData}
                imageCache={imageCache}
                onAdd={handleAddRow}
                onUpdate={handleUpdateRow}
                onDelete={handleDeleteRow}
                onBulkImport={handleBulkImport}
                onRefresh={handleRefresh}
                actionLoading={actionLoading}
              />
            )}

            {page === "sheet" && (
              <MockSheet
                orgData={orgData}
                agmData={agmData}
                onUpdateOrg={handleUpdateRow}
                onAddOrg={handleAddRow}
                onDeleteOrg={handleDeleteRow}
                onUpdateAgm={handleSaveAgm}
                onDeleteAgm={handleDeleteAgm}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer with Group Image */}
      <AppFooter />

      {/* Overlays & Modals */}
      {detailStore && <StoreDetailModal store={detailStore} imageCache={imageCache} onClose={() => setDetailStore(null)} />}
      {selectedProvince && (
        <ProvinceDetailModal
          province={selectedProvince}
          orgData={orgData}
          agmData={agmData}
          imageCache={imageCache}
          onClose={() => setSelectedProvince(null)}
        />
      )}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onSave={() => loadAllData()} />

      {toast && (
        <div className={`fixed bottom-10 right-10 z-[999] max-w-xs animate-in slide-in-from-bottom-6 rounded-2xl px-6 py-4 text-sm font-bold text-white shadow-2xl ${toast.type === "ok" ? "bg-primary border-b-4 border-primary/30" : "bg-destructive border-b-4 border-destructive/30"}`}>
          {toast.msg}
        </div>
      )}

      {actionLoading && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in">
          <div className="flex flex-col items-center gap-4 p-8 glass-card">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-base font-black text-primary animate-pulse">กำลังบันทึกข้อมูล...</p>
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-center text-[0.65rem] font-bold tracking-widest uppercase ${connected ? "bg-primary/90 text-white" : "bg-slate-900 text-slate-400"} backdrop-blur-sm`}>
        {connected ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Local Database Active</span>
            <span className="mx-2 opacity-30">|</span>
            <span className="text-secondary">{orgData.length} stores mapped</span>
            <span className="mx-2 opacity-30">|</span>
            <span className="text-accent">{agmData.length} AGM monitored</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline Simulation Mode</span>
            <span className="mx-2 opacity-30">|</span>
            <button onClick={() => setSettingsOpen(true)} className="underline hover:text-white transition-colors">Emergency DB Setup</button>
          </>
        )}
      </div>
    </div>
  )
}

