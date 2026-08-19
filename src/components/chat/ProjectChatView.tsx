import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ProjectChatMessage, ProjectBoardItem, ViewMode } from '../../types';
import {
  MessagesSquare,
  Search,
  Pin,
  Trash2,
  Send,
  Link,
  Megaphone,
  HelpCircle,
  MessageSquare,
  ExternalLink,
  Tag,
  Clock,
  User,
  Shield,
  Sparkles,
  Layers,
  X,
  FileText,
  Paperclip,
  CheckCircle2,
  CornerDownRight,
  Filter,
  ArrowRight
} from 'lucide-react';

interface ProjectChatViewProps {
  onNavigate?: (view: ViewMode) => void;
}

export const ProjectChatView: React.FC<ProjectChatViewProps> = ({ onNavigate }) => {
  const {
    projectData,
    activeProjectId,
    currentUser,
    addProjectChatMessage,
    deleteProjectChatMessage,
    toggleProjectChatMessageReaction,
    togglePinProjectChatMessage
  } = useProject();

  const isPM = currentUser?.role === 'pm' || currentUser?.role === 'admin';

  // Filters & Search
  const [filterType, setFilterType] = useState<'all' | 'announcement' | 'question' | 'item_reference' | 'pinned'>('all');
  const [chatSearch, setChatSearch] = useState('');

  // Composer
  const [inputContent, setInputContent] = useState('');
  const [msgType, setMsgType] = useState<'chat' | 'announcement' | 'question'>('chat');
  const [linkedItemId, setLinkedItemId] = useState<string>('');

  // Attached Board Item detail modal state
  const [viewingBoardItem, setViewingBoardItem] = useState<ProjectBoardItem | null>(null);

  // Emojis for quick reactions
  const emojis = ['👍', '🚀', '❤️', '💡', '🎉', '❓'];

  // Scroll ref for messages stream
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Board items for active project
  const projectItems = useMemo(() => {
    return (projectData.boardItems || []).filter(i => i.projectId === activeProjectId);
  }, [projectData.boardItems, activeProjectId]);

  // Messages for active project
  const projectMessages = useMemo(() => {
    return (projectData.boardMessages || []).filter(m => m.projectId === activeProjectId);
  }, [projectData.boardMessages, activeProjectId]);

  // Pinned messages list
  const pinnedMessages = useMemo(() => {
    return projectMessages.filter(m => m.isPinned);
  }, [projectMessages]);

  // Filtered messages
  const filteredMessages = useMemo(() => {
    return projectMessages.filter(msg => {
      if (filterType === 'pinned' && !msg.isPinned) return false;
      if (filterType !== 'all' && filterType !== 'pinned' && msg.type !== filterType) return false;
      if (chatSearch.trim() !== '') {
        const q = chatSearch.toLowerCase().trim();
        const matchesContent = msg.content.toLowerCase().includes(q);
        const matchesUser = msg.userName.toLowerCase().includes(q);
        const matchesLinked = msg.linkedItemTitle?.toLowerCase().includes(q);
        if (!matchesContent && !matchesUser && !matchesLinked) return false;
      }
      return true;
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [projectMessages, filterType, chatSearch]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    const linkedItem = projectItems.find(i => i.id === linkedItemId);

    await addProjectChatMessage({
      content: inputContent.trim(),
      type: linkedItemId ? 'item_reference' : msgType,
      linkedItemId: linkedItemId || undefined,
      linkedItemTitle: linkedItem?.title
    });

    setInputContent('');
    setLinkedItemId('');
    setMsgType('chat');
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 max-w-full min-w-0 pb-6">
      {/* HEADER BANNER */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl shrink-0 shadow-lg shadow-indigo-600/10">
            <MessagesSquare className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight truncate">Team Chat & Discussion</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                {projectMessages.length} Messages
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Live discussion, announcements, Q&A, and board attachments for {projectData.projectName || 'this project'}
            </p>
          </div>
        </div>

        {/* NAVIGATION ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          {onNavigate && (
            <button
              onClick={() => onNavigate('project_board')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Project Board</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* PINNED MESSAGES BANNER (If any exist) */}
      {pinnedMessages.length > 0 && filterType !== 'pinned' && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 shadow-lg flex items-start gap-3 min-w-0">
          <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
            <Pin className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Pinned Announcement / Notice</span>
              <button
                onClick={() => setFilterType('pinned')}
                className="text-[11px] font-semibold text-amber-400 hover:underline cursor-pointer"
              >
                View all ({pinnedMessages.length})
              </button>
            </div>
            <div className="text-xs text-slate-200 line-clamp-2">
              <span className="font-semibold text-amber-200">{pinnedMessages[pinnedMessages.length - 1].userName}: </span>
              {pinnedMessages[pinnedMessages.length - 1].content}
            </div>
          </div>
        </div>
      )}

      {/* CHAT CONTAINER */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl flex flex-col min-w-0 overflow-hidden h-[calc(100vh-14rem)] min-h-[500px]">
        
        {/* CONTROLS & FILTER BAR */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* FILTER PILLS */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                filterType === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All ({projectMessages.length})
            </button>
            <button
              onClick={() => setFilterType('announcement')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                filterType === 'announcement' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Announcements</span>
            </button>
            <button
              onClick={() => setFilterType('question')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                filterType === 'question' ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Q&A</span>
            </button>
            <button
              onClick={() => setFilterType('item_reference')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                filterType === 'item_reference' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5 text-purple-400" />
              <span>Board Links</span>
            </button>
            <button
              onClick={() => setFilterType('pinned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                filterType === 'pinned' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Pin className="w-3.5 h-3.5 text-rose-400" />
              <span>Pinned ({pinnedMessages.length})</span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative min-w-[200px] sm:max-w-[260px] shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chat..."
              value={chatSearch}
              onChange={e => setChatSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-xl outline-none focus:border-indigo-500 transition-colors"
            />
            {chatSearch && (
              <button
                onClick={() => setChatSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* MESSAGES STREAM AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-w-0">
          {filteredMessages.length === 0 ? (
            <div className="bg-slate-950 p-12 rounded-2xl border border-slate-800 text-center space-y-3 max-w-md mx-auto my-12">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No chat messages found</p>
              <p className="text-xs text-slate-500">
                {chatSearch || filterType !== 'all'
                  ? 'Try clearing search filters or changing category.'
                  : 'Start the discussion by posting an announcement, question, or team update below.'}
              </p>
            </div>
          ) : (
            filteredMessages.map(msg => {
              const isAuthor = msg.userId === currentUser.id;
              const linkedItem = projectItems.find(i => i.id === msg.linkedItemId);

              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl border transition-all min-w-0 ${
                    msg.isPinned
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : msg.type === 'announcement'
                      ? 'bg-amber-950/10 border-amber-500/30'
                      : msg.type === 'question'
                      ? 'bg-cyan-950/10 border-cyan-500/30'
                      : isAuthor
                      ? 'bg-indigo-950/10 border-indigo-500/30'
                      : 'bg-slate-950/80 border-slate-800/80'
                  }`}
                >
                  {/* AUTHOR HEADER */}
                  <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md shrink-0">
                        {msg.userName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-100 truncate">{msg.userName}</span>
                          {msg.userRole === 'pm' && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 shrink-0">
                              PM
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 font-mono shrink-0">
                            {formatTimestamp(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* TYPE BADGES & PIN ACTION */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {msg.type === 'announcement' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1">
                          <Megaphone className="w-3 h-3" />
                          <span>Announcement</span>
                        </span>
                      )}
                      {msg.type === 'question' && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          <span>Q&A</span>
                        </span>
                      )}

                      <button
                        onClick={() => togglePinProjectChatMessage(msg.id)}
                        className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                          msg.isPinned
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                        title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      {(isAuthor || isPM) && (
                        <button
                          onClick={() => deleteProjectChatMessage(msg.id)}
                          className="p-1 rounded-lg bg-slate-900 text-slate-500 border border-slate-800 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* MESSAGE CONTENT TEXT */}
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words mb-2 min-w-0 overflow-hidden pl-10">
                    {msg.content}
                  </p>

                  {/* ATTACHED BOARD ITEM CARD */}
                  {(msg.linkedItemId || msg.linkedItemTitle) && (
                    <div className="ml-10 my-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {msg.linkedItemTitle || linkedItem?.title || 'Attached Board Item'}
                        </span>
                      </div>
                      {linkedItem && (
                        <button
                          onClick={() => setViewingBoardItem(linkedItem)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        >
                          <span>View Item</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* REACTION EMOJIS & PICKER */}
                  <div className="ml-10 flex items-center gap-1.5 flex-wrap pt-1.5">
                    {emojis.map(emoji => {
                      const count = msg.reactions?.[emoji]?.length || 0;
                      const userReacted = msg.reactions?.[emoji]?.includes(currentUser.id);

                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleProjectChatMessageReaction(msg.id, emoji)}
                          className={`px-2.5 py-1 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                            userReacted
                              ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50 shadow-sm font-semibold'
                              : count > 0
                              ? 'bg-slate-900 text-slate-200 border-slate-700/80 hover:bg-slate-800 shadow-sm'
                              : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/80'
                          }`}
                        >
                          <span className="text-sm leading-none">{emoji}</span>
                          {count > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                              userReacted ? 'bg-indigo-500/40 text-indigo-200' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* COMPOSER FORM BAR */}
        <form onSubmit={handleSend} className="p-3.5 border-t border-slate-800/80 bg-slate-950/90 space-y-2.5 min-w-0 shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
            {/* MESSAGE TYPE SELECTOR */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 max-w-full overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setMsgType('chat')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  msgType === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💬 Chat
              </button>
              <button
                type="button"
                onClick={() => setMsgType('announcement')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  msgType === 'announcement' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📢 Announcement
              </button>
              <button
                type="button"
                onClick={() => setMsgType('question')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  msgType === 'question' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ❓ Question
              </button>
            </div>

            {/* ATTACH BOARD ITEM SELECTOR */}
            {projectItems.length > 0 && (
              <select
                value={linkedItemId}
                onChange={e => setLinkedItemId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl outline-none cursor-pointer focus:border-indigo-500 max-w-full sm:max-w-[240px] truncate"
              >
                <option value="">🔗 Attach Board Item (Optional)</option>
                {projectItems.map(i => (
                  <option key={i.id} value={i.id}>
                    [{i.type.toUpperCase()}] {i.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* TEXT INPUT + SEND BUTTON */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              placeholder={
                msgType === 'announcement'
                  ? 'Type team announcement...'
                  : msgType === 'question'
                  ? 'Ask a question about this project...'
                  : 'Type message or update...'
              }
              value={inputContent}
              onChange={e => setInputContent(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
            />

            <button
              type="submit"
              disabled={!inputContent.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>

      {/* ATTACHED BOARD ITEM DETAIL MODAL */}
      {viewingBoardItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase border border-indigo-500/30">
                  {viewingBoardItem.type}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{viewingBoardItem.title}</h3>
              </div>
              <button
                onClick={() => setViewingBoardItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              {viewingBoardItem.content && (
                <div
                  className="prose prose-invert max-w-none text-xs bg-slate-950 p-3 rounded-xl border border-slate-800"
                  dangerouslySetInnerHTML={{ __html: viewingBoardItem.content }}
                />
              )}

              {viewingBoardItem.url && (
                <a
                  href={viewingBoardItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1.5 font-semibold"
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{viewingBoardItem.url}</span>
                </a>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              {onNavigate && (
                <button
                  onClick={() => {
                    setViewingBoardItem(null);
                    onNavigate('project_board');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Go to Project Board</span>
                </button>
              )}
              <button
                onClick={() => setViewingBoardItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
