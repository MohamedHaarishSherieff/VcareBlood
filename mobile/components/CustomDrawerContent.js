import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItem,
  useDrawerStatus,
} from '@react-navigation/drawer';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';

function CustomDrawerContent(props) {
  const { t } = useContext(LanguageContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = async () => {
    // Clear stored auth state
    const userId = await AsyncStorage.getItem('userId');
    const phone = await AsyncStorage.getItem('userPhoneNumber');
    const currentUserId = userId || phone;
    
    await AsyncStorage.removeItem('userPhoneNumber');
    await AsyncStorage.removeItem('userDetailsDocId');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('vcare_access_token');
    await AsyncStorage.removeItem('vcare_refresh_token');
    
    // Clear user-specific chat history
    if (currentUserId) {
      await AsyncStorage.removeItem(`@vcare_recent_chats_${currentUserId}`);
    }
    
    setIsLoggedIn(false);
    // Reset navigation stack and go to Register
    props.navigation.reset({
      index: 0,
      routes: [{ name: 'Register' }],
    });
  };

  const drawerStatus = useDrawerStatus();

  // Re-check login state whenever the drawer opens/closes
  useEffect(() => {
    const updateLoginState = async () => {
      const phone = await AsyncStorage.getItem('userPhoneNumber');
      const userId = await AsyncStorage.getItem('userId');
      const accessToken = await AsyncStorage.getItem('vcare_access_token');
      setIsLoggedIn(!!phone || !!userId || !!accessToken);
    };

    updateLoginState();
  }, [drawerStatus]);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScrollContent} style={styles.drawerScroll}>
      <View style={styles.drawerContent}>
        {/* Drawer header with close/back button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => props.navigation.closeDrawer()} style={styles.drawerBackButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Login section at the top of drawer */}
        {!isLoggedIn && (
          <View style={styles.loginSection}>
            <Button
              mode="contained"
              onPress={() => props.navigation.navigate('Register')}
              style={styles.loginButton}
              labelStyle={styles.loginButtonText}
              icon="login"
            >
              {t('signIn')}
            </Button>
            <Text style={styles.loginText}>{t('loginToAccessFeatures')}</Text>
          </View>
        )}
        
        {/* Standard drawer items */}
        {isLoggedIn && (
          <DrawerItem
            label={t('home')}
            onPress={() => props.navigation.navigate('HomeTab')}
          />
        )}
        <DrawerItem
          label={t('donate')}
          onPress={() => props.navigation.navigate('DonateAmount')}
        />
        <DrawerItem
          label={t('findDonors')}
          onPress={() => props.navigation.navigate('SearchDonors')}
        />
        {isLoggedIn && (
          <DrawerItem
            label={t('myProfile')}
            onPress={() => props.navigation.navigate('ProfileTab')}
          />
        )}
        <DrawerItem
          label={t('referFriend')}
          onPress={() => props.navigation.navigate('ReferFriend')}
        />
        <DrawerItem
          label={t('faq')}
          onPress={() => props.navigation.navigate('FAQ')}
        />
        <DrawerItem
          label={t('settings')}
          onPress={() => props.navigation.navigate('Settings')}
        />
        <DrawerItem
          label={t('aboutUs')}
          onPress={() => props.navigation.navigate('About')}
        />

        {isLoggedIn && (
          <DrawerItem
            label={t('logout')}
            onPress={handleLogout}
          />
        )}
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerScroll: {
    backgroundColor: '#fff',
  },
  drawerScrollContent: {
    flex: 1,
    paddingVertical: 0,
  },
  drawerContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  drawerBackButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff5f2',
  },
  loginButton: {
    backgroundColor: 'rgb(211, 16, 16)',
    marginBottom: 8,
  },
  loginButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  loginText: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default CustomDrawerContent;