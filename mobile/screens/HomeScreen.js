import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, Text, Button, Badge } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';
import { useTabBar } from '../context/TabBarContext';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { handleScroll } = useTabBar();
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
    <SafeAreaView style={styles.safeContainer} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero & Branding Section */}
        <Surface style={styles.heroCard} elevation={2}>
          <View style={styles.badgeRow}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Live Donor Network • 24/7</Text>
            </View>
            {isLoggedIn && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={16} color="#059669" />
                <Text style={styles.verifiedText}>Active Donor</Text>
              </View>
            )}
          </View>

          {/* Preserved Official Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.welcomeTitle}>{t('welcome')}</Text>
          <Text style={styles.welcomeSubtitle}>{t('connect')}</Text>

          <View style={styles.heroButtonRow}>
            <TouchableOpacity
              style={styles.primaryHeroBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('SearchDonors')}
            >
              <MaterialCommunityIcons name="heart-search" size={22} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>{t('findDonors')}</Text>
            </TouchableOpacity>

            {!isLoggedIn && (
              <TouchableOpacity
                style={styles.secondaryHeroBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Register')}
              >
                <MaterialCommunityIcons name="account-plus" size={22} color="#D32F2F" />
                <Text style={styles.secondaryBtnText}>{t('registerDonor')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Surface>

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick Services</Text>
          <Text style={styles.sectionSubtitle}>Tap to explore</Text>
        </View>

        <View style={styles.gridContainer}>
          {/* Quick Action 1: Search Donors */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SearchDonors')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
              <MaterialCommunityIcons name="blood-bag" size={28} color="#D32F2F" />
            </View>
            <Text style={styles.gridCardTitle}>{t('findDonors')}</Text>
            <Text style={styles.gridCardSub}>Filter by Blood & City</Text>
          </TouchableOpacity>

          {/* Quick Action 2: Emergency Request / Search Users */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SearchUser')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="account-search-outline" size={28} color="#D97706" />
            </View>
            <Text style={styles.gridCardTitle}>{t('searchUsers')}</Text>
            <Text style={styles.gridCardSub}>Direct Donor Lookup</Text>
          </TouchableOpacity>

          {/* Quick Action 3: Donate Funds */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('DonateAmount')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
              <MaterialCommunityIcons name="hand-heart" size={28} color="#059669" />
            </View>
            <Text style={styles.gridCardTitle}>{t('donate')}</Text>
            <Text style={styles.gridCardSub}>Support V-Care Mission</Text>
          </TouchableOpacity>

          {/* Quick Action 4: AI Health Assistant */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="robot" size={28} color="#1E3A8A" />
            </View>
            <Text style={styles.gridCardTitle}>AI Health Bot</Text>
            <Text style={styles.gridCardSub}>Instant Q&A 24/7</Text>
          </TouchableOpacity>
        </View>

        {/* Impact Statistics Counter Card */}
        <Surface style={styles.impactCard} elevation={1}>
          <Text style={styles.impactTitle}>Why Your Support Matters</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Lives Saved per Donor</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Free & Voluntary</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>Direct</Text>
              <Text style={styles.statLabel}>Chat Contact</Text>
            </View>
          </View>
        </Surface>

        {/* Mission Statement & Info Banner */}
        <Surface style={styles.missionCard} elevation={1}>
          <View style={styles.missionHeader}>
            <MaterialCommunityIcons name="shield-check-outline" size={24} color="#1E3A8A" />
            <Text style={styles.missionTitle}>Our Social Mission</Text>
          </View>
          <Text style={styles.missionText}>{t('mission')}</Text>

          <View style={styles.featureChipsRow}>
            <View style={styles.featureChip}>
              <MaterialIcons name="security" size={14} color="#0F172A" />
              <Text style={styles.featureChipText}>Privacy Focused</Text>
            </View>
            <View style={styles.featureChip}>
              <MaterialIcons name="flash-on" size={14} color="#0F172A" />
              <Text style={styles.featureChipText}>Instant Alerts</Text>
            </View>
            <View style={styles.featureChip}>
              <MaterialIcons name="favorite" size={14} color="#0F172A" />
              <Text style={styles.featureChipText}>Community Trust</Text>
            </View>
          </View>
        </Surface>

        {/* Bottom CTA Banner */}
        <TouchableOpacity
          style={styles.bottomCtaBanner}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ReferFriend')}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.bottomCtaTitle}>Help Us Spread the Word</Text>
            <Text style={styles.bottomCtaSub}>Invite friends & relatives to save lives</Text>
          </View>
          <View style={styles.ctaArrowCircle}>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  logo: {
    width: 220,
    height: 100,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  heroButtonRow: {
    flexDirection: 'column',
    gap: 10,
  },
  primaryHeroBtn: {
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryHeroBtn: {
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  secondaryBtnText: {
    color: '#D32F2F',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  gridCardSub: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B',
  },
  impactCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  impactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#93C5FD',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 8,
  },
  missionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 14,
  },
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  featureChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 4,
  },
  bottomCtaBanner: {
    backgroundColor: '#D32F2F',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  bottomCtaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomCtaSub: {
    fontSize: 12,
    color: '#FFCDD2',
    marginTop: 2,
  },
  ctaArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});

export default HomeScreen;