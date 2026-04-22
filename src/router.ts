import { ndpAgent } from "./graph";

const express = require("express");
const router = express.Router();
  let thread_id = 100;
// Route: GET /users/
router.post("/", async (req: any, res: any) => {
  const body = req.body;
  const apiHost = "https://" + body.apiHost+"/ns-api/v2";
  const accessToken = body.accessToken;
  const qn=body.qn;

  const config = { configurable: { thread_id: thread_id++,apiHost: apiHost,accessToken: accessToken } };
  await ndpAgent.updateState(config, { 
  messages: []
  
});
  let data = await ndpAgent.invoke(
    {
      messages: [{ role: "human", content: qn}],
    },
    config,
  );
  let r=data["messages"]?.[3]?.["content"];
 res.send(r);
});

// Route: GET /users/profile
router.get("/profile", (req: any, res: { send: (arg0: string) => void }) => {
  res.send("User profile");
});

module.exports = router;
