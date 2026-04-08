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

const callData = {};

app.post("/incoming", (req, res) => {
  const callerPhone = req.body.From || "";
  const callSid = req.body.CallSid || "";
  const name = lookupName(callerPhone);
  console.log("Incoming call from:", callerPhone, "Name:", name, "SID:", callSid);

  callData[callSid] = { name };

  const host = req.headers.host;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/media-stream">
      <Parameter name="callSid" value="${callSid}"/>
    </Stream>
  </Connect>
</Response>`;

  res.type("text/xml");
  res.send(twiml);
});

app.get("/", (req, res) => {
  res.send("Caller ID API running");
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/media-stream" });

wss.on("connection", async (twilioWs) => {
  console.log("WebSocket opened by Twilio");

  let elevenWs;
  let name = "there";
  let streamSid = null;

  twilioWs.on("message", async (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.event === "start") {
        const callSid = msg.start?.customParameters?.callSid || "";
        streamSid = msg.start?.streamSid;
        name = callData[callSid]?.name || "there";
        console.log("Stream started - CallSid:", callSid, "Name:", name);

        try {
          const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
            { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
          );
          const responseData = await response.json();
          const signedUrl = responseData.signed_url;
          console.log("Got signed URL");

          elevenWs = new WebSocket(signedUrl);

          elevenWs.on("open", () => {
            console.log("Connected to ElevenLabs, sending name:", name);
            elevenWs.send(JSON.stringify({
              type: "conversation_initiation_client_data",
              dynamic_variables: { name: name },
              conversation_config_override: {
                tts: { optimize_streaming_latency: 4 }
              }
            }));
          });

          elevenWs.on("message", (elevenData) => {
            try {
              const parsed = JSON.parse(elevenData);
              if (parsed.type === "audio" && parsed.audio?.chunk) {
                const twilioMsg = {
                  event: "media",
                  streamSid: streamSid,
                  media: { payload: parsed.audio.chunk }
                };
                if (twilioWs.readyState === WebSocket.OPEN) {
                  twilioWs.send(JSON.stringify(twilioMsg));
                }
              }
              if (parsed.type === "interruption") {
                if (twilioWs.readyState === WebSocket.OPEN) {
                  twilioWs.send(JSON.stringify({ event: "clear", streamSid }));
                }
              }
            } catch (e) {}
          });

          elevenWs.on("close", () => {
            console.log("ElevenLabs disconnected");
            if (twilioWs.readyState === WebSocket.OPEN) twilioWs.close();
          });

          elevenWs.on("error", (err) => {
            console.error("ElevenLabs error:", err.message);
          });

        } catch (err) {
          console.error("Failed to connect to ElevenLabs:", err.message);
        }
      }

      if (msg.event === "media" && elevenWs?.readyState === WebSocket.OPEN) {
        elevenWs.send(JSON.stringify({
          user_audio_chunk: Buffer.from(msg.media.payload, "base64").toString("base64")
        }));
      }

      if (msg.event === "stop") {
        console.log("Call ended");
        if (elevenWs?.readyState === WebSocket.OPEN) elevenWs.close();
      }

    } catch (e) {
      console.error("Parse error:", e.message);
    }
  });

  twilioWs.on("close", () => {
    console.log("Twilio disconnected");
    if (elevenWs?.readyState === WebSocket.OPEN) elevenWs.close();
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server running on port " + port);
});
