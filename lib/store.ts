import type { OrgRecord, AgmRecord } from "./types"
import * as XLSX from "xlsx"
import {
  isConfigured,
  fetchOrgData,
  fetchAgmData,
  addOrgRow,
  updateOrgRow,
  deleteOrgRow,
  saveAgmRow,
  deleteAgmRow,
  uploadImage,
  getImageBase64,
  OrgRow as ApiOrgRow,
  AgmRow as ApiAgmRow
} from "./google-apps-script"

// ========== Reactive state with listeners ==========
let state = {
  orgData: [] as OrgRecord[],
  agmData: [] as AgmRecord[],
  loading: true,
  error: null as string | null,
  imageCache: {} as Record<string, string>,
}

let listeners: (() => void)[] = []

function updateState(patch: Partial<typeof state>) {
  state = { ...state, ...patch }
  notify()
}

function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribe(fn: () => void) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function getState() {
  return state
}

// ========== Load data (Internal Local Storage) ==========
export async function loadAllData() {
  if (!isConfigured()) {
    updateState({
      loading: false,
      error: "ระบบยังไม่พร้อมทำงาน"
    })
    return
  }

  updateState({
    loading: true,
    error: null
  })

  try {
    const [orgResult, agmResult] = await Promise.all([
      fetchOrgData(),
      fetchAgmData(),
    ])

    const orgData = orgResult.map((r) => ({
      "Store ID": r["Store ID"] || "",
      "Location Code": r["Location Code"] || "",
      "Store Name Thai": r["Store Name Thai"] || "",
      "Store Name": r["Store Name"] || "",
      "AGM Name": r["AGM Name"] || "",
      "AGM ZONE": r["AGM ZONE"] || "",
      "GPM Name": (r as any)["GPM Name"] || "",
      "Store Manager Name": (r as any)["Store Manager Name"] || "",
      position: (r as any).position || (r as any).Position || "",
      "Province": (r as any)["Province"] || "",
      "SM Phone": (r as any)["SM Phone"] || r["Mobile Phone"] || "",
      "Store Phone": (r as any)["Store Phone"] || "",
      "Mobile Phone": r["Mobile Phone"] || "",
      "Yr of Service in TL": r["Yr of Service in TL"] || "",
      "Service in Position": r["Service in Position"] || "",
      "Image URL": r["Image URL"] || "",
      _imageFileId: r._imageFileId || "",
    }))

    const agmData = agmResult.map((r) => ({
      "AGM Name": r["AGM Name"] || "",
      "AGM ZONE": r["AGM ZONE"] || "",
      "Mobile Phone": r["Mobile Phone"] || "",
      Email: r.Email || "",
      "Image URL": r["Image URL"] || "",
      Remark: r.Remark || "",
      _imageFileId: r._imageFileId || "",
    }))

    updateState({
      orgData,
      agmData,
      loading: false,
      error: null
    })

    // Lazy-load images
    lazyLoadImages()
  } catch (err) {
    updateState({
      loading: false,
      error: err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลได้"
    })
  }
}

// ========== Lazy image loading ==========
async function lazyLoadImages() {
  const allFileIds: { id: string; type: "org" | "agm"; key: string }[] = []
  const { orgData, agmData, imageCache } = state

  orgData.forEach((r, i) => {
    if (r._imageFileId && !imageCache[r._imageFileId]) {
      allFileIds.push({ id: r._imageFileId, type: "org", key: `org-${i}` })
    }
  })

  agmData.forEach((r) => {
    if (r._imageFileId && !imageCache[r._imageFileId]) {
      allFileIds.push({ id: r._imageFileId, type: "agm", key: `agm-${r["AGM Name"]}` })
    }
  })

  // Load images in parallel batches of 5
  for (let i = 0; i < allFileIds.length; i += 5) {
    const batch = allFileIds.slice(i, i + 5)
    const results = await Promise.allSettled(
      batch.map((item) => getImageBase64(item.id))
    )

    const newCache = { ...state.imageCache }
    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value.success && result.value.base64) {
        newCache[batch[idx].id] = result.value.base64
      }
    })

    updateState({ imageCache: newCache })
  }
}

export function getImageFromCache(fileId: string): string {
  return state.imageCache[fileId] || ""
}

// ========== CRUD Operations ==========
export async function addRow(row: OrgRecord) {
  await addOrgRow(row as unknown as ApiOrgRow)
  await loadAllData()
}

