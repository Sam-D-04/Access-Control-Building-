const { executeQuery, getOneRow } = require('../config/database');

async function findDepartmentById(deptId) {
    const sql = `
        SELECT 
            d.*,
            p.name as parent_name
        FROM departments d
        LEFT JOIN departments p ON d.parent_id = p.id
        WHERE d.id = ?
    `;
    const department = await getOneRow(sql, [deptId]);
    return department;
}

async function getAllDepartments() {
    const sql = `
        SELECT 
            d.*,
            p.name as parent_name
        FROM departments d
        LEFT JOIN departments p ON d.parent_id = p.id
        ORDER BY d.level ASC, d.parent_id ASC, d.id ASC
    `;
    const departments = await executeQuery(sql);
    return departments;
}


async function getDepartmentsByLevel(level) {
    const sql = `
        SELECT 
            d.*,
            p.name as parent_name
        FROM departments d
        LEFT JOIN departments p ON d.parent_id = p.id
        WHERE d.level = ?
        ORDER BY d.name ASC
    `;
    const departments = await executeQuery(sql, [level]);
    return departments;
}


async function getRootDepartments() {
    return getDepartmentsByLevel(0);
}


async function createDepartment(data) {
    const { name, parent_id, description } = data;
    
    // Tính level dựa vào parent
    let level = 0;
    if (parent_id) {
        const parent = await findDepartmentById(parent_id);
        if (!parent) {
            throw new Error('Parent department không tồn tại');
        }
        level = parent.level + 1;
    }
    
    const sql = `
        INSERT INTO departments (name, parent_id, level, description)
        VALUES (?, ?, ?, ?)
    `;
    
    const result = await executeQuery(sql, [name, parent_id || null, level, description || null]);
    return result.insertId;
}


async function updateDepartment(deptId, data) {
    const { name, parent_id, description } = data;
    
    // Kiểm tra không cho phép set parent
    if (parent_id && parseInt(parent_id) === parseInt(deptId)) {
        throw new Error('Không thể set parent là chính nó');
    }
    
    // Kiểm tra không cho phép tạo circular reference
    if (parent_id) {
        const isCircular = await checkCircularReference(deptId, parent_id);
        if (isCircular) {
            throw new Error('Không thể tạo circular reference (A → B → A)');
        }
    }
    
    // Tính lại level nếu thay đổi parent
    let level = 0;
    if (parent_id) {
        const parent = await findDepartmentById(parent_id);
        if (!parent) {
            throw new Error('Parent department không tồn tại');
        }
        level = parent.level + 1;
    }
    
    const sql = `
        UPDATE departments
        SET 
            name = COALESCE(?, name),
            parent_id = ?,
            level = ?,
            description = COALESCE(?, description)
        WHERE id = ?
    `;
    
    const result = await executeQuery(sql, [
        name || null,
        parent_id || null,
        level,
        description || null,
        deptId
    ]);
    
    // Cập nhật lại level của tất cả children 
    await updateChildrenLevels(deptId);
    
    return result.affectedRows > 0;
}


async function deleteDepartment(deptId) {
    // Check xem có nhân viên không
    const countSql = 'SELECT COUNT(*) as count FROM users WHERE department_id = ?';
    const countResult = await getOneRow(countSql, [deptId]);
    
    if (countResult.count > 0) {
        throw new Error(`Không thể xóa phòng ban có ${countResult.count} nhân viên. Vui lòng chuyển nhân viên sang phòng khác trước.`);
    }
    
    // Check xem có children không
    const childrenSql = 'SELECT COUNT(*) as count FROM departments WHERE parent_id = ?';
    const childrenResult = await getOneRow(childrenSql, [deptId]);
    
    if (childrenResult.count > 0) {
        throw new Error(`Không thể xóa phòng ban có ${childrenResult.count} phòng ban con. Vui lòng xóa hoặc di chuyển các phòng con trước.`);
    }
    
    const sql = 'DELETE FROM departments WHERE id = ?';
    const result = await executeQuery(sql, [deptId]);
    return result.affectedRows > 0;
}


async function getDepartmentAncestors(deptId) {
    const ancestors = [];
    let currentId = deptId;
    
    while (currentId) {
        ancestors.push(currentId);
        
        const sql = 'SELECT parent_id FROM departments WHERE id = ?';
        const dept = await getOneRow(sql, [currentId]);
        
        if (dept && dept.parent_id) {
            currentId = dept.parent_id;
        } else {
            break;
        }
    }
    
    return ancestors;
}


async function getDepartmentDescendants(deptId) {
    const descendants = [deptId];
    
    const sql = 'SELECT id FROM departments WHERE parent_id = ?';
    const directChildren = await executeQuery(sql, [deptId]);
    
    for (const child of directChildren) {
        const subDescendants = await getDepartmentDescendants(child.id);
        descendants.push(...subDescendants);
    }
    
    return descendants;
}


