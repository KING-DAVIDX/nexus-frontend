<script>
  import { onMount, onDestroy } from 'svelte'
  import { user } from '../../stores/auth.js'
  import { supabase } from '../../lib/supabaseClient.js'
  import { getSocket } from '../../lib/socket.js'
  
  export let activeChat
  export let chatType
  
  let messages = []
  let newMessage = ''
  let loading = false
  let showReactionPicker = false
  let reactionMessageId = null
  
  const socket = getSocket()
  const dispatch = createEventDispatcher()
  
  onMount(() => {
    loadMessages()
    
    if (socket) {
      // Listen for new private messages
      socket.on('private-message', handleIncomingMessage)
      
      // Listen for new group messages
      socket.on('group-message', handleIncomingMessage)
      
      // Listen for message reactions
      socket.on('message-reaction', handleMessageReaction)
      
      // Listen for message sent confirmation
      socket.on('message-sent', handleMessageSent)
    }
    
    return () => {
      if (socket) {
        socket.off('private-message', handleIncomingMessage)
        socket.off('group-message', handleIncomingMessage)
        socket.off('message-reaction', handleMessageReaction)
        socket.off('message-sent', handleMessageSent)
      }
    }
  })
  
  async function loadMessages() {
    loading = true
    
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id (id, nickname, avatar_url),
          receiver:users!receiver_id (id, nickname)
        `)
        .order('timestamp', { ascending: true })
      
      if (chatType === 'private') {
        query = query.or(`and(sender_id.eq.${$user.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${$user.id})`)
      } else {
        query = query.eq('group_id', activeChat.id)
      }
      
      const { data, error } = await query
      
      if (!error) {
        messages = data
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      loading = false
    }
  }
  
  function handleIncomingMessage(message) {
    // Check if this message belongs to the current chat
    const isPrivateMatch = chatType === 'private' && 
      ((message.sender_id === activeChat.id && message.receiver_id === $user.id) ||
       (message.sender_id === $user.id && message.receiver_id === activeChat.id))
    
    const isGroupMatch = chatType === 'group' && message.group_id === activeChat.id
    
    if (isPrivateMatch || isGroupMatch) {
      messages = [...messages, message]
    }
  }
  
  function handleMessageSent(data) {
    // Replace temporary message with actual message from server
    messages = messages.map(msg => 
      msg.tempId === data.tempId ? data.message : msg
    )
  }
  
  function handleMessageReaction(message) {
    messages = messages.map(msg => 
      msg.id === message.id ? message : msg
    )
  }
  
  async function sendMessage() {
    if (!newMessage.trim()) return
    
    const tempId = Date.now().toString()
    const messageData = {
      tempId,
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    }
    
    // Add temporary message to UI immediately
    messages = [...messages, {
      id: tempId,
      tempId,
      sender_id: $user.id,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: chatType,
      sender: {
        id: $user.id,
        nickname: $user.user_metadata.nickname
      },
      isTemp: true
    }]
    
    // Send via socket
    if (chatType === 'private') {
      socket.emit('private-message', {
        ...messageData,
        to: activeChat.id
      })
    } else {
      socket.emit('group-message', {
        ...messageData,
        group_id: activeChat.id
      })
    }
    
    newMessage = ''
  }
  
  async function reactToMessage(messageId, reaction) {
    socket.emit('message-reaction', {
      messageId,
      reaction
    })
    
    showReactionPicker = false
    reactionMessageId = null
  }
  
  function initiateCall() {
    if (chatType === 'private') {
      dispatch('callInitiated', {
        to: activeChat.id,
        type: 'voice'
      })
    }
  }
  
  const chatContainer = document.querySelector('.chat-messages')
  
  $: if (chatContainer && messages.length) {
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }, 100)
  }
</script>

<div class="flex-1 flex flex-col h-full">
  {/* Chat header */}
  <div class="p-4 border-b border-gray-200 flex items-center justify-between">
    <div class="flex items-center space-x-3">
      {#if chatType === 'private'}
        <div class="relative">
          <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            {#if activeChat.avatar_url}
              <img src={activeChat.avatar_url} alt={activeChat.nickname} class="w-10 h-10 rounded-full" />
            {:else}
              <span class="text-indigo-600 font-medium">{activeChat.nickname[0]?.toUpperCase()}</span>
            {/if}
          </div>
          {#if activeChat.online}
            <div class="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></div>
          {/if}
        </div>
        <div>
          <h3 class="font-medium">{activeChat.nickname}</h3>
          <p class="text-sm text-gray-500">
            {activeChat.online ? 'Online' : `Last seen ${new Date(activeChat.last_seen).toLocaleTimeString()}`}
          </p>
        </div>
      {:else}
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <span class="text-green-600 font-medium">{activeChat.name[0]?.toUpperCase()}</span>
        </div>
        <div>
          <h3 class="font-medium">{activeChat.name}</h3>
          <p class="text-sm text-gray-500">{activeChat.group_members.length} members</p>
        </div>
      {/if}
    </div>
    
    {#if chatType === 'private'}
      <button 
        class="p-2 rounded-full hover:bg-gray-100"
        on:click={initiateCall}
        title="Voice call"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </button>
    {/if}
  </div>
  
  {/* Messages */}
  <div class="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
    {#if loading}
      <div class="text-center text-gray-500">Loading messages...</div>
    {:else if messages.length === 0}
      <div class="text-center text-gray-500">No messages yet. Start the conversation!</div>
    {:else}
      {#each messages as message}
        <div class="flex {message.sender_id === $user.id ? 'justify-end' : 'justify-start'}">
          <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg {message.sender_id === $user.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}">
            {#if chatType === 'group' && message.sender_id !== $user.id}
              <div class="text-xs font-medium mb-1">{message.sender.nickname}</div>
            {/if}
            
            <div class="flex items-end space-x-2">
              <p class="break-words">{message.content}</p>
              
              {#if message.reaction}
                <span class="text-sm">{message.reaction}</span>
              {/if}
              
              {#if !message.isTemp}
                <button 
                  class="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  on:click={() => { showReactionPicker = true; reactionMessageId = message.id }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              {/if}
            </div>
            
            <div class="text-xs mt-1 {message.sender_id === $user.id ? 'text-indigo-200' : 'text-gray-500'}">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
  
  {/* Message input */}
  <div class="p-4 border-t border-gray-200">
    <form class="flex space-x-2" on:submit|prevent={sendMessage}>
      <input
        type="text"
        placeholder="Type a message..."
        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        bind:value={newMessage}
      />
      <button
        type="submit"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        disabled={!newMessage.trim()}
      >
        Send
      </button>
    </form>
  </div>
  
  {/* Reaction Picker */}
  {#if showReactionPicker}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-4">
        <h3 class="text-lg font-medium mb-4">Choose a reaction</h3>
        <div class="grid grid-cols-4 gap-2">
          {#each ['😀', '😍', '😂', '😮', '😢', '😡', '👍', '👎'] as reaction}
            <button 
              class="text-2xl p-2 hover:bg-gray-100 rounded"
              on:click={() => reactToMessage(reactionMessageId, reaction)}
            >
              {reaction}
            </button>
          {/each}
        </div>
        <button 
          class="mt-4 w-full px-4 py-2 text-gray-600 hover:text-gray-800"
          on:click={() => { showReactionPicker = false; reactionMessageId = null }}
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .chat-messages {
    scroll-behavior: smooth;
  }
</style>