const {
    findDoorById,
    getAllDoors,
    getDoorsByDepartment,
    createDoor,
    updateDoor,
    lockDoor: lockDoorModel,
    unlockDoor: unlockDoorModel,
    deleteDoor
} = require('../models/Door');

const { publishMessage } = require('../config/mqtt');

// GET /api/doors - Lấy danh sách tất cả cửa
async function getDoorsHandler(req, res, next) {
    try {
        const { department_id } = req.query;

        let doors;

        // Filter theo department_id nếu có
        if (department_id) {
            doors = await getDoorsByDepartment(department_id);
        } else {
            doors = await getAllDoors();
        }

        return res.json({
            success: true,
            data: doors,
            count: doors.length
        });

    } catch (error) {
        console.error('Error in getDoorsHandler:', error);
        next(error);
    }
}

// GET /api/doors/:id - Lấy thông tin cửa theo ID
async function getDoorByIdHandler(req, res, next) {
    try {
        const doorId = req.params.id;

        const door = await findDoorById(doorId);

        if (!door) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cửa'
            });
        }

        return res.json({
            success: true,
            data: door
        });

    } catch (error) {
        console.error('Error in getDoorByIdHandler:', error);
        next(error);
    }
}

// POST /api/doors - Tạo cửa mới
async function createDoorHandler(req, res, next) {
    try {
        const { name, location, department_id, is_locked, is_active } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tên cửa'
            });
        }

        const doorData = {
            name,
            location,
            department_id: department_id || null,
            is_locked: is_locked !== undefined ? is_locked : false,
            is_active: is_active !== undefined ? is_active : true
        };

        const newDoor = await createDoor(doorData);

        console.log('Door created:', newDoor.id, newDoor.name, 'Department:', newDoor.department_name || 'None');

        return res.status(201).json({
            success: true,
            message: 'Tạo cửa thành công',
            data: newDoor
        });

    } catch (error) {
        console.error('Error in createDoorHandler:', error);
        next(error);
    }
}

// PUT /api/doors/:id - Cập nhật thông tin cửa
async function updateDoorHandler(req, res, next) {
    try {
        const doorId = req.params.id;
        const { name, location, department_id, is_locked, is_active } = req.body;

        // Kiểm tra cửa có tồn tại không
        const existingDoor = await findDoorById(doorId);
        if (!existingDoor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cửa'
            });
        }

        const doorData = {};
        if (name !== undefined) doorData.name = name;
        if (location !== undefined) doorData.location = location;
        if (department_id !== undefined) doorData.department_id = department_id;
        if (is_locked !== undefined) doorData.is_locked = is_locked;
        if (is_active !== undefined) doorData.is_active = is_active;

        const updatedDoor = await updateDoor(doorId, doorData);

        console.log('Door updated:', updatedDoor.id, updatedDoor.name);

        return res.json({
            success: true,
            message: 'Cập nhật cửa thành công',
            data: updatedDoor
        });

    } catch (error) {
        console.error('Error in updateDoorHandler:', error);
        next(error);
    }
}

// PUT /api/doors/:id/lock - Khóa cửa khẩn cấp + MQTT
async function lockDoorHandler(req, res, next) {
    try {
        const doorId = req.params.id;

        // Kiểm tra cửa có tồn tại không
        const existingDoor = await findDoorById(doorId);
        if (!existingDoor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cửa'
            });
        }

        // Kiểm tra cửa đã bị khóa chưa
        if (existingDoor.is_locked) {
            return res.status(400).json({
                success: false,
                message: 'Cửa đã ở trạng thái khóa'
            });
        }

        // Lock cửa
        const lockedDoor = await lockDoorModel(doorId);

        // Publish MQTT 
        publishMessage('door/lock', {
            type: 'door_locked',
            door_id: lockedDoor.id,
            door_name: lockedDoor.name,
            location: lockedDoor.location,
            locked_by: req.user.full_name,
            locked_at: new Date().toISOString()
        });

        console.log('Door locked:', lockedDoor.name, 'by', req.user.full_name);

        return res.json({
            success: true,
            message: 'Đã khóa cửa thành công',
            data: lockedDoor
        });

    } catch (error) {
        console.error('Error in lockDoorHandler:', error);
        next(error);
    }
}

// PUT /api/doors/:id/unlock - Mở khóa cửa + MQTT
async function unlockDoorHandler(req, res, next) {
    try {
        const doorId = req.params.id;

        // Kiểm tra cửa có tồn tại không
        const existingDoor = await findDoorById(doorId);
        if (!existingDoor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cửa'
            });
        }

        // Kiểm tra cửa đã mở chưa
        if (!existingDoor.is_locked) {
            return res.status(400).json({
                success: false,
                message: 'Cửa đã ở trạng thái mở'
            });
        }

        // Unlock cửa
        const unlockedDoor = await unlockDoorModel(doorId);

        // Publish MQTT event
        publishMessage('door/unlock', {
            type: 'door_unlocked',
            door_id: unlockedDoor.id,
            door_name: unlockedDoor.name,
            location: unlockedDoor.location,
            unlocked_by: req.user.full_name,
            unlocked_at: new Date().toISOString()
        });

        console.log('Door unlocked:', unlockedDoor.name, 'by', req.user.full_name);

        return res.json({
            success: true,
            message: 'Đã mở khóa cửa thành công',
            data: unlockedDoor
        });

    } catch (error) {
        console.error('Error in unlockDoorHandler:', error);
        next(error);
    }
}

// DELETE /api/doors/:id - Xóa cửa
async function deleteDoorHandler(req, res, next) {
    try {
        const doorId = req.params.id;

        // Kiểm tra cửa có tồn tại không
        const existingDoor = await findDoorById(doorId);
        if (!existingDoor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cửa'
            });
        }

        // Soft delete (set is_active = FALSE)
        const deleted = await deleteDoor(doorId);

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Xóa cửa thất bại'
            });
        }

        console.log('Door deleted:', existingDoor.name, 'by', req.user.full_name);

        return res.json({
            success: true,
            message: 'Đã xóa cửa thành công'
        });

    } catch (error) {
        console.error('Error in deleteDoorHandler:', error);
        next(error);
    }
}

module.exports = {
    getDoorsHandler,
    getDoorByIdHandler,
    createDoorHandler,
    updateDoorHandler,
    lockDoorHandler,
    unlockDoorHandler,
    deleteDoorHandler
};
