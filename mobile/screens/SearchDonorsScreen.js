import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, Text } from 'react-native';
import { TextInput, Button, Title, Card, Paragraph, Surface, List, Divider, Portal, Modal, useTheme, Avatar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { donorService } from '../services/donorService';
import { statesWithDistricts } from '../data/states-districts';
import { LanguageContext } from '../context/LanguageContext';
import { useTabBar } from '../context/TabBarContext';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const states = ['All', ...Object.keys(statesWithDistricts)];

export default function SearchDonorsScreen({ route, navigation }) {
  const { handleScroll } = useTabBar();
  const theme = useTheme();
  const { t } = useContext(LanguageContext);

  const [searchQuery, setSearchQuery] = useState({
    bloodGroup: '',
    state: '',
    city: ''
  });

  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDropdown, setSelectedDropdown] = useState(null);
  const [availableDistricts, setAvailableDistricts] = useState([]);

  useEffect(() => {
    if (searchQuery.state && searchQuery.state !== 'All') {
      setAvailableDistricts(statesWithDistricts[searchQuery.state] || []);
      setSearchQuery(prev => ({ ...prev, city: '' }));
    } else {
      setAvailableDistricts([]);
      setSearchQuery(prev => ({ ...prev, city: '' }));
    }
  }, [searchQuery.state]);

  useEffect(() => {
    const initialQuery = {
      bloodGroup: route?.params?.bloodGroup || searchQuery.bloodGroup || '',
      state: route?.params?.state || searchQuery.state || '',
      city: route?.params?.city || searchQuery.city || ''
    };
    if (route?.params?.bloodGroup || route?.params?.state || route?.params?.city) {
      setSearchQuery(initialQuery);
    }
    handleSearchWithQuery(initialQuery);
  }, [route?.params]);

  const handleSearchWithQuery = async (queryToUse) => {
    const activeQuery = queryToUse || searchQuery;
    setLoading(true);
    try {
      const results = await donorService.searchDonors(activeQuery);
      setDonors(results);
    } catch (error) {
      console.error('Search error:', error);
      alert((t('errorSearchingDonors') || 'Error searching donors:') + ' ' + (error.message || 'Please try again'));
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await handleSearchWithQuery(searchQuery);
  };

  const renderDonorCard = ({ item }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('UserProfile', { phoneNumber: item.phoneNumber })}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.donorInfo}>
          {item.profilePhoto ? (
            <Avatar.Image size={52} source={{ uri: item.profilePhoto }} />
          ) : (
            <Avatar.Icon size={52} icon="account" style={{ backgroundColor: '#F1F5F9' }} color="#64748B" />
          )}
          <View style={styles.textContainer}>
            <Text style={styles.donorName}>{item.name || 'Anonymous'}</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={15} color="#64748B" />
              <Text style={styles.locationText}>
                {item.city ? `${item.city}, ${item.state}` : item.state || 'Location not set'}
              </Text>
            </View>
            <View style={styles.bloodBadge}>
              <MaterialCommunityIcons name="water" size={14} color="#D32F2F" />
              <Text style={styles.bloodBadgeText}>{item.bloodGroup || 'Group unset'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.chevronCircle}>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#64748B" />
        </View>
      </Card.Content>
    </Card>
  );

  const renderDropdownButton = (label, value, type, disabled = false) => (
    <TouchableOpacity
      onPress={() => !disabled && setSelectedDropdown(type)}
      style={styles.dropdownButton}
      disabled={disabled}
    >
      <TextInput
        label={label}
        value={value}
        mode="outlined"
        style={styles.input}
        outlineColor="#E2E8F0"
        activeOutlineColor="#D32F2F"
        placeholder={`Select ${label.toLowerCase()}`}
        editable={false}
        disabled={disabled}
        right={
          <TextInput.Icon
            icon={() => (
              <MaterialCommunityIcons name="chevron-down" size={22} color="#64748B" />
            )}
            onPress={() => !disabled && setSelectedDropdown(type)}
            forceTextInputFocus={false}
          />
        }
      />
    </TouchableOpacity>
  );

  const renderDropdownModal = () => {
    let title = '';
    let items = [];
    let onSelect = () => {};

    switch (selectedDropdown) {
      case 'bloodGroup':
        title = t('selectBloodGroup');
        items = bloodGroups;
        onSelect = (item) => {
          setSearchQuery(prev => ({ ...prev, bloodGroup: item }));
          setSelectedDropdown(null);
        };
        break;
      case 'state':
        title = t('selectState');
        items = states;
        onSelect = (item) => {
          setSearchQuery(prev => ({ ...prev, state: item, city: '' }));
          setSelectedDropdown(null);
        };
        break;
      case 'district':
        title = t('selectDistrict');
        items = availableDistricts;
        onSelect = (item) => {
          setSearchQuery(prev => ({ ...prev, city: item }));
          setSelectedDropdown(null);
        };
        break;
      default:
        return null;
    }

    return (
      <Portal>
        <Modal
          visible={!!selectedDropdown}
          onDismiss={() => setSelectedDropdown(null)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>{title}</Title>
          <Divider style={styles.divider} />
          <FlatList
            data={items}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <List.Item
                title={item}
                titleStyle={{ fontSize: 15, fontWeight: '600', color: '#0F172A' }}
                onPress={() => onSelect(item)}
                style={styles.listItem}
              />
            )}
            ItemSeparatorComponent={() => <Divider style={{ backgroundColor: '#F1F5F9' }} />}
          />
        </Modal>
      </Portal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <Surface style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          {renderDropdownButton(t('bloodGroup'), searchQuery.bloodGroup, 'bloodGroup')}
        </View>

        <View style={styles.inputContainer}>
          {renderDropdownButton(t('state'), searchQuery.state, 'state')}
        </View>

        <View style={styles.inputContainer}>
          {renderDropdownButton(
            t('district'),
            searchQuery.city,
            'district',
            !searchQuery.state || searchQuery.state === 'All'
          )}
        </View>

        {renderDropdownModal()}

        <TouchableOpacity
          style={styles.searchButton}
          activeOpacity={0.85}
          onPress={handleSearch}
        >
          <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
          <Text style={styles.searchButtonText}>{t('searchDonors')}</Text>
        </TouchableOpacity>
      </Surface>

      {loading ? (
        <ActivityIndicator size="large" color="#D32F2F" style={styles.loader} />
      ) : (
        <FlatList
          data={donors}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={renderDonorCard}
          keyExtractor={(item) => item.phoneNumber || item.id || Math.random().toString()}
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="water-off-outline" size={64} color="#CBD5E1" />
              <Paragraph style={styles.emptyText}>
                {searchQuery.bloodGroup || searchQuery.city || searchQuery.state
                  ? t('noDonorsFound')
                  : t('searchDonorsMessage')}
              </Paragraph>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  inputContainer: {
    marginBottom: 10,
  },
  dropdownButton: {
    width: '100%',
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 20,
    maxHeight: '75%',
    paddingBottom: 8,
  },
  modalTitle: {
    padding: 18,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    backgroundColor: '#E2E8F0',
  },
  listItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  searchButton: {
    marginTop: 6,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
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
  donorInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  textContainer: { 
    marginLeft: 14, 
    flex: 1 
  },
  donorName: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0F172A', 
    marginBottom: 3 
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 6 
  },
  locationText: { 
    fontSize: 13, 
    color: '#64748B', 
    marginLeft: 4 
  },
  bloodBadge: { 
    flexDirection: 'row', 
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bloodBadgeText: { 
    fontSize: 12, 
    color: '#D32F2F', 
    fontWeight: '700', 
    marginLeft: 4 
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  }
});