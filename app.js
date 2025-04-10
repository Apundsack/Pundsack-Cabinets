const express = require('express');
const path = require('path');
const fs = require('fs');
const galleryRoutes = require('./routes/gallery');
const contactRoutes = require('./routes/contact'); // Import contact routes
const aboutRoutes = require('./routes/about'); // Import about routes
const bodyParser = require('body-parser'); // Import body-parser
const indexRoutes = require('./routes/index');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config(); // Load environment variables

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Register galleryRoutes before dynamically loading other routes
app.use(galleryRoutes); // Ensure gallery routes are first

// Register contact routes
app.use(contactRoutes); // Add contact routes

// Register about routes
app.use('/about', aboutRoutes);

// Register index routes
app.use(indexRoutes); // Add index routes

// Dynamically load all other routes (if needed)
const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  if (file !== 'gallery.js' && file !== 'contact.js' && file !== 'about.js') { // Avoid loading gallery.js, contact.js, and about.js again
    const route = require(path.join(routesPath, file));
    app.use('/', route);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;