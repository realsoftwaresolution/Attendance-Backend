const { Op } = require("sequelize");
const db = require("../models");
const { AppError } = require("../utils/AppError");
const { hashPassword } = require("../utils/hash.utils");

exports.editUser = async (req, res) => {
    const { id } = req.params;
    const { Username, Password, UserType, UserGrp, CompanyCode, Edit, Delete } = req.body;

    // 1. Find the existing user
    const user = await db.UserMst.findByPk(id);
    if (!user) {
        throw new AppError("User not found", 404);
    }

    // 2. Check if username is being changed and is already taken
    if (Username && Username !== user.Username) {
        const existing = await db.UserMst.findOne({
            where: {
                Username,
                UserMstId: { [Op.ne]: id }
            }
        });
        if (existing) {
            throw new AppError("Username already exists", 400);
        }
    }

    // 3. Prepare update payload
    const updatedFields = {
        Username,
        UserType,
        UserGrp,
        CompanyCode: CompanyCode || null,
        Edit_Rights: Edit,
        Delete_Rights: Delete,
    };

    // 4. Conditionally hash and update password if provided
    if (Password && Password.trim() !== '') {
        updatedFields.Password = await hashPassword(Password);
    }

    // 5. Update user and respond
    const entry = await user.update(updatedFields);
    return res.status(200).json({ message: "User updated successfully", entry });
};