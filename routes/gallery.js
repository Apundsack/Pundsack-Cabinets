const express = require('express');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const router = express.Router();


async function getAllPhotosWithDimensions(dir) {
  const files = fs.readdirSync(dir);
  const photosWithDimensions = [];

  console.log("Processing directory:", dir); // Log the current directory

  for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      console.log("Checking file/dir:", filePath); // Log each file/dir

      if (stat.isDirectory()) {
          console.log("Found subdirectory:", filePath);
          const subDirPhotos = await getAllPhotosWithDimensions(filePath); // Recursively process subdirectories
          photosWithDimensions.push(...subDirPhotos); // Add photos from subdirectory
      } else if (/\.(jpg|jpeg|png|gif)$/i.test(file)) {  // Check for image files
          console.log("Found image file:", filePath);
          try {
              const dimensions = sizeOf(filePath);  // Get image dimensions
              console.log("Dimensions for", filePath, ":", dimensions);

              // Create the relative path for the image file to serve in the gallery
              const relativePath = filePath.replace(path.join(__dirname, '../public'), '');

              photosWithDimensions.push({
                  url: relativePath,
                  width: dimensions.width,
                  height: dimensions.height
              });
          } catch (err) {
              console.error(`Error getting dimensions for ${filePath}:`, err);
              const relativePath = filePath.replace(path.join(__dirname, '../public'), '');
              photosWithDimensions.push({ url: relativePath, width: 100, height: 100 }); // Fallback dimensions
          }
      }
  }
  return photosWithDimensions;  // Return all the gathered photos with dimensions
}


// 2. Route for the main gallery page
router.get('/gallery', async (req, res) => {
  const photosDir = path.join(__dirname, '../public/images/photos'); // The root directory of images
  try {
      const photos = await getAllPhotosWithDimensions(photosDir);
      
      if (photos.length === 0) {
          return res.status(404).send('No photos found.');
      }

      const photosWithLinks = photos.map(photo => {
          return {
              ...photo,
              link: `/gallery/${path.basename(photo.url)}` // Link to the individual photo detail page
          };
      });

      res.render('gallery', { photos: photosWithLinks }); // Render the gallery page with photos and links
  } catch (err) {
      console.error('Error fetching photos:', err);
      res.status(500).send('Error fetching photos');
  }
});


// 3. Route for individual image pages (PDP)
router.get('/gallery/:imageName', async (req, res) => {
    const imageName = req.params.imageName; // Get the image name from the URL
    const photosDir = path.join(__dirname, '../public/images/photos');

    try {
        const allPhotos = await getAllPhotosWithDimensions(photosDir);
        const photo = allPhotos.find(p => path.basename(p.url) === imageName);

        if (!photo) {
            return res.status(404).send('Image not found'); // Handle image not found
        }
        res.render('image', { photo: photo }); // Render the individual image page
    } catch (err) {
        console.error("Error in /gallery/:imageName route:", err);
        res.status(500).send("Error loading image");
    }
});


module.exports = router;