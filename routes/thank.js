const express = require('express');
const router = express.Router();

// Main /about route
router.get('/', (req, res) => {
  res.render('thank-you');
});

module.exports = router;