import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRBAC() {
    console.log('Testing RBAC setup...\n');

    const roles = await prisma.role.findMany();
    console.log(`✓ Roles: ${roles.length}`);
    roles.forEach(r => console.log(`  - ${r.name}: ${r.description}`));

    const permissions = await prisma.permission.findMany();
    console.log(`\n✓ Permissions: ${permissions.length}`);

    const rolePermissions = await prisma.rolePermission.findMany({
        include: { role: true, permission: true }
    });
    console.log(`\n✓ Role-Permission mappings: ${rolePermissions.length}`);

    const userRoles = await prisma.userRole.findMany({
        include: { user: true, role: true }
    });
    console.log(`\n✓ User-Role assignments: ${userRoles.length}`);
    userRoles.forEach(ur => console.log(`  - ${ur.user.name} -> ${ur.role.name}`));

    await prisma.$disconnect();
}

testRBAC().catch(console.error);
