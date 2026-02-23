export const ANALYTICS_EVENTS = {
  PAGE_VIEW: "page_view",
  SIGNUP_START: "signup_start",
  SIGNUP_COMPLETE: "signup_complete",
  SIGNIN_COMPLETE: "signin_complete",
  CHECKOUT_START: "checkout_start",
  CHECKOUT_SESSION_CREATED: "checkout_session_created",
  PURCHASE_COMPLETE: "purchase_complete",
  BILLING_PORTAL_OPENED: "billing_portal_opened",
  FILE_SELECTED: "file_selected",
  CONVERT_START: "convert_start",
  CONVERT_COMPLETE: "convert_complete",
  EDITOR_EXPORT_START: "editor_export_start",
  EDITOR_EXPORT_COMPLETE: "editor_export_complete",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const GA4_EVENT_NAME_MAP: Partial<Record<AnalyticsEventName, string>> = {
  [ANALYTICS_EVENTS.PAGE_VIEW]: "page_view",
  [ANALYTICS_EVENTS.SIGNUP_COMPLETE]: "sign_up",
  [ANALYTICS_EVENTS.SIGNIN_COMPLETE]: "login",
  [ANALYTICS_EVENTS.CHECKOUT_START]: "begin_checkout",
  [ANALYTICS_EVENTS.PURCHASE_COMPLETE]: "purchase",
  [ANALYTICS_EVENTS.FILE_SELECTED]: "select_content",
};
