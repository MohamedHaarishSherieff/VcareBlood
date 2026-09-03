import { NativeModules, Platform } from 'react-native';

const { TruecallerAuthModule } = NativeModules;

// Truecaller Client ID configuration for V-Care application
const TRUECALLER_CLIENT_ID = 'zkbuc8_kza03r3gtd2lowrtonrwlxspcgaledophqns';

export const OPTION_VERIFY_ALL_USERS = 1;

/**
 * Truecaller SDK Error Code Diagnostic Map
 */
export const TRUECALLER_ERROR_MAP = {
  0: { code: 0, title: 'Unknown Error', description: 'Something went wrong during Truecaller verification (Code: 0).' },
  1: { code: 1, title: 'Network Error', description: 'No internet connection available (Code: 1).' },
  2: { code: 2, title: 'Internal Error', description: 'Truecaller SDK internal error occurred (Code: 2).' },
  3: { code: 3, title: 'User Cancelled', description: 'Verification request was cancelled (Code: 3).' },
  4: { code: 4, title: 'Unverified User', description: 'User profile is not verified in Truecaller (Code: 4).' },
  5: { code: 5, title: 'App Not Installed/Logged In', description: 'Truecaller app is not installed or logged in on this device (Code: 5).' },
  10: { code: 10, title: 'Invalid Account State', description: 'Truecaller user has an invalid or inactive account state (Code: 10).' },
  12: { code: 12, title: 'SHA-1 Mismatch / Partner Error', description: 'Invalid partner key or SHA-1 fingerprint mismatch in Truecaller Console (Code: 12).' },
  14: { code: 14, title: 'Consent Denied', description: 'User denied by dismissing the Truecaller consent screen (Code: 14).' },
};

export const getTruecallerErrorMessage = (errorCode) => {
  const codeNum = parseInt(errorCode, 10);
  return TRUECALLER_ERROR_MAP[codeNum] || {
    code: codeNum || 0,
    title: 'Verification Error',
    description: `Verification failed (Code: ${errorCode || 0}) - Please check your setup.`
  };
};

/**
 * Initialize Truecaller SDK with Client ID and TcSdkOptions.OPTION_VERIFY_ALL_USERS
 */
