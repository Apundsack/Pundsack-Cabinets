const express = require('express');
const router = express.Router();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

router.get('/', (req, res) => {
  res.render('index');
});

module.exports = router;
