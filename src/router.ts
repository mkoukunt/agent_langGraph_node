import { ndpAgent } from "./graph";

const express = require("express");
const router = express.Router();

// Route: GET /users/
router.post("/", async (req: any, res: { send: (arg0: string) => void }) => {
  const body = req.body;
  const apiHost = body.apiHost;
  const accessToken = body.accessToken;
  const qn=body.qn;
  const config = { configurable: { thread_id: "user-123" } };
  await ndpAgent.updateState(config, { 
  messages: []
  
});
  let data = await ndpAgent.invoke(
    {
      messages: [{ role: "human", content: qn, apiHost: apiHost ,accessToken:accessToken}],
    },
    config,
  );
  res.send("User list");
});

// Route: GET /users/profile
router.get("/profile", (req: any, res: { send: (arg0: string) => void }) => {
  res.send("User profile");
});

module.exports = router;
