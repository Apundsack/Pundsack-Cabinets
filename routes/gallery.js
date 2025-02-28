const express = require('express');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const exifreader = require('exifreader');  // Import the exifreader for metadata extraction
const router = express.Router();

// Function to get all photos with dimensions
async function getAllPhotosWithDimensions(dir) {
  const files = fs.readdirSync(dir);
  const photosWithDimensions = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // If it's a directory, recursively fetch photos from subdirectories
      const subDirPhotos = await getAllPhotosWithDimensions(filePath);
      photosWithDimensions.push(...subDirPhotos);
    } else if (/\.(jpg|jpeg|png|gif|avif)$/i.test(file)) {
      // If it's an image file, fetch its dimensions
      try {
        const dimensions = sizeOf(filePath);
        const relativePath = filePath.replace(path.join(__dirname, '../public'), '');
        photosWithDimensions.push({
          url: relativePath,
          width: dimensions.width,
          height: dimensions.height
        });
      } catch (err) {
        console.error(`Error getting dimensions for ${filePath}:`, err);
        const relativePath = filePath.replace(path.join(__dirname, '../public'), '');
        photosWithDimensions.push({ url: relativePath, width: 100, height: 100 });
      }
    }
  }

  return photosWithDimensions;
}

// Route for the gallery page
router.get('/gallery', async (req, res) => {
  const photosDir = path.join(__dirname, '../public/images/photos');
  try {
    const photos = await getAllPhotosWithDimensions(photosDir);
    if (photos.length === 0) {
      return res.status(404).send('No photos found.');
    }

    const photosWithLinks = photos.map(photo => ({
      ...photo,
      link: `/gallery/${path.basename(photo.url)}`,
    }));
    
    // Pass the path module to the template
    res.render('gallery', { photos: photosWithLinks, path: path });
  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).send('Error fetching photos');
  }
});


// Route for individual image pages (with metadata)
router.get('/gallery/:imageName', async (req, res) => {
  const imageName = decodeURIComponent(req.params.imageName);  // Decode URL-encoded image name
  const photosDir = path.join(__dirname, '../public/images/photos');

  try {
      const allPhotos = await getAllPhotosWithDimensions(photosDir);
      const photo = allPhotos.find(p => path.basename(p.url) === imageName);  // Match by file name

      if (!photo) {
          return res.status(404).send('Image not found');
      }

      const imagePath = path.join(__dirname, '../public', photo.url);
      const imageBuffer = fs.readFileSync(imagePath);
      const tags = exifreader.load(imageBuffer);

      const metadata = {
          date: tags['DateTime'] ? tags['DateTime'].description : 'Unknown',
          camera: tags['Model'] ? tags['Model'].description : 'Unknown',
          orientation: tags['Orientation'] ? tags['Orientation'].description : 'Unknown'
      };

      res.render('image', { photo: photo, metadata: metadata });
  } catch (err) {
      console.error("Error in /gallery/:imageName route:", err);
      res.status(500).send("Error loading image");
  }
});

module.exports = router;
