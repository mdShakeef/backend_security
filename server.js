//require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const SecurityLog = require('./models/Log');

const app = express();
app.use(express.json());

// save image
const upload = multer({ dest: 'uploads/' });

// MongoDB connection
//mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
 // .then(() => console.log('✅ MongoDB Connected!'))
 // .catch(err => console.error('❌ MongoDB Error:', err));
 mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Error:', err));

// Cloudinary setting
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 1. image and alert from laptop API
app.post('/api/notify', upload.single('photo'), async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!req.file) return res.status(400).json({ error: "No photo uploaded" });

    // upload to Cloudinary
    const cloudResult = await cloudinary.uploader.upload(req.file.path, { folder: 'intruders' });

    // remove local file
    fs.unlinkSync(req.file.path);

    // save to MongoDB
    const newLog = new SecurityLog({
      deviceId: deviceId,
      photoUrl: cloudResult.secure_url
    });
    await newLog.save();

    console.log(`🚨 Alert! ${deviceId} opened. Photo saved to DB.`);
    res.status(200).json({ success: true, message: 'Log saved successfully!' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. send the photo to mobile app API
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await SecurityLog.find().sort({ openedAt: -1 }).limit(10);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));


module.exports = app;