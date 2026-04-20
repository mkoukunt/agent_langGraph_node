const express = require('express');
const router = express.Router();

// Route: GET /users/
router.get('/', (req: any, res: { send: (arg0: string) => void; }) => {
  res.send('User list');
});

// Route: GET /users/profile
router.get('/profile', (req: any, res: { send: (arg0: string) => void; }) => {
  res.send('User profile');
});

module.exports = router;
