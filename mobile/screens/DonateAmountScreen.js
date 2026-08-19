import React, { useState, useContext } from 'react';
import {
  SafeAreaView,
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

  const payeeUpiId = 'vcare@upi';
  const payeeName = 'V-Care Blood Donation Platform';

  const isAmountValid = () => {
    const num = Number(amount);
    return amount && !isNaN(num) && num > 0;
  };

  const canDonate = isAmountValid() && agree && !loading;

  const handleDonate = async () => {
    if (!isAmountValid()) {
      Alert.alert('Validation', 'Please enter a valid donation amount');
      return;
    }
    if (!agree) {
      Alert.alert('Terms', 'Please agree to the terms and conditions before donating');
      return;
    }

    const upiUrl = `upi://pay?pa=${encodeURIComponent(payeeUpiId)}&pn=${encodeURIComponent(
      payeeName,
    )}&am=${encodeURIComponent(amount)}&cu=INR`;

    try {
      setLoading(true);
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (!canOpen) {
        Alert.alert(
          'No UPI app',
          'No UPI app found on this device. Please install one (Google Pay, PhonePe, Paytm, etc.) and try again.',
        );
        return;
      }

      await Linking.openURL(upiUrl);
    } catch (err) {
      console.error('UPI payment launch failed', err);
      Alert.alert('Payment Error', 'Unable to open UPI app. Please try again later.');
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
    <SafeAreaView style={styles.safeArea}>
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

              <Button
                mode="contained"
                onPress={handleDonate}
                style={styles.button}
                loading={loading}
                disabled={!canDonate}
              >
                {loading ? t('processing') : t('donate')}
              </Button>
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
  keyboardAvoidingContainer: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 16, paddingBottom: 88 },
  surface: { padding: 20, elevation: 4, borderRadius: 10, marginVertical: 12 },
  title: { textAlign: 'center', marginBottom: 16 },
  sloganContainer: { marginBottom: 16, alignItems: 'center' },
  sloganMain: {
    textAlign: 'center',
    color: 'rgb(211, 16, 16)',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  input: { marginBottom: 14 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkboxIcon: { padding: 4 },
  termsText: { flex: 1, marginLeft: 8, lineHeight: 20 },
  linkText: { color: '#1560FF', textDecorationLine: 'underline' },
  button: { marginTop: 8, borderRadius: 8 },
  adSurface: {
    padding: 20,
    elevation: 4,
    borderRadius: 10,
    marginVertical: 12,
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  adDescription: { marginBottom: 12, color: '#444', textAlign: 'center' },
  adButton: { marginTop: 8, borderRadius: 8 },
  adThankYou: { marginTop: 14, color: '#28a745', textAlign: 'center', fontWeight: '600' },
});

export default DonateAmountScreen;
