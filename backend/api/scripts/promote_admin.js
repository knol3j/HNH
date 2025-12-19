
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const username = process.argv[2];

if (!username) {
    console.error("Please provide a username");
    process.exit(1);
}

async function promote() {
    try {
        console.log(`Promoting ${username} to ADMIN...`);
        const user = await prisma.user.update({
            where: { username },
            data: { role: 'ADMIN' }
        });
        console.log(`Success! User ${user.username} is now ${user.role}.`);
    } catch (e) {
        if (e.code === 'P2025') {
            console.error(`User '${username}' not found.`);
        } else {
            console.error(e);
        }
    } finally {
        await prisma.$disconnect();
    }
}

promote();
