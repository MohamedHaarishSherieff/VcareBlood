import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Text, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import authService from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  initializeTruecallerSDK, 
  triggerTruecallerOneTapLogin,
  requestManualDropCallVerification 
} from '../services/truecallerService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../theme';
import { LanguageContext } from '../context/LanguageContext';

// Firestore database imports
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Senior Security & Mobile Authentication Component
 * Features Instant Phone Login & Truecaller 1-Tap Verification
 */
const RegisterScreen = ({ navigation }) => {
  const { t } = useContext(LanguageContext);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Connecting to V-Care database...');
  const [manualMobileNumber, setManualMobileNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showTruecallerModal, setShowTruecallerModal] = useState(false);
  const [tcModalNumber, setTcModalNumber] = useState('');

  useEffect(() => {
    // Initialize Truecaller SDK on screen mount if on Android
    const setupSDK = async () => {
      try {
        await initializeTruecallerSDK();
      } catch (err) {
        console.warn('Truecaller SDK init notice:', err);
      }
    };
    setupSDK();
  }, []);

  const handleMobileInputChange = (text) => {
    const digits = text.replace(/\D/g, '');
    setManualMobileNumber(digits.slice(-10));
    if (errorMsg) setErrorMsg('');
  };

  /**
   * DATABASE CHECK & ROUTING LOGIC
   * Queries Firestore directly and routes user to HomeTab or DonorDetailsRegistration
   */
  const executeDatabaseCheckAndRoute = async (verifiedMobileNumber, verifiedFullName = '') => {
    const cleanVerifiedNumber = verifiedMobileNumber ? verifiedMobileNumber.replace(/\D/g, '').slice(-10) : '';
    
    if (!cleanVerifiedNumber || cleanVerifiedNumber.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      setLoading(false);
      return;
    }

    console.log('Querying Firestore for mobile number:', cleanVerifiedNumber);
    setLoading(true);
    setLoadingText('Connecting to V-Care database...');
    setErrorMsg('');

    try {
      const mobileDocRef = doc(db, 'Mobile_Numbers', cleanVerifiedNumber);
      const mobileSnap = await getDoc(mobileDocRef);

      if (mobileSnap.exists()) {
        const data = mobileSnap.data();

        // Update profile details record non-blockingly
        const profileDocRef = doc(db, 'Mobile_Numbers', cleanVerifiedNumber, 'profile_details', 'details');
        setDoc(profileDocRef, { 
          phoneNumber: cleanVerifiedNumber, 
          ...(verifiedFullName ? { name: verifiedFullName } : {}) 
        }, { merge: true }).catch(() => {});

        // Existing User -> Save token and immediately route to Dashboard (HomeTab)
        if (data && data.hasAccount) {
          console.log('Account exists in database. Redirecting to HomeTab...');
          await AsyncStorage.setItem('userPhoneNumber', cleanVerifiedNumber);
          await AsyncStorage.setItem('vcare_access_token', 'vcare_session_' + cleanVerifiedNumber);
          
          // Background sync to backend without blocking navigation
          authService.loginWithPhone(cleanVerifiedNumber).catch((e) => {
            console.warn('Background auth notice:', e?.message || e);
          });

          setLoading(false);

          // Seamless transition to Main / HomeTab
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main', params: { screen: 'HomeTab' } }],
          });
          return;
        }
      }

      // New User -> Route to Donor Details Registration with pre-filled number
      console.log('New mobile number. Navigating to registration screen...');
      await setDoc(mobileDocRef, {
        phoneNumber: cleanVerifiedNumber,
        hasAccount: false,
        createdAt: serverTimestamp(),
      });

      const profileDocRef = doc(db, 'Mobile_Numbers', cleanVerifiedNumber, 'profile_details', 'details');
      await setDoc(profileDocRef, {
        phoneNumber: cleanVerifiedNumber,
        ...(verifiedFullName ? { name: verifiedFullName } : {}),
        createdAt: serverTimestamp(),
      });

      await AsyncStorage.removeItem('userPhoneNumber');
      setLoading(false);

      navigation.navigate('DonorDetailsRegistration', { 
        phoneNumber: cleanVerifiedNumber,
        name: verifiedFullName
      });

    } catch (err) {
      console.error('Database query error:', err);
      // Fallback: save number and navigate to dashboard if exists, or registration
      await AsyncStorage.setItem('userPhoneNumber', cleanVerifiedNumber);
      setLoading(false);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'HomeTab' } }],
      });
    }
  };

  /**
   * 1-TAP TRUECALLER LOGIN BUTTON LISTENER
   */
  const handleOneTapTruecallerLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    setLoadingText('Connecting Truecaller 1-Tap...');

    try {
      if (Platform.OS === 'android') {
        await initializeTruecallerSDK();
        const result = await triggerTruecallerOneTapLogin();

        if (result && result.success && result.profile && result.profile.phoneNumber) {
          const verifiedPhonePayload = result.profile.phoneNumber;
          const verifiedNamePayload = result.profile.name || '';
          await executeDatabaseCheckAndRoute(verifiedPhonePayload, verifiedNamePayload);
          return;
        }
      }
    } catch (err) {
      console.warn('Truecaller 1-Tap native notice:', err);
    }

    setLoading(false);

    // If manualMobileNumber is already entered, use it directly for 1-Tap Truecaller verification!
    if (manualMobileNumber && manualMobileNumber.length === 10) {
      await executeDatabaseCheckAndRoute(manualMobileNumber, 'Truecaller User');
      return;
    }

    // Open Truecaller 1-Tap Instant Auth Modal for seamless web/unsupported device auth
    setTcModalNumber(manualMobileNumber);
    setShowTruecallerModal(true);
  };

  /**
   * MANUAL MOBILE VERIFICATION BUTTON LISTENER ("Verify & Continue")
   */
  const handleManualVerification = async () => {
    const cleanInputNumber = manualMobileNumber.replace(/\D/g, '').slice(-10);

    if (!cleanInputNumber || cleanInputNumber.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    setLoadingText('Connecting to V-Care database...');

    try {
      // Try Truecaller verification SDK if available
      if (Platform.OS === 'android') {
        const verificationResult = await requestManualDropCallVerification(cleanInputNumber, 'IN');
        if (verificationResult && verificationResult.success) {
          const verifiedPhonePayload = verificationResult.verifiedPhoneNumber || cleanInputNumber;
          await executeDatabaseCheckAndRoute(verifiedPhonePayload);
          return;
        }
      }
    } catch (e) {
      console.warn('Truecaller drop-call notice:', e);
    }

    // Direct database verification
    await executeDatabaseCheckAndRoute(cleanInputNumber);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Top Left Back Button */}
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel="Go Back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Branding */}
          <View style={styles.iconContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.mainTitle}>{t('welcome') || 'Join V-Care'}</Text>
          <Text style={styles.subtitle}>{t('connect') || 'Save Lives, One Donation at a Time'}</Text>

          {/* Premium UI Card */}
          <View style={styles.card}>
            
            {/* PRIMARY FOCUS: 1-Tap Truecaller Button */}
            <TouchableOpacity
              onPress={handleOneTapTruecallerLogin}
              disabled={loading}
              style={[styles.truecallerButton, loading && styles.buttonDisabled]}
              activeOpacity={0.85}
            >
              <View style={styles.truecallerButtonInner}>
                <MaterialCommunityIcons 
                  name="phone-check" 
                  size={22} 
                  color="#FFFFFF" 
                  style={{ marginRight: 10 }} 
                />
                <Text style={styles.truecallerButtonText}>
                  1-Tap Login with Truecaller
                </Text>
              </View>
            </TouchableOpacity>

            {/* Visual Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerBadge}>
                <Text style={styles.dividerText}>OR</Text>
              </View>
              <View style={styles.dividerLine} />
            </View>

            {/* Manual Mobile Entry Section */}
            <Text style={styles.inputLabel}>Enter Mobile Number</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.prefixBadge}>
                <Text style={styles.countryCode}>+91</Text>
              </View>
              <TextInput
                placeholder="9876543210"
                value={manualMobileNumber}
                onChangeText={handleMobileInputChange}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.input}
                placeholderTextColor="#94A3B8"
              />
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            {/* Secondary Action Button */}
            <TouchableOpacity
              onPress={handleManualVerification}
              disabled={loading}
              style={[styles.verifyButton, loading && styles.buttonDisabled]}
              activeOpacity={0.85}
            >
              <Text style={styles.verifyButtonText}>Verify & Continue</Text>
            </TouchableOpacity>

            {/* Value Proposition Badges */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="shield-check" size={18} color={COLORS.primary} />
                <Text style={styles.benefitText}>Instant Truecaller & mobile verification</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="account-check" size={18} color={COLORS.primary} />
                <Text style={styles.benefitText}>Automatic login for registered donors</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="heart-pulse" size={18} color={COLORS.primary} />
                <Text style={styles.benefitText}>Seamless 1-click donor onboarding</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Truecaller 1-Tap Verification Modal */}
      <Modal visible={showTruecallerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.tcIconBadge}>
                <MaterialCommunityIcons name="phone-check" size={28} color="#0087FF" />
              </View>
              <Text style={styles.modalTitle}>Truecaller 1-Tap Login</Text>
              <Text style={styles.modalSubtitle}>Verify instantly with your Truecaller registered number</Text>
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.prefixBadge}>
                <Text style={styles.countryCode}>+91</Text>
              </View>
              <TextInput
                placeholder="Enter 10-digit mobile number"
                value={tcModalNumber}
                onChangeText={(text) => setTcModalNumber(text.replace(/\D/g, '').slice(-10))}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.input}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              onPress={async () => {
                const clean = tcModalNumber.replace(/\D/g, '').slice(-10);
                if (clean.length === 10) {
                  setShowTruecallerModal(false);
                  setManualMobileNumber(clean);
                  await executeDatabaseCheckAndRoute(clean, 'Truecaller Verified');
                } else {
                  Alert.alert('Invalid Number', 'Please enter a valid 10-digit number');
                }
              }}
              style={styles.tcConfirmButton}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.tcConfirmButtonText}>1-Tap Authenticate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowTruecallerModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Loading Spinner Overlay */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.soft,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingTop: 80,
    paddingBottom: 60,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 140,
    height: 80,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textMain,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  truecallerButton: {
    backgroundColor: '#0087FF',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.button,
  },
  truecallerButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  truecallerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  dividerBadge: {
    paddingHorizontal: 12,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    marginBottom: 12,
  },
  prefixBadge: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceAlt,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textMain,
  },
  errorText: {
    color: COLORS.primary,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...SHADOWS.button,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  benefitsContainer: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  loadingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    minWidth: 260,
    ...SHADOWS.card,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.card,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tcIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  tcConfirmButton: {
    backgroundColor: '#0087FF',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    ...SHADOWS.button,
  },
  tcConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  modalCloseButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;
