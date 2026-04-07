const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const callers = {
  "+19738565029": "Basheer",
  "+19736346265": "Neel",
  "+13474241577": "Miko"
};

app.post("/lookup", (req, res) => {
  const phone = req.body.phone;

  const name = callers[phone] || "there";

  res.json({
    name: name
  });
});

app.get("/", (req, res) => {
  res.send("Caller ID API running");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server running on port " + port);
});
