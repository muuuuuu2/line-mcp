#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// メッセージ送信の引数の型定義
interface SendMessageArgs {
  group_id: string;
  message: string;
}

// グループプロフィール取得の引数の型定義
interface GetGroupProfileArgs {
  group_id: string;
}

// グループメッセージ履歴取得の引数の型定義
interface GetGroupHistoryArgs {
  group_id: string;
  count?: number;
}

// メッセージ送信機能の定義
const sendMessageTool: Tool = {
  name: "line_send_group_message",
  description: "Send a message to a LINE group",
  inputSchema: {
    type: "object",
    properties: {
      group_id: {
        type: "string",
        description: "The ID of the group to send to",
      },
      message: {
        type: "string",
        description: "The message content",
      },
    },
    required: ["group_id", "message"],
  },
};

// グループプロフィール取得機能の定義
const getGroupProfileTool: Tool = {
  name: "line_get_group_profile",
  description: "Get profile information of a LINE group",
  inputSchema: {
    type: "object",
    properties: {
      group_id: {
        type: "string",
        description: "The ID of the group",
      },
    },
    required: ["group_id"],
  },
};

// グループメッセージ履歴取得機能の定義
const getGroupHistoryTool: Tool = {
  name: "line_get_group_history",
  description: "Get message history of a LINE group",
  inputSchema: {
    type: "object",
    properties: {
      group_id: {
        type: "string",
        description: "The ID of the group",
      },
      count: {
        type: "number",
        description: "Number of messages to retrieve (default: 10)",
      },
    },
    required: ["group_id"],
  },
};

// LINE APIとの通信を管理するクライアントクラス
class LINEClient {
  private channelAccessToken: string;
  private headers: { Authorization: string; "Content-Type": string };
  private baseUrl = "https://api.line.me/v2/bot";

  constructor(channelAccessToken: string) {
    this.channelAccessToken = channelAccessToken;
    this.headers = {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    };
  }

  // グループにメッセージを送信
  async sendGroupMessage(groupId: string, message: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/message/push`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        to: groupId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    return response.json();
  }

  // グループプロフィールを取得
  async getGroupProfile(groupId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/group/${groupId}/summary`, {
      headers: this.headers,
    });

    return response.json();
  }

  // グループメッセージ履歴を取得
  async getGroupHistory(groupId: string, count: number = 10): Promise<any> {
    const response = await fetch(`${this.baseUrl}/message/list/group/${groupId}?count=${count}`, {
      headers: this.headers,
    });

    return response.json();
  }
}

async function main() {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    console.error("Please set LINE_CHANNEL_ACCESS_TOKEN environment variable");
    process.exit(1);
  }

  console.error("Starting LINE MCP Server...");
  const server = new Server(
    {
      name: "LINE MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const lineClient = new LINEClient(channelAccessToken);

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      console.error("Received CallToolRequest:", request);
      try {
        if (!request.params.arguments) {
          throw new Error("No arguments provided");
        }

        switch (request.params.name) {
          case "line_send_group_message": {
            const args = request.params.arguments as unknown as SendMessageArgs;
            if (!args.group_id || !args.message) {
              throw new Error("Missing required arguments: group_id and message");
            }
            const response = await lineClient.sendGroupMessage(
              args.group_id,
              args.message
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "line_get_group_profile": {
            const args = request.params.arguments as unknown as GetGroupProfileArgs;
            if (!args.group_id) {
              throw new Error("Missing required argument: group_id");
            }
            const response = await lineClient.getGroupProfile(args.group_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "line_get_group_history": {
            const args = request.params.arguments as unknown as GetGroupHistoryArgs;
            if (!args.group_id) {
              throw new Error("Missing required argument: group_id");
            }
            const response = await lineClient.getGroupHistory(args.group_id, args.count);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error("Error executing tool:", error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return {
      tools: [sendMessageTool, getGroupProfileTool, getGroupHistoryTool],
    };
  });

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("LINE MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});