/**
 * Behavioral Engine Mobile SDK
 * 
 * This SDK provides a simple interface for mobile apps to communicate
 * with the behavioral engine backend.
 * 
 * @example
 * ```typescript
 * import { BehavioralEngineSDK, createBehavioralEngineSDK } from '@/lib/sdk';
 * 
 * // Create SDK instance
 * const sdk = createBehavioralEngineSDK({
 *   supabaseUrl: process.env.SUPABASE_URL,
 *   supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
 *   deviceInfo: {
 *     deviceIdentifier: await getDeviceId(),
 *     platform: 'ios',
 *     appVersion: '1.0.0',
 *   },
 *   onInterventionReceived: (intervention) => {
 *     showInterventionModal(intervention);
 *   },
 *   onRiskLevelChanged: (riskState) => {
 *     updateRiskIndicator(riskState);
 *   },
 * });
 * 
 * // Initialize after user auth
 * await sdk.initialize();
 * 
 * // Start session when app opens
 * await sdk.startSession();
 * 
 * // Track events
 * await sdk.trackScreenView('home');
 * await sdk.trackScroll(2500);
 * await sdk.trackReopen();
 * 
 * // Get pending interventions
 * const { data: interventions } = await sdk.getInterventions();
 * 
 * // Respond to intervention
 * await sdk.acknowledgeIntervention(interventions[0].id);
 * 
 * // End session when app closes
 * await sdk.endSession();
 * ```
 */

export { BehavioralEngineSDK, createBehavioralEngineSDK } from './behavioral-engine';

export type {
  SDKConfig,
  SDKResponse,
  DeviceInfo,
  SessionInfo,
  EventType,
  EventMetadata,
  Intervention,
  RiskState,
  RiskLevel,
  InterventionType,
  InterventionStatus,
  InterventionResponseAction,
} from './types';
