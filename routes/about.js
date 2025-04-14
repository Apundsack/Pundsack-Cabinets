const express = require('express');
const router = express.Router();

router.use('/finish', require('./about/finish'));

router.use('/paint', require('./about/paint'));

router.use('/wood', require('./about/wood'));

router.use('/stain', require('./about/stain'));

// Main /about route
router.get('/', (req, res) => {
  res.render('about');
});

module.exports = router;