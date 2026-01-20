import RootLayout from "@/components/shared/RootLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RootLayout>{children}</RootLayout>;
}
