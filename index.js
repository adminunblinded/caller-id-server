const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.AGENT_ID;

const callers = {
  "9738565029": "Basheer",
  "9736346265": "Blue Neel",
  "3474241577": "Miko"
};

function lookupName(phone) {
  phone = (phone || "").replace(/^\+1/, "").replace(/^\+/, "").trim();
  return callers[phone] || "there";
}

app.post("/incoming", async (req, res) => {
  const callerPhone = req.body.From || "";
  const name = lookupName(callerPhone);
  console.log("Incoming call from:", callerPhone, "Name:", name);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.elevenlabs.io/v1/convai/twilio?agent_id=${AGENT_ID}&xi-api-key=${ELEVENLABS_API_KEY}">
      <Parameter name="name" value="${name}"/>
    </Stream>
  </Connect>
</Response>`;

  res.type("text/xml");
  res.send(twiml);
});

app.post("/lookup", (req, res) => {
  const name = lookupName(req.body.phone);
  res.json({ name });
});

app.get("/", (req, res) => {
  res.send("Caller ID API running");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running on port " + port);
});
