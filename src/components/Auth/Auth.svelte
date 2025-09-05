<script>
  import { supabase } from '../../lib/supabaseClient.js'
  import EmailVerification from './EmailVerification.svelte'
  
  let authView = 'login'
  let email = ''
  let password = ''
  let nickname = ''
  let error = ''
  let loading = false
  let verificationEmail = ''
  
  async function checkNicknameAvailability(nick) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', nick)
      .single()
    
    return !data
  }
  
  async function handleLogin() {
    loading = true
    error = ''
    
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (authError) throw authError
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }
  
  async function handleRegister() {
    loading = true
    error = ''
    
    try {
      const isAvailable = await checkNicknameAvailability(nickname)
      if (!isAvailable) {
        error = 'Nickname is already taken'
        return
      }
      
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send verification code')
      }
      
      verificationEmail = email
      authView = 'verify'
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }
  
  function switchView(view) {
    authView = view
    error = ''
  }
  
  function handleVerificationComplete() {
    completeRegistration()
  }
  
  async function completeRegistration() {
    loading = true
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: verificationEmail,
        password,
        options: {
          data: {
            nickname
          }
        }
      })
      
      if (authError) throw authError
      
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: verificationEmail,
          nickname,
          online: true
        })
      
      if (dbError) throw dbError
      
      authView = 'login'
      error = 'Registration successful! Please login.'
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  function handleSubmit() {
    if (authView === 'login') {
      handleLogin()
    } else {
      handleRegister()
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        {authView === 'login' ? 'Sign in to Nexus Chat' : 
         authView === 'verify' ? 'Verify Your Email' : 'Create your account'}
      </h2>
    </div>
    
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span class="block sm:inline">{error}</span>
      </div>
    {/if}
    
    {#if authView === 'verify'}
      <EmailVerification 
        email={verificationEmail} 
        onComplete={handleVerificationComplete}
        onCancel={() => switchView('register')}
      />
    {:else}
      <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
        {#if authView === 'register'}
          <div>
            <label for="nickname" class="block text-sm font-medium text-gray-700">Nickname</label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Choose a unique nickname"
              bind:value={nickname}
            />
          </div>
        {/if}
        
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Enter your email"
            bind:value={email}
          />
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Enter your password"
            bind:value={password}
          />
        </div>
        
        <div>
          <button
            type="submit"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Please wait...' : 
             authView === 'login' ? 'Sign in' : 'Continue to verification'}
          </button>
        </div>
        
        <div class="text-center">
          {#if authView === 'login'}
            <button
              type="button"
              class="text-indigo-600 hover:text-indigo-500 text-sm"
              on:click={() => switchView('register')}
            >
              Don't have an account? Sign up
            </button>
          {:else}
            <button
              type="button"
              class="text-indigo-600 hover:text-indigo-500 text-sm"
              on:click={() => switchView('login')}
            >
              Already have an account? Sign in
            </button>
          {/if}
        </div>
      </form>
    {/if}
  </div>
</div>