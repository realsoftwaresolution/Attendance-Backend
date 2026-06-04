const jwt = require('jsonwebtoken');

exports.verifyToken1 = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
  
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Token not found" 
      });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token" 
      });
    }
  };