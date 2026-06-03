import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { wktToGeoJSON } from "@terraformer/wkt";
import { Prisma } from "../generated/prisma/client";


type PropertyWithLocation = Prisma.PropertyGetPayload<{
  include: { location: true };
}>;

export const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = String(req.params["cognitoId"]);
    
    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId },
      include: { favorites: true },
    });

    if (tenant) {
      res.json(tenant);
    } else {
      res.status(404).json({ message: "Tenant not found" });
    }
  } catch (error: unknown) {

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error retrieving tenant: ${message}` });
  }
};

export const createTenant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;

    const tenant = await prisma.tenant.create({
      data: { cognitoId, name, email, phoneNumber },
    });

    res.status(201).json(tenant);
  } catch (error: unknown) {                                     // ✅ Fix: any → unknown
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error creating tenant: ${message}` });
  }
};

export const updateTenant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = String(req.params["cognitoId"]);           // ✅ Fix: plain string
    const { name, email, phoneNumber } = req.body;

    const updateTenant = await prisma.tenant.update({
      where: { cognitoId },
      data: { name, email, phoneNumber },
    });

    res.json(updateTenant);
  } catch (error: unknown) {                                     // ✅ Fix: any → unknown
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error updating tenant: ${message}` });
  }
};

export const getCurrentResidences = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = String(req.params["cognitoId"]);           // ✅ Fix: plain string

    const rawProperties = await prisma.property.findMany({
      where: { tenants: { some: { cognitoId } } },
      include: { location: true },
    });

    // ✅ Fix: cast to typed array so property in map is not implicit any
    const properties = rawProperties as unknown as PropertyWithLocation[];

    const residencesWithFormattedLocation = await Promise.all(
      properties.map(async (property: PropertyWithLocation) => {  // ✅ Fix: explicit type
        const coordinates: { coordinates: string }[] =
          await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

        const geoJSON = wktToGeoJSON(
          coordinates[0]?.coordinates ?? ""
        ) as unknown as { coordinates: [number, number] };        // ✅ Fix: any → typed cast

        const longitude = geoJSON.coordinates[0];
        const latitude = geoJSON.coordinates[1];

        return {
          ...property,
          location: {
            ...property.location,
            coordinates: { longitude, latitude },
          },
        };
      })
    );

    res.json(residencesWithFormattedLocation);
  } catch (err: unknown) {                                        // ✅ Fix: any → unknown
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: `Error retrieving residences: ${message}` });
  }
};

export const addFavoriteProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = String(req.params["cognitoId"]);            // ✅ Fix: plain string
    const propertyId = String(req.params["propertyId"]);          // ✅ Fix: plain string

    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId },
      include: { favorites: true },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    const propertyIdNumber = Number(propertyId);
    const existingFavorites = tenant.favorites ?? [];

    // ✅ Fix: fav typed as { id: number } — favorites is Property[] from Prisma
    if (!existingFavorites.some((fav: { id: number }) => fav.id === propertyIdNumber)) {
      const updatedTenant = await prisma.tenant.update({
        where: { cognitoId },
        data: { favorites: { connect: { id: propertyIdNumber } } },
        include: { favorites: true },
      });
      res.json(updatedTenant);
    } else {
      res.status(409).json({ message: "Property already added as favorite" });
    }
  } catch (error: unknown) {                                      // ✅ Fix: any → unknown
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error adding favorite property: ${message}` });
  }
};

export const removeFavoriteProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = String(req.params["cognitoId"]);            // ✅ Fix: plain string
    const propertyId = String(req.params["propertyId"]);          // ✅ Fix: plain string
    const propertyIdNumber = Number(propertyId);

    const updatedTenant = await prisma.tenant.update({
      where: { cognitoId },
      data: { favorites: { disconnect: { id: propertyIdNumber } } },
      include: { favorites: true },
    });

    res.json(updatedTenant);
  } catch (err: unknown) {                                        // ✅ Fix: any → unknown
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: `Error removing favorite property: ${message}` });
  }
};