import "./globals.css";

export const metadata = {
  title: "NAV · Your Personal AI Study Companion",
  description: "Your next step, a little clearer. Your learning plan, college deadlines and progress in one private workspace.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
