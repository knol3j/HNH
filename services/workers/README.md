# HashNHedge Worker Runtime Services

This directory is the target home for containerized GPU and compute workers.

## Worker types

- `miner-worker`: mining jobs and share submission
- `inference-worker`: AI inference workloads
- `triton-gateway`: NVIDIA Triton integration
- `dynamo-gateway`: NVIDIA Dynamo integration
- `telemetry-sidecar`: GPU utilization and health reporting
- `general-compute-worker`: controlled generic compute jobs

## Runtime baseline

Workers should run inside containers with:

- Docker
- NVIDIA Container Toolkit
- explicit GPU device assignment
- restricted filesystem access
- restricted network egress by job type
- signed releases
- heartbeat reporting
- structured logs
- job lease acknowledgement

## Scheduler protocol

Each worker should support:

1. register capabilities
2. send heartbeat
3. receive job lease
4. acknowledge job lease
5. stream progress
6. submit result/proof metadata
7. report failure
8. shut down gracefully

## Telemetry

Minimum metrics:

- GPU model
- GPU memory total/used
- GPU utilization
- temperature
- power draw
- active job ID
- runtime seconds
- error count
- result/proof hash
