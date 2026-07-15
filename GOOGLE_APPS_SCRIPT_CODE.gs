function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // BATCH APPEND: Append multiple rows at once
    if (data.batch && Array.isArray(data.rows)) {
      let sheet = ss.getSheetByName(data.sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(data.sheetName);
        if (data.headers && data.headers.length > 0) {
          sheet.appendRow(data.headers);
        }
      }

      // Append all rows in batch
      data.rows.forEach(row => sheet.appendRow(row));

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Batch append: ' + data.rows.length + ' rows'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // BATCH OVERWRITE: Clear and rewrite entire sheet
    if (data.overwrite && Array.isArray(data.rows)) {
      let sheet = ss.getSheetByName(data.sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(data.sheetName);
      } else {
        // Clear existing data (keep headers if provided)
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, lastCol).clear();
        }
      }

      if (data.headers && data.headers.length > 0) {
        sheet.clear();
        sheet.appendRow(data.headers);
      }

      data.rows.forEach(row => sheet.appendRow(row));

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Overwrite: ' + data.rows.length + ' rows'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // UPDATE ROW: Find by primary key and update
    if (data.action === 'update' && data.primaryKey && data.primaryKeyValue) {
      let sheet = ss.getSheetByName(data.sheetName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false, error: 'Sheet not found'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const pkIndex = headers.indexOf(data.primaryKey);
      if (pkIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false, error: 'Primary key column not found'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const allData = sheet.getDataRange().getValues();
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][pkIndex]).trim() === String(data.primaryKeyValue).trim()) {
          // Update the row
          const rowRange = sheet.getRange(i + 1, 1, 1, data.values.length);
          rowRange.setValues([data.values]);
          return ContentService.createTextOutput(JSON.stringify({
            success: true, message: 'Row updated'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: false, error: 'Row not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // DELETE ROW: Find by primary key and delete
    if (data.action === 'delete' && data.primaryKey && data.primaryKeyValue) {
      let sheet = ss.getSheetByName(data.sheetName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false, error: 'Sheet not found'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const pkIndex = headers.indexOf(data.primaryKey);
      if (pkIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false, error: 'Primary key column not found'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const allData = sheet.getDataRange().getValues();
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][pkIndex]).trim() === String(data.primaryKeyValue).trim()) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({
            success: true, message: 'Row deleted'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: false, error: 'Row not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // SINGLE APPEND (default)
    let sheet = ss.getSheetByName(data.sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(data.sheetName);
      if (data.headers && data.headers.length > 0) {
        sheet.appendRow(data.headers);
      }
    }
    sheet.appendRow(data.values);

    return ContentService.createTextOutput(JSON.stringify({
      success: true, message: 'Row appended'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true, message: 'Web app is running'
  })).setMimeType(ContentService.MimeType.JSON);
}
