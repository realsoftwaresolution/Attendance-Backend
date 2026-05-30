const db = require("../config/dbConnection");
const { Op } = require("sequelize");
const geoip = require("geoip-lite");
const axios = require("axios");
async function getAddressFromLatLng(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  
      const res = await axios.get(url, {
        headers: { "User-Agent": "qr-app" }
      });
  
      return res.data.display_name || "Unknown";
    } catch {
      return "Unknown";
    }
  }


exports.createQRCode = async (req, res) => {
    try {
      const { ownerNumber, ownerName } = req.body;
  
      if (!ownerNumber) {
        return res.status(400).json({
          success: false,
          error: "Owner number is required"
        });
      }
  
      // 🔥 ALWAYS generate QR internally
      const finalQRCode = `QR_${ownerNumber}_${Date.now()}`;
  
      // Check duplicate
      const existing = await db.sequelize.query(
        `SELECT 1 FROM QRScannerMst WHERE QRCode = :qrCode AND IsDelete = 0`,
        {
          replacements: { qrCode: finalQRCode },
          type: db.Sequelize.QueryTypes.SELECT
        }
      );
  
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: "QR code already exists"
        });
      }
  
      await db.sequelize.query(`
        INSERT INTO QRScannerMst (
          QRCode,
          QROwnerNumber,
          QROwnerName,
          ScannerName,
          ScannerNumber,
          ScanCount,
          Active,
          IsDelete,
          FirstScanDate,
          LastScanDate,
          CreatedAt,
          UpdatedAt
        )
        VALUES (
          :qrCode,
          :ownerNumber,
          :ownerName,
          'N/A',
          'N/A',
          0,
          1,
          0,
          GETDATE(),
          GETDATE(),
          GETDATE(),
          GETDATE()
        )
      `, {
        replacements: {
          qrCode: finalQRCode,
          ownerNumber,
          ownerName: ownerName || "Unknown"
        }
      });
  
      // 🔥 THIS is what QR must contain
      const qrUrl = `${process.env.BASE_URL}/qr/r/${finalQRCode}`;
  
      return res.status(201).json({
        success: true,
        data: {
          qrCode: finalQRCode,
          qrUrl: qrUrl
        }
      });
  
    } catch (err) {
      console.error("❌ QR creation error:", err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  };
  
  
// exports.createQRCode = async (req, res) => {
//     try {
//     const { ownerNumber, ownerName, qrCode } = req.body;
    

//     if (!ownerNumber || !qrCode) {
//       return res.status(400).json({
//         success: false,
//         error: "Owner number and QR code are required"
//       });
//     }
    
//     const finalQRCode = qrCode || `QR_${ownerNumber}_${Date.now()}`;
    
//     const existing = await db.sequelize.query(
//       `SELECT 1 FROM QRScannerMst WHERE QRCode = :qrCode AND IsDelete = 0`,
//       {
//         replacements: { qrCode: finalQRCode },
//         type: db.Sequelize.QueryTypes.SELECT
//       }
//     );
    
//     if (existing.length > 0) {
//       return res.status(409).json({
//         success: false,
//         error: "QR code already exists"
//       });
//     }
    
//     // ✅ RAW INSERT (SQL handles all dates)
//     await db.sequelize.query(`
//       INSERT INTO QRScannerMst (
//         QRCode,
//         QROwnerNumber,
//         QROwnerName,
//         ScannerName,
//         ScannerNumber,
//         ScanCount,
//         Active,
//         IsDelete,
//         FirstScanDate,
//         LastScanDate,
//         CreatedAt,
//         UpdatedAt
//       )
//       VALUES (
//         :qrCode,
//         :ownerNumber,
//         :ownerName,
//         'N/A',
//         'N/A',
//         0,
//         1,
//         0,
//         GETDATE(),
//         GETDATE(),
//         GETDATE(),
//         GETDATE()
//       )
//     `, {
//       replacements: {
//         qrCode: finalQRCode,
//         ownerNumber,
//         ownerName: ownerName || "Unknown"
//       }
//     });
    
//     return res.status(201).json({
//       success: true,
//       message: "QR code created successfully",
//       data: {
//         qrCode: finalQRCode,
//         ownerNumber,
//         ownerName
//       }
//     });
    
    
//     } catch (err) {
//     console.error("❌ QR creation error:", err);
//     return res.status(500).json({
//     success: false,
//     error: err.message
//     });
//     }
//     };

exports.trackAndRedirect = async (req, res) => {
  try {
    const { qrCode } = req.params;

    console.log("QR ROUTE HIT:", qrCode);

    if (!qrCode) {
      return res.status(400).send("Invalid QR");
    }

    const qr = await db.QRScanner.findOne({
      where: {
        QRCode: qrCode,
        IsDelete: false
      }
    });

    if (!qr) {
      return res.status(404).send("QR not found");
    }

    // ===== DEVICE INFO =====
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "Unknown";

    const geo = geoip.lookup(ip);

    const locationAddress = geo
      ? `${geo.city || ""}, ${geo.region || ""}, ${geo.country || ""}`
      : "Unknown";

    // ===== SQL SAFE DATE FORMAT =====
    const now = new Date();

    const sqlDate =
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0") + " " +
      String(now.getHours()).padStart(2, "0") + ":" +
      String(now.getMinutes()).padStart(2, "0") + ":" +
      String(now.getSeconds()).padStart(2, "0") + "." +
      String(now.getMilliseconds()).padStart(3, "0");

    // ===== RAW INSERT (avoid Sequelize date conversion bug) =====
    await db.sequelize.query(`
      INSERT INTO QRScannerMst (
        QRCode,
        QROwnerNumber,
        QROwnerName,
        ScannerName,
        ScannerNumber,
        DeviceModel,
        DeviceOS,
        Latitude,
        Longitude,
        LocationAddress,
        ScanCount,
        FirstScanDate,
        LastScanDate,
        Active,
        IsDelete
      )
      VALUES (
        :qrCode,
        :ownerNumber,
        :ownerName,
        :scannerName,
        :scannerNumber,
        :deviceModel,
        :deviceOS,
        :lat,
        :lng,
        :location,
        1,
        :firstDate,
        :lastDate,
        1,
        0
      )
    `, {
      replacements: {
        qrCode: qr.QRCode,
        ownerNumber: qr.QROwnerNumber,
        ownerName: qr.QROwnerName || "QR Owner",
        scannerName: "External User",
        scannerNumber: ip,
        deviceModel: userAgent.substring(0, 200), // prevent overflow
        deviceOS: userAgent.substring(0, 200),
        lat: geo?.ll?.[0] || null,
        lng: geo?.ll?.[1] || null,
        location: locationAddress,
        firstDate: sqlDate,
        lastDate: sqlDate
      }
    });

    console.log("✅ Scan Recorded Successfully");

    // ===== REDIRECT =====
    return res.redirect(`https://wa.me/${qr.QROwnerNumber}`);

  } catch (err) {
    console.error("❌ Redirect error:", err);
    return res.status(500).send("Server error");
  }
};

    
      
exports.recordScan = async (req, res) => {
    try {
    const {
    qrCode,
    scannerName,
    scannerNumber,
    deviceBrand,
    deviceModel,
    deviceOS,
    latitude,
    longitude,
    locationAddress
    } = req.body;
    

    // Validation
    if (!qrCode || !scannerName || !scannerNumber) {
      return res.status(400).json({
        success: false,
        error: "QR code, scanner name, and number are required"
      });
    }
    
    // Extract owner number from QR code (format: https://wa.me/9876543210)
    let ownerNumber = qrCode;
    if (qrCode.includes('wa.me/')) {
      const match = qrCode.match(/wa\.me\/(\d+)/);
      ownerNumber = match ? match[1] : qrCode;
    } else if (qrCode.includes('phone=')) {
      const match = qrCode.match(/phone=(\d+)/);
      ownerNumber = match ? match[1] : qrCode;
    }
    
    // Check if scanner already exists for this QR
    const existingScan = await db.QRScanner.findOne({
      where: {
        QRCode: qrCode,
        ScannerNumber: scannerNumber,
        IsDelete: false
      }
    });
    
    // =============================
    // 🔁 REPEAT SCAN (UPDATE)
    // =============================
    if (existingScan) {
    
      await db.sequelize.query(`
        UPDATE QRScannerMst
        SET
          ScanCount = ScanCount + 1,
          LastScanDate = GETDATE(),
          DeviceBrand = :deviceBrand,
          DeviceModel = :deviceModel,
          DeviceOS = :deviceOS,
          Latitude = :latitude,
          Longitude = :longitude,
          LocationAddress = :locationAddress,
          UpdatedAt = GETDATE()
        WHERE QRCode = :qrCode
          AND ScannerNumber = :scannerNumber
          AND IsDelete = 0
      `, {
        replacements: {
          qrCode,
          scannerNumber,
          deviceBrand,
          deviceModel,
          deviceOS,
          latitude,
          longitude,
          locationAddress
        }
      });
    
      return res.json({
        success: true,
        message: "Scan recorded (repeat scan)",
        isNewScanner: false
      });
    }
    
    // =============================
    // 🆕 NEW SCAN (INSERT)
    // =============================
    await db.sequelize.query(`
      INSERT INTO QRScannerMst (
        QRCode,
        QROwnerNumber,
        QROwnerName,
        ScannerName,
        ScannerNumber,
        DeviceBrand,
        DeviceModel,
        DeviceOS,
        Latitude,
        Longitude,
        LocationAddress,
        ScanCount,
        FirstScanDate,
        LastScanDate,
        Active,
        IsDelete,
        CreatedAt,
        UpdatedAt
      )
      VALUES (
        :qrCode,
        :ownerNumber,
        'QR Owner',
        :scannerName,
        :scannerNumber,
        :deviceBrand,
        :deviceModel,
        :deviceOS,
        :latitude,
        :longitude,
        :locationAddress,
        1,
        GETDATE(),
        GETDATE(),
        1,
        0,
        GETDATE(),
        GETDATE()
      )
    `, {
      replacements: {
        qrCode,
        ownerNumber,
        scannerName,
        scannerNumber,
        deviceBrand,
        deviceModel,
        deviceOS,
        latitude,
        longitude,
        locationAddress
      }
    });
    
    return res.status(201).json({
      success: true,
      message: "New scan recorded",
      isNewScanner: true,
      scanCount: 1
    });
    
    
    } catch (err) {
    console.error("❌ Scan recording error:", err);
    return res.status(500).json({
    success: false,
    error: err.message
    });
    }
    };
    
exports.getScannersByQR = async (req, res) => {
  try {
    const { qrCode } = req.params;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        error: "QR code is required"
      });
    }

    const scanners = await db.QRScanner.findAll({
      where: {
        QRCode: qrCode,
        IsDelete: false,
        ScannerNumber: { [Op.ne]: "N/A" } // Exclude placeholder entries
      },
      order: [['LastScanDate', 'DESC']]
    });

    // Calculate statistics
    const totalScans = scanners.reduce((sum, s) => sum + s.ScanCount, 0);
    const uniqueScanners = scanners.length;

    return res.json({
      success: true,
      count: uniqueScanners,
      totalScans: totalScans,
      scanners: scanners
    });

  } catch (err) {
    console.error("❌ Get scanners error:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getScannersByOwnerNumber = async (req, res) => {
  try {
    const { ownerNumber } = req.params;

    if (!ownerNumber) {
      return res.status(400).json({
        success: false,
        error: "Owner number is required"
      });
    }

    const scanners = await db.QRScanner.findAll({
      where: {
        QROwnerNumber: ownerNumber,
        IsDelete: false,
        ScannerNumber: { [Op.ne]: "N/A" }
      },
      order: [['LastScanDate', 'DESC']]
    });

    const totalScans = scanners.reduce((sum, s) => sum + s.ScanCount, 0);
    const uniqueScanners = scanners.length;
    const uniqueNumbers = [...new Set(scanners.map(s => s.ScannerNumber))].length;

    return res.json({
      success: true,
      stats: {
        totalScans: totalScans,
        uniqueScanners: uniqueScanners,
        uniqueNumbers: uniqueNumbers
      },
      scanners: scanners
    });

  } catch (err) {
    console.error("❌ Get scanners by owner error:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.searchScanners = async (req, res) => {
  try {
    const { ownerNumber } = req.params;
    const { query } = req.query;

    if (!ownerNumber || !query) {
      return res.status(400).json({
        success: false,
        error: "Owner number and search query are required"
      });
    }

    const scanners = await db.QRScanner.findAll({
      where: {
        QROwnerNumber: ownerNumber,
        IsDelete: false,
        ScannerNumber: { [Op.ne]: "N/A" },
        [Op.or]: [
          { ScannerName: { [Op.like]: `%${query}%` } },
          { ScannerNumber: { [Op.like]: `%${query}%` } }
        ]
      },
      order: [['LastScanDate', 'DESC']]
    });

    return res.json({
      success: true,
      count: scanners.length,
      scanners: scanners
    });

  } catch (err) {
    console.error("❌ Search scanners error:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.deleteScanner = async (req, res) => {
  try {
    const { id } = req.params;

    const scanner = await db.QRScanner.findOne({
      where: {
        QRScannerId: id,
        IsDelete: false
      }
    });

    if (!scanner) {
      return res.status(404).json({
        success: false,
        error: "Scanner not found"
      });
    }

    // Soft delete
    scanner.IsDelete = true;
    scanner.Active = false;
    await scanner.save();

    return res.json({
      success: true,
      message: "Scanner deleted successfully"
    });

  } catch (err) {
    console.error("❌ Delete scanner error:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getStatsByOwner = async (req, res) => {
  try {
    const { ownerNumber } = req.params;

    if (!ownerNumber) {
      return res.status(400).json({
        success: false,
        error: "Owner number is required"
      });
    }

    const scanners = await db.QRScanner.findAll({
      where: {
        QROwnerNumber: ownerNumber,
        IsDelete: false,
        ScannerNumber: { [Op.ne]: "N/A" }
      },
      order: [['LastScanDate', 'DESC']],
      limit: 10
    });

    const allScanners = await db.QRScanner.findAll({
      where: {
        QROwnerNumber: ownerNumber,
        IsDelete: false,
        ScannerNumber: { [Op.ne]: "N/A" }
      }
    });

    const totalScans = allScanners.reduce((sum, s) => sum + s.ScanCount, 0);
    const uniqueNumbers = [...new Set(allScanners.map(s => s.ScannerNumber))].length;

    return res.json({
      success: true,
      stats: {
        totalUniqueScans: allScanners.length,
        totalScanCount: totalScans,
        uniqueNumbers: uniqueNumbers,
        recentScans: scanners
      }
    });

  } catch (err) {
    console.error("❌ Get stats error:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};