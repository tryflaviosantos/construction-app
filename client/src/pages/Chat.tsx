import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Send, Users, Building2 } from "lucide-react";
import { format } from "date-fns";
import type { ChatRoom, ChatMessage, Site, User } from "@shared/schema";

interface MessageWithSender extends ChatMessage {
  sender?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
}

export default function Chat() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: sites, isLoading: sitesLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: roomMessages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", selectedRoom?.id, "messages"],
    enabled: !!selectedRoom,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedRoom) return;
      return apiRequest("POST", `/api/chat/rooms/${selectedRoom.id}/messages`, { content });
    },
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const res = await apiRequest("POST", `/api/sites/${siteId}/chat`, {});
      return res.json();
    },
    onSuccess: (room) => {
      setSelectedRoom(room);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
    },
  });

  const getUserById = useCallback((id: string) => {
    return users?.find((u) => u.id === id);
  }, [users]);

  useEffect(() => {
    if (roomMessages) {
      const messagesWithSenders = roomMessages.map((msg) => ({
        ...msg,
        sender: getUserById(msg.senderId) ? {
          id: msg.senderId,
          firstName: getUserById(msg.senderId)?.firstName || null,
          lastName: getUserById(msg.senderId)?.lastName || null,
          profileImageUrl: getUserById(msg.senderId)?.profileImageUrl || null,
        } : null,
      }));
      setMessages(messagesWithSenders.reverse());
    }
  }, [roomMessages, getUserById]);

  useEffect(() => {
    if (selectedRoom && user) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", roomId: selectedRoom.id, odId: user.id }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "new_message") {
          setMessages((prev) => [...prev, data.message]);
        }
      };

      wsRef.current = ws;

      return () => {
        ws.close();
      };
    }
  }, [selectedRoom, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedRoom) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSiteSelect = (siteId: string) => {
    setSelectedSite(siteId);
    const existingRoom = rooms?.find((r) => r.siteId === siteId);
    if (existingRoom) {
      setSelectedRoom(existingRoom);
    } else {
      joinRoomMutation.mutate(siteId);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  const formatMessageTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday ? format(d, "HH:mm") : format(d, "MMM d, HH:mm");
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t("chat.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("chat.subtitle")}</p>
        </div>

        <div className="p-4 border-b">
          <Select value={selectedSite} onValueChange={handleSiteSelect}>
            <SelectTrigger data-testid="select-site-chat">
              <SelectValue placeholder={t("chat.selectSite")} />
            </SelectTrigger>
            <SelectContent>
              {sitesLoading ? (
                <div className="p-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {site.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {roomsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : rooms?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t("chat.noRooms")}</p>
                <p className="text-sm">{t("chat.selectSiteToStart")}</p>
              </div>
            ) : (
              rooms?.map((room) => (
                <Button
                  key={room.id}
                  variant={selectedRoom?.id === room.id ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto py-3 px-3 mb-1"
                  onClick={() => setSelectedRoom(room)}
                  data-testid={`button-room-${room.id}`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{room.name}</div>
                      <div className="text-xs text-muted-foreground">{t("chat.siteChat")}</div>
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            <div className="p-4 border-b flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedRoom.name}</h3>
                  <p className="text-sm text-muted-foreground">{t("chat.siteChat")}</p>
                </div>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {t("chat.online")}
              </Badge>
            </div>

            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-64" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">{t("chat.noMessages")}</p>
                  <p className="text-sm">{t("chat.startConversation")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.sender?.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(msg.sender?.firstName || null, msg.sender?.lastName || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                          <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                            <span className="text-sm font-medium">
                              {msg.sender ? `${msg.sender.firstName || ""} ${msg.sender.lastName || ""}`.trim() : t("chat.unknownUser")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 inline-block ${
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t("chat.typeMessage")}
                  data-testid="input-message"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-20 w-20 mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-medium mb-2">{t("chat.selectRoom")}</h3>
              <p className="text-sm">{t("chat.selectRoomDescription")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
