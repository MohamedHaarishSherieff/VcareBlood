import React, { createContext, useState, useRef, useContext } from 'react';

export const TabBarContext = createContext({
  isTabBarVisible: true,
  handleScroll: () => {},
  showTabBar: () => {},
  hideTabBar: () => {},
});

export const TabBarProvider = ({ children }) => {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const lastOffsetY = useRef(0);

  const handleScroll = (event) => {
    if (!event || !event.nativeEvent || !event.nativeEvent.contentOffset) return;

    const currentOffsetY = event.nativeEvent.contentOffset.y;
    const diff = currentOffsetY - lastOffsetY.current;

    // Reset to visible at top of scroll
    if (currentOffsetY <= 15) {
      if (!isTabBarVisible) setIsTabBarVisible(true);
      lastOffsetY.current = currentOffsetY;
      return;
    }

    // Threshold of 12px to prevent jitter on slight touch shifts
    if (Math.abs(diff) > 12) {
      if (diff > 0) {
        // Scrolling DOWN -> Hide floating bar
        if (isTabBarVisible) setIsTabBarVisible(false);
      } else {
        // Scrolling UP -> Show menu bar
        if (!isTabBarVisible) setIsTabBarVisible(true);
      }
      lastOffsetY.current = currentOffsetY;
    }
  };

  const showTabBar = () => setIsTabBarVisible(true);
  const hideTabBar = () => setIsTabBarVisible(false);

  return (
    <TabBarContext.Provider value={{ isTabBarVisible, handleScroll, showTabBar, hideTabBar }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => useContext(TabBarContext);
export default TabBarContext;
