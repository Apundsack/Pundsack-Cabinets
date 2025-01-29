const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

function getPhotos(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getPhotos(filePath, fileList);
    } else if (/\.(jpg|jpeg|png|gif)$/.test(file)) {
      fileList.push(filePath.replace(path.join(__dirname, '../public'), ''));
    }
  });
  return fileList;
}

router.get('/gallery', (req, res) => {
  const photosDir = path.join(__dirname, '../public/photos');
  const photos = getPhotos(photosDir);
  res.render('gallery', { photos });
});

module.exports = router;