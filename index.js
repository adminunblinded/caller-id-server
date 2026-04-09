const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const callers = {
  "9738565029": "Basheer",
  "9736346265": "Blue Neel",
  "2014703908": "Nadav",
  "4015729006": "Nick",
  "3475222756": "Aiko",
  "3474241577": "Miko"
};

function lookupName(phone) {
  phone = (phone || "").replace(/^\+1/, "").replace(/^\+/, "").trim();
  return callers[phone] || "there";
}

app.post("/get-name", (req, res) => {
  console.log("Webhook body:", JSON.stringify(req.body));
  const phone = req.body.caller_id || req.body.phone || "";
  const name = lookupName(phone);
  console.log("Returning name:", name);
  res.json({
    dynamic_variables: {
      name: name
    }
  });
});

app.post("/lookup", (req, res) => {
  const name = lookupName(req.body.phone || "");
  res.json({ name });
});

app.get("/", (req, res) => {
  res.send("Caller ID API running");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running on port " + port);
});
