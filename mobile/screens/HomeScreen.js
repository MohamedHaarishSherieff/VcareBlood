import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Surface, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';

const HomeScreen = ({ navigation }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { t } = useContext(LanguageContext);

  const refreshLogin = async () => {
    const userPhoneNumber = await AsyncStorage.getItem('userPhoneNumber');
    const userId = await AsyncStorage.getItem('userId');
    const accessToken = await AsyncStorage.getItem('vcare_access_token');
    setIsLoggedIn(!!userPhoneNumber || !!userId || !!accessToken);
  };

  useEffect(() => {
    refreshLogin();
    const unsubscribe = navigation.addListener('focus', refreshLogin);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Text style={styles.welcomeText}>{t('welcome')}</Text>
        <Text style={styles.subtitle}>{t('connect')}</Text>
        <Text style={styles.description}>{t('mission')}</Text>
        <View style={styles.buttonContainer}>
          {!isLoggedIn && (
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Register')}
              style={styles.button}
            >
              {t('registerDonor')}
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('SearchDonors')}
            style={styles.button}
          >
            {t('findDonors')}
          </Button>
        </View>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  surface: {
    margin: 16,
    padding: 20,
    elevation: 4,
    borderRadius: 10,
  },
  welcomeText: {
    fontSize: 24,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    marginVertical: 8,
  },
});

export default HomeScreen;