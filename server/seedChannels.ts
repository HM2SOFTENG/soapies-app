import * as db from "./db";

export async function ensureDefaultChannels() {
  console.log("[Seed] Ensuring default channels exist...");

  try {
    const defaultChannels = [
      {
        name: "Mens Chat",
        type: "channel" as const,
        communityId: "soapies",
        description: "A space for men in the community to chat",
      },
      {
        name: "Womens Chat",
        type: "channel" as const,
        communityId: "soapies",
        description: "A space for women in the community to chat",
      },
      {
        name: "Community Chat - Soapies",
        type: "channel" as const,
        communityId: "soapies",
        description: "General chat for all Soapies members",
      },
      {
        name: "Community Chat - Groupus",
        type: "channel" as const,
        communityId: "groupus",
        description: "General chat for all Groupus members",
      },
      {
        name: "Community Chat - Gaypeez",
        type: "channel" as const,
        communityId: "gaypeez",
        description: "General chat for all Gaypeez members",
      },
      {
        name: "Admins Chat",
        type: "channel" as const,
        description: "Private chat for administrators",
      },
      {
        name: "Soapies Angels Chat",
        type: "channel" as const,
        description: "Chat for Soapies Angels members",
      },
    ];

    // Get all conversations first to check what exists
    // For now, we'll create the channels without duplicate checking
    // since we don't have a direct query to get all conversations

    for (const channelData of defaultChannels) {
      try {
        // Create the conversation (channel)
        const convId = await db.createConversation(
          {
            name: channelData.name,
            type: channelData.type,
            communityId: channelData.communityId || null,
            description: channelData.description,
            createdBy: null, // System-created
            updatedAt: new Date(),
          },
          [] // Empty participants initially, will be added via hooks/triggers or separate logic
        );

        if (convId) {
          console.log(`[Seed] Created channel: ${channelData.name} (ID: ${convId})`);

          // Auto-add members based on channel type
          if (channelData.name === "Mens Chat") {
            // Auto-add all male members
            await seedChannelMembers(convId, {
              type: "gender",
              value: "male",
            });
          } else if (channelData.name === "Womens Chat") {
            // Auto-add all female members
            await seedChannelMembers(convId, {
              type: "gender",
              value: "female",
            });
          } else if (
            channelData.name === "Community Chat - Soapies" ||
            channelData.name === "Community Chat - Groupus" ||
            channelData.name === "Community Chat - Gaypeez"
          ) {
            // Auto-add all members in community
            await seedChannelMembers(convId, {
              type: "community",
              value: channelData.communityId || "soapies",
            });
          } else if (channelData.name === "Admins Chat") {
            // Auto-add all admins
            await seedChannelMembers(convId, {
              type: "role",
              value: "admin",
            });
          } else if (channelData.name === "Soapies Angels Chat") {
            // Auto-add all angels
            await seedChannelMembers(convId, {
              type: "memberRole",
              value: "angel",
            });
          }
        }
      } catch (err) {
        // Channel might already exist or other error
        console.warn(`[Seed] Could not create channel ${channelData.name}:`, err);
      }
    }

    console.log("[Seed] Default channels seeding complete");
  } catch (err) {
    console.error("[Seed] Error seeding channels:", err);
  }
}

async function seedChannelMembers(
  conversationId: number,
  filter: {
    type: "gender" | "role" | "memberRole" | "community";
    value: string;
  }
) {
  try {
    // This would require queries to get users based on filter criteria
    // For now, we'll just log that this would be implemented
    console.log(
      `[Seed] Would add members to conversation ${conversationId} with filter:`,
      filter
    );

    // In a full implementation:
    // 1. Query users based on filter (gender, role, memberRole, community)
    // 2. For each user, add them to conversationParticipants table
    // This requires database functions that may not exist yet
  } catch (err) {
    console.warn(
      `[Seed] Could not seed channel members for conversation ${conversationId}:`,
      err
    );
  }
}
