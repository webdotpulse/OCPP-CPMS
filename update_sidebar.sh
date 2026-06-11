sed -i '/path: '\''\/rfid'\''/a \  { key: '\''nav.vehicleIdentity'\'', path: '\''\/vehicle-identity-management'\'', icon: Car },' Frontend/components/layout/Sidebar.tsx
sed -i 's/import { Home,/import { Home, Car,/' Frontend/components/layout/Sidebar.tsx
