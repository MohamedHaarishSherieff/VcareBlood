import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { donorService } from '../services/donorService';
import knowledgeBaseService from '../services/knowledgeBaseService';
import { statesWithDistricts } from '../data/states-districts';
import { useTabBar } from '../context/TabBarContext';

export default function AIChatScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { handleScroll, showTabBar, hideTabBar } = useTabBar();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm Ismail. How can I help you today? Ask me anything about blood donation, finding donors, or using the app.",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardOpen(true);
        hideTabBar();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
        showTabBar();
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [hideTabBar, showTabBar]);

  const sectionRoutes = [
    { keywords: ['donor list', 'find donors', 'search donors', 'find the donors', 'donor screen', 'where to find donors', 'open donor list', 'show me donors', 'list of donors'], screen: 'SearchDonors', label: 'Open Donor Search', response: 'Here is the donor search section in the app.' },
    { keywords: ['language', 'change language', 'language setting', 'language settings'], screen: 'Settings', label: 'Open Settings', response: 'You can change language in Settings.' },
    { keywords: ['profile', 'edit profile', 'my profile'], screen: 'ProfileTab', label: 'Open Profile', response: 'Here is your profile section.' },
    { keywords: ['register', 'sign up', 'create account', 'join'], screen: 'Register', label: 'Open Register', response: 'You can register in the app here.' },
    { keywords: ['donor registration', 'donor details', 'register as donor'], screen: 'DonorDetailsRegistration', label: 'Open Donor Registration', response: 'This is the donor registration section.' },
    { keywords: ['faq', 'frequently asked questions'], screen: 'FAQ', label: 'Open FAQ', response: 'Here is the FAQ section.' },
    { keywords: ['delete account', 'delete my account', 'close account', 'account deletion', 'delete acount', 'close my account', 'how to delete my account'], screen: 'Settings', label: 'Open Settings', response: 'You can delete your account from Settings. Tap below to open it.' },
    { keywords: ['settings', 'app settings', 'preferences'], screen: 'Settings', label: 'Open Settings', response: 'Open Settings from here.' },
    { keywords: ['about', 'about us', 'about app'], screen: 'About', label: 'Open About', response: 'Here is the About section.' },
    { keywords: ['refer friend', 'refer a friend', 'invite friend', 'share app'], screen: 'ReferFriend', label: 'Open Refer Friend', response: 'This is the Refer Friend section.' },
    { keywords: ['terms', 'terms and conditions', 'privacy'], screen: 'Terms', label: 'Open Terms', response: 'Here are the Terms & Conditions.' },
    { keywords: ['forgot password', 'reset password', 'password reset'], screen: 'ForgotPassword', label: 'Open Forgot Password', response: 'You can reset your password here.' },
    { keywords: ['search users', 'find users', 'user search'], screen: 'SearchUser', label: 'Open User Search', response: 'This is the user search screen.' },
    { keywords: ['donate money', 'financial donation', 'donate cash', 'pay donation', 'money donation', 'support financially'], screen: 'DonateAmount', label: 'Open Donate', response: 'This is the financial donation screen.' },
    { keywords: ['home screen', 'home page', 'go home', 'open home'], screen: 'HomeTab', label: 'Open Home', response: 'This is the Home screen.' },
  ];

  const levenshteinDistance = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + 1);
      }
    }
    return matrix[b.length][a.length];
  };

  const normalizeState = (location) => {
    if (!location) return null;
    const normalizedLocation = location.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const state of Object.keys(statesWithDistricts)) {
      const normalizedState = state.toLowerCase().replace(/\s+/g, ' ').trim();
      if (normalizedState === normalizedLocation || normalizedState.replace(/ /g, '') === normalizedLocation.replace(/ /g, '')) {
        return state;
      }
      if (normalizedLocation.includes(normalizedState) || normalizedState.includes(normalizedLocation)) {
        return state;
      }
    }
    return null;
  };

  const parseDonorSearchRoute = (text) => {
    const donorQuery = donorService.extractDonorQuery(text);
    if (!donorQuery.bloodGroup || !donorQuery.location) return null;
    const normalizedState = normalizeState(donorQuery.location);
    return {
      screen: 'SearchDonors',
      label: `Search ${donorQuery.bloodGroup} donors`,
      response: `Opening donor search for ${donorQuery.bloodGroup} donors${normalizedState ? ` in ${normalizedState}` : ` in ${donorQuery.location}`}.`,
      params: {
        bloodGroup: donorQuery.bloodGroup,
        state: normalizedState || donorQuery.location,
        city: '',
      },
    };
  };

  const isQuestionOrKnowledgeQuery = (text) => {
    const lower = text.toLowerCase().trim();
    return (
      lower.includes('?') ||
      lower.startsWith('can') ||
      lower.startsWith('how') ||
      lower.startsWith('what') ||
      lower.startsWith('is') ||
      lower.startsWith('who') ||
      lower.startsWith('why') ||
      lower.startsWith('where') ||
      lower.startsWith('i have') ||
      lower.includes('donate to') ||
      lower.includes('receive') ||
      lower.includes('blood') ||
      lower.includes('group') ||
      lower.includes('+') ||
      lower.includes('-')
    );
  };

  const findSectionAction = (text) => {
    if (isQuestionOrKnowledgeQuery(text)) {
      return null;
    }

    for (const section of sectionRoutes) {
      if (section.keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
        return section;
      }
    }
    return null;
  };

  const handleSendMessage = async (textToSend) => {
    const messageText = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!messageText) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      let response;
      let action = null;

      const donorRoute = parseDonorSearchRoute(messageText);
      if (donorRoute) {
        response = donorRoute.response;
        action = { type: 'navigate', screen: donorRoute.screen, label: donorRoute.label, params: donorRoute.params };
      } else if (isQuestionOrKnowledgeQuery(messageText)) {
        response = knowledgeBaseService.generateAnswer(messageText);
        const lowerMsg = messageText.toLowerCase();
        if (lowerMsg.includes('search') || lowerMsg.includes('find donor') || lowerMsg.includes('donor list')) {
          action = { type: 'navigate', screen: 'SearchDonors', label: 'Open Donor Search' };
        } else if (lowerMsg.includes('profile')) {
          action = { type: 'navigate', screen: 'ProfileTab', label: 'Open Profile' };
        } else if (lowerMsg.includes('setting') || lowerMsg.includes('language')) {
          action = { type: 'navigate', screen: 'Settings', label: 'Open Settings' };
        } else if (lowerMsg.includes('faq')) {
          action = { type: 'navigate', screen: 'FAQ', label: 'Open FAQ' };
        } else if (lowerMsg.includes('register donor') || lowerMsg.includes('donor details')) {
          action = { type: 'navigate', screen: 'DonorDetailsRegistration', label: 'Open Donor Registration' };
        }
      } else {
        const sectionAction = findSectionAction(messageText);
        if (sectionAction && !donorService.isDonorQuery(messageText)) {
          response = sectionAction.response;
          action = { type: 'navigate', screen: sectionAction.screen, label: sectionAction.label };
        } else if (donorService.isDonorQuery(messageText)) {
          const { bloodGroup, location } = donorService.extractDonorQuery(messageText);

          if (bloodGroup) {
            try {
              const donors = await donorService.searchDonors({
                bloodGroup,
                state: location || '',
                city: '',
              });

              if (donors.length > 0) {
                response = `I found ${donors.length} donor(s) matching your request:\n\n${donors
                  .map(d => `• ${d.name} (${d.bloodGroup}) - ${d.city}, ${d.state} - ${d.phoneNumber}`)
                  .join('\n')}`;
              } else {
                response = `Sorry, I couldn't find any donors with ${bloodGroup} blood type${
                  location ? ` in ${location}` : ''
                }. Please try broadening your search or check back later.`;
              }
            } catch (error) {
              console.warn('Donor search failed:', error.message);
              response = `I detected you want to find ${bloodGroup} donors${
                location ? ` in ${location}` : ''
              }, but I'm having trouble connecting to the database right now. Please try again later.`;
            }
          } else {
            response = "I couldn't identify the blood group in your request. Please specify a blood type like A+, B-, O+, etc.";
          }
        } else {
          response = knowledgeBaseService.generateAnswer(messageText);
        }
      }

      const botResponse = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot',
        timestamp: new Date(),
        action,
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorResponse = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble processing your question. Please try asking about blood compatibility, donor eligibility, or app features.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.sender === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper,
              ]}
            >
              {message.sender === 'bot' && (
                <MaterialCommunityIcons name="robot" size={24} color={theme.colors.primary} style={styles.botIcon} />
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.sender === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.sender === 'user' ? { color: '#fff' } : { color: '#333' },
                  ]}
                >
                  {message.text}
                </Text>
                {message.action && message.action.type === 'navigate' && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate(message.action.screen, message.action.params)}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>{message.action.label}</Text>
                  </TouchableOpacity>
                )}
                <Text
                  style={[
                    styles.timestamp,
                    message.sender === 'user'
                      ? { color: 'rgba(255,255,255,0.7)' }
                      : { color: '#999' },
                  ]}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={[styles.messageWrapper, styles.botMessageWrapper]}>
              <MaterialCommunityIcons name="robot" size={24} color={theme.colors.primary} style={styles.botIcon} />
              <View style={[styles.messageBubble, styles.botBubble]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestion Chips */}
        <View style={styles.suggestionsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsContainer}>
            {[
              'Can B+ donate to A-?',
              'Who can donate blood?',
              'How to search for donors?',
              'O- blood compatibility',
              'How to edit my profile?'
            ].map((suggestion, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionChip}
                onPress={() => handleSendMessage(suggestion)}
                disabled={loading}
              >
                <Text style={styles.suggestionChipText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Area */}
        <View style={[styles.inputArea, { paddingBottom: isKeyboardOpen ? 12 : 82 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A' }]}
            placeholder="Ask me anything about blood donation or V-Care..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
            onFocus={() => {
              hideTabBar();
              setIsKeyboardOpen(true);
            }}
            onBlur={() => {
              if (!isKeyboardOpen) showTabBar();
            }}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => handleSendMessage()}
            disabled={loading || !inputText.trim()}
            style={[
              styles.sendButton,
              { backgroundColor: '#D32F2F', opacity: loading || !inputText.trim() ? 0.4 : 1 }
            ]}
          >
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 16,
  },
  messageWrapper: {
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  botIcon: {
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#D32F2F',
    borderBottomRightRadius: 4,
    elevation: 2,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
  },
  suggestionsWrapper: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionChipText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '700',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFEBEE',
    borderColor: '#D32F2F',
    borderWidth: 1,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  linkText: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 12,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
  },
});