# HashNHedge Miner Health Monitor

## Overview

The health monitor automatically watches your miner process and restarts it if it crashes. It protects against:

- **Unexpected crashes** - Auto-restart on failure
- **Restart loops** - Stops restarting if miner crashes repeatedly (indicates config issue)
- **Silent failures** - Logs all events for debugging

## Usage

### Quick Start

```bash
cd agent
node health_monitor.js
```

This will:
1. Start the XMRig miner
2. Watch for crashes
3. Auto-restart with a 3-second delay
4. Stop after 5 crashes in 5 minutes (prevents infinite loops)

### As a System Service (Linux)

For production deployments, run as a systemd service:

```bash
sudo cp miner-health.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable miner-health
sudo systemctl start miner-health
```

Check status: `systemctl status miner-health`  
View logs: `journalctl -u miner-health -f`

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task → "HNH Health Monitor"
3. Trigger: "When I log on"
4. Action: "Start a program"
   - Program: `node.exe`
   - Arguments: `health_monitor.js`
   - Start in: `C:\path\to\HNH\agent\`

## Configuration

Edit environment variables or modify `health_monitor.js`:

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKER_NAME` | `unknown` | Worker identifier for telemetry |
| `VITE_API_URL` | `null` | Backend API URL for health alerts |

## Logs

All events are logged to `health_monitor.log` in the agent directory.

Log levels:
- `INFO` - Normal operations
- `SUCCESS` - Successful actions
- `WARN` - Warnings (miner exited)
- `ERROR` - Errors (crash, binary missing, restart loop)
- `MINER` - Miner output (hashrate, accepted shares)

## Restart Protection

The monitor tracks restarts to prevent infinite loops:

- **Max restarts:** 5
- **Time window:** 5 minutes
- **Action:** If exceeded, stops restarting and logs CRITICAL error

This indicates a configuration problem (bad wallet, pool unreachable, etc.) that needs manual intervention.

## Integration with Main Agent

The health monitor is standalone - it doesn't replace `server.js`. Use cases:

| Scenario | Recommended Setup |
|----------|-------------------|
| Simple mining | Run `health_monitor.js` directly |
| Full agent features | Run `server.js` (has basic process management) |
| Production | Run `health_monitor.js` as systemd service |

## Troubleshooting

**Miner won't start:**
- Check `health_monitor.log` for error details
- Verify miner binary exists in `bin/` directory
- Run setup script: `./setup_miner.sh` or `setup_miner_windows.ps1`

**Constant restarts:**
- Check pool connectivity
- Verify wallet addresses are valid
- Check if antivirus is blocking miner

**No logs:**
- Ensure write permissions in agent directory
- Check disk space
