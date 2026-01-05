const {
    findDepartmentById,
    getAllDepartments,
    getAllDepartmentsWithCount
} = require('../models/Department');

// GET /api/departments - Lấy danh sách tất cả phòng ban
async function getAllDepartmentsHandler(req, res, next) {
    try {
        const { with_count } = req.query;

        let departments;

        // Nếu muốn kèm số nhân viên
        if (with_count === 'true') {
            departments = await getAllDepartmentsWithCount();
        }
        // Lấy danh sách thông thường
        else {
            departments = await getAllDepartments();
        }

        return res.json({
            success: true,
            data: departments,
            count: departments.length
        });

    } catch (error) {
        console.error('Error in getAllDepartmentsHandler:', error);
        next(error);
    }
}

// GET /api/departments/:id - Lấy thông tin phòng ban theo ID
async function getDepartmentByIdHandler(req, res, next) {
    try {
        const deptId = req.params.id;

        const department = await findDepartmentById(deptId);

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phòng ban'
            });
        }

        return res.json({
            success: true,
            data: department
        });

    } catch (error) {
        console.error('Error in getDepartmentByIdHandler:', error);
        next(error);
    }
}

module.exports = {
    getAllDepartmentsHandler,
    getDepartmentByIdHandler
};
