import { router } from "expo-router";
import { api } from "./api";
export async function openConversation(token, body) {
  const conversation = await api("/conversations", {
    token,
    method: "POST",
    body,
  });
  router.push({
    pathname: "/conversation/[id]",
    params: { id: conversation.conversation_id },
  });
}
