<script>
  import { onMount } from 'svelte'
  import { isAuthenticated, user } from './stores/auth.js'
  import Auth from './components/Auth/Auth.svelte'
  import ChatApp from './components/Chat/ChatApp.svelte'
  import { initSocket, disconnectSocket } from './lib/socket.js'
  
  let socket = null
  
  // Initialize socket when user logs in
  $: if ($isAuthenticated && $user && !socket) {
    socket = initSocket($user.id)
  }
  
  // Clean up socket on logout
  $: if (!$isAuthenticated && socket) {
    disconnectSocket()
    socket = null
  }
  
  onMount(() => {
    return () => {
      if (socket) {
        disconnectSocket()
      }
    }
  })
</script>

<main class="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
  {#if $isAuthenticated}
    <ChatApp />
  {:else}
    <Auth />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
</style>