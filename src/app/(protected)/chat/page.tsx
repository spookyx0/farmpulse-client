"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useSocket } from '@/app/contexts/SocketContext';
import api from '@/app/services/api';
import { 
  Send, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Image as ImageIcon, 
  Paperclip, 
  Smile,
  User as UserIcon,
  ArrowLeft,
  Check,
  CheckCheck,
  MessageSquare
} from 'lucide-react';

// Types
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

interface ChatUser {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  isOnline?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export default function ChatPage() {
  const { user } = useAuth();
  const socket = useSocket();
  
  const [contacts, setContacts] = useState<ChatUser[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typingTimeoutRef = useRef<any>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle responsive view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        if (!user) return;

        const { data: users } = await api.get('/users');

        // Restrict chat based on role
        if (user.role === 'OWNER') {
          // Owner sees all Staff / Branches
          setContacts(users.filter((u: ChatUser) => u.role !== 'OWNER'));
        } else {
          // Staff can only message the Owner
          setContacts(users.filter((u: ChatUser) => u.role === 'OWNER'));
        }
      } catch (error) {
        console.error("Failed to fetch contacts", error);
      }
    };

    if (user) fetchContacts();
  }, [user]);

  // Mark messages as read
  const markAsRead = useCallback(async (contactId: string) => {
    if (!user) return;
    
    // Optimistic update
    setContacts(prev => prev.map(c => 
      c.id === contactId ? { ...c, unreadCount: 0 } : c
    ));

    try {
      await api.patch(`/messages/read/${contactId}`);
      socket?.emit('messagesRead', { senderId: contactId, readerId: user.id });
    } catch (error) {
      console.error("Failed to mark messages as read", error);
    }
  }, [user, socket]);

  // Socket listeners for typing
  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data: { senderId: string }) => {
      setTypingUsers(prev => new Set(prev).add(data.senderId));
    };

    const handleStopTyping = (data: { senderId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(data.senderId);
        return next;
      });
    };

    const handleReceiveMessage = (message: Message) => {
      const isChatOpen = selectedContact?.id === message.senderId;

      if (isChatOpen) {
        setMessages(prev => [...prev, { ...message, read: true }]);
        markAsRead(message.senderId);
      }
      
      setContacts(prev => prev.map(c => {
        if (c.id === message.senderId) {
          return {
            ...c,
            lastMessage: message.content,
            lastMessageTime: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: isChatOpen ? 0 : (c.unreadCount || 0) + 1
          };
        }
        return c;
      }));
    };

    const handleMessagesRead = (data: { readerId: string }) => {
      if (selectedContact?.id === data.readerId) {
        setMessages(prev => prev.map(msg => 
          msg.senderId === String(user?.id) ? { ...msg, read: true } : msg
        ));
      }
    };

    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messagesRead', handleMessagesRead);

    return () => {
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messagesRead', handleMessagesRead);
    };
  }, [socket, selectedContact, user, markAsRead]);

  // Handle input change with typing emission
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (socket && selectedContact) {
      socket.emit('typing', { receiverId: selectedContact.id });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { receiverId: selectedContact.id });
      }, 2000);
    }
  };

  // Handle sending message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || !user) return;

    // Clear typing status
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socket) socket.emit('stopTyping', { receiverId: selectedContact.id });

    const msg: Message = {
      id: Date.now().toString(),
      senderId: String(user.id),
      receiverId: selectedContact.id,
      content: newMessage,
      createdAt: new Date().toISOString(),
      read: false
    };

    // Optimistic update
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    
    // Emit to socket
    if (socket) {
      socket.emit('sendMessage', {
        receiverId: selectedContact.id,
        content: newMessage
      });
    }
  };

  // Filter contacts
  const filteredContacts = contacts.filter(c => 
    c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {/* Sidebar / Contact List */}
      <div className={`${isMobileView && showChatOnMobile ? 'hidden' : 'flex flex-col'} w-full md:w-80 bg-white border-r border-slate-200`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search people..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredContacts.map(contact => (
            <div 
              key={contact.id}
              onClick={async () => {
                setSelectedContact(contact);
                setShowChatOnMobile(true);
                try {
                  const { data } = await api.get(`/messages/${contact.id}`);
                  setMessages(data);
                  if (contact.unreadCount && contact.unreadCount > 0) {
                    markAsRead(contact.id);
                  }
                } catch (error) {
                  console.error("Failed to fetch messages", error);
                }
              }}
              className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-slate-50 hover:bg-slate-50 ${selectedContact?.id === contact.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-100">
                  {contact.avatar && !imgErrors[contact.id] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                        src={contact.avatar} 
                        alt={contact.username} 
                        className="w-full h-full object-cover"
                        onError={() => setImgErrors(prev => ({...prev, [contact.id]: true}))}
                    />
                  ) : (
                    <UserIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                {contact.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-slate-800 truncate">{contact.username}</h3>
                  <span className="text-xs text-slate-400">{contact.lastMessageTime}</span>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-500 truncate pr-2">{contact.lastMessage}</p>
                    {contact.unreadCount && contact.unreadCount > 0 ? (
                        <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                            {contact.unreadCount}
                        </span>
                    ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${isMobileView && !showChatOnMobile ? 'hidden' : 'flex flex-col'} flex-1 bg-[#F0F2F5]`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm z-10">
              <div className="flex items-center gap-3">
                {isMobileView && (
                  <button onClick={() => setShowChatOnMobile(false)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                  {selectedContact.avatar && !imgErrors[selectedContact.id] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={selectedContact.avatar} alt={selectedContact.username} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 leading-tight">{selectedContact.username}</h3>
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                    {selectedContact.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 md:gap-2">
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors hidden md:block">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors hidden md:block">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-100">
              {messages.map((msg) => {
                const isMe = msg.senderId === String(user?.id);
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm relative group ${
                      isMe 
                        ? 'bg-green-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-green-100' : 'text-slate-400'}`}>
                        <span className="text-[10px]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {selectedContact && typingUsers.has(selectedContact.id) && (
                <div className="flex justify-start mb-2">
                   <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                     <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                     <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                     <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex gap-1 mb-2 md:flex">
                    <button type="button" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <Smile className="w-5 h-5" />
                    </button>
                    <button type="button" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <button type="button" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <ImageIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 bg-slate-100 rounded-2xl flex items-center border border-transparent focus-within:border-green-500/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-green-100 transition-all">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    className="w-full bg-transparent border-none px-4 py-3 focus:ring-0 text-sm text-slate-800 placeholder:text-slate-400 max-h-32"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="p-3 bg-green-600 text-white rounded-full shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex-shrink-0 mb-0.5"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Welcome to LSB Chat</h3>
            <p className="max-w-md text-sm">Select a conversation from the sidebar to start messaging your team members.</p>
          </div>
        )}
      </div>
    </div>
  );
}