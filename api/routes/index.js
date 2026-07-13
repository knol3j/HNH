const express = require('express');
const communityController = require('../controllers/communityController');
const vendorController = require('../controllers/vendorController');
const workerController = require('../controllers/workerController');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HashNHedge API is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// COMMUNITY ROUTES
// ============================================================
router.post('/community/register', communityController.registerCommunityMember);
router.get('/community/profile/:id', communityController.getCommunityMember);
router.put('/community/profile/:id', communityController.updateCommunityMember);
router.get('/community/members', communityController.listCommunityMembers);

// ============================================================
// VENDOR ROUTES
// ============================================================
router.post('/vendor/register', vendorController.registerVendor);
router.get('/vendor/profile/:id', vendorController.getVendor);
router.put('/vendor/profile/:id', vendorController.updateVendor);
router.get('/vendor/list', vendorController.listVendors);
router.post('/vendor/:vendorId/offering', vendorController.addVendorOffering);

// ============================================================
// WORKER/MINER ROUTES
// ============================================================
router.post('/worker/register', workerController.registerWorker);
router.post('/worker/:workerId/heartbeat', workerController.workerHeartbeat);
router.put('/worker/:workerId/capabilities', workerController.updateWorkerCapabilities);
router.get('/worker/:workerId/stats', workerController.getWorkerStats);
router.get('/worker/:workerId/jobs', workerController.getAvailableJobs);
router.post('/worker/:workerId/jobs/:jobId/claim', workerController.claimJob);
router.post('/worker/:workerId/shares', workerController.submitShare);
router.get('/workers', workerController.listWorkers);

// ============================================================
// TASKS ENDPOINT (for mining controller compatibility)
// ============================================================
router.get('/tasks', workerController.getAvailableTasks);

module.exports = router;
