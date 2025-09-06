<script>
  import { createEventDispatcher } from 'svelte'
  
  const dispatch = createEventDispatcher()
  
  export let email = ''
  let code = ''
  let error = ''
  let loading = false

  $: canVerify = code.length === 6 && !loading
  
  async function verifyCode() {
    if (!canVerify) return
    loading = true
    error = ''
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })
      
      const result = await response.json()
      
      if (!response.ok) throw new Error(result.error || 'Verification failed')
      
      dispatch('complete', { email })
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }
  
  function handleCancel() {
    dispatch('cancel')
  }
</script>

<div class="space-y-6">
  <p class="text-sm text-gray-600">
    We've sent a verification code to <strong>{email}</strong>. Please check your inbox and enter the code below.
  </p>
  
  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <span class="block sm:inline">{error}</span>
    </div>
  {/if}
  
  <div>
    <label for="verification-code" class="block text-sm font-medium text-gray-700">Verification Code</label>
    <input
      id="verification-code"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      maxlength="6"
      class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm text-center tracking-widest font-mono text-xl"
      placeholder="000000"
      bind:value={code}
    />
  </div>
  
  <div class="flex space-x-3">
    <button
      type="button"
      class="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      on:click={handleCancel}
      disabled={loading}
    >
      Cancel
    </button>
    <button
      type="button"
      class="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      on:click={verifyCode}
      disabled={!canVerify}
    >
      {loading ? 'Verifying...' : 'Verify'}
    </button>
  </div>
</div>