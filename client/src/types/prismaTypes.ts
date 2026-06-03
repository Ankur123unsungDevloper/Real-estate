// ----------------------------------------------------------------
// Client-side Prisma Types
// Manually defined to match server schema — no @prisma/client dependency
// These mirror the models in server/prisma/schema.prisma
// ----------------------------------------------------------------

// -------------------- Enums --------------------

export type Highlight =
  | "HighSpeedInternetAccess"
  | "WasherDryer"
  | "AirConditioning"
  | "Heating"
  | "SmokeFree"
  | "CableReady"
  | "SatelliteTV"
  | "DoubleVanities"
  | "TubShower"
  | "Intercom"
  | "SprinklerSystem"
  | "RecentlyRenovated"
  | "CloseToTransit"
  | "GreatView"
  | "QuietNeighborhood";

export type Amenity =
  | "WasherDryer"
  | "AirConditioning"
  | "Dishwasher"
  | "HighSpeedInternet"
  | "HardwoodFloors"
  | "WalkInClosets"
  | "Microwave"
  | "Refrigerator"
  | "Pool"
  | "Gym"
  | "Parking"
  | "PetsAllowed"
  | "WiFi";

export type PropertyType =
  | "Rooms"
  | "Tinyhouse"
  | "Apartment"
  | "Villa"
  | "Townhouse"
  | "Cottage";

export type ApplicationStatus = "Pending" | "Denied" | "Approved";

export type PaymentStatus =
  | "Pending"
  | "Paid"
  | "PartiallyPaid"
  | "Overdue";

// -------------------- Models --------------------

export interface Location {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: {
    longitude: number;
    latitude: number;
  };
}

export interface Manager {
  id: number;
  cognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  image?: string;
  managedProperties?: Property[];
}

export interface Tenant {
  id: number;
  cognitoId: string;
  name: string;
  email: string;
  image?: string;
  phoneNumber: string;
  properties?: Property[];
  favorites?: Property[];
  applications?: Application[];
  leases?: Lease[];
}

export interface Property {
  id: number;
  name: string;
  description: string;
  pricePerMonth: number;
  securityDeposit: number;
  applicationFee: number;
  photoUrls: string[];
  amenities: Amenity[];
  highlights: Highlight[];
  isPetsAllowed: boolean;
  isParkingIncluded: boolean;
  beds: number;
  baths: number;
  squareFeet: number;
  propertyType: PropertyType;
  postedDate: string;
  averageRating?: number | null;
  numberOfReviews?: number | null;
  locationId: number;
  managerCognitoId: string;
  location?: Location;
  manager?: Manager;
  leases?: Lease[];
  applications?: Application[];
  favoritedBy?: Tenant[];
  tenants?: Tenant[];
}

export interface Application {
  id: number;
  applicationDate: string;
  status: ApplicationStatus;
  propertyId: number;
  tenantCognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  message?: string | null;
  leaseId?: number | null;
  property?: Property;
  tenant?: Tenant;
  lease?: Lease | null;
}

export interface Lease {
  id: number;
  startDate: string;
  endDate: string;
  rent: number;
  deposit: number;
  propertyId: number;
  tenantCognitoId: string;
  property?: Property;
  tenant?: Tenant;
  application?: Application | null;
  payments?: Payment[];
}

export interface Payment {
  id: number;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  paymentDate: string;
  paymentStatus: PaymentStatus;
  leaseId: number;
  lease?: Lease;
}