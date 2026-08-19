import React, { createContext } from 'react';
import { Provider as PaperProvider, adaptNavigationTheme, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';

export const ThemeContext = createContext();

const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDefaultTheme,
});

const AppTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    primary: 'rgb(211, 16, 16)',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#000000',
    secondaryContainer: '#f5f5f5',
    surfaceVariant: '#f0f0f0',
    outline: '#e0e0e0',
  },
};

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{ theme: AppTheme }}>
      <PaperProvider theme={AppTheme}>
        <NavigationContainer theme={AppTheme}>
          {children}
        </NavigationContainer>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
