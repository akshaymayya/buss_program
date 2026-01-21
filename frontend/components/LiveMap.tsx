"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface LiveMapProps {
    sourceCoords?: number[] | null; // [lon, lat] from ORS
    destCoords?: number[] | null;   // [lon, lat] from ORS
    routeGeometry?: number[][] | null; // List of [lon, lat]
}

function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
}

const LiveMap = ({ sourceCoords, destCoords, routeGeometry }: LiveMapProps) => {
    const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);

    // Default center (Bangalore)
    const defaultCenter: [number, number] = [12.9716, 77.5946];

    useEffect(() => {
        if (sourceCoords && destCoords) {
            // ORS returns [lon, lat], Leaflet needs [lat, lon]
            const source: [number, number] = [sourceCoords[1], sourceCoords[0]];
            const dest: [number, number] = [destCoords[1], destCoords[0]];

            const b = L.latLngBounds([source, dest]);
            setBounds(b);
        }
    }, [sourceCoords, destCoords]);

    return (
        <div className="h-full w-full rounded-xl overflow-hidden shadow-sm border border-gray-100 z-0">
            <MapContainer center={defaultCenter} zoom={7} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {sourceCoords && (
                    <Marker position={[sourceCoords[1], sourceCoords[0]]} icon={icon}>
                        <Popup>Source Location</Popup>
                    </Marker>
                )}

                {destCoords && (
                    <Marker position={[destCoords[1], destCoords[0]]} icon={icon}>
                        <Popup>Destination Location</Popup>
                    </Marker>
                )}

                {routeGeometry && (
                    <Polyline
                        positions={routeGeometry.map(coord => [coord[1], coord[0]] as [number, number])}
                        pathOptions={{ color: 'blue', weight: 5, opacity: 0.7 }}
                    />
                )}

                {bounds && <ChangeView bounds={bounds} />}
            </MapContainer>
        </div>
    );
};

export default LiveMap;
