app.post("/get-name", (req, res) => {
  let phone = req.body.caller_id || "";
  phone = phone.replace(/^\+1/, "").replace(/^\+/, "").trim();
  
  const callers = {
    "9738565029": "Basheer",
    "9736346265": "Blue Neel",
    "3474241577": "Miko"
  };
  
  const name = callers[phone] || "there";
  
  res.json({
    dynamic_variables: {
      name: name
    }
  });
});
