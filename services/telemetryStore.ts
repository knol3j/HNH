import Dexie from 'dexie';

export interface TelemetryRecord {
    timestamp: number;
    hashrate: number;
    power: number;
    temp: number;
}

class TelemetryDatabase extends Dexie {
    records!: Dexie.Table<TelemetryRecord, number>;

    constructor() {
        super('HNHTelemetryDB');
        this.version(1).stores({
            records: 'timestamp, hashrate, power, temp'
        });
    }

    // Add a new telemetry point
    addRecord(record: Omit<TelemetryRecord, 'timestamp'>) {
        const ts = Date.now();
        this.records.add({ timestamp: ts, ...record });
        // Keep only last 24 hours (approx 43200 points at 2s interval)
        const cutoff = ts - 24 * 60 * 60 * 1000;
        this.records.where('timestamp').below(cutoff).delete();
    }

    // Get last N points
    async getLast(n: number): Promise<TelemetryRecord[]> {
        return await this.records.orderBy('timestamp').reverse().limit(n).toArray();
    }

    // Get all records in time range
    async getRange(start: number, end: number): Promise<TelemetryRecord[]> {
        return await this.records.where('timestamp').between(start, end).toArray();
    }
}

export const telemetryDB = new TelemetryDatabase();
