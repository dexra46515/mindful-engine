/**
 * API Endpoints Configuration
 */

// Base URL - will be set during SDK initialization
let API_BASE = '';

export const setApiBase = (url: string) => {
  API_BASE = url;
};

export const getApiBase = () => API_BASE;

export const ENDPOINTS = {
  INGEST_EVENT: '/ingest-event',
  RESPOND_INTERVENTION: '/respond-intervention',
  PARENT_API: '/parent-api',
  ORCHESTRATOR: '/orchestrator',
  FEEDBACK_AGENT: '/feedback-agent',
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;
