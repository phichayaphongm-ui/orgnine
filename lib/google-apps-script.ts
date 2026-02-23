import { storageService } from "./storage-service"
import { resizeImage } from "./image-utils"
import { toast } from "sonner"

const SETTINGS_KEY = "ORG_CHART_SETTINGS"
const SECURITY_TOKEN = "Lotus2026_Secure_Personnel_Portal"

export interface OrgRow {
  "Store ID": string
  "Location Code": string
  "Store Name Thai": string
  "Store Name": string
  "AGM Name": string
  "AGM ZONE": string
  "GPM Name"?: string
  "Store Manager Name"?: string
  position: string
  "Province"?: string
  "SM Phone"?: string
  "Store Phone"?: string
  "Mobile Phone": string
  "Yr of Service in TL": string
  "Service in Position": string
  "Image URL": string
  _imageFileId?: string
}

export interface AgmRow {
  "AGM Name": string
  "AGM ZONE": string
  "Mobile Phone": string
  Email: string
  "Image URL": string
  Remark: string
  _imageFileId?: string
}

export function getSettings() {
  if (typeof window === "undefined") return { webAppUrl: process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "" }

  // Prioritize Environment Variable (for security and Vercel deployment)
  const envUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL
  if (envUrl) return { webAppUrl: envUrl }

  // Fallback to localStorage (for local manual override)
  const s = localStorage.getItem(SETTINGS_KEY)
  return s ? JSON.parse(s) : { webAppUrl: "" }
}

export function isConfigured() {
  const { webAppUrl } = getSettings()
  return !!webAppUrl
}

// --- Fetch Helpers for GAS ---

async function callGas(action: string, data?: any) {
  const { webAppUrl } = getSettings()
  if (!webAppUrl) return { success: false }

  try {
    // Note: GAS POST requires handling redirects.
    // We use 'no-cors' for fire-and-forget updates to avoid Preflight (OPTIONS) errors.
    // Limitation: we won't be able to read the response body in 'no-cors' mode.
    await fetch(webAppUrl, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ action, token: SECURITY_TOKEN, ...data }),
      headers: { "Content-Type": "text/plain" }
    })
    return { success: true }
  } catch (err) {
    console.error("GAS Call failed:", err)
    return { success: false }
  }
}

async function fetchGas() {
  const { webAppUrl } = getSettings()
  if (!webAppUrl) return null
  try {
    const url = new URL(webAppUrl)
    url.searchParams.set("token", SECURITY_TOKEN)

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error("Fetch GAS failed:", err)
    // Notify user of CORS/Network error
    if (typeof window !== "undefined") {
      toast.error("เชื่อมต่อ Google Sheets ล้มเหลว (อาจเกิดจากสิทธิ์การเข้าถึงหรือ CORS)", {
        description: "โปรดตรวจสอบการ Deploy ใน Apps Script ว่าเป็น 'Anyone' และกด Allow สิทธิ์แล้วหรือยัง",
        duration: 5000
      })
    }
    return null
  }
}

// --- API Implementation ---

export async function fetchOrgData(): Promise<OrgRow[]> {
  if (isConfigured()) {
    const data = await fetchGas()
    if (data?.orgData) {
      storageService.saveOrgData(data.orgData)
      return data.orgData
    }
    // If GAS fails, we fall back to local, but we don't return null to avoid infinite loader
  }
  return storageService.getOrgData()
}

export async function fetchAgmData(): Promise<AgmRow[]> {
  if (isConfigured()) {
    const data = await fetchGas()
    if (data?.agmData) {
      storageService.saveAgmData(data.agmData)
      return data.agmData
    }
  }
  return storageService.getAgmData()
}

export async function addOrgRow(rowData: OrgRow): Promise<void> {
  if (isConfigured()) {
    await callGas("addOrgRow", { data: rowData })
  }
  storageService.addOrgRow(rowData)
}

export async function updateOrgRow(rowIndex: number, rowData: OrgRow): Promise<void> {
  if (isConfigured()) {
    await callGas("updateOrgRow", { index: rowIndex, data: rowData })
  }
  storageService.updateOrgRow(rowIndex, rowData)
}

export async function deleteOrgRow(rowIndex: number): Promise<void> {
  if (isConfigured()) {
    await callGas("deleteOrgRow", { index: rowIndex })
  }
  storageService.deleteOrgRow(rowIndex)
}

export async function saveAgmRow(rowData: AgmRow): Promise<void> {
  if (isConfigured()) {
    await callGas("saveAgmRow", { data: rowData })
  }
  storageService.saveAgmRow(rowData)
}

export async function deleteAgmRow(agmName: string): Promise<void> {
  if (isConfigured()) {
    await callGas("deleteAgmRow", { agmName })
  }
  storageService.deleteAgmRow(agmName)
}

export async function bulkImportToGas(rows: OrgRow[]): Promise<void> {
  if (isConfigured()) {
    await callGas("bulkImportOrg", { rows })
  }
}

/**
 * Handle image upload - Now stores as small Base64 directly in sheet
 */
export async function uploadImage(
  base64Data: string,
  filename: string,
  refId: string,
  imageType: "agm" | "store"
): Promise<{ success: boolean; url?: string; base64?: string; fileId?: string }> {
  try {
    // 1. Aggressively resize to thumbnail (max 300px) to fit in Sheet cell limit (~50k chars)
    const resizedBase64 = await resizeImage(base64Data, 300, 300, 0.6)

    // 2. If configured, send to GAS to confirm upload intent
    if (isConfigured()) {
      await callGas("uploadImage", {
        base64Data: resizedBase64.split(",")[1],
        filename,
        refId,
        imageType
      })
    }

    // 3. Save to local storage cache/db and return the Base64 as the permanent URL
    const localResult = await storageService.uploadImage(resizedBase64, filename, refId, imageType)

    return {
      ...localResult,
      url: resizedBase64
    }
  } catch (error) {
    console.error("Failed image process:", error)
    return { success: false }
  }
}

export async function getImageBase64(fileId: string): Promise<{ success: boolean; base64: string }> {
  const base64 = await storageService.getImageBase64(fileId)
  return {
    success: !!base64,
    base64: base64 || ""
  }
}

// Mock functions for compatibility
export async function getSheetUrl() { return isConfigured() ? getSettings().webAppUrl : "#local" }
export async function runSystemTest() {
  return { overall: isConfigured() ? "Connected" : "Simulated", details: {} }
}
