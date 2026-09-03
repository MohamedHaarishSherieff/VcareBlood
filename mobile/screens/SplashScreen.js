import React, { useEffect } from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    let isMounted = true;
    const checkSessionAndNavigate = async () => {
      try {
        const phone = await AsyncStorage.getItem('userPhoneNumber');
        if (phone) {
          const mobileDocRef = doc(db, 'Mobile_Numbers', phone);
          const mobileSnap = await getDoc(mobileDocRef);
          if (!mobileSnap.exists() || !mobileSnap.data()?.hasAccount) {
            await AsyncStorage.removeItem('userPhoneNumber');
          }
        }
      } catch (err) {
        console.warn('SplashScreen session check warning:', err);
      } finally {
        if (isMounted && navigation && navigation.replace) {
          navigation.replace('Main');
        }
      }
    };

    const timer = setTimeout(() => {
      checkSessionAndNavigate();
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrapper}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <ActivityIndicator size="large" color="#D32F2F" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  logoWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logo: {
    width: 260,
    height: 120,
  },
  loader: {
    marginTop: 12,
  },
});

export default SplashScreen;
