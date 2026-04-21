import { ndpAgent } from "./graph";
const express = require('express');
const app = express();
const port = 3000;
const router = express.Router();
const bp = require('body-parser')
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
const agentRouter = require('./router');
app.use('/agent', agentRouter);
app.use(express.json()); 

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
