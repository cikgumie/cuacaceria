/**
 * PENGHALAAN UTAMA (ROUTING)
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Cuaca Pelajar - Glassmorphism')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * SETUP PANGKALAN DATA (CREATE DATABASE)
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'TETAPAN_PELAJAR';
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = ['ID_PELAJAR', 'NAMA', 'GAMBAR_B64', 'LAT', 'LNG', 'KEMASKINI_TERAKHIR'];
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1e293b');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    return { status: 'success', message: 'Jadual TETAPAN_PELAJAR berjaya dicipta.' };
  }
  return { status: 'info', message: 'Jadual telah wujud.' };
}

/**
 * SIMPAN TETAPAN PELAJAR (UPSERT)
 */
function simpanTetapan(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('TETAPAN_PELAJAR');
    if (!sheet) {
      setupDatabase();
      sheet = ss.getSheetByName('TETAPAN_PELAJAR');
    }
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    const idPelajar = data.id || 'PELAJAR_TAMU';
    const nama = data.nama ? data.nama.trim().toUpperCase() : 'TANPA NAMA';
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === idPelajar) {
        rowIndex = i + 1;
        break;
      }
    }
    
    const rowData = [idPelajar, nama, data.gambar, data.lat, data.lng, new Date()];
    if (rowIndex > -1) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: 'success', data: rowData };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

/**
 * DAPATKAN DATA PENGGUNA
 */
function getUserData() {
  const email = 'PELAJAR_TAMU';
  const settings = dapatkanTetapan(email);
  return { email: email, settings: settings };
}

/**
 * DAPATKAN TETAPAN PELAJAR
 */
function dapatkanTetapan(idPelajar) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('TETAPAN_PELAJAR');
  if (!sheet) return null;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === idPelajar) {
      return { id: values[i][0], nama: values[i][1], gambar: values[i][2], lat: values[i][3], lng: values[i][4] };
    }
  }
  return null;
}

/**
 * INTEGRASI AI (OPENROUTER)
 */

// Simpan API Key (Jalankan ini sekali sahaja melalui editor atau debug)
function simpanApiKeyAI() {
  const NEW_KEY = "AIzaSyCEiQt1E78xmduM7-lfi_uXgGo6Ut7CunA"; 
  PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', NEW_KEY);
  return "Kunci API Gemini telah disimpan dengan selamat. Anda kini boleh memadamkan kunci tersebut dari kod ini untuk keselamatan.";
}

function dapatkanTipAI(data) {
  // Defensive check for data object
  if (!data) data = { temp: 30, status: 'Cerah', aqi: 50, uv: 5 };
  if (!data.temp) data.temp = 30;
  if (!data.status) data.status = 'Cerah';
  if (!data.aqi) data.aqi = 50;
  if (!data.uv) data.uv = 5;

  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'); 
  // Nota: Kita gunakan semula kunci 'OPENROUTER_API_KEY' atau tukar ke 'GEMINI_API_KEY'
  if (!apiKey) return "Sila tetapkan Google Gemini API Key terlebih dahulu.";

  const prompt = "Anda adalah penasihat cuaca untuk murid sekolah di Malaysia. Berdasarkan data cuaca di lokasi murid:\n" +
                 "Suhu: " + data.temp + "°C\n" +
                 "Status: " + data.status + "\n" +
                 "Indeks Pencemaran (AQI): " + data.aqi + "\n" +
                 "Indeks UV: " + data.uv + "\n\n" +
                 "Berikan satu tip yang ringkas (maksimum 20 patah perkataan), ceria, dan sangat membantu dalam Bahasa Melayu. Jangan gunakan petikan (quotes).";

  const payload = {
    "contents": [{
      "parts": [{
        "text": prompt
      }]
    }]
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2-flash-lite:generateContent?key=" + apiKey;
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    
    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      return json.candidates[0].content.parts[0].text.trim();
    }
    
    if (json.error) {
      return "Ralat Gemini: " + (json.error.message || json.error.code);
    }
    
    return "Maaf, AI sedang berehat. Sila cuba sebentar lagi.";
  } catch (e) {
    return "Gangguan talian AI (Gemini): " + e.toString();
  }
}

/**
 * PENGENDALI PERMINTAAN DARI GITHUB (CORS FRIENDLY)
 */

// Fungsi utama untuk menguruskan permintaan (GET & POST)
function prosesPermintaan(functionName, args) {
  var result;
  try {
    if (functionName === 'simpanTetapan') {
      result = simpanTetapan(args);
    } else if (functionName === 'dapatkanTipAI') {
      result = dapatkanTipAI(args);
    } else if (functionName === 'getUserData') {
      result = getUserData();
    } else if (functionName === 'simpanApiKeyAI') {
      result = simpanApiKeyAI();
    } else {
      result = { status: 'error', message: 'Fungsi tidak dijumpai.' };
    }
  } catch (e) {
    result = { status: 'error', message: e.toString() };
  }
  return result;
}

// Handler untuk GET (Sokong JSONP untuk bypass CORS)
function doGet(e) {
  var functionName = e.parameter.functionName;
  var args = e.parameter.args ? JSON.parse(e.parameter.args) : {};
  var callback = e.parameter.callback;
  
  var result = prosesPermintaan(functionName, args);
  var jsonString = JSON.stringify(result);
  
  if (callback) {
    // Balas dalam format JSONP: callbackName({"data": "..."})
    return ContentService.createTextOutput(callback + '(' + jsonString + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService.createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handler untuk POST
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var result = prosesPermintaan(data.functionName, data.args);
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}