import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/mapa.css'
import { CENTRO_CORDOBA, MAPA_BASE } from '../utils/ubicacion'

const icono = L.divIcon({
  className: 'mapa-pin-contenedor',
  html: '<span class="mapa-pin pin-alta activo"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

function CapturarClic({ onChange }) {
  useMapEvents({
    click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }),
  })

  return null
}

// Si la ubicación quedó fuera de la vista (por ejemplo, con "Usar mi ubicación"),
// el mapa vuela hasta ella
function SeguirUbicacion({ valor }) {
  const map = useMap()

  useEffect(() => {
    if (valor && !map.getBounds().contains([valor.lat, valor.lng])) {
      map.flyTo([valor.lat, valor.lng], 16, { duration: 0.6 })
    }
  }, [valor, map])

  return null
}

// Mapa chico para marcar dónde ocurre la problemática (opcional)
function SelectorUbicacion({ valor, onChange }) {
  return (
    <div className="selector-ubicacion">
      <MapContainer
        center={[CENTRO_CORDOBA.lat, CENTRO_CORDOBA.lng]}
        zoom={13}
        className="selector-ubicacion-mapa"
      >
        <TileLayer {...MAPA_BASE} />
        <CapturarClic onChange={onChange} />
        <SeguirUbicacion valor={valor} />
        {valor && <Marker position={[valor.lat, valor.lng]} icon={icono} />}
      </MapContainer>

      <div className="selector-ubicacion-pie">
        <span>
          {valor
            ? `Ubicación marcada (${valor.lat.toFixed(4)}, ${valor.lng.toFixed(4)})`
            : 'Tocá el mapa para marcar dónde ocurre (opcional).'}
        </span>

        {valor && (
          <button type="button" onClick={() => onChange(null)}>
            Quitar
          </button>
        )}
      </div>
    </div>
  )
}

export default SelectorUbicacion
