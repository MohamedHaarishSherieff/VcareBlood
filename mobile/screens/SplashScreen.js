import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';

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
            // Incomplete registration or non-existent account - clear stored phone
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
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  logo: {
    width: 400,
    height: 400,
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
  }
});

export default SplashScreen;
