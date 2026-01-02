export const metadata = {
  title: 'F.A.I.L. Kit Next.js Example',
  description: 'Demo RAG agent for F.A.I.L. Kit testing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
