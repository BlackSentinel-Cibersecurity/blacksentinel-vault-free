export const APP_NAME = 'BlackSentinel Vault';
export const APP_VERSION = '1.0.0';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SECURITY_ADMIN: 'security_admin',
  PAM_ADMIN: 'pam_admin',
  SECRET_ADMIN: 'secret_admin',
  SECRET_READER: 'secret_reader',
  COMPLIANCE_ADMIN: 'compliance_admin',
  VIEWER: 'viewer'
} as const;

export const SECRET_TYPES = {
  PASSWORD: 'password',
  API_KEY: 'api_key',
  TOKEN: 'token',
  JWT: 'jwt',
  CERTIFICATE: 'certificate',
  PRIVATE_KEY: 'private_key',
  SSH_KEY: 'ssh_key',
  DATABASE_CREDENTIAL: 'database_credential',
  ENVIRONMENT_VARIABLE: 'environment_variable',
  ENCRYPTION_KEY: 'encryption_key',
  CUSTOM: 'custom'
} as const;

export const PAM_ACCOUNT_TYPES = {
  WINDOWS: 'windows',
  LINUX: 'linux',
  MACOS: 'macos',
  ACTIVE_DIRECTORY: 'active_directory',
  ENTRA_ID: 'entra_id',
  AWS_IAM: 'aws_iam',
  AZURE: 'azure',
  GOOGLE_CLOUD: 'google_cloud',
  VMWARE: 'vmware',
  NETWORK_DEVICE: 'network_device',
  DATABASE: 'database',
  HYPERVISOR: 'hypervisor',
  APPLIANCE: 'appliance'
} as const;

export const SESSION_PROTOCOLS = {
  SSH: 'ssh',
  RDP: 'rdp',
  VNC: 'vnc',
  WEB: 'web',
  API: 'api',
  DATABASE: 'database',
  KUBERNETES: 'kubernetes'
} as const;

export const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const AUDIT_EVENTS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  SECRET_CREATED: 'secret_created',
  SECRET_READ: 'secret_read',
  SECRET_UPDATED: 'secret_updated',
  SECRET_DELETED: 'secret_deleted',
  SECRET_ROTATED: 'secret_rotated',
  PAM_ACCOUNT_CREATED: 'pam_account_created',
  PAM_ACCESS_GRANTED: 'pam_access_granted',
  PAM_SESSION_STARTED: 'pam_session_started',
  PAM_SESSION_ENDED: 'pam_session_ended',
  CERTIFICATE_REQUESTED: 'certificate_requested',
  CERTIFICATE_RENEWED: 'certificate_renewed',
  CERTIFICATE_REVOKED: 'certificate_revoked',
  POLICY_CREATED: 'policy_created',
  POLICY_UPDATED: 'policy_updated',
  ACCESS_REQUEST_CREATED: 'access_request_created',
  ACCESS_REQUEST_APPROVED: 'access_request_approved',
  ACCESS_REQUEST_DENIED: 'access_request_DENIED',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_REVOKED: 'role_revoked'
} as const;
