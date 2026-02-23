"use client"

import { useState, useMemo } from "react"
import type { OrgRecord, AgmRecord } from "@/lib/types"
import { Database, Plus, Trash2, Save, X, Search, FileSpreadsheet, CloudSync, Loader2 } from "lucide-react"
import { isConfigured, bulkImportToGas } from "@/lib/google-apps-script"
import { toast } from "sonner"
import { formatPhone } from "@/lib/utils"

interface MockSheetProps {
    orgData: OrgRecord[]
    agmData: AgmRecord[]
    onUpdateOrg: (idx: number, row: OrgRecord) => void
    onAddOrg: (row: OrgRecord) => void
    onDeleteOrg: (idx: number) => void
    onUpdateAgm: (row: AgmRecord) => void
    onDeleteAgm: (name: string) => void
}

export default function MockSheet({
    orgData,
    agmData,
    onUpdateOrg,
    onAddOrg,
    onDeleteOrg,
    onUpdateAgm,
    onDeleteAgm
}: MockSheetProps) {
    const [activeTab, setActiveTab] = useState<"org" | "agm">("org")
    const [searchTerm, setSearchTerm] = useState("")

    const filteredOrg = orgData.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const filteredAgm = agmData.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] glass-card overflow-hidden">
            {/* Tab Switcher & Toolbar */}
            <div className="flex items-center justify-between border-b px-6 py-4 bg-secondary/30">
                <div className="flex bg-muted p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab("org")}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "org" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        ORG DATA
                    </button>
                    <button
                        onClick={() => setActiveTab("agm")}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "agm" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        AGM DATA
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="ค้นหาข้อมูล..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-xl border-none bg-white/50 text-sm focus:ring-2 focus:ring-primary/20 w-64"
                        />
                    </div>

                    {isConfigured() && (
                        <button
                            onClick={async () => {
                                if (!confirm("คุณต้องการส่งข้อมูลทั้งหมดไปที่ Google Sheets ใช่หรือไม่?")) return
                                try {
                                    await bulkImportToGas(orgData)
                                    toast.success("Sync ข้อมูลสำเร็จ")
                                } catch (err) {
                                    toast.error("Sync ล้มเหลว")
                                }
                            }}
                            className="flex items-center gap-2 rounded-xl bg-[#2ec4a9] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#28ad95] transition-all active:scale-95"
                        >
                            <CloudSync className="h-4 w-4" />
                            Sync to Cloud
                        </button>
                    )}

                    <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 text-sm font-bold shadow-sm hover:bg-emerald-100 transition-all active:scale-95">
                        <FileSpreadsheet className="h-4 w-4" />
                        เชื่อมโยง Excel
                        <input
                            type="file"
                            className="hidden"
                            accept=".xlsx, .xls, .csv"
                            onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                try {
                                    const { importExcelData } = await import("@/lib/store")
                                    const count = await importExcelData(file)
                                    alert(`เชื่อมโยงข้อมูลสำเร็จ ${count} รายการ`)
                                } catch (err) {
                                    alert("เชื่อมโยงล้มเหลว: " + (err instanceof Error ? err.message : String(err)))
                                }
                            }}
                        />
                    </label>
                    <button
                        onClick={() => {
                            if (activeTab === "org") {
                                onAddOrg({
                                    "Store ID": "New",
                                    "Location Code": "",
                                    "Store Name Thai": "",
                                    "AGM Name": "",
                                    "AGM ZONE": "",
                                    "Store Name": "",
                                    "GPM Name": "",
                                    "Store Manager Name": "",
                                    "Province": "",
                                    "SM Phone": "",
                                    "Store Phone": "",
                                    position: "",
                                    "Yr of Service in TL": "",
                                    "Service in Position": "",
                                    "Mobile Phone": "",
                                    "Image URL": ""
                                })
                            }
                        }}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:shadow-lg transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4" /> เพิ่มแถว
                    </button>
                </div>
            </div>

            {/* Spreadsheet Grid */}
            <div className="flex-1 overflow-auto bg-white/50">
                <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md">
                        <tr>
                            <th className="px-4 py-3 border text-left bg-muted w-10">#</th>
                            {activeTab === "org" ? (
                                <>
                                    {["Store ID", "Location Code", "Group", "Zone", "Store Name", "Province", "Manager", "GPM", "Yr Serv", "Mobile"].map(h => (
                                        <th key={h} className="px-4 py-3 border text-left font-semibold text-primary/80 whitespace-nowrap">{h}</th>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {["AGM Name", "AGM ZONE", "Mobile Phone", "Email", "Remark"].map(h => (
                                        <th key={h} className="px-4 py-3 border text-left font-semibold text-primary/80 whitespace-nowrap">{h}</th>
                                    ))}
                                </>
                            )}
                            <th className="px-4 py-3 border text-center w-20">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === "org" ? (
                            filteredOrg.map((row, idx) => (
                                <tr key={idx} className="hover:bg-primary/5 group transition-colors">
                                    <td className="px-4 py-2 border text-center text-muted-foreground font-mono bg-muted/20">{idx + 1}</td>
                                    <Cell value={row["Store ID"]} onSave={(v) => onUpdateOrg(idx, { ...row, "Store ID": v })} />
                                    <Cell value={row["Location Code"]} onSave={(v) => onUpdateOrg(idx, { ...row, "Location Code": v })} />
                                    <Cell value={row["Store Name Thai"]} onSave={(v) => onUpdateOrg(idx, { ...row, "Store Name Thai": v })} />
                                    <Cell value={row["AGM Name"]} onSave={(v) => onUpdateOrg(idx, { ...row, "AGM Name": v })} />
                                    <Cell value={row["AGM ZONE"]} onSave={(v) => onUpdateOrg(idx, { ...row, "AGM ZONE": v })} />
                                    <Cell value={row["Store Name"]} onSave={(v) => onUpdateOrg(idx, { ...row, "Store Name": v })} />
                                    <Cell value={row["Province"]} onSave={(v) => onUpdateOrg(idx, { ...row, "Province": v })} />
                                    <Cell value={row["Store Manager Name"]} onSave={(v) => onUpdateOrg(idx, { ...row, "Store Manager Name": v })} />
                                    <Cell value={row["GPM Name"]} onSave={(v) => onUpdateOrg(idx, { ...row, "GPM Name": v })} />
                                    <Cell value={row["Yr of Service in TL"]} onSave={(v) => onUpdateOrg(idx, { ...row, "Yr of Service in TL": v })} />
                                    <Cell isPhone value={row["Mobile Phone"]} onSave={(v) => onUpdateOrg(idx, { ...row, "Mobile Phone": v })} />
                                    <td className="px-4 py-2 border text-center">
                                        <button onClick={() => onDeleteOrg(idx)} className="p-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded-lg">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            filteredAgm.map((row, idx) => (
                                <tr key={idx} className="hover:bg-primary/5 group transition-colors">
                                    <td className="px-4 py-2 border text-center text-muted-foreground font-mono bg-muted/20">{idx + 1}</td>
                                    <Cell value={row["AGM Name"]} onSave={(v) => onUpdateAgm({ ...row, "AGM Name": v })} />
                                    <Cell value={row["AGM ZONE"]} onSave={(v) => onUpdateAgm({ ...row, "AGM ZONE": v })} />
                                    <Cell isPhone value={row["Mobile Phone"]} onSave={(v) => onUpdateAgm({ ...row, "Mobile Phone": v })} />
                                    <Cell value={row.Email} onSave={(v) => onUpdateAgm({ ...row, Email: v })} />
                                    <Cell value={row.Remark} onSave={(v) => onUpdateAgm({ ...row, Remark: v })} />
                                    <td className="px-4 py-2 border text-center">
                                        <button onClick={() => onDeleteAgm(row["AGM Name"])} className="p-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded-lg">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function Cell({ value, onSave, isPhone }: { value: string; onSave: (v: string) => void; isPhone?: boolean }) {
    const [editing, setEditing] = useState(false)
    const [localValue, setLocalValue] = useState(value)

    if (editing) {
        return (
            <td className="p-0 border focus-within:ring-2 focus-within:ring-primary/40 relative z-10">
                <input
                    autoFocus
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={() => {
                        setEditing(false)
                        onSave(localValue)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            setEditing(false)
                            onSave(localValue)
                        }
                        if (e.key === "Escape") {
                            setEditing(false)
                            setLocalValue(value)
                        }
                    }}
                    className="w-full h-full px-4 py-2 bg-white outline-none font-medium"
                />
            </td>
        )
    }

    return (
        <td
            onDoubleClick={() => setEditing(true)}
            className="px-4 py-2 border cursor-text whitespace-nowrap min-w-[120px]"
        >
            <span className={!value ? "text-muted-foreground italic text-xs" : ""}>
                {isPhone ? formatPhone(value) : (value || "(ว่าง)")}
            </span>
        </td>
    )
}
