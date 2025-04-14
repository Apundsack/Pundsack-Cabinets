const express = require('express');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const exifreader = require('exifreader'); // Import the exifreader for metadata extraction
const router = express.Router();

let cachedPhotos = null; // Cache for photo metadata

// Function to get all photos with dimensions and metadata
async function getAllPhotosWithDimensions(dir) {
  const files = fs.readdirSync(dir);

  // Process all files concurrently using Promise.all
  const photoPromises = files.map(async (file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      return getAllPhotosWithDimensions(filePath); // Recursively process subdirectories
    } else if (/\.(jpg|jpeg|png|gif|avif)$/i.test(file)) {
      try {
        const dimensions = sizeOf(filePath);
        const imageBuffer = fs.readFileSync(filePath);
        const tags = exifreader.load(imageBuffer, { expanded: true });

        // Extract tags
        const xpKeywordsArray = tags['exif']?.XPKeywords?.description
          ? tags['exif'].XPKeywords.description.split(';').map(tag => tag.trim().toLowerCase())
          : [];
        const imageDescArray = tags['ImageDescription']?.description
          ? [tags['ImageDescription'].description.toLowerCase().trim()]
          : [];
        const subjectTagsArray = tags['xmp']?.subject?.value || [];
        const lastKeywordXMPArray = tags['xmp']?.LastKeywordXMP?.value || [];
        const xmpSubjectTagsArray = tags['xmp']?.['dc:subject']?.value || [];

const combinedTags = [
  ...xpKeywordsArray,
  ...imageDescArray,
  ...subjectTagsArray,
  ...lastKeywordXMPArray,
  ...xmpSubjectTagsArray,
]
  .map(tag => (typeof tag === 'string' ? tag.toLowerCase().trim() : '')) // Ensure tags are strings
  .filter((tag, index, self) => tag && self.indexOf(tag) === index); // Remove empty tags and deduplicate

        const relativePath = filePath.replace(path.join(__dirname, '../public'), '');

        return {
          url: relativePath,
          width: dimensions.width,
          height: dimensions.height,
          tags: combinedTags,
        };
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
        return null; // Skip files with errors
      }
    }
    return null; // Skip non-image files
  });

  const photos = await Promise.all(photoPromises);
  return photos.flat().filter(photo => photo !== null); // Flatten and filter out null values
}

// Function to get cached photos
async function getCachedPhotos(dir) {
  if (cachedPhotos) {
    return cachedPhotos; // Return cached data if available
  }

  cachedPhotos = await getAllPhotosWithDimensions(dir); // Cache the processed data
  return cachedPhotos;
}

// Route for the gallery page
router.get('/gallery', async (req, res) => {
  const photosDir = path.join(__dirname, '../public/images/photos');
  try {
    const photos = await getCachedPhotos(photosDir);
    if (photos.length === 0) {
      return res.status(404).send('No photos found.');
    }

    const photosWithLinks = photos.map(photo => ({
      ...photo,
      link: `/gallery/${path.basename(photo.url)}`,
    }));

    res.render('gallery', { photos: photosWithLinks, path: path });
  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).send('Error fetching photos');
  }
});

// Route for a single image
router.get('/gallery/:imageName', async (req, res) => {
  const imageName = decodeURIComponent(req.params.imageName);
  const photosDir = path.join(__dirname, '../public/images/photos');

  try {
    // Locate the specific image file
    const imagePath = path.join(photosDir, imageName);

    // Check if the file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).send('Image not found');
    }

    // Read the image file and extract metadata
    const imageBuffer = fs.readFileSync(imagePath);
    const tags = exifreader.load(imageBuffer);

    // Extract and reformat the date
    let rawDate = tags['DateTime'] ? tags['DateTime'].description : 'Unknown';
    let formattedDate = 'Unknown';
    if (rawDate !== 'Unknown') {
      const [datePart] = rawDate.split(' '); // Split into date and time
      formattedDate = datePart.replace(/:/g, '/'); // Replace ':' with '/'
    }

    // Extract tags
    const tagArray = tags['XPKeywords']?.description
      ? tags['XPKeywords'].description.split(';').map(tag => tag.trim().toLowerCase())
      : [];

    // Prepare metadata
    const metadata = {
      date: formattedDate,
      camera: tags['Model'] ? tags['Model'].description : 'Unknown',
      orientation: tags['Orientation'] ? tags['Orientation'].description : 'Unknown',
    };

    // Render the image page with metadata and tags
    res.render('image', {
      photo: { url: `/images/photos/${imageName}`, tags: tagArray },
      metadata: metadata,
    });
  } catch (err) {
    console.error("Error in /gallery/:imageName route:", err);
    res.status(500).send("Error loading image");
  }
});

module.exports = router;