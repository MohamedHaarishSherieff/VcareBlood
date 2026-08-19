// Chat Components - WhatsApp-like Chat Feature
// Easy to integrate into any existing React Native app

export { default as ChatList } from '../ChatList';
export { default as MessageBubble } from '../MessageBubble';
export { default as ChatInput } from '../ChatInput';

// Usage Example:
// import { ChatList, ChatScreen } from './components/chat';
//
// In your navigation:
// <Stack.Screen name="ChatList" component={ChatList} />
// <Stack.Screen name="ChatScreen" component={ChatScreen} />
//
// Navigation flow:
// ChatList -> ChatScreen (with contact param)