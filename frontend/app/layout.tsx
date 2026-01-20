import { CustomizerContextProvider } from "@/context/customizerContext";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import MyApp from "./app";
import { SessionProvider } from "next-auth/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/globals.css";
import "../styles/theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KolateAI",
  description:
    "KolateAI - AI-Powered Insights for Accelerating Drug Development",
  icons: {
    icon: "/kolate-ico.svg",
    shortcut: "/kolate-ico.svg",
    apple: "/kolate-ico.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader color="#1e4db7" showSpinner={false} />
        <SessionProvider>
          <CustomizerContextProvider>
            <MyApp>{children}</MyApp>
            <ToastContainer autoClose={3000} />
          </CustomizerContextProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
