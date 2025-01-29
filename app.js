const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Dynamically load all routes
const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  const route = require(path.join(routesPath, file));
  app.use('/', route);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
