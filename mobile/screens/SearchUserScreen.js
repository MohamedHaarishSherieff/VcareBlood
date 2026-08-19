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
            <Avatar.Image size={50} source={{ uri: item.profilePhoto }} />
          ) : (
            <Avatar.Icon size={50} icon="account" style={{ backgroundColor: '#f0f0f0' }} color="#888" />
          )}
          <View style={styles.textContainer}>
            <Text style={styles.userName}>{item.name || 'Anonymous User'}</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
              <Text style={styles.locationText}>
                {item.city ? `${item.city}, ${item.state}` : item.state || 'Location not set'}
              </Text>
            </View>
            <View style={styles.bloodRow}>
              <MaterialCommunityIcons name="water" size={14} color="#ff6b6b" />
              <Text style={styles.bloodText}>Blood Group: {item.bloodGroup || 'Not set'}</Text>
            </View>
          </View>
        </View>
        <IconButton
          icon="chevron-right"
          iconColor={theme.colors.primary}
          size={24}
        />
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search by name or number"
          value={queryText}
          onChangeText={setQueryText}
          onSubmitEditing={runSearch}
          style={styles.searchBar}
          icon="magnify"
          iconColor="#ff6b6b"
          placeholderTextColor="#999"
          elevation={2}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator animating size="large" color="#ff6b6b" />
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
          <MaterialCommunityIcons name="account-search-outline" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptySubtitle}>Try searching by full name or 10-digit number</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <MaterialCommunityIcons name="account-group" size={100} color="#fff1f1" />
          <Text style={styles.welcomeTitle}>Find Donors</Text>
          <Text style={styles.welcomeSubtitle}>Search the V-Care community for life-saving connections.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    borderRadius: 12,
    backgroundColor: '#f1f3f5',
  },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textContainer: { marginLeft: 12, flex: 1 },
  userName: { fontSize: 17, fontWeight: '700', color: '#2C3E50', marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  locationText: { fontSize: 13, color: '#666', marginLeft: 4 },
  bloodRow: { flexDirection: 'row', alignItems: 'center' },
  bloodText: { fontSize: 12, color: '#ff6b6b', fontWeight: '600', marginLeft: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 14, color: '#666', fontWeight: '500' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#444', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8 },
  welcomeTitle: { fontSize: 24, fontWeight: '800', color: '#ff6b6b', marginTop: 20 },
  welcomeSubtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 10, lineHeight: 22 },
});
