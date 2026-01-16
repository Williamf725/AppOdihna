// constants/mockData.ts

// constants/mockData.ts

export interface Property {
  id: number;
  title: string;
  location: string;
  city: string;
  department: string;
  price: number;
  rating: number;
  reviewCount: number; // Asegúrate que sea reviewCount, no review
  images: string[];
  description: string;
  amenities: string[];
  tags: string[];
  maxGuests: number;
  bedrooms: number;
  blockedDates: string[];
  host: {
    name: string;
    joinedDate: string;
    avatar: any;
    id?: string;
    email?: string;
    phone?: string;
    verified?: boolean;
    properties?: number;
    reviewsReceived?: number;
    rating?: number;
    bio?: string;
    responseTime?: string;
    responseRate?: string;
    languages?: string[];
    interests?: string[];
    location?: string;
    whatsappNumber?: string;
  };
  reviews: Review[]; // Asegúrate que sea Review[] con R mayúscula
}

// Asegúrate de tener la interfaz Review definida
export interface Review {
  id: number;
  userName: string;
  userAvatar: any;
  rating: number;
  date: string;
  comment: string;
}



// Información del anfitrión principal
export const mainHost = {
  name: "Mariana Peña",
  joinedDate: "Enero 2018",
  avatar: require('../assets/images/anfitrion.jpg'),
  whatsappNumber: "573202027777",
  bio: "Apasionada por la hospitalidad y el turismo sostenible. Me encanta recibir viajeros de todo el mundo y compartir las maravillas de Colombia.",
  properties: 30,
  reviewsReceived: 847,
  rating: 4.9,
  languages: ["Español", "Inglés", "Portugués"],
  verified: true,
  responseTime: "En menos de una hora",
  responseRate: "100%",
  location: "Bogotá, Colombia",
  interests: ["Gastronomía", "Ecoturismo", "Fotografía", "Senderismo"],
};

export const categories = [
  { id: 1, name: "Todos", icon: "apps-outline", tag: "todos" },
  { id: 2, name: "Cabañas", icon: "home-outline", tag: "cabaña" },
  { id: 3, name: "Lagos", icon: "water-outline", tag: "lago" },
  { id: 4, name: "Montañas", icon: "triangle-outline", tag: "montaña" },
  { id: 5, name: "Romántico", icon: "heart-outline", tag: "romantico" },
  { id: 6, name: "Familiar", icon: "people-outline", tag: "familiar" },
  { id: 7, name: "Playa", icon: "sunny-outline", tag: "playa" },
  { id: 8, name: "Ciudad", icon: "business-outline", tag: "ciudad" },
  { id: 9, name: "Naturaleza", icon: "leaf-outline", tag: "naturaleza" },
  { id: 10, name: "Bosque", icon: "git-network-outline", tag: "bosque" },
  { id: 11, name: "Lujo", icon: "diamond-outline", tag: "lujo" },
];

// Lista de comodidades disponibles
export const availableAmenities = [
  { id: 1, name: "WiFi", icon: "wifi-outline" },
  { id: 2, name: "Piscina", icon: "water-outline" },
  { id: 3, name: "Chimenea", icon: "flame-outline" },
  { id: 4, name: "Jacuzzi", icon: "water-outline" },
  { id: 5, name: "Cocina completa", icon: "restaurant-outline" },
  { id: 6, name: "Parqueadero", icon: "car-outline" },
  { id: 7, name: "BBQ/Parrilla", icon: "flame-outline" },
  { id: 8, name: "Jardín", icon: "leaf-outline" },
  { id: 9, name: "Terraza", icon: "home-outline" },
  { id: 10, name: "Aire acondicionado", icon: "snow-outline" },
  { id: 11, name: "Calefacción", icon: "thermometer-outline" },
  { id: 12, name: "TV", icon: "tv-outline" },
  { id: 13, name: "Lavadora", icon: "water-outline" },
  { id: 14, name: "Secadora", icon: "sunny-outline" },
  { id: 15, name: "Zona de trabajo", icon: "laptop-outline" },
  { id: 16, name: "Gimnasio", icon: "barbell-outline" },
  { id: 17, name: "Sauna", icon: "flame-outline" },
  { id: 18, name: "Balcón", icon: "home-outline" },
  { id: 19, name: "Vista al mar", icon: "water-outline" },
  { id: 20, name: "Vista a la montaña", icon: "triangle-outline" },
  { id: 21, name: "Acceso al lago", icon: "boat-outline" },
  { id: 22, name: "Acceso al río", icon: "water-outline" },
  { id: 23, name: "Zona verde", icon: "leaf-outline" },
  { id: 24, name: "Fogata", icon: "bonfire-outline" },
  { id: 25, name: "Zona de camping", icon: "home-outline" },
  { id: 26, name: "Hamacas", icon: "bed-outline" },
  { id: 27, name: "Seguridad 24/7", icon: "shield-checkmark-outline" },
  { id: 28, name: "Admite mascotas", icon: "paw-outline" },
];

// Departamentos de Colombia
export const colombianDepartments = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá",
  "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba",
  "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
  "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda",
  "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca",
  "Vaupés", "Vichada"
];
