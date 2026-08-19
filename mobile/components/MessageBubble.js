import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function MessageBubble({ message, isMine }) {
  const theme = useTheme();

  return (
    <View style={[
      styles.messageRow,
      isMine ? styles.messageRowRight : styles.messageRowLeft
    ]}>
      <View style={[
        styles.bubble,
        isMine
          ? [styles.bubbleRight, { backgroundColor: theme.colors.primary }]
          : [styles.bubbleLeft, { backgroundColor: '#f0f0f0' }]
      ]}>
        <Text style={[
          styles.messageText,
          { color: isMine ? '#fff' : theme.colors.text }
        ]}>
          {message.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[
            styles.timestamp,
            { color: isMine ? 'rgba(255,255,255,0.7)' : '#999' }
          ]}>
            {message.time}
          </Text>
          {isMine && (
            <Text style={styles.statusIndicator}>
              {message.status === 'sent' ? '✓' : message.status === 'delivered' ? '✓✓' : '✓✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 0.5,
    minHeight: 36,
    justifyContent: 'center',
    maxWidth: '80%',
  },
  bubbleLeft: {
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    justifyContent: 'flex-end',
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusIndicator: {
    fontSize: 12,
    marginLeft: 4,
  },
});