
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const coins = ['XMR', 'RVN', 'ETC', 'ERG', 'KAS'];
    console.log('--- Verifying Mining Shares in Database ---');

    for (const coin of coins) {
        const sessions = await prisma.miningSession.findMany({
            where: { coin: coin },
            select: {
                coin: true,
                acceptedShares: true,
                totalShares: true,
                startTime: true
            },
            take: 5,
            orderBy: { startTime: 'desc' }
        });

        if (sessions.length > 0) {
            const totalAccepted = sessions.reduce((sum, s) => sum + s.acceptedShares, 0);
            console.log(`✅ ${coin}: Found ${sessions.length} sessions, ${totalAccepted} total accepted shares in recent samples.`);
        } else {
            console.log(`❌ ${coin}: No sessions found in database.`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
