import { ndpAgent } from "./graph";
import { Command } from "@langchain/langgraph";
import { getCollection } from "./mongo";

const express = require("express");
const router = express.Router();
let thread_id = 100;
// Route: GET /users/
router.post("/", async (req: any, res: any) => {
  const body = req.body;
  const apiHost = "https://" + body.apiHost + "/ns-api/v2";
  const accessToken = body.accessToken;
  const qn = body.qn;
  const tId = body.tId;

  const config = {
    configurable: {
      thread_id: tId,
      apiHost: apiHost,
      accessToken: accessToken,
    },
  };
  await ndpAgent.updateState(config, {
    messages: [],
  });
  let data: any = await ndpAgent.invoke(
    {
      messages: [{ role: "human", content: qn }],
    },
    config,
  );
  console.log(data.__interrupt__);
  if (data.__interrupt__) {
    console.log(JSON.stringify(data.__interrupt__[0]));
    res.send({
      interrupted: true,
      thread_id: config.configurable.thread_id,
      interrupt: data.__interrupt__[0],
    });
  }
  let r = data["messages"]?.[3]?.["content"];
  res.send(r);
});

// Route: POST /resume
router.post("/resume", async (req: any, res: any) => {
  let {
    tId,
    apiHost,  
    accessToken,  
    resume_value
  } = req.body;
   apiHost = "https://" + apiHost + "/ns-api/v2";

  const config = { configurable: { thread_id: tId , apiHost: apiHost,
      accessToken: accessToken} };

  let data: any = await ndpAgent.invoke(
    new Command({ resume: resume_value ?? true }),
    config,
  );

  if (data.__interrupt__) {
    res.send({
      interrupted: true,
      thread_id: tId,
      interrupt: data.__interrupt__[0],
    });
    return;
  }

   let r = data["messages"]?.[3]?.["content"];
  res.send(r);
});
// Route: GET /fetch
router.post("/fetch", async (req: any, res: any) => {
  try {
    const body = req.body;
    const tId = body.tId;
    const qn = body.qn;
    const config = {
      configurable: {
        thread_id: tId,
      },
    };
    await ndpAgent.updateState(config, {
      messages: [],
    });

    let data: any = await ndpAgent.invoke(
      {
        messages: [{ role: "human", content: qn }],
      },
      config,
    );
  let r = data["messages"]?.[3]?.["content"];
  res.send(r);
   
  } catch (err: any) {
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;
