// const router = require("express").Router();

// const pcController = require("./pc.controller");

// const TOKEN = process.env.PC_API_TOKEN || "PC_MASTER_TOKEN";

// // 🔐 AUTH
// router.use((req, res, next) => {
//   const token = req.headers.token || req.headers.authorization;
//   if (token !== TOKEN && token !== `Bearer ${TOKEN}`) {
//     return res.status(401).json({ success: false, message: "Unauthorized" });
//   }
//   next();
// });

// // ✅ ROUTES
// router.post("/register", pcController.registerPc);
// router.get("/list", pcController.listPcs);
// router.post("/command", pcController.sendCommand);
// router.get("/poll/:pcId", pcController.pollCommand);
// router.get("/status/:pcId", pcController.getPcStatus);
// router.delete("/:pcId", pcController.deletePc);

// module.exports = router;
const router = require('express').Router();
const pc = require('../controllers/pc.controller');

const TOKEN = process.env.PC_API_TOKEN || 'PC_MASTER_TOKEN';

router.use((req, res, next) => {
    const token =
        req.headers['x-pc-token'] ||
        req.headers['token'] ||
        req.headers['authorization'];

    if (!token || token !== TOKEN) {
        console.log("❌ PC AUTH FAILED");
        console.log("Received:", token);
        console.log("Expected:", TOKEN);
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
});


router.post('/register', pc.registerPc);
router.get('/list', pc.listPcs);
router.post('/command', pc.sendCommand);
router.get('/poll/:pcId', pc.pollCommand);

module.exports = router;
