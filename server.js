const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const callers = {
  "9738565029": "Basheer",
  "9736346265": "Blue Neel",
  "3474241577": "Miko"
};

function lookupName(phone) {
  phone = (phone || "").replace(/^\+1/, "").replace(/^\+/, "").trim();
  return callers[phone] || "there";
}

// Original lookup endpoint (keep this)
app.post("/lookup", (req, res) => {
  console.log("Incoming phone:", req.body.phone);
  const name = lookupName(req.body.phone);
  console.log("Returning name:", name);
  res.json({ name: name });
});

// New pre-call webhook endpoint for dynamic variables
app.post("/get-name", (req, res) => {
  console.log("Pre-call webhook body:", req.body);
  const phone = req.body.caller_id || req.body.phone || "";
  const name = lookupName(phone);
  console.log("Injecting name:", name);
  res.json({
    dynamic_variables: {
      name: name
    }
  });
});

app.get("/", (req, res) => {
  res.send("Caller ID API running");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running on port " + port);
});
