// src/components/NotificationBanner.jsx
// Pegalo en InstructorForm, justo debajo del header
import React from 'react'
import { usePushNotifications } from '../hooks/usePushNotifications'

const NotificationBanner = ({ axiosConfig, userId }) => {
  const { permiso, suscrito, suscribirse, desuscribirse } = usePushNotifications(axiosConfig, userId)

  // Si ya está suscrito o no soporta notificaciones, no mostrar nada
  if (!('Notification' in window)) return null
  if (suscrito) return null

  // Si ya denegó el permiso, mostrar aviso sin botón
  if (permiso === 'denied') return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-[11px] font-bold text-rose-600">
      🔕 Las notificaciones están bloqueadas. Habilitálas desde la configuración de tu navegador.
    </div>
  )

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black text-indigo-700 uppercase">🔔 Activar notificaciones</p>
        <p className="text-[11px] text-indigo-500 font-bold mt-0.5">
          Recibí alertas cuando te asignen una clase nueva
        </p>
      </div>
      <button
        onClick={suscribirse}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase whitespace-nowrap transition-all"
      >
        Activar
      </button>
    </div>
  )
}

export default NotificationBanner