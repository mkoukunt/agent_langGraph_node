const express = require('express');
const app = express();
const port = 3000;
const router = express.Router();
const agentRouter = require('./router');
app.get('/', (req: any, res: { send: (arg0: string) => void; }) => {
  res.send('Hello World!');
});
app.use('/users', agentRouter);
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
