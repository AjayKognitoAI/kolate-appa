"use client";
import React, { useContext } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeSettings } from "@/utils/theme/Theme";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import "@/utils/i18n";
import { CustomizerContext } from "@/context/customizerContext";
import { Provider } from "react-redux";
import store from "@/store";

const MyApp = ({ children }: { children: React.ReactNode }) => {
  const theme = ThemeSettings();
  const { activeDir } = useContext(CustomizerContext);

  return (
    <>
      <Provider store={store}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </Provider>
    </>
  );
};

export default MyApp;
