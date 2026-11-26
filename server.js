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

// Health check route (Render ko jagaye rakhne aur status check ke liye)
app.get('/', (req, res) => {
  res.status(200).send('Hikvision Bridge is Active!');
});

// Hikvision HTTP Listening Endpoint
app.post('/hikvision-attendance', upload.any(), async (req, res) => {
  try {
    console.log("=== NEW HIKVISION PACKET ===");
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Body:", JSON.stringify(req.body));

    // Machine ka raw data nikalna (chahe JSON ho, Form-Data ho, ya XML)
    let rawData = req.body;
    if (req.body && req.body.event_log) {
      rawData = typeof req.body.event_log === 'string'
        ? JSON.parse(req.body.event_log)
        : req.body.event_log;
    }

    const event = (rawData && rawData.AccessControllerEvent) ? rawData.AccessControllerEvent : {};

    // Agar standard JSON event mila toh clean data bhejein, warna raw format bhi bhej dein
    const payload = event.employeeNoString ? {
      EMPLOYEE_ID: event.employeeNoString,
      NAME: event.name || "UNKNOWN",
      DATE_TIME: rawData.dateTime || new Date().toISOString(),
      VERIFY_MODE: event.currentVerifyMode || "",
      DEVICE_NAME: rawData.deviceName || "MAIN_DEVICE",
      EVENT_TYPE: event.subEventType || ""
    } : {
      RAW_FORMAT_TEST: typeof rawData === 'string'
        ? rawData.substring(0, 500)
        : JSON.stringify(rawData).substring(0, 500),
      CONTENT_TYPE: req.headers['content-type'] || "UNKNOWN"
    };

    await axios.post(GOOGLE_SHEET_URL, payload);
    console.log("Forwarded to Google Sheet:", JSON.stringify(payload));

    res.status(200).send('OK');
  } catch (error) {
    console.error("Error processing Hikvision event:", error.message);
    // Hikvision ko hamesha 200 OK bhejna zaroori hai taaki retry loop na bane
    res.status(200).send('OK');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hikvision Bridge Server running on port ${PORT}`);
});