async function getDirectChildren(deptId) {
    const sql = `
        SELECT 
            d.*,
            COUNT(u.id) as employee_count
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id
        WHERE d.parent_id = ?
        GROUP BY d.id
        ORDER BY d.name ASC
    `;
    
    const children = await executeQuery(sql, [deptId]);
    return children;
}


async function countEmployeesInDepartment(deptId, includeChildren = false) {
    if (!includeChildren) {
        // Chỉ đếm nhân viên trực tiếp
        const sql = `
            SELECT COUNT(*) as count
            FROM users
            WHERE department_id = ?
        `;
        const result = await getOneRow(sql, [deptId]);
        return result.count;
    } else {
        // Đếm cả nhân viên của các phòng con
        const descendants = await getDepartmentDescendants(deptId);
        const placeholders = descendants.map(() => '?').join(',');
        
        const sql = `
            SELECT COUNT(*) as count
            FROM users
            WHERE department_id IN (${placeholders})
        `;
        const result = await getOneRow(sql, descendants);
        return result.count;
    }
}


async function getAllDepartmentsWithCount() {
    const sql = `
        SELECT
            d.id,
            d.name,
            d.parent_id,
            d.level,
            d.description,
            d.created_at,
            p.name as parent_name,
            COUNT(DISTINCT u.id) as employee_count,
            COUNT(DISTINCT doors.id) as door_count,
            m.id as manager_id,
            m.full_name as manager_name
        FROM departments d
        LEFT JOIN departments p ON d.parent_id = p.id
        LEFT JOIN users u ON d.id = u.department_id
        LEFT JOIN users m ON d.id = m.department_id AND m.position = 'Manager'
        LEFT JOIN doors ON d.id = doors.department_id
        GROUP BY d.id, m.id, m.full_name
        ORDER BY d.level ASC, d.parent_id ASC, d.name ASC
    `;

    const departments = await executeQuery(sql);
    return departments;
}


async function buildDepartmentTree() {
    const allDepts = await getAllDepartmentsWithCount();
    
    // Build map
    const deptMap = {};
    allDepts.forEach(dept => {
        deptMap[dept.id] = {
            ...dept,
            children: []
        };
    });
    
    // Build tree
    const tree = [];
    allDepts.forEach(dept => {
        if (dept.parent_id === null) {
            tree.push(deptMap[dept.id]);
        } else {
            if (deptMap[dept.parent_id]) {
                deptMap[dept.parent_id].children.push(deptMap[dept.id]);
            }
        }
    });
    
    return tree;
}


async function checkCircularReference(deptId, newParentId) {
    const descendants = await getDepartmentDescendants(deptId);
    return descendants.includes(newParentId);
}


async function updateChildrenLevels(deptId) {
    const dept = await findDepartmentById(deptId);
    const children = await getDirectChildren(deptId);
    
    for (const child of children) {
        const newLevel = dept.level + 1;
        await executeQuery(
            'UPDATE departments SET level = ? WHERE id = ?',
            [newLevel, child.id]
        );
        
       
        await updateChildrenLevels(child.id);
    }
}


async function getAllowedDepartmentsForDoor(doorId) {
    const sql = `
        SELECT department_id 
        FROM door_departments 
        WHERE door_id = ?
    `;
    
    const results = await executeQuery(sql, [doorId]);
    return results.map(r => r.department_id);
}


async function assignDepartmentToDoor(doorId, departmentId) {
    const sql = `
        INSERT INTO door_departments (door_id, department_id)
        VALUES (?, ?)
    `;
    
    const result = await executeQuery(sql, [doorId, departmentId]);
    return result.insertId;
}


async function removeDepartmentFromDoor(doorId, departmentId) {
    const sql = `
        DELETE FROM door_departments 
        WHERE door_id = ? AND department_id = ?
    `;
    
    const result = await executeQuery(sql, [doorId, departmentId]);
    return result.affectedRows > 0;
}


async function setDoorDepartments(doorId, departmentIds) {
    // Xóa hết
    await executeQuery('DELETE FROM door_departments WHERE door_id = ?', [doorId]);
    
    // Thêm mới
    if (departmentIds && departmentIds.length > 0) {
        const values = departmentIds.map(deptId => `(${doorId}, ${deptId})`).join(',');
        const sql = `INSERT INTO door_departments (door_id, department_id) VALUES ${values}`;
        await executeQuery(sql);
    }
    
    return true;
}


module.exports = {
    // Basic CRUD
    findDepartmentById,
    getAllDepartments,
    getDepartmentsByLevel,
    getRootDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    
    // Hierarchy
    getDepartmentAncestors,
    getDepartmentDescendants,
    getDirectChildren,
    
    // Stats
    countEmployeesInDepartment,
    getAllDepartmentsWithCount,
    buildDepartmentTree,
    
    // Door Departments
    getAllowedDepartmentsForDoor,
    assignDepartmentToDoor,
    removeDepartmentFromDoor,
    setDoorDepartments
};
