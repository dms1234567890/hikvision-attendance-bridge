const express = require('express');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer();

// JSON, Form-Data, aur XML/Text teeno format accept karne ke liye
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ type: ['text/xml', 'application/xml', 'text/plain'], limit: '10mb' }));

// Aapka deploy kiya hua Google Sheet Web App URL
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbz66MdDf42jnvHxYLL4mWMCbqQWq651Jkfw1FDA3q9MrUcI-oLgSTTpxCuCm8AFGu80Xg/exec";

// Health check route (Render ko 24x7 jagaye rakhne ke liye)
app.get('/', (req, res) => {
  res.status(200).send('Hikvision Bridge is Active!');
});

// Hikvision HTTP Listening Endpoint
app.post('/hikvision-attendance', upload.any(), async (req, res) => {
  try {
    // Machine ka raw data nikalna
    let rawData = req.body;
    if (req.body && req.body.event_log) {
      rawData = typeof req.body.event_log === 'string'
        ? JSON.parse(req.body.event_log)
        : req.body.event_log;
    }

    const event = (rawData && rawData.AccessControllerEvent) ? rawData.AccessControllerEvent : {};

    if (event.employeeNoString) {
      const punchTime = rawData.dateTime || new Date().toISOString();

      // Sirf aaj (26 Nov 2026) aur aage ke sabhi LIVE punches hi Sheet mein jayenge
      // 26 Nov 2026 se pehle ka purana backlog ignore ho jayega
      if (punchTime < "2026-11-26T00:00:00") {
        return res.status(200).send('OK');
      }

      const payload = {
        EMPLOYEE_ID: event.employeeNoString,
        NAME: event.name || "UNKNOWN",
        DATE_TIME: punchTime,
        VERIFY_MODE: event.currentVerifyMode || "",
        DEVICE_NAME: rawData.deviceName || "MAIN_DEVICE",
        EVENT_TYPE: event.subEventType || ""
      };

      await axios.post(GOOGLE_SHEET_URL, payload);
      console.log("Live Punch Saved:", payload.EMPLOYEE_ID, payload.NAME, payload.DATE_TIME);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error("Error processing Hikvision event:", error.message);
    res.status(200).send('OK');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hikvision Bridge Server running on port ${PORT}`);
});
