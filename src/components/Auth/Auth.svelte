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
  let verificationCode = ''    
      
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
          
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/send-verification-code`, {    
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
      
  function handleVerificationComplete(event) {    
    verificationEmail = event.detail.email    
    verificationCode = event.detail.code    
    completeRegistration()    
  }    
      
  async function completeRegistration() {    
    loading = true    
        
    try {    
      const verifyResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/verify-code`, {    
        method: 'POST',    
        headers: { 'Content-Type': 'application/json' },    
        body: JSON.stringify({ email: verificationEmail, code: verificationCode })    
      })    
          
      const verifyResult = await verifyResponse.json()    
          
      if (!verifyResponse.ok) {    
        throw new Error(verifyResult.error || 'Verification failed')    
      }    
          
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
      console.error('Registration error:', err)    
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

<div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-900">      
  <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">    
    <div class="absolute -top-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-soft-light opacity-30 animate-blob"></div>    
    <div class="absolute top-0 -right-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-soft-light opacity-30 animate-blob animation-delay-2000"></div>    
    <div class="absolute -bottom-40 left-20 w-80 h-80 bg-fuchsia-500 rounded-full mix-blend-soft-light opacity-30 animate-blob animation-delay-4000"></div>    
  </div>    

  <div class="max-w-md w-full space-y-8 bg-white/95 p-10 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm relative z-10">    
    <div class="text-center">    
      <div class="mx-auto w-24 h-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">    
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">    
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />    
        </svg>    
      </div>    
      <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">    
        {authView === 'login' ? 'Welcome to Nexus Chat' :     
         authView === 'verify' ? 'Verify Your Email' : 'Create Account'}    
      </h2>    
      <p class="mt-2 text-sm text-gray-600">    
        {authView === 'login' ? 'Sign in to continue your conversation' :     
         authView === 'verify' ? 'Enter the code sent to your email' : 'Join the Nexus community today'}    
      </p>    
    </div>  

    {#if error}    
    <div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm" role="alert">    
      <span class="block sm:inline">{error}</span>    
    </div>    
    {/if}    

    {#if authView === 'verify'}
    <EmailVerification
      email={verificationEmail}
      on:complete={handleVerificationComplete}
      on:cancel={() => switchView('register')}
    />
    {:else}
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>    
      {#if authView === 'register'}    
        <div>    
          <label for="nickname" class="block text-sm font-medium text-gray-700 mb-1">Nickname</label>    
          <input    
            id="nickname"    
            name="nickname"    
            type="text"    
            required    
            class="relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"    
            placeholder="Choose a unique nickname"    
            bind:value={nickname}    
          />    
        </div>    
      {/if}    

      <div>    
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email address</label>    
        <input    
          id="email"    
          name="email"    
          type="email"    
          required    
          class="relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"    
          placeholder="Enter your email"    
          bind:value={email}    
        />    
      </div>    
      
      <div>    
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>    
        <input    
          id="password"    
          name="password"    
          type="password"    
          required    
          class="relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"    
          placeholder="Enter your password"    
          bind:value={password}    
        />    
      </div>    
      
      <div>    
        <button    
          type="submit"    
          class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50"    
          disabled={loading}    
        >    
          {#if loading}    
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">    
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>    
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>    
            </svg>    
          {/if}    
          {loading ? 'Please wait...' :     
           authView === 'login' ? 'Sign in' : 'Continue to verification'}    
        </button>    
      </div>    
      
      <div class="text-center pt-4 border-t border-gray-100">    
        {#if authView === 'login'}    
          <p class="text-sm text-gray-600">    
            Don't have an account?     
            <button    
              type="button"    
              class="ml-1 font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"    
              on:click={() => switchView('register')}    
            >    
              Sign up    
            </button>    
          </p>    
        {:else}    
          <p class="text-sm text-gray-600">    
            Already have an account?     
            <button    
              type="button"    
              class="ml-1 font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"    
              on:click={() => switchView('login')}    
            >    
              Sign in    
            </button>    
          </p>    
        {/if}    
      </div>    
    </form>    
    {/if}    
  </div>    
</div>    

<style>    
  .animate-blob {    
    animation: blob 7s infinite;    
  }    
  
  .animation-delay-2000 {    
    animation-delay: 2s;    
  }    
  
  .animation-delay-4000 {    
    animation-delay: 4s;    
  }    
  
  @keyframes blob {    
    0% {    
      transform: translate(0px, 0px) scale(1);    
    }    
    33% {    
      transform: translate(30px, -50px) scale(1.1);    
    }    
    66% {    
      transform: translate(-20px, 20px) scale(0.9);    
    }    
    100% {    
      transform: translate(0px, 0px) scale(1);    
    }    
  }    
</style>