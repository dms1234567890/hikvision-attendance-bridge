const express = require('express');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer();

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbz66MdDf42jnvHxYLL4mWMCbqQWq651Jkfw1FDA3q9MrUcI-oLgSTTpxCuCm8AFGu80Xg/exec";

app.get('/', (req, res) => res.send('Hikvision Bridge is Active!'));

app.post('/hikvision-attendance', upload.any(), async (req, res) => {
  try {
    const raw = req.body.event_log ? JSON.parse(req.body.event_log) : req.body;
    const event = raw.AccessControllerEvent || {};

    if (event.employeeNoString) {
      const payload = {
        EMPLOYEE_ID: event.employeeNoString,
        NAME: event.name || "UNKNOWN",
        DATE_TIME: raw.dateTime || new Date().toISOString(),
        VERIFY_MODE: event.currentVerifyMode || "",
        DEVICE_NAME: raw.deviceName || "MAIN_DEVICE",
        EVENT_TYPE: event.subEventType || ""
      };

      await axios.post(GOOGLE_SHEET_URL, payload);
      console.log("Saved to Sheet:", payload.EMPLOYEE_ID);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error("Error:", error.message);
    res.status(200).send('OK');
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Started"));
