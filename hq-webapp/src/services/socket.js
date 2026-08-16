import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
})

export const connectClinicSocket = (clinicId) => {
  if (!socket.connected) socket.connect()
  if (clinicId) {
    socket.emit('join_clinic', clinicId)
  }
}