const express = require('express');
const router = express.Router();

// Sub-route for /about/finish
router.use('/finish', require('./about/finish'));

// Sub-route for /about/finish
router.use('/wood', require('./about/wood'));

// Sub-route for /about/finish
router.use('/stain', require('./about/stain'));

// Main /about route
router.get('/', (req, res) => {
  res.render('about');
});

module.exports = router;