const jwt = require('jsonwebtoken');
const { findUserByEmail, verifyPassword } = require('../models/User');
const { CustomError } = require('../middlewares/errorHandler');

// Controller xử lý login
async function login(req, res) {
    try {
        // Lấy email và password từ request body
        const { email, password } = req.body;

        // Kiểm tra có nhập email và password không
        if (!email || !password) {
            throw new CustomError('Email và password là bắt buộc', 400);
        }

        // Tìm user trong database theo email
        const user = await findUserByEmail(email);

        // Kiểm tra user có tồn tại không
        if (!user) {
            throw new CustomError('Email hoặc password không đúng', 401);
        }

        // Kiểm tra user có bị vô hiệu hóa không
        if (!user.is_active) {
            throw new CustomError('Tài khoản đã bị vô hiệu hóa', 403);
        }

        // Kiểm tra password có đúng không
        const isPasswordValid = await verifyPassword(password, user.password);

        if (!isPasswordValid) {
            throw new CustomError('Email hoặc password không đúng', 401);
        }

        // Tạo JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '24h'  
            }
        );

        // Tạo object user để trả về (không bao gồm password)
        const userData = {
            id: user.id,
            employee_id: user.employee_id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            department_id: user.department_id,
            position: user.position,
            role: user.role,
            is_active: user.is_active
        };

        // Log để debug
        console.log('User logged in:', user.email);

        // Trả về response
        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token: token,
            user: userData
        });
    } catch (error) {
      
    }
}

// Controller lấy thông tin user hiện tại
async function getMe(req, res) {
    try {
         
        const user = req.user;

         
        const userData = {
            id: user.id,
            employee_id: user.employee_id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            department_id: user.department_id,
            position: user.position,
            role: user.role,
            is_active: user.is_active,
            created_at: user.created_at
        };

         
        res.json({
            success: true,
            user: userData
        });
    } catch (error) {
       
    }
}

module.exports = {
    login,
    getMe
};
