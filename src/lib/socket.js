import { io } from 'socket.io-client'

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

let socket = null

export const initSocket = (userId) => {
  socket = io(backendUrl, {
    auth: { userId }
  })

  socket.on('connect', () => {
    console.log('Connected to server')
    socket.emit('authenticate', userId)
  })

  socket.on('disconnect', () => {
    console.log('Disconnected from server')
  })

  return socket
}

export const getSocket = () => {
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}