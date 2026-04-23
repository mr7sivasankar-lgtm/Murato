import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Phone } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function ChatRoomPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchChat();
    fetchMessages();

    // Socket
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join_room', chatId);
    socket.on('receive_message', (msg) => {
      setMessages((prev) => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });
    socket.on('typing', (data) => {
      if (data.senderId !== user?._id) setTyping(true);
      setTimeout(() => setTyping(false), 2000);
    });

    return () => socket.disconnect();
  }, [chatId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchChat = async () => {
    try {
      const { data } = await api.get(`/chat/mine`);
      const found = data.find(c => c._id === chatId);
      if (found) setChat(found);
    } catch {}
  };

  const fetchMessages = async () => {
    try {
      const { data } = await api.get(`/chat/${chatId}/messages`);
      setMessages(data);
    } catch {}
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msgText = text;
    setText('');
    try {
      const { data } = await api.post(`/chat/${chatId}/messages`, { text: msgText });
      setMessages(prev => {
        if (prev.find(m => m._id === data._id)) return prev;
        return [...prev, data];
      });
    } catch { toast.error('Failed to send'); }
  };

  const handleTyping = () => {
    socketRef.current?.emit('typing', { chatId, senderId: user?._id });
  };

  const otherUser = chat?.participants?.find(p => p._id !== user?._id);

  return (
    <div className="chat-room" style={{ background: '#f4f6fb' }}>
      {/* Header */}
      <div style={{ background: 'var(--white)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate('/chats')} style={{ color: 'var(--navy)' }}>
          <ArrowLeft size={22} />
        </button>
        <div className="avatar-placeholder avatar-sm">{otherUser?.name?.[0]?.toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15 }}>{otherUser?.name || 'User'}</p>
          {typing && <p style={{ fontSize: 11, color: 'var(--success)' }}>typing...</p>}
        </div>
        {otherUser?.phone && (
          <a href={`tel:${otherUser.phone}`} style={{ color: 'var(--navy)', padding: 6 }}>
            <Phone size={20} />
          </a>
        )}
      </div>

      {/* Ad Banner */}
      {chat?.adId && (
        <div style={{ background: '#f0f3fc', padding: '10px 20px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          {chat.adId.images?.[0] ? (
            <img src={chat.adId.images[0]} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
          ) : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏗️</div>}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{chat.adId.title}</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>₹{Number(chat.adId.price).toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => {
          const isMe = msg.senderId?._id === user?._id || msg.senderId === user?._id;
          return (
            <div key={msg._id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div className={`msg-bubble ${isMe ? 'msg-me' : 'msg-other'}`}>
                {msg.text}
                {msg.type === 'offer' && (
                  <div style={{ marginTop: 4, fontWeight: 700 }}>💰 Offer: ₹{Number(msg.offerAmount).toLocaleString('en-IN')}</div>
                )}
              </div>
              <span className="msg-time">{new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}
        {typing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="msg-bubble msg-other" style={{ padding: '8px 14px' }}>
              <span style={{ letterSpacing: 2 }}>• • •</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-row" onSubmit={sendMessage}>
        <input
          className="chat-input"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => { setText(e.target.value); handleTyping(); }}
        />
        <button type="submit" className="send-btn">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