export async function updateRow(index: number, row: OrgRecord) {
  await updateOrgRow(index, row as unknown as ApiOrgRow)
  await loadAllData()
}

export async function deleteRow(index: number) {
  await deleteOrgRow(index)
  await loadAllData()
}

export async function saveAgm(row: AgmRecord) {
  await saveAgmRow(row as unknown as ApiAgmRow)
  await loadAllData()
}

export async function deleteAgm(name: string) {
  await deleteAgmRow(name)
  await loadAllData()
}

export async function uploadAndSaveImage(
  source: string | File,
  refId: string,
  imageType: "agm" | "store"
): Promise<{ url: string; base64: string }> {
  let base64Data = ""
  let filename = `${imageType}-${refId}-${Date.now()}.jpg`

  if (source instanceof File) {
    const { resizeImage } = await import("./image-utils")
    base64Data = await resizeImage(source, 300, 300, 0.6)
    filename = source.name
  } else {
    base64Data = source
  }

  const result = await uploadImage(base64Data, filename, refId, imageType)
  if (!result.success) throw new Error("Upload failed")

  // Update local state immediately for preview
  if (imageType === "store") {
    const idx = state.orgData.findIndex(r => r["Store ID"] === refId)
    if (idx >= 0) setLocalOrgImage(idx, base64Data)
  } else {
    setLocalAgmImage(refId, base64Data)
  }

  return { url: result.url || base64Data, base64: base64Data }
}

// ========== Bulk import ==========
export async function bulkImportOrg(rows: OrgRecord[]) {
  // Use a batch process for large imports
  for (const row of rows) {
    await addOrgRow(row as unknown as ApiOrgRow)
  }
  await loadAllData()
}

// ========== Excel Integration ==========
export async function importExcelData(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary" })

        // We'll process all sheets that look like they contain store data
        let allImportedRows: OrgRecord[] = []

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

          const mappedRows: OrgRecord[] = jsonData.map(row => ({
            "Store ID": String(row["Store ID"] || ""),
            "Location Code": String(row["Location Code"] || ""),
            "Store Name Thai": String(row["Store Name Thai"] || row["Store Name"] || row["Store Name - ENG"] || ""),
            "Store Name": String(row["Store Name - ENG"] || row["Store Name"] || ""),
            "AGM Name": String(row["AGM - Name"] || row["AGM Name"] || ""),
            "AGM ZONE": String(row["Region"] || row["AGM ZONE"] || row[" AGM ZONE"] || ""),
            "GPM Name": String(row["GPM - Name"] || row["GPM Name"] || ""),
            "Store Manager Name": String(row["Store Manager - Name"] || row["Store Manager Name"] || ""),
            position: String(row["Position"] || row["position"] || ""),
            "Province": String(row["Province"] || row["จังหวัด"] || ""),
            "SM Phone": String(row["SM - Tel."] || row["SM Phone"] || ""),
            "Store Phone": String(row["Tel."] || row["Store Phone"] || ""),
            "Mobile Phone": String(row["SM - Tel."] || row["Tel."] || row["Mobile Phone"] || ""),
            "Yr of Service in TL": String(row["Yr of Service in TL"] || ""),
            "Service in Position": String(row["Service in Position"] || ""),
            "Image URL": row["Image URL"] || "",
          })).filter(r => r["Store ID"] && r["Store ID"] !== "undefined" && r["Store ID"] !== "NaN")

          allImportedRows = [...allImportedRows, ...mappedRows]
        })

        if (allImportedRows.length > 0) {
          await bulkImportOrg(allImportedRows)
        }

        resolve(allImportedRows.length)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (err) => reject(err)
    reader.readAsBinaryString(file)
  })
}

// For local image updates (before upload)
export function setLocalOrgImage(index: number, base64: string) {
  const newOrgData = [...state.orgData]
  if (newOrgData[index]) {
    newOrgData[index] = { ...newOrgData[index], _localImage: base64 }
    updateState({ orgData: newOrgData })
  }
}

export function setLocalAgmImage(name: string, base64: string) {
  const newAgmData = [...state.agmData]
  const idx = newAgmData.findIndex((r) => r["AGM Name"] === name)
  if (idx >= 0) {
    newAgmData[idx] = { ...newAgmData[idx], _localImage: base64 }
    updateState({ agmData: newAgmData })
  }
}


