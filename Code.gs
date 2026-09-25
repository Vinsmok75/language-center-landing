/**
 * ==========================================================================
 * Najah Media - Google Apps Script CRM Backend (Code.gs)
 * ==========================================================================
 * 
 * Target Google Sheet Columns:
 * 1. Date of the lead
 * 2. Name of the prospect
 * 3. Businesse name
 * 4. Numéro de téléphone
 * 5. City
 * 6. Étape
 * 7. Date/Time
 * 8. Probabilité
 * 9. Meet Link (If meet accepted)
 * 10. Notes
 * 
 * Features:
 * - Concurrency Safe with LockService
 * - Preserves leading zeros & '+' signs for Moroccan phone numbers
 * - Auto-initializes headers with clean CRM styling if the sheet is empty
 * - Combines multi-step qualification answers (Email, Ancienneté, Élèves/mois, Pub) into Notes
 * - Built-in test function to verify inside Apps Script editor
 * ==========================================================================
 */

// Target Sheet configuration (leave null for active sheet, or specify name like "Feuille 1" or "Leads")
var CONFIG = {
  SHEET_NAME: null, // e.g. "Leads" or null to use active sheet
  TIMEZONE: "GMT+1", // Morocco standard time
  DEFAULT_ETAPE: "Nouveau Lead",
  DEFAULT_PROBABILITE: "20%",
  HEADERS: [
    "Date of the lead",
    "Name of the prospect",
    "Businesse name",
    "Numéro de téléphone",
    "City",
    "Étape",
    "Date/Time",
    "Probabilité",
    "Meet Link (If meet accepted)",
    "Notes"
  ]
};

/**
 * Retrieves the destination sheet and creates headers if blank
 */
function getTargetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = CONFIG.SHEET_NAME ? ss.getSheetByName(CONFIG.SHEET_NAME) : ss.getActiveSheet();

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME || "Leads");
  }

  // If the sheet has no rows, create and format the 10 headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CONFIG.HEADERS);

    var headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0F2942"); // Dark Navy Blue
    headerRange.setFontColor("#FFFFFF");  // Crisp White
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 38);
    sheet.setFrozenRows(1);

    // Auto fit initial widths
    for (var col = 1; col <= CONFIG.HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  return sheet;
}

/**
 * Handle GET request (Health check and status from browser)
 */
function doGet(e) {
  try {
    var sheet = getTargetSheet();
    var totalRows = sheet.getLastRow();
    var leadsCount = Math.max(0, totalRows - 1);

    var response = {
      status: "success",
      message: "Webhook Google Apps Script opérationnel.",
      totalLeads: leadsCount,
      columns: CONFIG.HEADERS
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST request (Form submissions from the landing page)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();

  // Prevent concurrency conflicts (wait up to 30s)
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Serveur occupé. Réessayez dans un instant."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var sheet = getTargetSheet();

    // Parse payload (supports JSON payload and standard form data)
    var rawContents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload = {};

    try {
      payload = JSON.parse(rawContents);
    } catch (parseError) {
      payload = (e && e.parameter) ? e.parameter : {};
    }

    var now = new Date();
    var scriptTimeZone = Session.getScriptTimeZone() || CONFIG.TIMEZONE;

    // 1. Date of the lead (dd/MM/yyyy)
    var dateOfTheLead = Utilities.formatDate(now, scriptTimeZone, "dd/MM/yyyy");

    // 2. Name of the prospect
    var prospectName = payload.fullName || payload.full_name || payload.prospectName || payload.name || "";

    // 3. Businesse name (Center type or custom business name)
    var businessName = payload.businessName || payload.centerType || payload.center_type || payload.centerName || payload.formationType || "";

    // 4. Numéro de téléphone (Format with leading single quote or preserve clean phone)
    var rawPhone = payload.phone || payload.phone_number || payload.telephone || "";
    var phone = String(rawPhone).trim();

    // 5. City
    var city = payload.city || payload.ville || "";

    // 6. Étape
    var etape = payload.etape || payload.step || CONFIG.DEFAULT_ETAPE;

    // 7. Date/Time (Exact submission timestamp dd/MM/yyyy HH:mm)
    var dateTime = payload.dateTime || payload.datetime || Utilities.formatDate(now, scriptTimeZone, "dd/MM/yyyy HH:mm");

    // 8. Probabilité
    var probabilite = payload.probabilite || payload.probability || CONFIG.DEFAULT_PROBABILITE;

    // 9. Meet Link (If meet accepted)
    var meetLink = payload.meetLink || payload.meet_link || "";

    // 10. Notes (Consolidate qualification questionnaire answers and email)
    var email = payload.email || "";
    var activeDuration = payload.activeDuration || payload.active_duration || "";
    var studentsPerMonth = payload.studentsPerMonth || payload.students_per_month || "";
    var adExperience = payload.adExperience || payload.ad_experience || "";

    var notesParts = [];
    if (email) notesParts.push("📧 Email: " + email);
    if (activeDuration) notesParts.push("⏳ Ancienneté: " + activeDuration);
    if (studentsPerMonth) notesParts.push("👥 Élèves/mois: " + studentsPerMonth);
    if (adExperience) notesParts.push("📢 Publicité: " + adExperience);
    if (payload.customNotes) notesParts.push("📝 Notes: " + payload.customNotes);

    var notes = notesParts.join(" | ");
    if (!notes && payload.notes) {
      notes = payload.notes;
    }

    // Append row strictly in the specified 10-column layout:
    var newRow = [
      dateOfTheLead,       // Column 1: Date of the lead
      prospectName,        // Column 2: Name of the prospect
      businessName,        // Column 3: Businesse name
      "'" + phone,         // Column 4: Numéro de téléphone (text prefix preserves 0 & +)
      city,                // Column 5: City
      etape,               // Column 6: Étape
      dateTime,            // Column 7: Date/Time
      probabilite,         // Column 8: Probabilité
      meetLink,            // Column 9: Meet Link (If meet accepted)
      notes                // Column 10: Notes
    ];

    sheet.appendRow(newRow);

    // Format new row
    var lastRowIdx = sheet.getLastRow();
    
    // Explicitly set phone column as plain text to avoid numeric issues
    sheet.getRange(lastRowIdx, 4).setNumberFormat("@");
    
    // Center align dates, step, probability, city
    sheet.getRange(lastRowIdx, 1).setHorizontalAlignment("center");
    sheet.getRange(lastRowIdx, 5).setHorizontalAlignment("center");
    sheet.getRange(lastRowIdx, 6).setHorizontalAlignment("center");
    sheet.getRange(lastRowIdx, 7).setHorizontalAlignment("center");
    sheet.getRange(lastRowIdx, 8).setHorizontalAlignment("center");

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Lead enregistré avec succès dans le CRM Google Sheets.",
      row: lastRowIdx
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

/**
 * Quick Test function to run directly inside Google Apps Script editor
 * Click "Run" -> "testAddLead" to verify the columns and output instantly
 */
function testAddLead() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        fullName: "Mohammed Alami",
        centerType: "Centre de langues",
        businessName: "Alami Language Academy",
        phone: "+212612345678",
        email: "alami@example.com",
        city: "Casablanca",
        activeDuration: "1 - 3 ans",
        studentsPerMonth: "30 - 50",
        adExperience: "Oui, régulièrement",
        etape: "Nouveau Lead",
        probabilite: "20%",
        meetLink: ""
      })
    }
  };

  var res = doPost(fakeEvent);
  Logger.log("Test Output: " + res.getContent());
}
