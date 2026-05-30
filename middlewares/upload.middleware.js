
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.random().toString(36).substring(2, 8);

    let ext = ".jpg";
    if (file.originalname) {
      const e = path.extname(file.originalname);
      if (e) ext = e;
    }

    cb(null, `emp-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype) {
    return cb(new Error("Invalid file"), false);
  }

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/jpg",   

    "application/pdf",
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(
      new Error("Only JPG, PNG, PDF allowed"),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
