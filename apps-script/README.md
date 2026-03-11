# Google Apps Script setup

Use this script to support:
- `GET ?action=guest&name=...` (for `showAkad` + `maxAttendance` by guest)
- `GET ?action=list&limit=50` (for RSVP comments)
- `POST` form data (save RSVP + wish)

## 1) Create spreadsheet

Create 2 sheets:
- `Tamu Undangan`
- `RSVP`

### Tamu Undangan headers (row 1)
Use at least these columns (case-insensitive):
- `Nama`
- `Show Akad`
- `Max Attendance`

Example:
- `Budi`, `TRUE`, `2`
- `Siti`, `FALSE`, `1`

### RSVP headers
You can leave empty. Script auto-creates headers when first `POST` comes in.

## 2) Deploy Apps Script

1. Open Apps Script project connected to your sheet.
2. Paste code from [Code.gs](Code.gs).
3. Click **Deploy** → **New deployment** → type **Web app**.
4. Execute as: **Me**.
5. Who has access: **Anyone**.
6. Copy the `/exec` URL.

## 3) Use URL in website

Set both in [../assets/data/content.json](../assets/data/content.json):
- `details.guestVisibility.googleSheetReadUrl`
- `rsvp.googleSheetWebhook`
- `rsvp.googleSheetReadUrl`

## Notes

- Frontend already sends `guest_name` and `invited_to` on RSVP submit.
- If guest not found in `Tamu Undangan`, defaults are used by script response:
  - `showAkad: false`
  - `maxAttendance: 2`
