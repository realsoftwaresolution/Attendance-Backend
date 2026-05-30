// routes/qr.routes.js

const router = require("express").Router();
const qrController = require("../controllers/qr.controller");

// All routes are PUBLIC (no auth required)

// Create QR Code
router.post("/create", qrController.createQRCode);

// Record a scan
router.post("/scan", qrController.recordScan);

// Get all scanners for a specific QR code
router.get("/scanners/qr/:qrCode", qrController.getScannersByQR);

// Get all scanners for an owner's number
router.get("/scanners/owner/:ownerNumber", qrController.getScannersByOwnerNumber);

// Search scanners
router.get("/search/:ownerNumber", qrController.searchScanners);

// Delete scanner
router.delete("/scanner/:id", qrController.deleteScanner);


// Get statistics
router.get("/stats/:ownerNumber", qrController.getStatsByOwner);
router.get("/r/:qrCode", qrController.trackAndRedirect);

module.exports = router;