const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const fetch = require("node-fetch");

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

// Store caller name by call SID
const callData = {};

// Twilio hits this when a call comes in
app.post("/incoming", (req, res) => {
  const callerPhone = req.body.From || "";
  const callSid = req.body.CallSid || "";
  const name = lookupName(callerPhone);
  console.log("Incoming call from:", callerPhone, "Name:", name, "SID:", callSid);

  // Store name for this call
  callData[callSid] = { name };

  const host = req.headers.host;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/media-stream?callSid=${callSid}">
    </Stream>
  </Connect>
</Response>`;

  res.type("text/xml");
  res.send(twiml);
});

app.get("/", (req, res) => {
  res.send("Caller ID API running");
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server, path: "/media-stream" });

wss.on("connection", async (twilioWs, req) => {
  const url = new URL(req.url, "http://localhost");
  const callSid = url.searchParams.get("callSid");
  const name = callData[callSid]?.name || "there";
  console.log("WebSocket connected for call:", callSid, "Name:", name);

  // Get signed URL from ElevenLabs
  let elevenWs;
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
      { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
    );
    const data = await response.json();
    const signedUrl = data.signed_url;
    console.log("Got signed URL from ElevenLabs");

    // Connect to ElevenLabs
    elevenWs = new WebSocket(signedUrl);

    elevenWs.on("open", () => {
      console.log("Connected to ElevenLabs");
      // Send custom parameters with caller name
      const initMessage = {
        type: "conversation_initiation_client_data",
        dynamic_variables: { name: name }
      };
      elevenWs.send(JSON.stringify(initMessage));
    });

    // Pipe ElevenLabs audio back to Twilio
    elevenWs.on("message", (data) => {
      if (twilioWs.readyState === WebSocket.OPEN) {
        twilioWs.send(data);
      }
    });

    elevenWs.on("close", () => {
      console.log("ElevenLabs disconnected");
      if (twilioWs.readyState === WebSocket.OPEN) twilioWs.close();
    });

    elevenWs.on("error", (err) => {
      console.error("ElevenLabs WebSocket error:", err.message);
    });

  } catch (err) {
    console.error("Failed to connect to ElevenLabs:", err.message);
    twilioWs.close();
    return;
  }

  // Pipe Twilio audio to ElevenLabs
  twilioWs.on("message", (data) => {
    if (elevenWs && elevenWs.readyState === WebSocket.OPEN) {
      elevenWs.send(data);
    }
  });

  twilioWs.on("close", () => {
    console.log("Twilio disconnected");
    if (elevenWs && elevenWs.readyState === WebSocket.OPEN) elevenWs.close();
    delete callData[callSid];
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server running on port " + port);
});
