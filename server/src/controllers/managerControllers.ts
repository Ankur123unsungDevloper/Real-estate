import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { wktToGeoJSON } from "@terraformer/wkt";
import { Prisma } from "../generated/prisma/client";

type PropertyWithLocation = Prisma.PropertyGetPayload<{
  include: { location: true };
}>;

export const getManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = String(req.params["cognitoId"]);

    const manager = await prisma.manager.findUnique({
      where: { cognitoId },
    });

    if (manager) {
      res.json(manager);
    } else {
      res.status(404).json({ message: "Manager not found" });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error retrieving manager: ${message}` });
  }
};

export const createManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;

    const manager = await prisma.manager.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });

    res.status(201).json(manager);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error creating manager: ${message}` });
  }
};

export const updateManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = String(req.params["cognitoId"]);
    const { name, email, phoneNumber } = req.body;

    const updateManager = await prisma.manager.update({
      where: { cognitoId },
      data: {
        name,
        email,
        phoneNumber,
      },
    });

    res.json(updateManager);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error updating manager: ${message}` });
  }
};

export const getManagerProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = String(req.params["cognitoId"]);

    const rawProperties = await prisma.property.findMany({
      where: { managerCognitoId: cognitoId },
      include: { location: true },
    });

    const properties = rawProperties as unknown as PropertyWithLocation[];

    const propertiesWithFormattedLocation = await Promise.all(
      properties.map(async (property: PropertyWithLocation) => {
        const coordinates: { coordinates: string }[] =
          await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

        const geoJSON = wktToGeoJSON(
          coordinates[0]?.coordinates ?? ""
        ) as unknown as { coordinates: [number, number] };

        const longitude = geoJSON.coordinates[0];
        const latitude = geoJSON.coordinates[1];

        return {
          ...property,
          location: {
            ...property.location,
            coordinates: {
              longitude,
              latitude,
            },
          },
        };
      })
    );

    res.json(propertiesWithFormattedLocation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res
      .status(500)
      .json({ message: `Error retrieving manager properties: ${message}` });
  }
};