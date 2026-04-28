export function getReportedMinerStatus({ minerStatus, hasMinerProcess, minerApiStats }) {
    if (minerStatus === 'ERROR') return 'ERROR';
    if (!hasMinerProcess) return 'OFFLINE';

    const totalHashrate = minerApiStats?.hashrate?.total?.[0] || 0;
    const hasConnection = Boolean(
        minerApiStats?.connection?.pool ||
        minerApiStats?.connection?.ip ||
        minerApiStats?.connection?.uptime_ms
    );

    return (hasConnection || totalHashrate > 0) ? 'MINING' : 'STARTING';
}

export function getReportedGpuUtil({ reportedStatus, hashrate }) {
    return reportedStatus === 'MINING' && hashrate > 0 ? 100 : 0;
}
