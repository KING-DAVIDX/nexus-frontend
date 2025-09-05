<script>
  import { onMount, createEventDispatcher } from 'svelte'
  import { supabase } from '../../lib/supabaseClient.js'
  import { user } from '../../stores/auth.js'
  import { derived } from 'svelte/store'
  
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
    const { data: privateChats } = await supabase
      .from('users')
      .select('id, nickname, avatar_url, online, last_seen')
      .neq('id', $user.id)
      .order('online', { ascending: false })
      .order('nickname')
    
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
    
    if (data) availableUsers = data
  }
  
  async function startNewChat() {
    if (!newChatNickname.trim()) return
    loading = true
    try {
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
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('name', newGroupName.trim())
        .single()
      
      if (existingGroup) {
        alert('Group name is already taken')
        return
      }
      
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          created_by: $user.id
        })
        .select()
        .single()
      
      if (groupError) throw groupError
      
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
  
  const filteredChats = derived([() => chats, () => searchQuery], ([$chats, $searchQuery]) => {
    return $chats.filter(chat =>
      chat.type === 'private'
        ? chat.nickname.toLowerCase().includes($searchQuery.toLowerCase())
        : chat.name.toLowerCase().includes($searchQuery.toLowerCase())
    )
  })
</script>

<div class="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
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
  
  <div class="flex-1 overflow-y-auto">
    {#if $filteredChats.length === 0}
      <div class="p-4 text-center text-gray-500">No chats found</div>
    {:else}
      {#each $filteredChats as chat}
        <div 
          class="flex items-center space-x-3 p-4 hover:bg-gray-100 cursor-pointer"
          on:click={() => selectChat(chat)}
        >
          {#if chat.type === 'private'}
            <div class="relative">
              <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                {#if chat.avatar_url}
                  <img src={chat.avatar_url} alt={chat.nickname} class="w-10 h-10 rounded-full" />
                {:else}
                  <span class="text-indigo-600 font-medium">{chat.nickname[0]?.toUpperCase()}</span>
                {/if}
              </div>
              {#if chat.online}
                <div class="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></div>
              {/if}
            </div>
            <div class="flex-1">
              <h3 class="font-medium">{chat.nickname}</h3>
              <p class="text-sm text-gray-500">
                {chat.online ? 'Online' : `Last seen ${new Date(chat.last_seen).toLocaleTimeString()}`}
              </p>
            </div>
          {:else}
            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span class="text-green-600 font-medium">{chat.name[0]?.toUpperCase()}</span>
            </div>
            <div class="flex-1">
              <h3 class="font-medium">{chat.name}</h3>
              <p class="text-sm text-gray-500">{chat.group_members.length} members</p>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
  
  <div class="p-4 border-t border-gray-200 space-y-2">
    <button 
      class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      on:click={() => showNewChatModal = true}
    >
      New Chat
    </button>
    <button 
      class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      on:click={() => showNewGroupModal = true}
    >
      New Group
    </button>
  </div>
  
  {#if showNewChatModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-lg font-medium mb-4">Start New Chat</h2>
        <input
          type="text"
          placeholder="Enter user nickname..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          bind:value={newChatNickname}
        />
        <div class="mt-4 flex justify-end space-x-2">
          <button 
            class="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-800"
            on:click={() => { showNewChatModal = false; newChatNickname = '' }}
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
  
  {#if showNewGroupModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-lg font-medium mb-4">Create New Group</h2>
        <input
          type="text"
          placeholder="Enter group name..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          bind:value={newGroupName}
        />
        <div class="mt-4 space-y-2 max-h-60 overflow-y-auto">
          {#each availableUsers as u}
            <label class="flex items-center space-x-2">
              <input 
                type="checkbox"
                checked={groupMembers.includes(u.id)}
                on:change={() => toggleGroupMember(u.id)}
              />
              <span>{u.nickname}</span>
            </label>
          {/each}
        </div>
        <div class="mt-4 flex justify-end space-x-2">
          <button 
            class="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-800"
            on:click={() => { showNewGroupModal = false; newGroupName = ''; groupMembers = [] }}
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