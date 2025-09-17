import React, { useState, useEffect } from 'react';
import { databaseService, Conversation } from '../services/databaseService';
import { PDFDocument } from './PDFManager';
import { v4 as uuidv4 } from 'uuid';

interface ChatListProps {
  onChatSelect: (conversation: Conversation | null) => void;
  selectedChat: Conversation | null;
  availablePDFs: PDFDocument[];
  refreshTrigger?: number; // Add refresh trigger prop
  onChatDelete?: (conversationId: string) => void; // Add delete callback
}

export const ChatList: React.FC<ChatListProps> = ({
  onChatSelect,
  selectedChat,
  availablePDFs,
  refreshTrigger,
  onChatDelete
}) => {
  const [chats, setChats] = useState<Conversation[]>([]);
  // const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  // Refresh chats when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      loadChats();
    }
  }, [refreshTrigger]);

  const loadChats = async () => {
    try {
      const loadedChats = await databaseService.getConversations();
      setChats(loadedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const handleNewChat = () => {
    const newChat: Conversation = {
      id: uuidv4(), // Generate proper UUID
      name: 'New Chat',
      pdfIds: [],
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    onChatSelect(newChat);
    // setIsDropdownOpen(false);
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering chat selection
    
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      try {
        await databaseService.deleteConversation(chatId);
        // Remove from local state
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        // Notify parent component
        if (onChatDelete) {
          onChatDelete(chatId);
        }
        // If the deleted chat was selected, clear selection
        if (selectedChat?.id === chatId) {
          onChatSelect(null);
        }
      } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Failed to delete chat. Please try again.');
      }
    }
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const getChatDisplayName = (chat: Conversation): string => {
    if (chat.name !== 'New Chat') {
      return truncateText(chat.name, 30);
    }

    // Auto-generate name based on existing PDFs only
    const existingPdfNames = chat.pdfIds
      .map(pdfId => availablePDFs.find(pdf => pdf.id === pdfId)?.name)
      .filter(Boolean)
      .slice(0, 2);

    if (existingPdfNames.length === 0) {
      return 'New Chat';
    } else if (existingPdfNames.length === 1) {
      return truncateText(existingPdfNames[0]!, 30);
    } else {
      const firstPdf = truncateText(existingPdfNames[0]!, 15);
      const secondPdf = truncateText(existingPdfNames[1]!, 15);
      const totalExistingPdfs = chat.pdfIds.filter(pdfId => 
        availablePDFs.some(pdf => pdf.id === pdfId)
      ).length;
      const additionalCount = totalExistingPdfs > 2 ? ` +${totalExistingPdfs - 2}` : '';
      return `${firstPdf} + ${secondPdf}${additionalCount}`;
    }
  };

  const getLastMessage = (chat: Conversation): string => {
    if (chat.messages.length === 0) {
      return 'No messages yet';
    }
    const lastMessage = chat.messages[chat.messages.length - 1];
    return truncateText(lastMessage.content, 30);
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="sidebar-section">
      <div className="sidebar-header">
        <h3>Recent Chats</h3>
        <button 
          className="upload-btn"
          onClick={handleNewChat}
          title="Start new chat"
        >
          +
        </button>
      </div>
      
      {chats.length === 0 ? (
        <div className="empty-state">
          <p>No chats yet</p>
          <p>Start a conversation to create your first chat!</p>
        </div>
      ) : (
        <div className="chat-list">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`}
              onClick={() => {
                onChatSelect(chat);
                // setIsDropdownOpen(false);
              }}
            >
              <div className="chat-content">
                <div className="chat-name">
                  {getChatDisplayName(chat)}
                </div>
                <div className="chat-preview">
                  {getLastMessage(chat)}
                </div>
                <div className="chat-meta">
                  <span className="chat-time">{formatTime(chat.updatedAt)}</span>
                  {(() => {
                    const existingPdfCount = chat.pdfIds.filter(pdfId => 
                      availablePDFs.some(pdf => pdf.id === pdfId)
                    ).length;
                    
                    if (existingPdfCount > 0) {
                      return (
                        <span className="chat-pdf-count">
                          📄 {existingPdfCount}
                        </span>
                      );
                    } else if (chat.pdfIds.length > 0) {
                      // All PDFs were deleted, but chat had PDFs originally
                      return (
                        <span className="chat-pdf-count no-pdfs">
                          No PDFs selected
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <button 
                className="delete-chat-btn"
                onClick={(e) => handleDeleteChat(chat.id, e)}
                title="Delete chat"
              >
                <i className="fas fa-times" style={{color: '#dc3545'}}></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
