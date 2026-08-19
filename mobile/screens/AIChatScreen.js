import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { donorService } from '../services/donorService';
import knowledgeBaseService from '../services/knowledgeBaseService';
import { statesWithDistricts } from '../data/states-districts';

export default function AIChatScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hello! I\'m Ismail. How can I help you today? Ask me anything about blood donation, finding donors, or using the app.',
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

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

  const fuzzyMatch = (text, phrase) => {
    const normalizedText = text.toLowerCase();
    if (normalizedText.includes(phrase)) return true;

    const textWords = normalizedText.split(/\s+/).filter(Boolean);
    const phraseWords = phrase.split(/\s+/).filter(Boolean);
    const threshold = (word) => (word.length <= 4 ? 1 : 2);

    return phraseWords.every(phraseWord =>
      textWords.some(textWord => levenshteinDistance(textWord, phraseWord) <= threshold(phraseWord))
    );
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
    if (
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
    ) {
      return true;
    }
    return false;
  };

  const findSectionAction = (text) => {
    // If text looks like a question or blood donation query, do not hijack with navigation section action
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

    // Add user message
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

      // Priority 1: Check for donor search with location (e.g., "i want b+ve in tamilnadu")
      const donorRoute = parseDonorSearchRoute(messageText);
      if (donorRoute) {
        response = donorRoute.response;
        action = { type: 'navigate', screen: donorRoute.screen, label: donorRoute.label, params: donorRoute.params };
      } 
      // Priority 2: Check for direct Q&A knowledge base answer (blood compatibility, eligibility, app info)
      else if (isQuestionOrKnowledgeQuery(messageText)) {
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
      }
      // Priority 3: Check for section navigation (e.g., "open settings", "go to profile")
      else {
        const sectionAction = findSectionAction(messageText);
        if (sectionAction && !donorService.isDonorQuery(messageText)) {
          response = sectionAction.response;
          action = { type: 'navigate', screen: sectionAction.screen, label: sectionAction.label };
        } 
        // Priority 4: Check for donor search without location (e.g., "find b+ donors")
        else if (donorService.isDonorQuery(messageText)) {
          const { bloodGroup, location } = donorService.extractDonorQuery(messageText);

          if (bloodGroup) {
            try {
              const donors = await donorService.searchDonors({
                bloodGroup,
                state: location || '',
                city: ''
              });

              if (donors.length > 0) {
                response = `I found ${donors.length} donor(s) matching your request:\n\n${donors.map(d =>
                  `• ${d.name} (${d.bloodGroup}) - ${d.city}, ${d.state} - ${d.phoneNumber}`
                ).join('\n')}`;
              } else {
                response = `Sorry, I couldn't find any donors with ${bloodGroup} blood type${location ? ` in ${location}` : ''}. Please try broadening your search or check back later.`;
              }
            } catch (error) {
              console.warn('Donor search failed:', error.message);
              response = `I detected you want to find ${bloodGroup} donors${location ? ` in ${location}` : ''}, but I'm having trouble connecting to the database right now. Please try again later.`;
            }
          } else {
            response = "I couldn't identify the blood group in your request. Please specify a blood type like A+, B-, O+, etc.";
          }
        } 
        // Priority 5: Fallback to knowledge base
        else {
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
        text: 'Sorry, I\'m having trouble processing your question. Please try asking about blood compatibility, donor eligibility, or app features.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
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
                message.sender === 'user'
                  ? styles.userBubble
                  : styles.botBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.sender === 'user'
                    ? { color: '#fff' }
                    : { color: '#333' },
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
      <View style={[styles.inputArea, { borderTopColor: theme.colors.outline }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
          placeholder="Ask me anything about blood donation or V-Care..."
          placeholderTextColor={theme.colors.placeholder}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSendMessage()}
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => handleSendMessage()}
          disabled={loading || !inputText.trim()}
          style={[styles.sendButton, { backgroundColor: theme.colors.primary, opacity: loading || !inputText.trim() ? 0.5 : 1 }]}
        >
          <MaterialCommunityIcons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 280,
  },
  messageWrapper: {
    marginVertical: 8,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  userBubble: {
    backgroundColor: 'rgb(211, 16, 16)',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#f0f2f5',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  suggestionsWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 125,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  suggestionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#fff',
    borderColor: 'rgb(211, 16, 16)',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionChipText: {
    color: 'rgb(211, 16, 16)',
    fontSize: 13,
    fontWeight: '600',
  },
  inputArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 65,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 8,
    zIndex: 100,
    elevation: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  linkButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderColor: 'rgb(211, 16, 16)',
    borderWidth: 1,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  linkText: {
    color: 'rgb(211, 16, 16)',
    fontWeight: 'bold',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});