import React, { createContext } from 'react';
import { Provider as PaperProvider, adaptNavigationTheme, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import themeTokens, { COLORS, SHADOWS, RADIUS, SPACING, TYPOGRAPHY } from '../theme';

export const ThemeContext = createContext();

const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDefaultTheme,
});

const AppTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  ...themeTokens,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    ...COLORS,
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FFFFFF',
      level3: '#FFFFFF',
      level4: '#FFFFFF',
      level5: '#FFFFFF',
    },
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
