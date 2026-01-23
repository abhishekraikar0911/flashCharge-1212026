const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const db = require('../services/db');
const steve = require('../services/steveService');

// Configure multer for firmware upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = '/opt/ev-platform/firmware-storage';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `firmware_${timestamp}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.bin')) {
      cb(null, true);
    } else {
      cb(new Error('Only .bin files allowed'));
    }
  }
});

// Upload firmware
router.post('/upload', authenticateToken, upload.single('firmware'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No firmware file uploaded' });
    }

    const { version, description } = req.body;
    const firmwareUrl = `http://${req.get('host')}/firmware/${req.file.filename}`;

    await db.query(`
      INSERT INTO firmware_versions (version, filename, file_path, file_size, description, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [version, req.file.filename, req.file.path, req.file.size, description, req.user.id]);

    res.json({
      success: true,
      message: 'Firmware uploaded successfully',
      firmware: {
        version,
        filename: req.file.filename,
        size: req.file.size,
        url: firmwareUrl
      }
    });
  } catch (error) {
    console.error('Firmware upload error:', error);
    res.status(500).json({ error: 'Failed to upload firmware' });
  }
});

// List firmware versions
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const [versions] = await db.query(`
      SELECT id, version, filename, file_size, description, created_at
      FROM firmware_versions
      ORDER BY created_at DESC
    `);

    res.json({ versions });
  } catch (error) {
    console.error('List firmware error:', error);
    res.status(500).json({ error: 'Failed to list firmware' });
  }
});

// Trigger OTA update
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const { chargerId, firmwareId } = req.body;

    const [firmware] = await db.query(
      'SELECT * FROM firmware_versions WHERE id = ?',
      [firmwareId]
    );

    if (!firmware.length) {
      return res.status(404).json({ error: 'Firmware not found' });
    }

    const fw = firmware[0];
    const firmwareUrl = `http://${req.get('host')}/firmware/${fw.filename}`;

    // Send UpdateFirmware via SteVe API
    const result = await steve.steveApiClient.post('/api/external/firmware/update', {
      chargePointId: chargerId,
      location: firmwareUrl,
      retrieveDate: new Date().toISOString(),
      retries: 3,
      retryInterval: 60
    });

    // Log update job
    await db.query(`
      INSERT INTO firmware_update_jobs (charger_id, firmware_id, status, initiated_by)
      VALUES (?, ?, 'pending', ?)
    `, [chargerId, firmwareId, req.user.id]);

    res.json({
      success: true,
      message: 'OTA update initiated',
      firmwareUrl,
      result: result.data
    });
  } catch (error) {
    console.error('OTA update error:', error);
    res.status(500).json({ error: 'Failed to initiate OTA update' });
  }
});

// Get update status
router.get('/status/:chargerId', authenticateToken, async (req, res) => {
  try {
    const [jobs] = await db.query(`
      SELECT j.*, f.version, f.filename
      FROM firmware_update_jobs j
      JOIN firmware_versions f ON f.id = j.firmware_id
      WHERE j.charger_id = ?
      ORDER BY j.created_at DESC
      LIMIT 10
    `, [req.params.chargerId]);

    res.json({ jobs });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

module.exports = router;
