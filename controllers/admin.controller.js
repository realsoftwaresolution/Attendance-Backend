const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt.config");
const  db = require("../models"); // Import the model
const { hashPassword, comparePassword } = require("../utils/hash.util");
const { Op } = require("sequelize");

// Admin Registration
exports.register = async (req, res) => {
    try {
      const { Username, Password, UserType, UserGrp, CompanyCode } = req.body;
  
      // Check for existing user
      const existingUser = await db.UserMst.findOne({
        where: { Username: { [Op.eq]: Username } },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
  
      // Hash the password
      const hashedPassword = await hashPassword(Password);
  
      // Prepare the payload
      const newUser = {
        Username,
        Password: hashedPassword,
        UserType: UserType, // Default UserType
        UserGrp: UserGrp,      // Optional field
        Sflag: "I",                    // Default 'Y' flag
        SDate: new Date().toISOString(), // Current date as ISO string
        CompanyCode: CompanyCode || null,
        Active: true,                  // Default active user
        IsDelete: false,               // Default not deleted
      };
  
      // Create the user
      await db.UserMst.create(newUser);
  
      return res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      console.error("Registration Error:", err);
      return res.status(500).json({ error: "An error occurred during registration" });
    }
  };

// Admin Login
exports.login = async (req, res) => {
    try {
      const { Username, Password } = req.body;
  
      // Check if the user exists
      const user = await db.UserMst.scope("withHash").findOne({
        where: { Username: { [Op.eq]: Username }, IsDelete: false, Active: true },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found or inactive" });
      }
  
      // Validate password
      const isPasswordValid = await comparePassword(Password, user.Password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid password" });
      }
  
      // Generate JWT Token
      const tokenPayload = {
        UserMstId: user.UserMstId,
        Username: user.Username,
        UserType: user.UserType,
      };
      const token = jwt.sign(tokenPayload, secret, { expiresIn: "1h" });
  
      // Update token and timestamp in database
      user.Token = token;
      user.TokenCreatedDate = new Date().toISOString();
      await user.save();
  
      // Return the token
      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          UserMstId: user.UserMstId,
          Username: user.Username,
          UserType: user.UserType,
        },
      });
    } catch (err) {
      console.error("Login Error:", err);
      return res.status(500).json({ error: "An error occurred during login" });
    }
  };

// Create Employee
exports.createEmployee = async (req, res) => {
    try {
      // Check if the logged-in user has the admin role
      if (req.user.UserType !== 'Admin') {
        return res.status(403).json({ error: 'You do not have permission to create an employee' });
      }
  
      // Proceed with employee creation if user is admin
      const { name, empPassword, empType } = req.body;
  
      // Hash the password before saving
      const hashedPassword = await hashPassword(empPassword);
  
      // Create the new employee
      const employee = await db.EmployeeMst.create({
        EmpName: name,
        EmpType: empType,
        EmpPassword: hashedPassword,
      });
  
      // Respond with the created employee
      return res.status(201).json(employee);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

// Update Employee
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    await Employee.update(req.body, { where: { id } });
    return res.json({ message: "Employee updated successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
