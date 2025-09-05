<script>
  import { onMount } from 'svelte'
  import { user } from '../../stores/auth.js'
  import { getSocket } from '../../lib/socket.js'
  import Sidebar from '../Sidebar/Sidebar.svelte'
  import ChatWindow from './ChatWindow.svelte'
  import VoiceCall from './VoiceCall.svelte'
  
  let activeChat = null
  let chatType = null
  let incomingCall = null
  let ongoingCall = null
  
  const socket = getSocket()
  
  onMount(() => {
    if (socket) {
      socket.emit('authenticate', $user.id)
      socket.on('incoming-call', (data) => {
        incomingCall = data
      })
    }
    return () => {
      if (socket) socket.off('incoming-call')
    }
  })
  
  function handleChatSelect(chat) {
    activeChat = chat
    chatType = chat.type
  }
  
  function handleCallInitiated(callData) {
    ongoingCall = callData
  }
  
  function handleCallEnd() {
    ongoingCall = null
    incomingCall = null
  }
  
  function answerCall() {
    ongoingCall = { ...incomingCall, isInitiator: false }
    incomingCall = null
  }
  
  function declineCall() {
    incomingCall = null
  }
</script>

<div class="flex h-screen bg-white">
  <Sidebar on:chatSelect={handleChatSelect} />
  
  <main class="flex-1 flex flex-col">
    {#if activeChat}
      <ChatWindow 
        {activeChat} 
        {chatType}
        on:callInitiated={handleCallInitiated}
      />
    {:else}
      <div class="flex-1 flex items-center justify-center bg-gray-50">
        <div class="text-center">
          <div class="mx-auto h-24 w-24 text-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Welcome to Nexus Chat</h3>
          <p class="mt-1 text-sm text-gray-500">Select a conversation or start a new one</p>
        </div>
      </div>
    {/if}
  </main>
  
  <!-- Incoming call notification -->
  {#if incomingCall}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 text-center">
        <h3 class="text-lg font-medium mb-2">Incoming Call</h3>
        <p class="text-gray-600 mb-4">From user {incomingCall.from}</p>
        <div class="flex space-x-4 justify-center">
          <button 
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            on:click={declineCall}
          >
            Decline
          </button>
          <button 
            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            on:click={answerCall}
          >
            Answer
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Ongoing call -->
  {#if ongoingCall}
    <VoiceCall 
      callData={ongoingCall} 
      on:endCall={handleCallEnd} 
    />
  {/if}
</div>