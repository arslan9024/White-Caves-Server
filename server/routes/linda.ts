import { Router } from 'express';
import { requirePermission, requireRole } from '../middleware/rbac.js';
import {
  acknowledgeSentimentAlert,
  backgroundAnalysisOptIn,
  broadcastMessages,
  connectLinda,
  createCampaign,
  disconnectLinda,
  dispatchCampaign,
  dispatchDueCampaignsHandler,
  getCampaigns,
  getConversationHistory,
  getConversations,
  getGorahaSavedStatus,
  getHealth,
  getQr,
  getSentimentAlerts,
  getSessions,
  getStats,
  getStatus,
  getLindaMetrics,
  streamLindaMetrics,
  runLindaScript,
  getLindaFeaturesAndPlaybooks,
  getLindaOutreachPlan,
  getLindaMasterPosture,
  pingLindaSession,
  toggleLindaCampaignStatus,
  getPoolTelemetry,
  listPoolAccounts,
  switchPoolAccount,
  connectPoolAccount,
  connectAllPoolAccounts,
  disconnectPoolAccount,
  getPoolAccountQr,
  requestPoolAccountPairCode,
  dispatchPoolCampaignNow,
  launchDH2LandlordCampaign,
  routeInboundTenantViewing,
  henryTrigger,
  inventoryBroadcast,
  nlpRoute,
  readyCheck,
  sendMessage,
  transcribeAudio,
  webhookIngestion,
} from '../controllers/linda/index.js';

const router = Router();

// Connection & System Health
router.get('/status', requirePermission('view_whatsapp_conversations'), getStatus);
router.get('/qr', requirePermission('view_whatsapp_conversations'), getQr);
router.post('/connect', requireRole('owner', 'admin'), connectLinda);
router.post('/disconnect', requireRole('owner', 'admin'), disconnectLinda);
router.get('/stats', requirePermission('view_whatsapp_conversations'), getStats);
router.get('/sessions', requirePermission('view_whatsapp_conversations'), getSessions);
router.get('/health', getHealth);
router.post('/ready', readyCheck);

// Messaging & Conversations
router.post('/send/:conversationId', requirePermission('reply_whatsapp_conversations'), sendMessage);
router.post('/broadcast', requireRole('owner', 'admin'), broadcastMessages);
router.post('/webhook', requirePermission('view_whatsapp_conversations'), webhookIngestion);
router.get('/conversations', requirePermission('view_whatsapp_conversations'), getConversations);
router.get('/conversations/:phoneNumber/history', requirePermission('view_whatsapp_conversations'), getConversationHistory);
router.get('/conversations/:phoneNumber/goraha-saved', requirePermission('view_whatsapp_conversations'), getGorahaSavedStatus);

// Campaigns & Broadcasts
router.get('/campaigns', requireRole('owner', 'admin'), getCampaigns);
router.post('/campaigns', requireRole('owner', 'admin'), createCampaign);
router.post('/campaigns/:id/dispatch', requireRole('owner', 'admin'), dispatchCampaign);
router.post('/campaigns/dispatch-due', requireRole('owner', 'admin'), dispatchDueCampaignsHandler);
router.post('/inventory-broadcast', inventoryBroadcast);

// Intelligence & Cross-Assistant Integrations
router.post('/nlp-route', nlpRoute);
router.post('/henry-trigger', henryTrigger);
router.post('/transcribe', requirePermission('view_whatsapp_conversations'), transcribeAudio);
router.get('/sentiment-alerts', requirePermission('view_whatsapp_conversations'), getSentimentAlerts);
router.post('/sentiment-alerts/:alertId/acknowledge', requirePermission('view_whatsapp_conversations'), acknowledgeSentimentAlert);
router.post('/background-analysis/opt-in', requireRole('owner', 'admin'), backgroundAnalysisOptIn);

// Operations Center V2 (Ported from whatsapp-bot-linda repo)
router.get('/metrics/stream', requirePermission('view_whatsapp_conversations'), streamLindaMetrics);
router.get('/metrics', requirePermission('view_whatsapp_conversations'), getLindaMetrics);
router.post('/run-script', requirePermission('view_whatsapp_conversations'), runLindaScript);
router.get('/features', requirePermission('view_whatsapp_conversations'), getLindaFeaturesAndPlaybooks);
router.get('/outreach-plan', requirePermission('view_whatsapp_conversations'), getLindaOutreachPlan);
router.get('/master-posture', requirePermission('view_whatsapp_conversations'), getLindaMasterPosture);
router.post('/sessions/:id/ping', requirePermission('view_whatsapp_conversations'), pingLindaSession);
router.patch('/campaigns/:id/status', requirePermission('view_whatsapp_conversations'), toggleLindaCampaignStatus);

// Live 5-SIM Pool Telemetry, Pairing, Anti-Ban Rotation & DH2 Launch (in-process White-Caves-Server)
router.get('/pool/telemetry', requirePermission('view_whatsapp_conversations'), getPoolTelemetry);
router.get('/pool/accounts', requirePermission('view_whatsapp_conversations'), listPoolAccounts);
router.post('/pool/switch', requirePermission('view_whatsapp_conversations'), switchPoolAccount);
router.post('/pool/connect-all', requireRole('owner', 'admin'), connectAllPoolAccounts);
router.post('/pool/:phone/connect', requireRole('owner', 'admin'), connectPoolAccount);
router.post('/pool/:phone/disconnect', requireRole('owner', 'admin'), disconnectPoolAccount);
router.get('/pool/:phone/qr', requirePermission('view_whatsapp_conversations'), getPoolAccountQr);
router.post('/pool/:phone/pair-code', requireRole('owner', 'admin'), requestPoolAccountPairCode);
router.post('/campaign/dispatch-now', requirePermission('reply_whatsapp_conversations'), dispatchPoolCampaignNow);
router.post('/campaigns/dh2-landlord-launch', requireRole('owner', 'admin'), launchDH2LandlordCampaign);
router.post('/inbound/route-viewing', requirePermission('view_whatsapp_conversations'), routeInboundTenantViewing);

export default router;
