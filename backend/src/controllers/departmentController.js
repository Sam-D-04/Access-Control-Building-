const {
    findDepartmentById,
    getAllDepartments,
    getRootDepartments,
    getDirectChildren,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getAllDepartmentsWithCount,
    buildDepartmentTree
} = require('../models/Department');

// ===============================================
// DEPARTMENT CRUD
// ===============================================

// GET /api/departments - Lấy tất cả departments
async function getAllDepartmentsHandler(req, res, next) {
    try {
        const { format } = req.query; // ?format=tree để lấy dạng cây
        
        if (format === 'tree') {
            const tree = await buildDepartmentTree();
            return res.json({
                success: true,
                data: tree
            });
        } else {
            const departments = await getAllDepartmentsWithCount();
            return res.json({
                success: true,
                data: departments,
                count: departments.length
            });
        }

    } catch (error) {
        console.error('Error in getAllDepartmentsHandler:', error);
        next(error);
    }
}

// GET /api/departments/:id - Lấy thông tin department theo ID
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

// GET /api/departments/root - Lấy departments gốc (level 0)
async function getRootDepartmentsHandler(req, res, next) {
    try {
        const rootDepts = await getRootDepartments();

        return res.json({
            success: true,
            data: rootDepts,
            count: rootDepts.length
        });

    } catch (error) {
        console.error('Error in getRootDepartmentsHandler:', error);
        next(error);
    }
}

// GET /api/departments/:id/children - Lấy children trực tiếp
async function getChildrenHandler(req, res, next) {
    try {
        const deptId = req.params.id;

        const children = await getDirectChildren(deptId);

        return res.json({
            success: true,
            data: children,
            count: children.length
        });

    } catch (error) {
        console.error('Error in getChildrenHandler:', error);
        next(error);
    }
}

// POST /api/departments - Tạo department mới
async function createDepartmentHandler(req, res, next) {
    try {
        const { name, parent_id, description } = req.body;

        // Validate
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: name'
            });
        }

        const newDeptId = await createDepartment({ name, parent_id, description });

        const newDept = await findDepartmentById(newDeptId);

        return res.status(201).json({
            success: true,
            message: 'Tạo phòng ban thành công',
            data: newDept
        });

    } catch (error) {
        console.error('Error in createDepartmentHandler:', error);

        if (error.message.includes('không tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    }
}

// PUT /api/departments/:id - Cập nhật department
async function updateDepartmentHandler(req, res, next) {
    try {
        const deptId = req.params.id;
        const { name, parent_id, description } = req.body;

        // Check exists
        const dept = await findDepartmentById(deptId);
        if (!dept) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phòng ban'
            });
        }

        const updated = await updateDepartment(deptId, { name, parent_id, description });

        if (!updated) {
            return res.status(500).json({
                success: false,
                message: 'Không thể cập nhật phòng ban'
            });
        }

        const updatedDept = await findDepartmentById(deptId);

        return res.json({
            success: true,
            message: 'Cập nhật phòng ban thành công',
            data: updatedDept
        });

    } catch (error) {
        console.error('Error in updateDepartmentHandler:', error);

        if (error.message.includes('circular') || error.message.includes('không tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    }
}

// DELETE /api/departments/:id - Xóa department
async function deleteDepartmentHandler(req, res, next) {
    try {
        const deptId = req.params.id;

        // Check exists
        const dept = await findDepartmentById(deptId);
        if (!dept) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phòng ban'
            });
        }

        const deleted = await deleteDepartment(deptId);

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Không thể xóa phòng ban'
            });
        }

        return res.json({
            success: true,
            message: 'Xóa phòng ban thành công'
        });

    } catch (error) {
        console.error('Error in deleteDepartmentHandler:', error);

        if (error.message.includes('nhân viên') || error.message.includes('phòng ban con')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        next(error);
    }
}

module.exports = {
    getAllDepartmentsHandler,
    getDepartmentByIdHandler,
    getRootDepartmentsHandler,
    getChildrenHandler,
    createDepartmentHandler,
    updateDepartmentHandler,
    deleteDepartmentHandler
};
