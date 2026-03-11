const SHEET_RSVP = 'RSVP';
const SHEET_GUESTS = 'Tamu Undangan';
const DEFAULT_SHOW_AKAD = false;
const DEFAULT_MAX_ATTENDANCE = 2;

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseBoolean(value, fallback) {
  if (value === true || value === false) return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'show', 'tampil'].indexOf(normalized) !== -1) return true;
  if (['0', 'false', 'no', 'n', 'hide', 'sembunyikan'].indexOf(normalized) !== -1) return false;
  return fallback;
}

function parsePositiveInt(value, fallback) {
  const num = Number(value);
  if (!isFinite(num) || num < 1) return fallback;
  return Math.floor(num);
}

function trimToMaxWords(value, maxWords) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

function findHeaderIndex(header, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    const idx = header.indexOf(aliases[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = String(params.action || 'list').toLowerCase();

  if (action === 'guest') {
    const name = params.name || params.guest || params.guest_name || '';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_GUESTS);
    if (!sh) return jsonOut({ ok: false, message: 'Guests sheet not found' });

    const values = sh.getDataRange().getValues();
    const header = values[0] || [];
    const rows = values.slice(1);

    const idxName = findHeaderIndex(header, ['Nama', 'Name', 'name']);
    const idxShowAkad = findHeaderIndex(header, ['Show Akad', 'showAkad', 'show_akad', 'akad']);
    const idxMaxAttendance = findHeaderIndex(header, ['Max Attendance', 'maxAttendance', 'max_attendance', 'max_hadir']);

    if (idxName < 0 || idxShowAkad < 0) {
      return jsonOut({ ok: false, message: 'Guests headers must include Nama and Show Akad' });
    }

    const target = normalizeName(name);
    const row = rows.find(function (r) {
      return normalizeName(r[idxName]) === target;
    });

    if (!row) {
      return jsonOut({
        ok: true,
        guest: {
          name: name,
          showAkad: DEFAULT_SHOW_AKAD,
          maxAttendance: DEFAULT_MAX_ATTENDANCE,
          found: false
        }
      });
    }

    const showAkad = parseBoolean(row[idxShowAkad], DEFAULT_SHOW_AKAD);
    const maxAttendance = idxMaxAttendance >= 0
      ? parsePositiveInt(row[idxMaxAttendance], DEFAULT_MAX_ATTENDANCE)
      : DEFAULT_MAX_ATTENDANCE;

    return jsonOut({
      ok: true,
      guest: {
        name: row[idxName],
        showAkad: showAkad,
        maxAttendance: maxAttendance,
        found: true
      }
    });
  }

  const limit = Math.max(1, Math.min(200, Number(params.limit || 50)));
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_RSVP);
  if (!sh) return jsonOut({ ok: false, comments: [] });

  const values = sh.getDataRange().getValues();
  const header = values[0] || [];
  const rows = values.slice(1);

  const idxName = findHeaderIndex(header, ['name', 'Name', 'nama', 'Nama']);
  const idxMessage = findHeaderIndex(header, ['message', 'Message', 'ucapan', 'Ucapan']);
  const idxAttendance = findHeaderIndex(header, ['attendance', 'Attendance', 'kehadiran', 'Kehadiran']);
  const idxAttendanceCount = findHeaderIndex(header, ['attendance_count', 'attendanceCount', 'jumlah']);

  const comments = rows
    .filter(function (r) {
      const name = idxName >= 0 ? String(r[idxName] || '').trim() : '';
      const message = idxMessage >= 0 ? String(r[idxMessage] || '').trim() : '';
      return Boolean(name || message);
    })
    .slice(-limit)
    .reverse()
    .map(function (r) {
      return {
        name: idxName >= 0 ? (r[idxName] || '') : '',
        message: idxMessage >= 0 ? (r[idxMessage] || '') : '',
        attendance: idxAttendance >= 0 ? (r[idxAttendance] || '') : '',
        attendance_count: idxAttendanceCount >= 0 ? (r[idxAttendanceCount] || '') : ''
      };
    });

  return jsonOut({ ok: true, comments: comments });
}

function doPost(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_RSVP);
  if (!sh) sh = ss.insertSheet(SHEET_RSVP);
  const safeMessage = trimToMaxWords(p.message || '', 50);

  if (sh.getLastRow() === 0) {
    sh.appendRow(['timestamp', 'name', 'message', 'attendance', 'attendance_count', 'guest_name', 'invited_to', 'page', 'user_agent']);
  }

  sh.appendRow([
    p.timestamp || new Date().toISOString(),
    p.name || '',
    safeMessage,
    p.attendance || '',
    p.attendance_count || '',
    p.guest_name || p.invited_to || '',
    p.invited_to || p.guest_name || '',
    p.page || '',
    p.user_agent || ''
  ]);

  return jsonOut({ ok: true });
}
