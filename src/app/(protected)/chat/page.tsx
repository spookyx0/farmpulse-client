"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useSocket } from '@/app/contexts/SocketContext';
import api from '@/app/services/api';
import { 
  Send, Search, MoreVertical, Phone, Video, 
  Image as ImageIcon, Paperclip, Smile, User as UserIcon, 
  ArrowLeft, Check, CheckCheck, MessageSquare, X, FileText, Download
} from 'lucide-react';

// --- Helper for URLs ---
const getUrl = (path: string | undefined) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `http://localhost:3001/${cleanPath}`; 
};

// Types
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
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

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typingTimeoutRef = useRef<any>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); }, [messages, previewUrl]);

  // Responsive logic
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Contacts
  useEffect(() => {
    const fetchContacts = async () => {
      if (!user) return;
      try {
        const { data: users } = await api.get('/users');
        const filteredUsers = user.role === 'OWNER' 
          ? users.filter((u: ChatUser) => u.role !== 'OWNER') 
          : users.filter((u: ChatUser) => u.role === 'OWNER');
        setContacts(filteredUsers);
      } catch (error) {
        console.error("Failed to fetch contacts", error);
      }
    };
    if (user) fetchContacts();
  }, [user]);

  // Mark as read
  const markAsRead = useCallback(async (contactId: string) => {
    if (!user) return;
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, unreadCount: 0 } : c));
    try {
      await api.patch(`/messages/read/${contactId}`);
      socket?.emit('messagesRead', { senderId: contactId, readerId: user.id });
    } catch (error) { console.error(error); }
  }, [user, socket]);

  // Register Socket
  useEffect(() => {
    if (socket && user) socket.emit('register', user.id); 
  }, [socket, user]);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: Message) => {
      const isChatOpen = selectedContact && String(selectedContact.id) === String(message.senderId);
      if (isChatOpen) {
        setMessages(prev => [...prev, { ...message, read: true }]);
        markAsRead(message.senderId);
      }
      setContacts(prev => prev.map(c => {
        if (String(c.id) === String(message.senderId)) {
          return {
            ...c,
            lastMessage: message.type === 'image' ? 'Sent an image' : message.type === 'file' ? 'Sent a file' : message.content,
            lastMessageTime: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: isChatOpen ? 0 : (c.unreadCount || 0) + 1
          };
        }
        return c;
      }));
    };

    const handleUserStatusUpdate = (data: { userId: string | number, isOnline: boolean }) => {
      setContacts(prev => prev.map(c => String(c.id) === String(data.userId) ? { ...c, isOnline: data.isOnline } : c));
      if (selectedContact && String(selectedContact.id) === String(data.userId)) {
        setSelectedContact(prev => prev ? { ...prev, isOnline: data.isOnline } : null);
      }
    };

    const handleTyping = (data: { senderId: string }) => setTypingUsers(prev => new Set(prev).add(data.senderId));
    const handleStopTyping = (data: { senderId: string }) => setTypingUsers(prev => { const next = new Set(prev); next.delete(data.senderId); return next; });
    const handleMessagesRead = (data: { readerId: string }) => {
      if (selectedContact && String(selectedContact.id) === String(data.readerId)) {
        setMessages(prev => prev.map(msg => String(msg.senderId) === String(user?.id) ? { ...msg, read: true } : msg));
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('userStatusUpdate', handleUserStatusUpdate);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('messagesRead', handleMessagesRead);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('userStatusUpdate', handleUserStatusUpdate);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('messagesRead', handleMessagesRead);
    };
  }, [socket, selectedContact, user, markAsRead]);

  // --- File Handlers ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (type === 'image') {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // --- Send Message ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedContact || !user) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket?.emit('stopTyping', { receiverId: selectedContact.id });

    try {
      let msg: Message;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('receiverId', selectedContact.id);
        formData.append('type', previewUrl ? 'image' : 'file');

        const { data } = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        msg = data;
      } else {
        msg = {
          id: Date.now().toString(),
          senderId: String(user.id),
          receiverId: selectedContact.id,
          content: newMessage,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'text'
        };
        socket?.emit('sendMessage', {
          receiverId: selectedContact.id,
          content: newMessage
        });
      }
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      clearSelectedFile();
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (socket && selectedContact) {
      socket.emit('typing', { receiverId: selectedContact.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => socket.emit('stopTyping', { receiverId: selectedContact.id }), 2000);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.username.toLowerCase().includes(searchTerm.toLowerCase()) || c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .message-animate {
          animation: slideIn 0.3s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>

      <div className="flex w-full h-[850] bg-white overflow-hidden relative font-sans">
        
        {/* Sidebar */}
        <div className={`${isMobileView && showChatOnMobile ? 'hidden' : 'flex flex-col'} w-full md:w-80 border-r border-slate-200 bg-white z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-full`}>
          {/* Sidebar Header */}
          <div className="flex-none p-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">Messages</h2>
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search conversations..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {filteredContacts.map(contact => (
              <div key={contact.id} onClick={async () => {
                  setSelectedContact(contact); setShowChatOnMobile(true);
                  try {
                    const { data } = await api.get(`/messages/${contact.id}`);
                    setMessages(data);
                    if (contact.unreadCount) markAsRead(contact.id);
                  } catch (error) { console.error(error); }
                }}
                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 group ${
                  selectedContact?.id === contact.id 
                  ? 'bg-emerald-50/80 shadow-sm border border-emerald-100/50' 
                  : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 transition-colors ${selectedContact?.id === contact.id ? 'border-emerald-200' : 'border-white shadow-sm'}`}>
                    {contact.avatar && !imgErrors[contact.id] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={getUrl(contact.avatar)} alt={contact.username} className="w-full h-full object-cover" onError={() => setImgErrors(prev => ({...prev, [contact.id]: true}))} />
                    ) : <UserIcon className="w-6 h-6 text-slate-400" />}
                  </div>
                  {contact.isOnline && (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-50"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-semibold text-sm truncate ${selectedContact?.id === contact.id ? 'text-emerald-900' : 'text-slate-700'}`}>{contact.username}</h3>
                    <span className="text-[11px] text-slate-400 font-medium">{contact.lastMessageTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <p className={`text-sm truncate pr-2 ${selectedContact?.id === contact.id ? 'text-emerald-700/80' : 'text-slate-500 group-hover:text-slate-600'}`}>{contact.lastMessage || <span className='italic opacity-50'>No messages yet</span>}</p>
                      {contact.unreadCount && contact.unreadCount > 0 ? (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center rounded-full shadow-sm shadow-emerald-200">
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
        <div className={`${isMobileView && !showChatOnMobile ? 'hidden' : 'flex flex-col'} flex-1 bg-slate-50/50 relative w-full h-full`}>
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="flex-none h-20 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
                <div className="flex items-center gap-4">
                  {isMobileView && (
                    <button onClick={() => setShowChatOnMobile(false)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                      <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                  )}
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm">
                      {selectedContact.avatar && !imgErrors[selectedContact.id] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={getUrl(selectedContact.avatar)} alt={selectedContact.username} className="w-full h-full object-cover" />
                      ) : <UserIcon className="w-6 h-6 text-slate-400" />}
                    </div>
                    {selectedContact.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 leading-tight">{selectedContact.username}</h3>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${selectedContact.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      <p className="text-xs text-slate-500 font-medium">{selectedContact.isOnline ? 'Active now' : 'Offline'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all duration-200"><Phone className="w-5 h-5" /></button>
                  <button className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all duration-200"><Video className="w-5 h-5" /></button>
                  <div className="w-px h-6 bg-slate-200 mx-2"></div>
                  <button className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all duration-200"><MoreVertical className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-[#F0F2F5] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
                {messages.map((msg) => {
                  const isMe = String(msg.senderId) === String(user?.id);
                  return (
                    <div key={msg.id} className={`flex w-full message-animate ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col max-w-[85%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`
                          px-4 py-3 shadow-sm relative group transition-all
                          ${isMe 
                            ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm' 
                            : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'}
                        `}>
                          
                          {msg.type === 'image' && msg.fileUrl ? (
                             /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={getUrl(msg.fileUrl)} alt="Shared" className="rounded-lg max-w-full mb-1 cursor-pointer hover:opacity-95 transition-opacity" />
                          ) : msg.type === 'file' && msg.fileUrl ? (
                            <div className={`flex items-center gap-3 p-3 rounded-lg mb-1 ${isMe ? 'bg-black/10' : 'bg-slate-50 border border-slate-100'}`}>
                              <div className="p-2.5 bg-white rounded-full shadow-sm"><FileText className="w-5 h-5 text-emerald-600" /></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate max-w-[200px]">{msg.fileName || 'Attachment'}</p>
                                <a href={getUrl(msg.fileUrl)} download target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs underline opacity-80 hover:opacity-100 mt-0.5">
                                  <Download className="w-3 h-3" /> Download
                                </a>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                          )}

                          <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                            <span className="text-[10px] opacity-80">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMe && (msg.read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {selectedContact && typingUsers.has(selectedContact.id) && (
                  <div className="flex justify-start message-animate">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex-none p-4 bg-white border-t border-slate-200 z-20">
                <div className="max-w-4xl mx-auto w-full relative">
                  
                  {/* File Preview Popup */}
                  {selectedFile && (
                    <div className="absolute bottom-full left-0 w-full mb-3 p-3 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-emerald-100 flex items-center justify-between message-animate z-30">
                      <div className="flex items-center gap-4">
                        {previewUrl ? (
                             /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm" />
                        ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200"><FileText className="w-6 h-6 text-slate-500" /></div>
                        )}
                        <div className="text-sm text-slate-700">
                          <p className="font-semibold truncate max-w-[200px]">{selectedFile.name}</p>
                          <p className="text-slate-500 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button onClick={clearSelectedFile} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-slate-400"><X className="w-5 h-5" /></button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-end gap-3 w-full">
                    <div className="flex gap-1 pb-1">
                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileSelect(e, 'file')} />
                        <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'image')} />
                        
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all active:scale-95"><Paperclip className="w-5 h-5" /></button>
                        <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all active:scale-95"><ImageIcon className="w-5 h-5" /></button>
                        <button type="button" className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all active:scale-95 hidden sm:block"><Smile className="w-5 h-5" /></button>
                    </div>
                    
                    <div className="flex-1 bg-slate-100 rounded-3xl flex items-center border border-transparent focus-within:border-emerald-500/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-200">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                        className="w-full bg-transparent border-none px-6 py-3.5 focus:ring-0 text-[15px] text-slate-800 placeholder:text-slate-400 max-h-32"
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={!newMessage.trim() && !selectedFile} 
                      className="p-3.5 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 transform active:scale-95"
                    >
                      <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8 text-center h-full">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100 animate-[bounce_3s_infinite]">
                  <MessageSquare className="w-14 h-14 text-emerald-200" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Welcome to LSB Chat</h3>
              <p className="max-w-md text-slate-500">Select a conversation from the sidebar to start messaging your team members instantly.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}