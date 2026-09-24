/**
 * ==========================================================================
 * Najah Media - Google Apps Script Backend (Code.gs)
 * ==========================================================================
 * Features:
 * 1. Automatic "N°" Row Order Classification (1, 2, 3, 4... sorted ascending).
 * 2. Auto-converts legacy sheets without "N°" by inserting Column A.
 * 3. Atomic Reservation Booking with LockService concurrency protection.
 * ==========================================================================
 */

/**
 * Returns active sheet and guarantees the "N°" column exists for row ordering
 */
function getBookingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  // If new sheet with no headers, initialize standard column headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "N°",                      // Column A: Numéro d'ordre (1, 2, 3...)
      "Date & Heure",            // Column B: Date de soumission
      "Nom complet",             // Column C: Prospect full name
      "Numéro de téléphone",     // Column D: WhatsApp / Téléphone
      "Email",                   // Column E: Email
      "Ville",                   // Column F: City
      "Type de centre",          // Column G: Q1
      "Ancienneté",              // Column H: Q2
      "Élèves / mois",           // Column I: Q3
      "Publicité (FB/IG)",       // Column J: Q4
      "Notes"                    // Column K: Notes / Détails
    ]);

    var headerRange = sheet.getRange(1, 1, 1, 11);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0F2942");
    headerRange.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
    return sheet;
  }

  // Ensure Column 1 is "N°" for existing sheets
  var firstHeader = String(sheet.getRange(1, 1).getValue()).trim().toLowerCase();
  var isNumberCol = (firstHeader === "n°" || firstHeader === "n" || firstHeader === "#" || firstHeader === "order" || firstHeader === "num");

  if (!isNumberCol) {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue("N°")
      .setFontWeight("bold")
      .setBackground("#0F2942")
      .setFontColor("#FFFFFF");
    
    // Number existing rows
    var totalRows = sheet.getLastRow();
    if (totalRows >= 2) {
      for (var r = 2; r <= totalRows; r++) {
        sheet.getRange(r, 1).setValue(r - 1).setHorizontalAlignment("center");
      }
    }
  }

  return sheet;
}

/**
 * 1. Dynamic Check / Availability endpoint (GET Request)
 */
function doGet(e) {
  try {
    var sheet = getBookingSheet();
    var lastRow = sheet.getLastRow();

    var result = {
      status: "success",
      totalLeads: Math.max(0, lastRow - 1)
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorResult = {
      status: "error",
      message: error.toString()
    };

    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. Atomic Lead Registration & Automatic Number Row Order Classification (POST Request)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();

  // Wait up to 30 seconds for concurrent writes
  try {
    lock.waitLock(30000);
  } catch (lockError) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Le serveur est occupé. Veuillez réessayer dans quelques instants."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var sheet = getBookingSheet();
    var rawContents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload = {};

    try {
      payload = JSON.parse(rawContents);
    } catch (parseErr) {
      payload = (e && e.parameter) ? e.parameter : {};
    }

    var fullName = payload.fullName || payload.full_name || "";
    var centerType = payload.centerType || payload.center_type || payload.centerName || payload.center_name || payload.formationType || "";
    var phone = payload.phone || "";
    var email = payload.email || "";
    var city = payload.city || "";
    var activeDuration = payload.activeDuration || payload.active_duration || "";
    var studentsPerMonth = payload.studentsPerMonth || payload.students_per_month || "";
    var adExperience = payload.adExperience || payload.ad_experience || "";
    var etape = payload.etape || "Nouveau Lead";
    var probabilite = payload.probabilite || "20%";
    var formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+1", "yyyy-MM-dd HH:mm:ss");
    var notes = payload.notes || `[Ancienneté: ${activeDuration}] [Élèves/mois: ${studentsPerMonth}] [Publicité: ${adExperience}] [Email: ${email}]`;

    // Calculate next row order number (1, 2, 3, 4...)
    var totalRows = sheet.getLastRow();
    var nextOrderNumber = 1;

    if (totalRows >= 2) {
      var lastVal = sheet.getRange(totalRows, 1).getValue();
      var parsed = parseInt(lastVal, 10);
      if (!isNaN(parsed) && parsed > 0) {
        nextOrderNumber = parsed + 1;
      } else {
        nextOrderNumber = totalRows;
      }
    }

    // Check schema of Column 2 to support both new and legacy columns
    var secondHeader = sheet.getLastColumn() >= 2 ? String(sheet.getRange(1, 2).getValue()).trim().toLowerCase() : "";

    if (secondHeader.indexOf("date") !== -1) {
      // Clean Multi-Step Schema
      sheet.appendRow([
        nextOrderNumber,
        formattedDate,
        fullName,
        phone,
        email,
        city,
        centerType,
        activeDuration,
        studentsPerMonth,
        adExperience,
        notes
      ]);
    } else {
      // CRM Format with N° as Column A
      sheet.appendRow([
        nextOrderNumber,
        fullName,
        centerType,
        phone,
        city,
        etape,
        email,
        probabilite,
        adExperience,
        notes
      ]);
    }

    // Format N° column (center align)
    var newLastRow = sheet.getLastRow();
    sheet.getRange(newLastRow, 1).setHorizontalAlignment("center").setFontWeight("bold");

    // Classify / Sort the table strictly into number row order (Column 1 ascending)
    if (newLastRow >= 3) {
      var dataRange = sheet.getRange(2, 1, newLastRow - 1, sheet.getLastColumn());
      dataRange.sort({ column: 1, ascending: true });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Lead enregistré avec succès dans l'ordre numérique.",
      orderNumber: nextOrderNumber
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

/**
 * Diagnostic test function - run inside Apps Script editor to verify setup
 */
function testSetup() {
  var sheet = getBookingSheet();
  Logger.log("Sheet rows: " + sheet.getLastRow() + ", columns: " + sheet.getLastColumn());
}
