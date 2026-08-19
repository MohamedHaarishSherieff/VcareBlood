import 'react-native-gesture-handler';
import { decode, encode } from 'base-64';
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LanguageContext } from './context/LanguageContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Portal } from 'react-native-paper';

import CustomDrawerContent from './components/CustomDrawerContent';
import { ChatList } from './components/chat';
import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import DonorDetailsRegistrationScreen from './screens/DonorDetailsRegistrationScreen';
import SearchDonorsScreen from './screens/SearchDonorsScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ReferFriendScreen from './screens/ReferFriendScreen';
import SettingsScreen from './screens/SettingsScreen';
import AboutScreen from './screens/AboutScreen';
import PostScreen from './screens/PostScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import RegisterScreen from './screens/RegisterScreen';
import FAQScreen from './screens/FAQScreen';
import AIChatScreen from './screens/AIChatScreen';
import ChatScreen from './screens/ChatScreen';
import SearchUserScreen from './screens/SearchUserScreen';
import DonateAmountScreen from './screens/DonateAmountScreen';
import TermsScreen from './screens/TermsScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

function MenuButton({ navigation }) {
  // simple hamburger button using text to avoid depending on icon libs
  return (
    <TouchableOpacity
      onPress={() => navigation.toggleDrawer()}
      style={{ paddingHorizontal: 12 }}
      accessibilityLabel="Open menu"
    >
      <Text style={{ color: '#fff', fontSize: 22 }}>☰</Text>
    </TouchableOpacity>
  );
}



function SearchButton({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('SearchUser')}
      style={{ paddingHorizontal: 12 }}
      accessibilityLabel="Search users"
    >
      <MaterialCommunityIcons name="account-search" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

function DonateButton({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('DonateAmount')}
      style={{ paddingHorizontal: 12 }}
      accessibilityLabel="Donate"
    >
      <Text style={{ color: '#fff', fontSize: 16 }}>Donate</Text>
    </TouchableOpacity>
  );
}

function TabNavigator() {
  const { t } = useContext(LanguageContext);
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: 'rgb(211, 16, 16)',
        tabBarInactiveTintColor: 'gray',
        tabBarShowLabel: false,
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 12,
          left: 16,
          right: 16,
          borderRadius: 30,
          height: 60,
          backgroundColor: '#ffffff',
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 10,
          borderTopWidth: 0,
        },
        sceneContainerStyle: {
          paddingBottom: 90,
        },
      }}
    >
      <Tab.Screen
        name="Post"
        component={PostScreen}
        options={{
          title: t('posts'),
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialCommunityIcons name="plus-circle" color={color} size={size || 24} />
          ),
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatList}
        options={({ route }) => ({
          title: t('chat'),
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialCommunityIcons name="chat" color={color} size={size || 24} />
          ),
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          tabBarStyle: [
            {
              position: 'absolute',
              bottom: 12,
              left: 16,
              right: 16,
              borderRadius: 30,
              height: 60,
              backgroundColor: '#ffffff',
              elevation: 10,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 10,
              display: route?.params?.contact ? 'none' : 'flex',
            },
          ],
        })}
      />
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialCommunityIcons name="home" color={color} size={size || 24} />
          ),
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={AIChatScreen}
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialCommunityIcons name="robot" color={color} size={size || 24} />
          ),
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialCommunityIcons name="account" color={color} size={size || 24} />
          ),
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Tab.Screen
        name="UserProfile"
        component={ProfileScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: 'User Profile',
        }}
      />

      {/* Hidden route screens (keep tab bar visible) */}
      <Tab.Screen
        name="SearchUser"
        component={SearchUserScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('searchUsers'),
        }}
      />
      <Tab.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { height: 0, position: 'absolute', display: 'none' },
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="DonorDetailsRegistration"
        component={DonorDetailsRegistrationScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { height: 0, position: 'absolute', display: 'none' },
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="DonateAmount"
        component={DonateAmountScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('donate'),
        }}
      />
      <Tab.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="SearchDonors"
        component={SearchDonorsScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('findDonors'),
        }}
      />
      <Tab.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('resetPassword'),
        }}
      />
      <Tab.Screen
        name="Terms"
        component={TermsScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('termsAndConditions'),
        }}
      />
      <Tab.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('editProfile'),
        }}
      />
      <Tab.Screen
        name="ReferFriend"
        component={ReferFriendScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('referFriend'),
        }}
      />
      <Tab.Screen
        name="FAQ"
        component={FAQScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('faq'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('settings'),
        }}
      />
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{
          tabBarButton: () => null,
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: t('aboutUs'),
        }}
      />
    </Tab.Navigator>
  );
}


function MainDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="MainTabs"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: { width: 280, backgroundColor: '#fff' },
        drawerActiveTintColor: '#000',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: { fontSize: 16 },
      }}>
      <Drawer.Screen
        name="MainTabs"
        component={TabNavigator}
        options={({ navigation }) => ({
          title: 'V-Care',
          headerStyle: { backgroundColor: 'rgb(211, 16, 16)' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => <MenuButton navigation={navigation} />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DonateButton navigation={navigation} />
              <SearchButton navigation={navigation} />
            </View>
          ),
        })}
      />
    </Drawer.Navigator>
  );
}

if (!global.btoa) global.btoa = encode;
if (!global.atob) global.atob = decode;

export default function App() {
  // Load icon fonts explicitly so icons render on web and mobile
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="rgb(211, 16, 16)" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <Portal.Host>
          {/* ErrorBoundary catches render errors and shows them instead of a white screen */}
          <ErrorBoundary>
            <Stack.Navigator initialRouteName="Splash" screenOptions={{ animationEnabled: true }}>
              <Stack.Screen
                name="Splash"
                component={SplashScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Main"
                component={MainDrawer}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </ErrorBoundary>
        </Portal.Host>
      </ThemeProvider>
    </LanguageProvider>
  );
}

// Simple ErrorBoundary to surface runtime errors during render
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    // also log to console for Metro / device logs
    console.error('ErrorBoundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>An error occurred</Text>
          <Text style={{ color: 'rgb(211, 16, 16)', marginBottom: 8 }}>{String(this.state.error?.message || this.state.error)}</Text>
          <Text style={{ color: '#444', fontSize: 12 }}>{this.state.info?.componentStack}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

