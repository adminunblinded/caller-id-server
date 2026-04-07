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

app.post("/lookup", (req, res) => {
  console.log("Incoming phone:", req.body.phone);
  
  let phone = req.body.phone || "";
  phone = phone.replace(/^\+1/, "").replace(/^\+/, "").trim();
  
  console.log("Cleaned phone:", phone);
  
  const name = callers[phone] || "there";
  res.json({ name: name });
});

app.get("/", (req, res) => {
  res.send("Caller ID API running");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running on port " + port);
});