export const initializeTruecallerSDK = async (clientId = TRUECALLER_CLIENT_ID) => {
  if (Platform.OS !== 'android') return false;

  try {
    if (TruecallerAuthModule && typeof TruecallerAuthModule.initialize === 'function') {
      await TruecallerAuthModule.initialize(clientId, OPTION_VERIFY_ALL_USERS);
      console.log('[SECURITY_ENGINEER: INIT] Truecaller SDK initialized with OPTION_VERIFY_ALL_USERS.');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[SECURITY_ENGINEER: INIT_ERROR]', error);
    return false;
  }
};

/**
 * Check if Truecaller SDK is installed and usable on device
 */
export const checkTruecallerIsUsable = () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    if (TruecallerAuthModule && typeof TruecallerAuthModule.isUsable === 'function') {
      const usable = TruecallerAuthModule.isUsable();
      return !!usable;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Trigger Truecaller 1-Tap Login request on device
 * Extracts profile payload directly inside onSuccessProfileShared callback
 */
export const triggerTruecallerOneTapLogin = async () => {
  if (Platform.OS !== 'android') {
    return { success: false, errorCode: 0, reason: 'NOT_ANDROID' };
  }

  try {
    if (TruecallerAuthModule && typeof TruecallerAuthModule.requestOneTapLogin === 'function') {
      console.log('[SECURITY_ENGINEER: STEP_1] Launching Truecaller 1-Tap OAuth flow...');
      const profile = await TruecallerAuthModule.requestOneTapLogin();
      
      if (profile && (profile.phoneNumber || profile.mobileNumber)) {
        const verifiedPhone = (profile.phoneNumber || profile.mobileNumber).replace(/\D/g, '').slice(-10);
        console.log('[SECURITY_ENGINEER: STEP_2] Truecaller onSuccessProfileShared payload extracted:', verifiedPhone);
        
        return {
          success: true,
          profile: {
            phoneNumber: verifiedPhone,
            firstName: profile.firstName || profile.name?.split(' ')[0] || '',
            lastName: profile.lastName || profile.name?.split(' ').slice(1).join(' ') || '',
            name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
            payload: profile,
          }
        };
      } else if (profile && profile.errorCode !== undefined) {
        const errInfo = getTruecallerErrorMessage(profile.errorCode);
        console.warn(`[SECURITY_ENGINEER: STEP_1_FAILURE] TrueError errorType logged: ${profile.errorCode} - ${errInfo.title}`);
        return { success: false, errorCode: profile.errorCode, errorInfo: errInfo };
      }
    }
    return { success: false, errorCode: 5, errorInfo: getTruecallerErrorMessage(5) };
  } catch (error) {
    const code = error?.code || error?.errorCode || 0;
    const errInfo = getTruecallerErrorMessage(code);
    console.warn(`[SECURITY_ENGINEER: STEP_1_EXCEPTION] TrueError logged: ${code} - ${error?.message}`);
    return { success: false, errorCode: code, errorInfo: errInfo, error: error?.message };
  }
};

/**
 * Trigger Manual Number Verification via Truecaller SDK (Missed call / Drop call)
 * Extracts payload inside VerificationCallback (TYPE_VERIFICATION_COMPLETE)
 */
export const requestManualDropCallVerification = async (phoneNumber, countryCode = 'IN') => {
  if (Platform.OS !== 'android') {
    return { success: false, errorCode: 0, reason: 'NOT_ANDROID' };
  }

  const cleanInputNumber = phoneNumber ? phoneNumber.replace(/\D/g, '').slice(-10) : '';
  if (!cleanInputNumber || cleanInputNumber.length !== 10) {
    return { success: false, errorCode: 0, reason: 'INVALID_NUMBER_FORMAT' };
  }

  try {
    if (TruecallerAuthModule && typeof TruecallerAuthModule.requestVerification === 'function') {
      console.log('[SECURITY_ENGINEER: STEP_1_MANUAL] Launching Truecaller drop call for:', cleanInputNumber);
      const result = await TruecallerAuthModule.requestVerification(countryCode, cleanInputNumber);
      
      if (result && (result.success || result.status === 'SUCCESS' || result.verifiedPhoneNumber)) {
        const verifiedPhone = (result.verifiedPhoneNumber || cleanInputNumber).replace(/\D/g, '').slice(-10);
        console.log('[SECURITY_ENGINEER: STEP_2_MANUAL] VerificationCallback TYPE_VERIFICATION_COMPLETE extracted:', verifiedPhone);
        return { 
          success: true, 
          verifiedPhoneNumber: verifiedPhone,
          result 
        };
      } else if (result && result.errorCode !== undefined) {
        const errInfo = getTruecallerErrorMessage(result.errorCode);
        console.warn(`[SECURITY_ENGINEER: STEP_1_MANUAL_FAILURE] TrueError errorType logged: ${result.errorCode}`);
        return { success: false, errorCode: result.errorCode, errorInfo: errInfo };
      }
    }
    return { success: false, errorCode: 0, errorInfo: getTruecallerErrorMessage(0) };
  } catch (error) {
    const code = error?.code || error?.errorCode || 0;
    const errInfo = getTruecallerErrorMessage(code);
    console.warn(`[SECURITY_ENGINEER: STEP_1_MANUAL_EXCEPTION] TrueError logged: ${code} - ${error?.message}`);
    return { success: false, errorCode: code, errorInfo: errInfo, error: error?.message };
  }
};

export default {
  initializeTruecallerSDK,
  checkTruecallerIsUsable,
  triggerTruecallerOneTapLogin,
  requestManualDropCallVerification,
  getTruecallerErrorMessage,
  TRUECALLER_ERROR_MAP,
  OPTION_VERIFY_ALL_USERS,
};
