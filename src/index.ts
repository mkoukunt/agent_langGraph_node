import { ndpAgent } from "./graph";
const express = require('express');
const app = express();
const port = 3000;
const router = express.Router();
const agentRouter = require('./router');
app.get('/', async (req: any, res: { send: (arg0: string) => void; }) => {
  const config = { configurable: { thread_id: "user-123" } };
  let data=await ndpAgent.invoke({messages:[{role:"human",content:"get the count of all the phones"}]}, config)
  res.send("hellow World");
});
app.use('/users', agentRouter);
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
