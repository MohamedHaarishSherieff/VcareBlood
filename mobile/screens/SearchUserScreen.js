import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Searchbar, Card, Text, ActivityIndicator, Avatar, useTheme, IconButton } from 'react-native-paper';
import { db } from '../firebase/config';
import { collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SearchUserScreen({ navigation }) {
  const theme = useTheme();
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const queryLower = trimmed.toLowerCase();
      const found = new Map();

      // 1. Phone number lookup (last 10 digits)
      const phoneDigits = trimmed.replace(/\D/g, '').slice(-10);
      if (phoneDigits.length === 10) {
        const profileSnap = await getDoc(doc(db, 'Mobile_Numbers', phoneDigits, 'profile_details', 'details'));
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          found.set(phoneDigits, { ...data, phoneNumber: phoneDigits });
        }
      }

      // 2. Name search (collectionGroup)
      // Note: For real scale, use Algolia/ElasticSearch or indexed queries
      const allProfilesSnap = await getDocs(collectionGroup(db, 'profile_details'));
      allProfilesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.phoneNumber) {
          const name = (data.name || '').toLowerCase();
          const nameLower = (data.nameLower || '').toLowerCase();
          if (name.includes(queryLower) || nameLower.includes(queryLower)) {
            found.set(data.phoneNumber, { ...data });
          }
        }
      });

      setResults(Array.from(found.values()));
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Unable to reach the database. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('UserProfile', { phoneNumber: item.phoneNumber })}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.userInfo}>
          {item.profilePhoto ? (
            <Avatar.Image size={52} source={{ uri: item.profilePhoto }} />
          ) : (
            <Avatar.Icon size={52} icon="account" style={{ backgroundColor: '#F1F5F9' }} color="#64748B" />
          )}
          <View style={styles.textContainer}>
            <Text style={styles.userName}>{item.name || 'Anonymous User'}</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={15} color="#64748B" />
              <Text style={styles.locationText}>
                {item.city ? `${item.city}, ${item.state}` : item.state || 'Location not set'}
              </Text>
            </View>
            <View style={styles.bloodBadge}>
              <MaterialCommunityIcons name="water" size={14} color="#D32F2F" />
              <Text style={styles.bloodBadgeText}>{item.bloodGroup || 'Not set'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.chevronCircle}>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#64748B" />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Searchbar
          placeholder="Search name or 10-digit number"
          value={queryText}
          onChangeText={setQueryText}
          onSubmitEditing={runSearch}
          style={styles.searchBar}
          icon="magnify"
          iconColor="#D32F2F"
          placeholderTextColor="#94A3B8"
          inputStyle={{ fontSize: 14, color: '#0F172A' }}
          elevation={0}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator animating size="large" color="#D32F2F" />
          <Text style={styles.loadingText}>Searching V-Care network...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.phoneNumber || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : searched ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="account-search-outline" size={72} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptySubtitle}>Try searching by full name or 10-digit phone number</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircleBig}>
            <MaterialCommunityIcons name="account-group" size={64} color="#D32F2F" />
          </View>
          <Text style={styles.welcomeTitle}>Search Network</Text>
          <Text style={styles.welcomeSubtitle}>Find registered donors across the V-Care community platform.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    paddingRight: 12,
  },
  searchBar: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    height: 48,
  },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textContainer: { marginLeft: 14, flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  locationText: { fontSize: 13, color: '#64748B', marginLeft: 4 },
  bloodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bloodBadgeText: { fontSize: 12, color: '#D32F2F', fontWeight: '700', marginLeft: 4 },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 14, color: '#64748B', fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  iconCircleBig: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  welcomeSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
