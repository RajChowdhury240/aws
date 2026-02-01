import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AWS IAM Actions Reference',
  description: 'Complete reference for AWS IAM actions, resources, and condition keys across all AWS services',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
