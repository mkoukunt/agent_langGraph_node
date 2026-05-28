"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const app = express();
const port = 3000;
const router = express.Router();
const bp = require('body-parser');
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));
const agentRouter = require('./router');
app.use('/agent', agentRouter);
app.use(express.json());
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
