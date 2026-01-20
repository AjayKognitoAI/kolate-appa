"use client";

import Script from "next/script";

interface UserWayWidgetProps {
  accountId: string;
}

/**
 * UserWay Accessibility Widget
 *
 * Provides users with accessibility controls including:
 * - Text size adjustment
 * - Contrast modes
 * - Dyslexia-friendly fonts
 * - Cursor enlargement
 * - Reading guide
 *
 * Sign up at https://userway.org/get to get your account ID.
 */
export const UserWayWidget: React.FC<UserWayWidgetProps> = ({ accountId }) => {
  if (!accountId) return null;

  return (
    <Script
      id="userway-widget"
      src="https://cdn.userway.org/widget.js"
      data-account={accountId}
      strategy="afterInteractive"
    />
  );
};

export default UserWayWidget;
