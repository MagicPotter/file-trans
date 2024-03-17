import { ConvexError, v } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query, internalMutation } from "./_generated/server";
import { getUser } from "./users";

export const generateUploadUrl = mutation(async (ctx) => {
  
  const identity = await ctx.auth.getUserIdentity();

  if(!identity) {
    throw new ConvexError("Du musst eingeloggt sein um eine Datei hochzuladen!");
  }
  
  return await ctx.storage.generateUploadUrl();
});

export async function hasAccessToOrg(
    ctx: QueryCtx | MutationCtx,
    orgId: string
  ) {
    const identity = await ctx.auth.getUserIdentity();
  
    if (!identity) {
      return null;
    }
  
    const user = await ctx.db.query("users").withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      ).first();
  
    if (!user) {
      return null;
    }
  
    const hasAccess =
      user.orgIds.some((item) => item.orgId === orgId) ||
      user.tokenIdentifier.includes(orgId);
  
    if (!hasAccess) {
      return null;
    }
  
    return { user };
  }

export const createFile = mutation({
    args: {
        name: v.string(),
        fileId: v.id("_storage"),
        orgId: v.string()
    },
    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();
        
        if(!identity) {
            throw new ConvexError("Du musst eingeloggt sein um eine Datei hochzuladen!");
        }

        const hasAccess = await hasAccessToOrg(ctx, args.orgId);

        if(!hasAccess) {
            throw new ConvexError("Du hast keine Berechtigung für diese Organisation")
        }

        await ctx.db.insert("files", {
            name: args.name,
            orgId: args.orgId,
            fileId: args.fileId
        });
    },
});

export const getFiles = query({
    
    args: {
        orgId: v.string()
    },
    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();

        if(!identity) {
            return [];
        }

        const hasAccess = await hasAccessToOrg(ctx, args.orgId);        
        
        if(!hasAccess) {
            return [];
        }

        return ctx.db.query("files").withIndex('by_orgId', (q) => q.eq('orgId', args.orgId)).collect();
    }

})