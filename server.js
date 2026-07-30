const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const SecurityLog = require('./models/Log');

const app = express();
app.use(express.json());

// Vercel Serverless-க்கு உகந்த Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MongoDB Connection
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch((err) => console.error('❌ MongoDB Error:', err));
} else {
  console.error('❌ MONGO_URI is missing in Environment Variables!');
}

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Root Test Route
app.get('/', (req, res) => {
  res.status(200).send('🚀 Laptop Security Backend is Running Perfectly!');
});

// 1. Image Upload API (Memory-யில் இருந்து நேரடி Cloudinary அப்லோட்)
app.post('/api/notify', upload.single('photo'), async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded" });
    }

    // Buffer மூலம் Cloudinary-க்கு நேரடியாக அப்லோட் செய்தல்
    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'intruders' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(fileBuffer);
      });
    };

    const cloudResult = await streamUpload(req.file.buffer);

    // MongoDB-யில் சேமித்தல்
    const newLog = new SecurityLog({
      deviceId: deviceId || 'Unknown Device',
      photoUrl: cloudResult.secure_url
    });
    await newLog.save();

    res.status(200).json({ success: true, message: 'Log saved successfully!' });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Mobile App Logs API
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await SecurityLog.find().sort({ openedAt: -1 }).limit(10);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export app for Vercel Serverless
module.exports = app;