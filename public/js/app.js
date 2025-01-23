const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const serverRootDirectory = path.resolve(__dirname, '../..');

// Serve static files from the "public" directory
app.use(express.static(path.join(serverRootDirectory, 'public')));

app.get('/', (req, res) => {
  try {
    const header = fs.readFileSync(path.join(serverRootDirectory, 'public/html/header.html'), 'utf8');
    const nav = fs.readFileSync(path.join(serverRootDirectory, 'public/html/nav.html'), 'utf8');
    const footer = fs.readFileSync(path.join(serverRootDirectory, 'public/html/footer.html'), 'utf8');
    const content = fs.readFileSync(path.join(serverRootDirectory, 'public/html/content.html'), 'utf8');

    // Assemble the full HTML
    const fullPage = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Node.js Website</title>
        <link rel="stylesheet" href="/css/styles.css">
      </head>
      <body>
        ${header}
        ${nav}
        ${content}
        ${footer}
      </body>
      </html>
    `;
    
    res.send(fullPage);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
