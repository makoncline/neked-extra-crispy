import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { siteConfig } from "../../../siteConfig";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  createSpot: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string(),
        state: z.string().min(1).max(2),
        city: z.string().min(1),
        placeId: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { placeId, lat, lng, name, city, state, userId, address } = input;
      const spot = await ctx.prisma.spot
        .create({
          data: {
            userId,
            name: input.name.trim(),
            city: input.city.trim(),
            state,
          },
          select: {
            id: true,
            user: true,
            name: true,
            state: true,
            city: true,
            createdAt: true,
          },
        })
        .catch((e) => {
          if (e.code === "P2002") {
            throw new Error("A spot with this name already exists!");
          } else {
            throw e;
          }
        });
      if (placeId && lat && lng && address) {
        await ctx.prisma.place.create({
          data: {
            spotId: spot.id,
            id: placeId,
            lat,
            lng,
            name,
            city,
            state,
            address,
          },
        });
      }
      try {
        const message = `
          ${spot.name}<br>
          ${spot.city}, ${spot.state}<br>
          added by ${spot.user.name || spot.user.email}<br>
          ${siteConfig.baseUrl}/spots/${spot.id}
          `;
        const queryParams = new URLSearchParams();
        queryParams.set("subject", `${siteConfig.title} - New Spot`);
        queryParams.set("message", message);
        fetch(`${siteConfig.sendEmailUrl}?${queryParams}`);
      } catch (e) {
        // ignore
      }
      return spot;
    }),
  createWing: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        spotId: z.string(),
        review: z.string(),
        rating: z.number().positive().min(1).max(10),
        mainImageId: z.string(),
        drumImageId: z.string().nullable(),
        flatImageId: z.string().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { mainImageId, drumImageId, flatImageId, ...wingReview } = input;
      const { id: wingId } = await ctx.prisma.wing.create({
        data: wingReview,
        select: {
          id: true,
        },
      });
      const { userId, spotId } = wingReview;
      const baseImageData = { userId, spotId, wingId };

      if (mainImageId) {
        await ctx.prisma.image.create({
          data: {
            ...baseImageData,
            key: mainImageId,
            type: "main",
          },
        });
      }
      if (drumImageId) {
        await ctx.prisma.image.create({
          data: {
            ...baseImageData,
            key: drumImageId,
            type: "drum",
          },
        });
      }
      if (flatImageId) {
        await ctx.prisma.image.create({
          data: {
            ...baseImageData,
            key: flatImageId,
            type: "flat",
          },
        });
      }
      const wing = await ctx.prisma.wing.findFirstOrThrow({
        where: { id: wingId },
        select: {
          id: true,
          review: true,
          rating: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          spot: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
            },
          },
          images: {
            select: {
              key: true,
              type: true,
            },
          },
        },
      });
      try {
        const message = `
          ${wing.spot.name}<br>
          ${wing.spot.city}, ${wing.spot.state}<br>
          added by ${wing.user.name || wing.user.email}<br>
          ${wing.rating}/10 🔥<br>
          ${wing.review}<br>
          ${siteConfig.baseUrl}/wings/${wing.id}
        `;
        const queryParams = new URLSearchParams();
        queryParams.set("subject", `${siteConfig.title} - New Rating`);
        queryParams.set("message", message);
        fetch(`${siteConfig.sendEmailUrl}?${queryParams}`);
      } catch (e) {
        // ignore
      }
      return wing;
    }),
});
