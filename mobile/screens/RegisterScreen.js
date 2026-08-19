import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import authService from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// firestore imports
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const RegisterScreen = ({ navigation }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // allow only digits and limit to 10 characters
  const handleMobileChange = (text) => {
    const digits = text.replace(/\D/g, '');
    // Take the last 10 digits to handle optional country code (e.g. 919876543210 -> 9876543210)
    setMobileNumber(digits.slice(-10));
  };

  const handleContinue = async () => {
    setErrorMsg('');
    if (!mobileNumber || mobileNumber.trim().length === 0) {
      setErrorMsg('Mobile number is required');
      return;
    }
    if (mobileNumber.length !== 10) {
      setErrorMsg('Enter exactly 10 digits');
      return;
    }

    setLoading(true);
    try {
      const mobileDocRef = doc(db, 'Mobile_Numbers', mobileNumber);
      console.log('looking up', mobileNumber);
      const mobileSnap = await getDoc(mobileDocRef);

      if (mobileSnap.exists()) {
        console.log('number exists, data', mobileSnap.data());
        const { hasAccount } = mobileSnap.data();

        // Ensure this number has a profile_details subcollection (create if missing)
        const profileDocRef = doc(db, 'Mobile_Numbers', mobileNumber, 'profile_details', 'details');
        await setDoc(profileDocRef, { phoneNumber: mobileNumber }, { merge: true });

        if (hasAccount) {
          await AsyncStorage.setItem('userPhoneNumber', mobileNumber);
          navigation.navigate('ProfileTab');
        } else {
          await AsyncStorage.removeItem('userPhoneNumber');
          navigation.navigate('DonorDetailsRegistration', { phoneNumber: mobileNumber });
        }
      } else {
        console.log('number not found, creating document');
        await setDoc(mobileDocRef, {
          phoneNumber: mobileNumber,
          hasAccount: false,
          createdAt: serverTimestamp(),
        });

        // Create the profile_details subcollection for this mobile number
        const profileDocRef = doc(db, 'Mobile_Numbers', mobileNumber, 'profile_details', 'details');
        await setDoc(profileDocRef, {
          phoneNumber: mobileNumber,
          createdAt: serverTimestamp(),
        });

        console.log('document created');

        await AsyncStorage.removeItem('userPhoneNumber');
        navigation.navigate('DonorDetailsRegistration', { phoneNumber: mobileNumber });
      }
    } catch (err) {
      console.error('Firestore error', err);
      Alert.alert('Error', 'Unable to verify number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Icon/Logo */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="heart-pulse" size={80} color="#fff" />
        </View>

        {/* Welcome Title */}
        <Text style={styles.mainTitle}>Join V-Care</Text>
        <Text style={styles.subtitle}>Save Lives, One Donation at a Time</Text>

        {/* Card Container */}
        <View style={styles.card}>
          {/* Label */}
          <Text style={styles.label}>Enter Mobile Number</Text>

          {/* Input with Country Code */}
          <View style={styles.inputWrapper}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              placeholder="9876543210"
              value={mobileNumber}
              onChangeText={handleMobileChange}
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.input}
              placeholderTextColor="#bbb"
              selectionColor="#ff6b6b"
            />
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </View>

          {/* Description */}
          <Text style={styles.description}>
            Enter your mobile number to continue
          </Text>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={loading}
            style={[styles.continueButton, loading && styles.buttonDisabled]}
          >
            <View style={styles.gradientButton}>
              <Text style={styles.buttonText}>
                {loading ? 'Loading...' : 'Continue'}
              </Text>
              {!loading && (
                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={styles.buttonIcon} />
              )}
            </View>
          </TouchableOpacity>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#ff6b6b" />
              <Text style={styles.benefitText}>Quick registration</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#ff6b6b" />
              <Text style={styles.benefitText}>Secure & private</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#ff6b6b" />
              <Text style={styles.benefitText}>Help others today</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ff6b6b',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 80,
    paddingBottom: 100,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.9,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff6b6b',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b6b',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  description: {
    fontSize: 13,
    color: '#888',
    marginBottom: 24,
    fontWeight: '500',
  },
  continueButton: {
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  benefitsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginLeft: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});

export default RegisterScreen;