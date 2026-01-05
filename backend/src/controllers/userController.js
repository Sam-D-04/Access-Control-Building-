const {
    findUserById,
    findUserByEmail,
    findUserByEmployeeId,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
} = require('../models/User');

// GET /api/users - Lấy danh sách tất cả users
async function getAllUsersHandler(req, res, next) {
    try {
        const users = await getAllUsers();

        // Không trả về password trong response
        const usersWithoutPassword = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        return res.json({
            success: true,
            data: usersWithoutPassword,
            count: usersWithoutPassword.length
        });

    } catch (error) {
        console.error('Error in getAllUsersHandler:', error);
        next(error);
    }
}

// GET /api/users/:id - Lấy thông tin user theo ID
async function getUserByIdHandler(req, res, next) {
    try {
        const userId = req.params.id;

        const user = await findUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy user'
            });
        }

        // Không trả về password
        const { password, ...userWithoutPassword } = user;

        return res.json({
            success: true,
            data: userWithoutPassword
        });

    } catch (error) {
        console.error('Error in getUserByIdHandler:', error);
        next(error);
    }
}

// POST /api/users - Tạo user mới 
async function createUserHandler(req, res, next) {
    try {
        const {
            employee_id,
            email,
            password,
            full_name,
            phone,
            avatar,
            department_id,
            position,
            role,
            is_active
        } = req.body;

        // Validate required fields
        if (!employee_id || !email || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: employee_id, email, password, full_name'
            });
        }

        // Kiểm tra email đã tồn tại chưa
        const existingEmail = await findUserByEmail(email);
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Kiểm tra employee_id đã tồn tại chưa
        const existingEmployeeId = await findUserByEmployeeId(employee_id);
        if (existingEmployeeId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID đã được sử dụng'
            });
        }

        // Validate position
        const validPositions = ['staff', 'manager', 'director'];
        if (position && !validPositions.includes(position)) {
            return res.status(400).json({
                success: false,
                message: 'position phải là: staff, manager, hoặc director'
            });
        }

        // Validate role
        const validRoles = ['admin', 'security', 'employee'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'role phải là: admin, security, hoặc employee'
            });
        }

        const userData = {
            employee_id,
            email,
            password,
            full_name,
            phone,
            avatar,
            department_id,
            position: position || 'staff',
            role: role || 'employee',
            is_active: is_active !== undefined ? is_active : true
        };

        const newUser = await createUser(userData);

        // Không trả về password
        const { password: pwd, ...userWithoutPassword } = newUser;

        console.log('User created:', newUser.employee_id, newUser.full_name);

        return res.status(201).json({
            success: true,
            message: 'Tạo user thành công',
            data: userWithoutPassword
        });

    } catch (error) {
        console.error('Error in createUserHandler:', error);
        next(error);
    }
}

// PUT /api/users/:id - Cập nhật thông tin user 
async function updateUserHandler(req, res, next) {
    try {
        const userId = req.params.id;
        const {
            email,
            password,
            full_name,
            phone,
            avatar,
            department_id,
            position,
            role,
            is_active
        } = req.body;

        // Kiểm tra user có tồn tại không
        const existingUser = await findUserById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy user'
            });
        }

        // Kiểm tra email đã được dùng bởi user khác chưa
        if (email && email !== existingUser.email) {
            const emailInUse = await findUserByEmail(email);
            if (emailInUse) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã được sử dụng bởi user khác'
                });
            }
        }

        // Validate position nếu có
        const validPositions = ['staff', 'manager', 'director'];
        if (position && !validPositions.includes(position)) {
            return res.status(400).json({
                success: false,
                message: 'position phải là: staff, manager, hoặc director'
            });
        }

        // Validate role nếu có
        const validRoles = ['admin', 'security', 'employee'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'role phải là: admin, security, hoặc employee'
            });
        }

        const userData = {};
        if (email !== undefined) userData.email = email;
        if (password !== undefined) userData.password = password;
        if (full_name !== undefined) userData.full_name = full_name;
        if (phone !== undefined) userData.phone = phone;
        if (avatar !== undefined) userData.avatar = avatar;
        if (department_id !== undefined) userData.department_id = department_id;
        if (position !== undefined) userData.position = position;
        if (role !== undefined) userData.role = role;
        if (is_active !== undefined) userData.is_active = is_active;

        const updatedUser = await updateUser(userId, userData);

        // Không trả về password
        const { password: pwd, ...userWithoutPassword } = updatedUser;

        console.log('User updated:', updatedUser.employee_id, updatedUser.full_name);

        return res.json({
            success: true,
            message: 'Cập nhật user thành công',
            data: userWithoutPassword
        });

    } catch (error) {
        console.error('Error in updateUserHandler:', error);
        next(error);
    }
}

// DELETE /api/users/:id - Xóa user
async function deleteUserHandler(req, res, next) {
    try {
        const userId = req.params.id;

        // Kiểm tra user có tồn tại không
        const existingUser = await findUserById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy user'
            });
        }

        // Không cho phép xóa chính mình
        if (req.user.id === parseInt(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa chính mình'
            });
        }

        const deleted = await deleteUser(userId);

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Xóa user thất bại'
            });
        }

        console.log('User deleted:', existingUser.employee_id, existingUser.full_name);

        return res.json({
            success: true,
            message: 'Đã xóa user thành công'
        });

    } catch (error) {
        console.error('Error in deleteUserHandler:', error);
        next(error);
    }
}

module.exports = {
    getAllUsersHandler,
    getUserByIdHandler,
    createUserHandler,
    updateUserHandler,
    deleteUserHandler
};
