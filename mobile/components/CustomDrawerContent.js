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
            icon={({ color, size }) => <MaterialCommunityIcons name="home-heart" size={22} color="#D32F2F" />}
            labelStyle={styles.itemLabel}
            onPress={() => props.navigation.navigate('HomeTab')}
          />
        )}
        <DrawerItem
          label={t('donate')}
          icon={({ color, size }) => <MaterialCommunityIcons name="hand-heart" size={22} color="#D32F2F" />}
          labelStyle={styles.itemLabel}
          onPress={() => props.navigation.navigate('DonateAmount')}
        />
        <DrawerItem
          label={t('findDonors')}
          icon={({ color, size }) => <MaterialCommunityIcons name="account-search" size={22} color="#1E3A8A" />}
          labelStyle={styles.itemLabel}
          onPress={() => props.navigation.navigate('SearchDonors')}
        />
        {isLoggedIn && (
          <DrawerItem
            label={t('myProfile')}
            icon={({ color, size }) => <MaterialCommunityIcons name="account-circle" size={22} color="#1E3A8A" />}
            labelStyle={styles.itemLabel}
            onPress={() => props.navigation.navigate('ProfileTab')}
          />
        )}
        <DrawerItem
          label={t('referFriend')}
          icon={({ color, size }) => <MaterialCommunityIcons name="share-variant" size={22} color="#64748B" />}
          labelStyle={styles.itemLabel}
          onPress={() => props.navigation.navigate('ReferFriend')}
        />
        <DrawerItem
          label={t('faq')}
          icon={({ color, size }) => <MaterialCommunityIcons name="help-circle-outline" size={22} color="#64748B" />}
          labelStyle={styles.itemLabel}
          onPress={() => props.navigation.navigate('FAQ')}
        />
        <DrawerItem
          label={t('settings')}
          icon={({ color, size }) => <MaterialCommunityIcons name="cog-outline" size={22} color="#64748B" />}
          labelStyle={styles.itemLabel}
          onPress={() => props.navigation.navigate('Settings')}
        />
        <DrawerItem
          label={t('aboutUs')}
          icon={({ color, size }) => <MaterialCommunityIcons name="information-outline" size={22} color="#64748B" />}
          labelStyle={styles.itemLabel}
          onPress={() => props.navigation.navigate('About')}
        />

        {isLoggedIn && (
          <DrawerItem
            label={t('logout')}
            icon={({ color, size }) => <MaterialCommunityIcons name="logout" size={22} color="#D32F2F" />}
            labelStyle={[styles.itemLabel, { color: '#D32F2F', fontWeight: '700' }]}
            onPress={handleLogout}
          />
        )}
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerScroll: {
    backgroundColor: '#FFFFFF',
  },
  drawerScrollContent: {
    flex: 1,
    paddingVertical: 0,
  },
  drawerContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  drawerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFEBEE',
  },
  loginButton: {
    backgroundColor: '#D32F2F',
    marginBottom: 8,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loginText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: -12,
  },
});

export default CustomDrawerContent;