const SPREADSHEET_ID = "1A9sHEE0q5LiNq86ro_sll4FPIW2hYmtLTUPSlta5Gj0";
const VERSION = "1.3 (Secure Mode)";
const SECURITY_TOKEN = "Lotus2026_Secure_Personnel_Portal";

/**
 * GET Request handler
 */
function doGet(e) {
  console.log("GET request received");
  try {
    const token = e.parameter.token;
    if (token !== SECURITY_TOKEN) {
      return createResponse({ error: "Unauthorized access" }, 401);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const orgSheet = getOrCreateSheet(ss, "Stores", [
      "Store ID", "Location Code", "Store Name Thai", "Store Name", "AGM Name", "AGM ZONE", 
      "GPM Name", "Store Manager Name", "Position", "Province", "SM Phone", "Store Phone", 
      "Mobile Phone", "Yr of Service in TL", "Service in Position", "Image URL", "_imageFileId"
    ]);
    const agmSheet = getOrCreateSheet(ss, "AGMs", [
      "AGM Name", "AGM ZONE", "Mobile Phone", "Email", "Image URL", "Remark", "_imageFileId"
    ]);

    const orgData = sheetToObjects(orgSheet);
    const agmData = sheetToObjects(agmSheet);

    return createResponse({ orgData, agmData, version: VERSION });
  } catch (err) {
    console.error("GET Error:", err);
    return createResponse({ error: err.toString() }, 500);
  }
}

/**
 * POST Request handler
 */
function doPost(e) {
  console.log("POST request received");
  try {
    const params = JSON.parse(e.postData.contents);
    
    if (params.token !== SECURITY_TOKEN) {
      return createResponse({ error: "Unauthorized access" }, 401);
    }

    const action = params.action;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    console.log("Action:", action);

    if (action === "addOrgRow") return addOrgRow(ss, params.data);
    if (action === "updateOrgRow") return updateOrgRow(ss, params.index, params.data);
    if (action === "deleteOrgRow") return deleteOrgRow(ss, params.index);
    if (action === "saveAgmRow") return saveAgmRow(ss, params.data);
    if (action === "deleteAgmRow") return deleteAgmRow(ss, params.agmName);
    if (action === "uploadImage") return handleUpload(params);
    if (action === "bulkImportOrg") return bulkImport(ss, params.rows);

    return createResponse({ error: "Invalid action: " + action }, 400);
  } catch (err) {
    console.error("POST Error:", err);
    return createResponse({ error: err.toString() }, 500);
  }
}

// --- CRUD Implementation ---

function addOrgRow(ss, data) {
  validateRowData(data);
  const sheet = ss.getSheetByName("Stores");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = headers.map(h => data[h] || "");
  sheet.appendRow(rowValues);
  return createResponse({ success: true });
}

function updateOrgRow(ss, index, data) {
  validateRowData(data);
  const sheet = ss.getSheetByName("Stores");
  const rowNum = index + 2; 
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = [headers.map(h => data[h] || "")];
  sheet.getRange(rowNum, 1, 1, headers.length).setValues(rowValues);
  return createResponse({ success: true });
}

function deleteOrgRow(ss, index) {
  const sheet = ss.getSheetByName("Stores");
  sheet.deleteRow(index + 2);
  return createResponse({ success: true });
}

function saveAgmRow(ss, data) {
  validateRowData(data);
  const sheet = ss.getSheetByName("AGMs");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const nameIndex = headers.indexOf("AGM Name");
  
  let rowIdx = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][nameIndex]) === String(data["AGM Name"])) {
      rowIdx = i + 1;
      break;
    }
  }

  const rowValues = [headers.map(h => data[h] || "")];
  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1, 1, headers.length).setValues(rowValues);
  } else {
    sheet.appendRow(rowValues[0]);
  }
  return createResponse({ success: true });
}

function deleteAgmRow(ss, agmName) {
  const sheet = ss.getSheetByName("AGMs");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const nameIdx = headers.indexOf("AGM Name");
  
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][nameIdx]) === agmName) {
      sheet.deleteRow(i + 1);
    }
  }
  return createResponse({ success: true });
}

function bulkImport(ss, rows) {
  const sheet = ss.getSheetByName("Stores");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const allValues = rows.map(r => {
    validateRowData(r);
    return headers.map(h => r[h] || "");
  });

  if (allValues.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, allValues.length, headers.length).setValues(allValues);
  }
  return createResponse({ success: true, count: allValues.length });
}

function handleUpload(params) {
  console.log("Image upload confirmation received");
  // We prefixed it on client, but confirm receipt
  return createResponse({ 
    success: true, 
    message: "Image received (Base64 Mode)" 
  });
}

// --- Helpers ---

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function createResponse(data, status = 200) {
  const result = JSON.stringify(data);
  if (data.error) console.error("Error Response:", data.error);
  if (result.length > 50000) console.warn("Response size is large:", result.length);
  
  return ContentService.createTextOutput(result)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Validate data before saving to sheet (Google Sheets limit is ~50k chars per cell)
 */
function validateRowData(data) {
  for (let key in data) {
    const val = String(data[key] || "");
    if (val.length > 50000) {
      throw new Error("Data in column '" + key + "' is too large (" + val.length + " chars). Max is 50,000. Please check image resizing.");
    }
  }
}
