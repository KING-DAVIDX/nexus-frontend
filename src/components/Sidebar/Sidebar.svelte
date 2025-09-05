<script>
  import { onMount } from 'svelte'
  import { supabase } from '../../lib/supabaseClient.js'
  import { user } from '../../stores/auth.js'
  
  let chats = []
  let searchQuery = ''
  let showNewChatModal = false
  let showNewGroupModal = false
  let newChatNickname = ''
  let newGroupName = ''
  let groupMembers = []
  let availableUsers = []
  let loading = false
  
  const dispatch = createEventDispatcher()
  
  onMount(() => {
    loadChats()
    loadAvailableUsers()
  })
  
  async function loadChats() {
    // Load private chats
    const { data: privateChats } = await supabase
      .from('users')
      .select('id, nickname, avatar_url, online, last_seen')
      .neq('id', $user.id)
      .order('online', { ascending: false })
      .order('nickname')
    
    // Load group chats
    const { data: groupChats } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        description,
        created_at,
        group_members (user_id)
      `)
      .order('name')
    
    if (privateChats && groupChats) {
      chats = [
        ...privateChats.map(chat => ({ ...chat, type: 'private' })),
        ...groupChats.map(chat => ({ ...chat, type: 'group' }))
      ]
    }
  }
  
  async function loadAvailableUsers() {
    const { data } = await supabase
      .from('users')
      .select('id, nickname')
      .neq('id', $user.id)
      .order('nickname')
    
    if (data) {
      availableUsers = data
    }
  }
  
  async function startNewChat() {
    if (!newChatNickname.trim()) return
    
    loading = true
    
    try {
      // Find user by nickname
      const { data: userData } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .eq('nickname', newChatNickname.trim())
        .single()
      
      if (userData) {
        dispatch('chatSelect', { ...userData, type: 'private' })
        showNewChatModal = false
        newChatNickname = ''
      } else {
        alert('User not found')
      }
    } catch (error) {
      console.error('Error starting new chat:', error)
      alert('Error starting chat')
    } finally {
      loading = false
    }
  }
  
  async function createNewGroup() {
    if (!newGroupName.trim() || groupMembers.length === 0) return
    
    loading = true
    
    try {
      // Check if group name is available
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('name', newGroupName.trim())
        .single()
      
      if (existingGroup) {
        alert('Group name is already taken')
        return
      }
      
      // Create group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          created_by: $user.id
        })
        .select()
        .single()
      
      if (groupError) throw groupError
      
      // Add members to group (including creator)
      const membersToAdd = [
        { group_id: groupData.id, user_id: $user.id },
        ...groupMembers.map(userId => ({ group_id: groupData.id, user_id: userId }))
      ]
      
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(membersToAdd)
      
      if (membersError) throw membersError
      
      dispatch('chatSelect', { ...groupData, type: 'group' })
      showNewGroupModal = false
      newGroupName = ''
      groupMembers = []
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Error creating group')
    } finally {
      loading = false
    }
  }
  
  function toggleGroupMember(userId) {
    if (groupMembers.includes(userId)) {
      groupMembers = groupMembers.filter(id => id !== userId)
    } else {
      groupMembers = [...groupMembers, userId]
    }
  }
  
  function selectChat(chat) {
    dispatch('chatSelect', chat)
  }
  
  async function logout() {
    await supabase.auth.signOut()
  }
  
  const filteredChats = $derived(
    chats.filter(chat => 
      chat.type === 'private' 
        ? chat.nickname.toLowerCase().includes(searchQuery.toLowerCase())
        : chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )
</script>

<div class="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
  {/* Header */}
  <div class="p-4 border-b border-gray-200 flex items-center justify-between">
    <h1 class="text-xl font-bold text-indigo-600">Nexus Chat</h1>
    <div class="flex items-center space-x-2">
      <button 
        class="p-2 rounded-full hover:bg-gray-200"
        on:click={logout}
        title="Logout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  </div>
  
  {/* Search */}
  <div class="p-4 border-b border-gray-200">
    <div class="relative">
      <input
        type="text"
        placeholder="Search chats..."
        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        bind:value={searchQuery}
      />
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  </div>
  
  {/* New chat buttons */}
  <div class="p-4 border-b border-gray-200 flex space-x-2">
    <button 
      class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
      on:click={() => showNewChatModal = true}
    >
      New Chat
    </button>
    <button 
      class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
      on:click={() => showNewGroupModal = true}
    >
      New Group
    </button>
  </div>
  
  {/* Chat list */}
  <div class="flex-1 overflow-y-auto">
    {#each filteredChats as chat}
      <div 
        class="p-4 border-b border-gray-100 hover:bg-white cursor-pointer transition-colors"
        on:click={() => selectChat(chat)}
      >
        {#if chat.type === 'private'}
          <div class="flex items-center space-x-3">
            <div class="relative">
              <div class="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                {#if chat.avatar_url}
                  <img src={chat.avatar_url} alt={chat.nickname} class="w-12 h-12 rounded-full" />
                {:else}
                  <span class="text-indigo-600 font-medium">{chat.nickname[0]?.toUpperCase()}</span>
                {/if}
              </div>
              {#if chat.online}
                <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-900 truncate">{chat.nickname}</h3>
              <p class="text-sm text-gray-500 truncate">
                {chat.online ? 'Online' : `Last seen ${new Date(chat.last_seen).toLocaleTimeString()}`}
              </p>
            </div>
          </div>
        {:else}
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span class="text-green-600 font-medium">{chat.name[0]?.toUpperCase()}</span>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-900 truncate">{chat.name}</h3>
              <p class="text-sm text-gray-500 truncate">
                {chat.group_members.length} members
              </p>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="p-8 text-center text-gray-500">
        {searchQuery ? 'No chats found' : 'No chats yet'}
      </div>
    {/each}
  </div>
  
  {/* New Chat Modal */}
  {#if showNewChatModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-96">
        <h3 class="text-lg font-medium mb-4">Start New Chat</h3>
        <input
          type="text"
          placeholder="Enter nickname"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          bind:value={newChatNickname}
        />
        <div class="flex justify-end space-x-3">
          <button 
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
            on:click={() => showNewChatModal = false}
          >
            Cancel
          </button>
          <button 
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            on:click={startNewChat}
            disabled={loading || !newChatNickname.trim()}
          >
            {loading ? 'Starting...' : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  {/* New Group Modal */}
  {#if showNewGroupModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 class="text-lg font-medium mb-4">Create New Group</h3>
        <input
          type="text"
          placeholder="Group name"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          bind:value={newGroupName}
        />
        
        <h4 class="font-medium mb-3">Add Members</h4>
        <div class="space-y-2 mb-4">
          {#each availableUsers as user}
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={groupMembers.includes(user.id)}
                on:change={() => toggleGroupMember(user.id)}
                class="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>{user.nickname}</span>
            </label>
          {/each}
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
            on:click={() => showNewGroupModal = false}
          >
            Cancel
          </button>
          <button 
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            on:click={createNewGroup}
            disabled={loading || !newGroupName.trim() || groupMembers.length === 0}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>