<script>
  import { onMount, onDestroy } from 'svelte'
  import { user } from '../../stores/auth.js'
  import { getSocket } from '../../lib/socket.js'
  
  export let callData
  
  let localStream = null
  let remoteStream = null
  let peerConnection = null
  let isMuted = false
  let isVideoEnabled = false
  let callStatus = 'connecting'
  
  const socket = getSocket()
  const dispatch = createEventDispatcher()
  
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }
  
  onMount(() => {
    initializeCall()
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
    }
  })
  
  async function initializeCall() {
    try {
      // Get user media
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: false, 
        audio: true 
      })
      
      // Create peer connection
      peerConnection = new RTCPeerConnection(iceServers)
      
      // Add local stream to connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream)
      })
      
      // Get remote stream
      peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0]
      }
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            to: callData.isInitiator ? callData.to : callData.from,
            candidate: event.candidate
          })
        }
      }
      
      // Listen for ICE candidates from remote
      socket.on('ice-candidate', handleIceCandidate)
      
      // Listen for call answer if we're the initiator
      if (callData.isInitiator) {
        socket.on('call-answered', handleAnswer)
        createOffer()
      } else {
        // We're answering a call
        handleOffer(callData.offer)
      }
      
      callStatus = 'active'
    } catch (error) {
      console.error('Error initializing call:', error)
      endCall()
    }
  }
  
  async function createOffer() {
    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      
      socket.emit('initiate-call', {
        to: callData.to,
        offer: offer
      })
    } catch (error) {
      console.error('Error creating offer:', error)
      endCall()
    }
  }
  
  async function handleOffer(offer) {
    try {
      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      
      socket.emit('call-answer', {
        to: callData.from,
        answer: answer
      })
    } catch (error) {
      console.error('Error handling offer:', error)
      endCall()
    }
  }
  
  async function handleAnswer(answer) {
    try {
      await peerConnection.setRemoteDescription(answer)
    } catch (error) {
      console.error('Error handling answer:', error)
      endCall()
    }
  }
  
  async function handleIceCandidate(data) {
    try {
      if (data.candidate) {
        await peerConnection.addIceCandidate(data.candidate)
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error)
    }
  }
  
  function toggleMute() {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      isMuted = !isMuted
    }
  }
  
  function toggleVideo() {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      isVideoEnabled = !isVideoEnabled
    }
  }
  
  function endCall() {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    
    if (peerConnection) {
      peerConnection.close()
    }
    
    socket.off('ice-candidate')
    socket.off('call-answered')
    
    dispatch('endCall')
  }
</script>

<div class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
  <div class="bg-gray-900 rounded-lg p-6 w-full max-w-md">
    <div class="text-center mb-6">
      <h2 class="text-xl font-bold text-white mb-2">Voice Call</h2>
      <p class="text-gray-400">
        {callData.isInitiator ? `Calling ${callData.to}` : `In call with ${callData.from}`}
      </p>
      <p class="text-sm text-gray-500 mt-1">{callStatus}</p>
    </div>
    
    <div class="flex justify-center space-x-6 mb-6">
      
      <div class="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center">
        <span class="text-white text-2xl">
          {callData.isInitiator ? callData.to?.substring(0, 2) : callData.from?.substring(0, 2)}
        </span>
      </div>
    </div>
    
    <div class="flex justify-center space-x-4">
      <button 
        class="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
        on:click={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {#if isMuted}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a9 9 0 010 12m-4.5-9.5L12 3v18l-4.5-4.5H4a1 1 0 01-1-1v-7a1 1 0 011-1h3.5z" />
          {/if}
        </svg>
      </button>
      
      <button 
        class="p-3 bg-red-600 rounded-full hover:bg-red-500 transition-colors"
        on:click={endCall}
        title="End call"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</div>