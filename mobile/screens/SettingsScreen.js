import React, { useContext, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Share, Linking, Platform, Alert } from 'react-native';
import { List, Switch, useTheme, Text, Portal, Dialog, Button, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LanguageContext } from '../context/LanguageContext';
import { db, authentication } from '../firebase/config';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import storageService from '../services/storageService';

const APP_LINK = 'https://example.com/download'; // replace with your real app link
const SHARE_MESSAGE = `Check out vcare app - Help save lives by donating blood! Download here: ${APP_LINK}`;

export default function SettingsScreen({ navigation }) {
  const { language, setLanguage, t, languages } = useContext(LanguageContext);
  const theme = useTheme();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAgree, setDeleteAgree] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const phone = await AsyncStorage.getItem('userPhoneNumber');
      const storedLanguage = await AsyncStorage.getItem('appLanguage');
      setIsLoggedIn(!!phone);
      if (storedLanguage && storedLanguage !== language) {
        setLanguage(storedLanguage);
      }
    };
    loadSettings();
  }, []);

  const onShareApp = async () => {
    try {
      await Share.share({ message: SHARE_MESSAGE });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  const onRateApp = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/id[YOUR_APP_ID]', // Replace with your App Store ID
      android: 'market://details?id=com.vcare', // Replace with your app package name
      default: APP_LINK,
    });

    Linking.canOpenURL(storeUrl).then(supported => {
      if (supported) {
        Linking.openURL(storeUrl);
      } else {
        console.warn('Unable to open store URL');
      }
    });
  };

  const confirmDeleteAccount = () => {
    setDeleteAgree(false);
    setShowDeleteDialog(true);
  };

  const onDeleteAccount = async () => {
    try {
      const uid = await AsyncStorage.getItem('userId');
      const storedPhone = await AsyncStorage.getItem('userPhoneNumber');
      const profileKey = storedPhone || uid;

      if (profileKey) {
        // delete donor documents that match this phone number
        if (storedPhone) {
          const donorQuery = query(collection(db, 'donors'), where('phoneNumber', '==', storedPhone));
          const donorSnapshot = await getDocs(donorQuery);
          for (const donorDoc of donorSnapshot.docs) {
            await deleteDoc(doc(db, 'donors', donorDoc.id));
          }
        }

        // remove profile details record under Mobile_Numbers
        const profileDetails = doc(db, 'Mobile_Numbers', profileKey, 'profile_details', 'details');
        await deleteDoc(profileDetails).catch(() => null);

        // remove root Mobile_Numbers document
        await deleteDoc(doc(db, 'Mobile_Numbers', profileKey)).catch(() => null);

        // delete profile photo from storage
        await storageService.deleteProfilePhoto(profileKey);
      }

      // attempt to delete auth user if available
      try {
        if (authentication?.currentUser) {
          await deleteUser(authentication.currentUser);
        }
      } catch (authErr) {
        // deletion may require re-authentication; still proceed to clear local data
        console.warn('Auth deletion failed', authErr);
      }

      // clear local storage and navigate to Register
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userPhoneNumber');
      await AsyncStorage.removeItem('authToken');
      Alert.alert('Account deleted', 'Your account was deleted.');
      navigation.reset({ index: 0, routes: [{ name: 'Register' }] });
    } catch (err) {
      console.error('Delete account failed', err);
      Alert.alert('Error', 'Could not delete account. Try again later.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 }]}>
        <List.Section style={styles.section}>
          <List.Subheader>{t('about')}</List.Subheader>
          <List.Item
            title={t('rateApp')}
            left={props => <MaterialCommunityIcons name="star" size={24} color={theme.colors.primary} style={{ marginRight: 16 }} />}
            onPress={onRateApp}
          />
          <List.Item
            title={t('shareApp')}
            left={props => <MaterialCommunityIcons name="share-variant" size={24} color={theme.colors.primary} style={{ marginRight: 16 }} />}
            onPress={onShareApp}
          />
        </List.Section>

        <List.Section style={styles.section}>
          <List.Subheader>{t('language')}</List.Subheader>
          {languages.map((lang) => (
            <List.Item
              key={lang.code}
              title={lang.label}
              left={(props) => <MaterialCommunityIcons name={language === lang.code ? 'check-circle' : 'circle-outline'} size={24} color={language === lang.code ? '#4CAF50' : theme.colors.placeholder} style={{ marginRight: 16 }} />}
              onPress={async () => {
                setLanguage(lang.code);
                try {
                  await AsyncStorage.setItem('appLanguage', lang.code);
                } catch (err) {
                  console.error('Could not save language', err);
                }
              }}
            />
          ))}
        </List.Section>

        {isLoggedIn && (
          <List.Section style={styles.section}>
            <List.Subheader>{t('account')}</List.Subheader>
            <List.Item
              title={t('deleteAccount')}
              description={t('deleteAccountDesc')}
              left={props => <MaterialCommunityIcons name="delete" size={24} color={theme.colors.error} style={{ marginRight: 16 }} />}
              onPress={confirmDeleteAccount}
            />
          </List.Section>
        )}

        <Portal>
          <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
            <Dialog.Title>{t('deleteAccountConfirmation')}</Dialog.Title>
            <Dialog.Content>
              <Text>
                {t('deleteAccountConfirmationText')}
              </Text>
              <View style={styles.deleteConfirmationRow}>
                <Checkbox.Android
                  status={deleteAgree ? 'checked' : 'unchecked'}
                  onPress={() => setDeleteAgree(!deleteAgree)}
                  color={theme.colors.error}
                />
                <Text style={styles.deleteConfirmationText} onPress={() => setDeleteAgree(!deleteAgree)}>
                  I understand and want to permanently delete my account.
                </Text>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowDeleteDialog(false)}>{t('cancelButton')}</Button>
              <Button
                onPress={() => {
                  setShowDeleteDialog(false);
                  onDeleteAccount();
                }}
                disabled={!deleteAgree}
                mode="contained"
                textColor={theme.colors.error}
              >
                {t('deleteAccountConfirmButton')}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  section: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  deleteConfirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  deleteConfirmationText: {
    flex: 1,
    marginLeft: 8,
    color: '#475569',
    fontSize: 13,
  },
});
