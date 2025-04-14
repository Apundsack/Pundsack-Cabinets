const express = require('express');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const exifreader = require('exifreader'); // Import the exifreader for metadata extraction
const router = express.Router();

async function getAllPhotosWithDimensions(dir) {
  const files = fs.readdirSync(dir);
  const photosWithDimensions = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const subDirPhotos = await getAllPhotosWithDimensions(filePath);
      photosWithDimensions.push(...subDirPhotos);
    } else if (/\.(jpg|jpeg|png|gif|avif)$/i.test(file)) {
      try {
        const dimensions = sizeOf(filePath);
        const imageBuffer = fs.readFileSync(filePath);
        const tags = exifreader.load(imageBuffer, { expanded: true });

        const extractTagFromXPKeywords = (tagData) => {
          if (tagData && typeof tagData === 'object' && tagData.description) {
            const tags = tagData.description.toLowerCase().split(';').map(tag => tag.trim()).filter(tag => tag !== '');
            return tags;
          } else {
            return [];
          }
        };

        const extractTagSimple = (tagValue, tagName) => {
          if (tagValue && typeof tagValue === 'string') {
            const extracted = [tagValue.toLowerCase().trim()];
            return extracted;
          } else {
            return [];
          }
        };

        const extractTagsArray = (tagData, tagName) => {
          if (tagData?.value && Array.isArray(tagData.value)) {
            const extracted = tagData.value.map(item => String(item).toLowerCase().trim()).filter(item => item !== '[object object]' && item !== '' && item !== '0');
            return extracted;
          } else {
            return [];
          }
        };

        const xpKeywordsArray = extractTagFromXPKeywords(tags['exif']?.XPKeywords);
        const imageDescArray = extractTagSimple(tags['ImageDescription']?.description, 'ImageDescription');
        const subjectTagsArray = extractTagsArray(tags['xmp']?.subject, 'xmp.subject');
        const lastKeywordXMPArray = extractTagsArray(tags['xmp']?.LastKeywordXMP, 'xmp.LastKeywordXMP');
        const xmpSubjectTagsArray = extractTagsArray(tags['xmp']?.['dc:subject'], 'xmp.dc.subject');

        // Combine the extracted tags
        const combinedTags = [
          ...xpKeywordsArray,
          ...imageDescArray,
          ...subjectTagsArray,
          ...lastKeywordXMPArray,
          ...xmpSubjectTagsArray
        ];

        // Filter out empty strings and ensure uniqueness
        const tagArray = combinedTags.filter(tag => tag).filter((tag, index) => combinedTags.indexOf(tag) === index);


        const relativePath = filePath.replace(path.join(__dirname, '../public'), '');

        photosWithDimensions.push({
          url: relativePath,
          width: dimensions.width,
          height: dimensions.height,
          tags: tagArray
        });
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
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

    res.render('gallery', { photos: photosWithLinks, path: path });
  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).send('Error fetching photos');
  }
});


router.get('/gallery/:imageName', async (req, res) => {
  const imageName = decodeURIComponent(req.params.imageName);
  const photosDir = path.join(__dirname, '../public/images/photos');

  try {
    const allPhotos = await getAllPhotosWithDimensions(photosDir);
    const photo = allPhotos.find(p => path.basename(p.url) === imageName);

    if (!photo) {
      return res.status(404).send('Image not found');
    }

    const imagePath = path.join(__dirname, '../public', photo.url);
    const imageBuffer = fs.readFileSync(imagePath);
    const tags = exifreader.load(imageBuffer);

    // Extract and reformat the date
    let rawDate = tags['DateTime'] ? tags['DateTime'].description : 'Unknown';
    let formattedDate = 'Unknown';
    if (rawDate !== 'Unknown') {
      const [datePart] = rawDate.split(' '); // Split into date and time
      formattedDate = datePart.replace(/:/g, '/'); // Replace ':' with '/'
    }

    const metadata = {
      date: formattedDate,
      camera: tags['Model'] ? tags['Model'].description : 'Unknown',
      orientation: tags['Orientation'] ? tags['Orientation'].description : 'Unknown',
    };

    res.render('image', { photo: photo, metadata: metadata });
  } catch (err) {
    console.error("Error in /gallery/:imageName route:", err);
    res.status(500).send("Error loading image");
  }
});

module.exports = router;