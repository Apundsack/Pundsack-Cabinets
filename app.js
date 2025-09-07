const express = require('express');
const path = require('path');
const fs = require('fs');
const galleryRoutes = require('./routes/gallery');
const contactRoutes = require('./routes/contact');
const aboutRoutes = require('./routes/about');
const thankRoutes = require('./routes/thank');
const bodyParser = require('body-parser');
const indexRoutes = require('./routes/index');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap')));

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Register routes
app.use(galleryRoutes);
app.use(contactRoutes);
app.use('/about', aboutRoutes);
app.use(indexRoutes);
app.use('/thank-you', thankRoutes);
// Dynamically load other routes
const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  if (file !== 'gallery.js' && file !== 'contact.js' && file !== 'about.js') {
    const route = require(path.join(routesPath, file));
    app.use('/', route);
  }
});

// Export the app object
module.exports = app;

// Only start the server if this file is being run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}