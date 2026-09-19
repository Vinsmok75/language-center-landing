/**
 * ==========================================================================
 * Najah Media - Google Apps Script Backend (Code.gs)
 * ==========================================================================
 * Features:
 * 1. doGet(e): Reads Column F ("Date/Time") from active spreadsheet and returns
 *              clean JSON array of taken slots for dynamic conflict detection.
 * 2. doPost(e): Handles appointment bookings with LockService concurrency
 *               protection to prevent double bookings.
 * ==========================================================================
 */

/**
 * Returns active sheet and sets up header row if brand new
 */
function getBookingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  // If new sheet with no headers, initialize standard column headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Name of the prospect",  // Column A
      "Business name",         // Column B
      "Numéro de téléphone",   // Column C
      "City",                  // Column D
      "Étape",                 // Column E
      "Date/Time",             // Column F (Critical slot tracking)
      "Probabilité",           // Column G
      "Meet Link",             // Column H
      "Notes"                  // Column I
    ]);

    var headerRange = sheet.getRange(1, 1, 1, 9);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0F2942");
    headerRange.setFontColor("#FFFFFF");
  }

  return sheet;
}

/**
 * 1. Dynamic Conflict Detection (GET Request)
 * Reads column F ("Date/Time") and returns taken slots
 * Example output:
 * {
 *   "status": "success",
 *   "bookedSlots": ["اليوم (10:00)", "غداً (15:00)", "2026-09-17 (11:00)"]
 * }
 */
function doGet(e) {
  try {
    var sheet = getBookingSheet();
    var lastRow = sheet.getLastRow();
    var bookedSlots = [];

    if (lastRow >= 2) {
      // Column F is index 6 (Row 2, Column 6, NumRows, NumCols 1)
      var range = sheet.getRange(2, 6, lastRow - 1, 1);
      var values = range.getValues();

      for (var i = 0; i < values.length; i++) {
        var cellVal = values[i][0];
        if (cellVal !== null && cellVal !== undefined) {
          var slotStr = String(cellVal).trim();
          if (slotStr.length > 0 && bookedSlots.indexOf(slotStr) === -1) {
            bookedSlots.push(slotStr);
          }
        }
      }
    }

    var result = {
      status: "success",
      count: bookedSlots.length,
      bookedSlots: bookedSlots
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorResult = {
      status: "error",
      message: error.toString(),
      bookedSlots: []
    };

    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. Atomic Reservation Booking with LockService Concurrency Protection (POST Request)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();

  // Wait up to 30 seconds for other concurrent writes to finish
  try {
    lock.waitLock(30000);
  } catch (lockError) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "النظام مشغول بمعالجة حجز آخر. المرجو المحاولة مجدداً بعد لحظات."
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
    var centerName = payload.centerName || payload.center_name || "";
    var phone = payload.phone || "";
    var city = payload.city || "";
    var formationType = payload.formationType || payload.formation_type || "";
    var etape = payload.etape || "Nouveau Lead";
    var selectedDate = payload.selectedDate || payload.selected_date || "";
    var selectedTime = payload.selectedTime || payload.selected_time || "";
    var dateTime = payload.dateTime || (selectedDate && selectedTime ? selectedDate + " (" + selectedTime + ")" : "");
    var probabilite = payload.probabilite || "20%";
    var meetLink = payload.meetLink || "";
    var notes = payload.notes || (formationType ? "[" + formationType + "] " : "") + new Date().toISOString();

    // Check for double bookings in Column F
    if (dateTime) {
      var lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        var existingSlots = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
        for (var j = 0; j < existingSlots.length; j++) {
          var existing = String(existingSlots[j][0]).trim();
          if (existing === dateTime.trim()) {
            return ContentService.createTextOutput(JSON.stringify({
              status: "conflict",
              message: "عذراً، هذا الموعد محجوز مسبقاً. يرجى اختيار موعد آخر."
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }

    // Append new row matching columns A - I
    sheet.appendRow([
      fullName,      // A: Name of the prospect
      centerName,    // B: Business name
      phone,         // C: Numéro de téléphone
      city,          // D: City
      etape,         // E: Étape
      dateTime,      // F: Date/Time
      probabilite,   // G: Probabilité
      meetLink,      // H: Meet Link
      notes          // I: Notes
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "تم تسجيل الحجز بنجاح.",
      bookedSlot: dateTime
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    // Release the script lock
    lock.releaseLock();
  }
}

/**
 * Diagnostic test function - run inside Apps Script editor to verify doGet logic
 */
function testDoGet() {
  var res = doGet(null);
  Logger.log("doGet output: " + res.getContent());
}
