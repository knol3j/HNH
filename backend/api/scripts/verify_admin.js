
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findUnique({
        where: { username: 'knol3j' }
    });
    console.log(`User knol3j role: ${user?.role}`);
    await prisma.$disconnect();
}

check();
