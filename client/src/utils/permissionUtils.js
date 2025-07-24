import { getUser } from './auth.js';
import { getPermissionsByRole } from '../api/permission';
import { match } from 'path-to-regexp';

export const hasPermission = (permissions, permissionString) => {
    if (!Array.isArray(permissions) || !permissionString) return false;

    const [method, rawPath] = permissionString.split(':');
    if (!method || !rawPath) return false;

    // Only normalize paths that end in /edit/:id or /view/:id
    const dynamicPatterns = [/\/edit(\/[^/]+)?$/, /\/view(\/[^/]+)?$/];
    let path = rawPath;

    for (const pattern of dynamicPatterns) {
        if (pattern.test(path)) {
            path = path.replace(pattern, '');
            break;
        }
    }

    path = path.replace(/\/$/, ''); // Remove trailing slash

    return permissions.some(p => {
        if (p.method?.toUpperCase() !== method.toUpperCase()) return false;

        if (!p.route || typeof p.route !== 'string') return false;

        try {
            const matchFn = match(p.route, { decode: decodeURIComponent });
            return matchFn(path) !== false;
        } catch (err) {
            return false;
        }
    });

};


export const normalizeRoute = (route) => {
    if (!route || typeof route !== 'string') return '';
    return route.replace(/\/+/g, '/'); // Remove multiple slashes
};

export const fetchUserPermissions = async () => {
    const user = getUser();

    if (user?.roleType) {
        try {
            const permissions = await getPermissionsByRole(user.roleType);
            return permissions;
        } catch (err) {
            console.error('Failed to load user permissions', err);
            return [];
        }
    }

    return [];
};

export const formatPermissionLabel = (perm) => {
    const action = perm.method.toUpperCase();
    const route = perm.route;

    const verbMap = {
        POST: 'Create',
        GET: 'View',
        PUT: 'Update',
        PATCH: 'Update',
        DELETE: 'Delete'
    };

    const label = verbMap[action] || action;

    // Handle specific cases based on route AND method
    const specialCases = {
        'GET:/users/:email': 'View User Details by Email',
        'GET:/users/:userId': 'View User Details by ID',
        'PUT:/users/:userId': 'Update User Details by ID',
        'GET:/roles/:roleId': 'View Role Details',
        'PUT:/roles/:roleId': 'Update Role Details by ID',
        'DELETE:/roles/:roleId': 'Delete Role',
        'GET:/permissions/:permissionId': 'View Permission Details',
        'PUT:/permissions/:permissionId': 'Update Permission by ID',
        'DELETE:/permissions/:permissionId': 'Delete Permission'
    };

    const key = `${action}:${route}`;
    if (specialCases[key]) return specialCases[key];

    // Fallback: clean generic route
    let cleaned = route.replace(/^\/admin\//, '').replace(/^\//, '').replace(/\/+/g, ' ');
    cleaned = cleaned.replace(/:[^/\s]+/g, '').trim();

    const words = cleaned.split(' ');
    const resource = words.map((w, i) => (i === 0 ? w : w.toLowerCase())).join(' ').replace(/\s+/g, ' ');

    return `${label} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
};