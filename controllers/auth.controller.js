const { Op } = require("sequelize");
const { AppError } = require("../utils/AppError");
const { hashPassword, comparePassword } = require("../utils/hash.utils");
const jwt = require('jsonwebtoken');
const jwtConfig = require("../config/jwt.config");
const db = require("../config/dbConnection");

exports.login = async (req, res) => {
    const { Username, Password } = req.body;

    const user = await db.UserMst.scope("withHash").findOne({
        where: { Username: { [Op.eq]: Username }, IsDelete: false, Active: true },
    });

    if (!user) {
        throw new AppError("User not found or inactive", 404);
    }

    const isPasswordValid = await comparePassword(Password, user.Password);
    if (!isPasswordValid) {
        throw new AppError("Invalid password", 400);
    }

    const tokenPayload = {
        UserMstId: user.UserMstId,
        Username: user.Username,
        UserType: user.UserType,
    };

    const token = jwt.sign(tokenPayload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

    user.Token = token;
    user.TokenCreatedDate = new Date().toISOString();
    await user.save();

    return res.status(200).json({
        message: "Login successful",
        token,
        user: {
            UserMstId: user.UserMstId,
            Username: user.Username,
            UserType: user.UserType,
            Edit_Rights: user.Edit_Rights,
            Delete_Rights: user.Delete_Rights,
        },
    });
};

exports.register = async (req, res) => {
    const { Username, Password, UserType, UserGrp, CompanyCode, Edit, Delete } = req.body;

    // 1. Check for existing user
    const existingUser = await db.UserMst.findOne({
        where: { Username: { [Op.eq]: Username } },
    });

    if (existingUser) {
        throw new AppError("Username already exists", 400);
    }

    // 2. Hash password and prepare payload
    const hashedPassword = await hashPassword(Password);
    const newUser = {
        Username,
        Password: hashedPassword,
        UserType,
        UserGrp,
        Sflag: "I",
        CompanyCode: CompanyCode || null,
        Active: true,
        IsDelete: false,
        Edit_Rights: Edit,
        Delete_Rights: Delete,
        SortId: 1,
    };

    // 3. Create user and respond
    const entry = await db.UserMst.create(newUser);
    return res.status(201).json({ message: "User registered successfully" });
};