import React from 'react';
import { View, Text, StyleSheet, Image, Share, Linking, Alert } from 'react-native';
import { Button, Title, Paragraph, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const APP_LINK = 'https://example.com/download'; // replace with your real app link
const SHARE_MESSAGE = `Hey! I\'m using the vcare app to help save lives. Join me and make a difference! Download here: ${APP_LINK}`;

export default function ReferFriendScreen({ navigation }) {
  const theme = useTheme();

  const onLoginPress = () => {
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Register');
    } else {
      Alert.alert('Register', 'Register pressed');
    }
  };
  
  const onShareGeneric = async () => {
    try {
      await Share.share({ message: SHARE_MESSAGE });
    } catch (error) {
      console.warn('Share error', error);
    }
  };

  const onShareWhatsApp = async () => {
    const text = encodeURIComponent(SHARE_MESSAGE);
    const url = `whatsapp://send?text=${text}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // fallback to generic share
        await onShareGeneric();
      }
    } catch (err) {
      console.warn('WhatsApp share failed', err);
      await onShareGeneric();
    }
  };

  // SMS and Email buttons removed per request — keep generic share and WhatsApp

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>

      <View style={styles.container}>
        <Title style={[styles.title, { color: theme.colors.primary }]}>
          Invite Your Friends to Save Lives ❤️
        </Title>

        <Paragraph style={[styles.intro, { color: theme.colors.text }]}>
          Every drop counts — and every friend you invite helps us save more lives together. Spread the
          word and make a difference!
        </Paragraph>

        {/* Illustration (optional). If you have an image asset, replace the source below. */}
        <Image
          source={require('../assets/logo.png')}
          style={styles.image}
          resizeMode="contain"
        />

        <View style={styles.shareSection}>
          <Text style={[styles.shareTitle, { color: theme.colors.text }]}>
            Share the app with your friends and family:
          </Text>

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              icon="whatsapp"
              onPress={onShareWhatsApp}
              style={styles.shareButton}
              theme={theme}
            >
              Share via WhatsApp
            </Button>
          </View>

          {/* SMS and Email sharing removed per request */}

          <View style={styles.buttonRow}>
            <Button mode="outlined" icon="share-variant" onPress={onShareGeneric} style={styles.shareButton}>
              Share via Social Media
            </Button>
          </View>
        </View>

        <Paragraph style={[styles.quote, { color: theme.colors.text }]}>
          "One friend can help save many lives. Start by sharing today!"
        </Paragraph>
      </View>

      {/* Bottom CTA removed per request */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8 },
  title: { textAlign: 'center', marginBottom: 12, fontSize: 22, fontWeight: '800', color: '#D32F2F', letterSpacing: -0.3 },
  intro: { textAlign: 'center', marginBottom: 18, color: '#475569', fontSize: 14, lineHeight: 22 },
  image: { width: 200, height: 100, marginBottom: 20 },
  shareSection: { width: '100%', marginBottom: 16 },
  shareTitle: { fontWeight: '700', marginBottom: 12, textAlign: 'center', color: '#0F172A', fontSize: 14 },
  buttonRow: { marginVertical: 6 },
  shareButton: { alignSelf: 'stretch', borderRadius: 14 },
  quote: { fontStyle: 'italic', textAlign: 'center', marginTop: 16, color: '#64748B', fontSize: 13 },
});
