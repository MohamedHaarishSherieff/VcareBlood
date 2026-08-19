import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, Text } from 'react-native';
import { TextInput, Button, Title, Card, Paragraph, Surface, List, Divider, Portal, Modal, useTheme, Avatar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { donorService } from '../services/donorService';
import { statesWithDistricts } from '../data/states-districts';
import { LanguageContext } from '../context/LanguageContext';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const states = ['All', ...Object.keys(statesWithDistricts)];

export default function SearchDonorsScreen({ route, navigation }) {
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
            <Avatar.Image size={50} source={{ uri: item.profilePhoto }} />
          ) : (
            <Avatar.Icon size={50} icon="account" style={{ backgroundColor: '#f0f0f0' }} color="#888" />
          )}
          <View style={styles.textContainer}>
            <Text style={styles.donorName}>{item.name || 'Anonymous'}</Text>
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
        placeholder={`Select ${label.toLowerCase()}`}
        editable={false}
        disabled={disabled}
        right={
          <TextInput.Icon
            icon={() => (
              <MaterialCommunityIcons name="chevron-down" size={24} color="#555" />
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
                onPress={() => onSelect(item)}
                style={styles.listItem}
              />
            )}
            ItemSeparatorComponent={() => <Divider />}
          />
        </Modal>
      </Portal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
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

        <Button
          mode="contained"
          onPress={handleSearch}
          style={styles.searchButton}
          labelStyle={{ color: '#fff' }}
        >
          {t('searchDonors')}
        </Button>
      </Surface>

      {loading ? (
        <ActivityIndicator size="large" color="rgb(211, 16, 16)" style={styles.loader} />
      ) : (
        <FlatList
          data={donors}
          renderItem={renderDonorCard}
          keyExtractor={(item) => item.phoneNumber || item.id || Math.random().toString()}
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          ListEmptyComponent={
            <Paragraph style={styles.emptyText}>
              {searchQuery.bloodGroup || searchQuery.city || searchQuery.state
                ? t('noDonorsFound')
                : t('searchDonorsMessage')}
            </Paragraph>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        }),
  },
  inputContainer: {
    marginBottom: 12,
  },
  dropdownButton: {
    width: '100%',
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    padding: 16,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: '#e0e0e0',
  },
  listItem: {
    paddingVertical: 8,
  },
  searchButton: {
    marginTop: 8,
    backgroundColor: 'rgb(211, 16, 16)',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
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
  donorInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  textContainer: { 
    marginLeft: 12, 
    flex: 1 
  },
  donorName: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#2C3E50', 
    marginBottom: 2 
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 2 
  },
  locationText: { 
    fontSize: 13, 
    color: '#666', 
    marginLeft: 4 
  },
  bloodRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  bloodText: { 
    fontSize: 12, 
    color: '#ff6b6b', 
    fontWeight: '600', 
    marginLeft: 4 
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.7,
  }
});