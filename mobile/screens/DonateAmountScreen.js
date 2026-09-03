import React, { useState, useContext } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  View,
  StyleSheet,
  Alert,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Title, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';

const DonateAmountScreen = ({ navigation }) => {
  const { t } = useContext(LanguageContext);
  const [amount, setAmount] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [adWatched, setAdWatched] = useState(false);

  const payeeUpiId = 'saranaks222@okhdfcbank';
  const payeeName = 'V-Care Blood Donation Platform';

  const isAmountValid = () => {
    const num = Number(amount);
    return amount && !isNaN(num) && num > 0;
  };

  const canDonate = isAmountValid() && agree && !loading;

  const handleDonate = async (appScheme) => {
    if (!isAmountValid()) {
      Alert.alert('Validation', 'Please enter a valid donation amount');
      return;
    }
    if (!agree) {
      Alert.alert('Terms', 'Please agree to the terms and conditions before donating');
      return;
    }

    let upiUrl = `upi://pay?pa=${encodeURIComponent(payeeUpiId)}&pn=${encodeURIComponent(
      payeeName,
    )}&am=${encodeURIComponent(amount)}&cu=INR`;

    if (appScheme === 'gpay') {
      upiUrl = `tez://upi/pay?pa=${encodeURIComponent(payeeUpiId)}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(amount)}&cu=INR`;
    } else if (appScheme === 'phonepe') {
      upiUrl = `phonepe://pay?pa=${encodeURIComponent(payeeUpiId)}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(amount)}&cu=INR`;
    } else if (appScheme === 'paytm') {
      upiUrl = `paytmmp://pay?pa=${encodeURIComponent(payeeUpiId)}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(amount)}&cu=INR`;
    }

    try {
      setLoading(true);
      // Directly open URL to trigger Android native UPI chooser (Google Pay, PhonePe, Paytm, etc.)
      await Linking.openURL(upiUrl);
    } catch (err) {
      console.warn('UPI app launch attempt failed, trying fallback generic upi:// scheme...', err);
      if (appScheme) {
        try {
          const genericUrl = `upi://pay?pa=${encodeURIComponent(payeeUpiId)}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(amount)}&cu=INR`;
          await Linking.openURL(genericUrl);
          return;
        } catch (e) {
          console.error('Generic UPI launch failed', e);
        }
      }
      Alert.alert(
        'Pay via UPI ID',
        `Unable to launch UPI app automatically.\n\nYou can manually send ₹${amount} to UPI ID:\n\n${payeeUpiId}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (text) => {
    const digits = (text || '').replace(/[^0-9]/g, '');
    setAmount(digits);
  };

  const handleWatchAd = () => {
    if (adLoading) return;
    setAdLoading(true);
    setTimeout(() => {
      setAdLoading(false);
      setAdWatched(true);
      Alert.alert(t('thankYou'), t('adSupportThankYou'));
    }, 8000);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
            <Surface style={styles.surface}>
              <Title style={styles.title}>{t('donateAmount')}</Title>

              <View style={styles.sloganContainer}>
                <Text style={styles.sloganMain}>{t('donationSlogan')}</Text>
              </View>

              <View style={styles.upiCard}>
                <MaterialCommunityIcons name="qrcode-scan" size={22} color="#D32F2F" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.upiCardLabel}>Official UPI ID</Text>
                  <Text style={styles.upiCardValue} selectTextOnPress>{payeeUpiId}</Text>
                </View>
              </View>

              <TextInput
                label={t('enterAmount')}
                value={amount}
                onChangeText={handleAmountChange}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
                placeholder={t('amountPlaceholder')}
              />

              <View style={styles.termsRow}>
                <TouchableOpacity onPress={() => setAgree(!agree)} style={styles.checkboxIcon}>
                  <MaterialCommunityIcons
                    name={agree ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color={agree ? '#28a745' : '#999'}
                  />
                </TouchableOpacity>
                <Text style={styles.termsText} onPress={() => setAgree(!agree)}>
                  {t('agreeTo')}{' '}
                  <Text style={styles.linkText} onPress={() => navigation.navigate('Terms')}>
                    {t('termsAndConditions')}
                  </Text>
                </Text>
              </View>

              <Text style={styles.payOptionLabel}>Pay with your preferred UPI app:</Text>

              <Button
                mode="contained"
                onPress={() => handleDonate()}
                style={[styles.button, { backgroundColor: 'rgb(211, 16, 16)' }]}
                loading={loading}
                disabled={!canDonate}
                icon="google-wallet"
              >
                {loading ? t('processing') : 'Pay via Any UPI App (GPay / PhonePe / Paytm)'}
              </Button>

              <View style={styles.appRow}>
                <TouchableOpacity
                  style={[styles.appChip, !canDonate && styles.disabledChip]}
                  onPress={() => canDonate && handleDonate('gpay')}
                  disabled={!canDonate}
                >
                  <MaterialCommunityIcons name="google" size={18} color={canDonate ? '#4285F4' : '#ccc'} />
                  <Text style={[styles.appChipText, !canDonate && styles.disabledText]}>Google Pay</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.appChip, !canDonate && styles.disabledChip]}
                  onPress={() => canDonate && handleDonate('phonepe')}
                  disabled={!canDonate}
                >
                  <MaterialCommunityIcons name="cellphone" size={18} color={canDonate ? '#5f259f' : '#ccc'} />
                  <Text style={[styles.appChipText, !canDonate && styles.disabledText]}>PhonePe</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.appChip, !canDonate && styles.disabledChip]}
                  onPress={() => canDonate && handleDonate('paytm')}
                  disabled={!canDonate}
                >
                  <MaterialCommunityIcons name="wallet" size={18} color={canDonate ? '#00baf2' : '#ccc'} />
                  <Text style={[styles.appChipText, !canDonate && styles.disabledText]}>Paytm</Text>
                </TouchableOpacity>
              </View>
            </Surface>

            <Surface style={styles.adSurface}>
              <Title style={styles.title}>{t('watchAdSupportTitle')}</Title>
              <Text style={styles.adDescription}>{t('watchAdSupportDescription')}</Text>
              <Button
                mode="outlined"
                onPress={handleWatchAd}
                style={styles.adButton}
                loading={adLoading}
              >
                {adLoading ? t('watchingAd') : t('watchAd')}
              </Button>
              {adWatched && <Text style={styles.adThankYou}>{t('adSupportThankYou')}</Text>}
            </Surface>
          </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardAvoidingContainer: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 16, paddingBottom: 88 },
  surface: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  sloganContainer: {
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 14,
    borderRadius: 14,
  },
  sloganMain: {
    textAlign: 'center',
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  upiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  upiCardLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upiCardValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 2,
  },
  input: { marginBottom: 14, backgroundColor: '#FFFFFF' },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkboxIcon: { padding: 4 },
  termsText: { flex: 1, marginLeft: 8, lineHeight: 20, color: '#475569', fontSize: 13 },
  linkText: { color: '#1E3A8A', fontWeight: '700', textDecorationLine: 'underline' },
  button: { marginTop: 8, borderRadius: 14, paddingVertical: 4 },
  payOptionLabel: { marginTop: 14, marginBottom: 10, fontSize: 13, fontWeight: '700', color: '#0F172A' },
  appRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  appChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  disabledChip: { borderColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  appChipText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  disabledText: { color: '#94A3B8' },
  adSurface: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginVertical: 10,
    borderColor: '#F1F5F9',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  adDescription: { marginBottom: 14, color: '#475569', textAlign: 'center', fontSize: 13, lineHeight: 18 },
  adButton: { marginTop: 6, borderRadius: 14, borderColor: '#10B981' },
  adThankYou: { marginTop: 14, color: '#059669', textAlign: 'center', fontWeight: '700', fontSize: 13 },
});

export default DonateAmountScreen;
