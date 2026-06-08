import { Suspense } from 'react'
import ChatClient from '@/components/ChatClient'

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="p-5 md:px-8 md:py-5 border-b border-gray-800 shrink-0">
        <h1 className="text-2xl font-bold text-gray-100">AI Chat</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your AI study assistant — aware of your courses, skills, and deadlines.
        </p>
      </div>
      <Suspense>
        <ChatClient />
      </Suspense>
    </div>
  )
}
