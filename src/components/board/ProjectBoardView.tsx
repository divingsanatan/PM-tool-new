import React, { useState, useMemo, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ProjectBoardItem, ProjectBoardCategory, BoardItemType, BoardItemComment, ProjectChatMessage, ViewMode } from '../../types';
import { SwipeableCard, SwipeGestureGuideBanner } from '../common/SwipeableCard';
import { EmptyState } from '../common/EmptyState';
import { triggerHaptic } from '../../utils/haptics';
import {
  FolderKanban,
  Plus,
  Search,
  Tag,
  Pin,
  Copy,
  Check,
  ExternalLink,
  Download,
  Edit,
  Trash2,
  FileText,
  Link2,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  File as FileIcon,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Quote,
  Palette,
  Type,
  Eye,
  Code2,
  X,
  Lock,
  User,
  Calendar,
  Sparkles,
  Layers,
  FilePlus,
  Link as LinkIcon,
  StickyNote,
  AlertCircle,
  MessageSquare,
  Send,
  MessageCircle,
  Megaphone,
  HelpCircle,
  Share2,
  MessagesSquare,
  CornerDownRight,
  ThumbsUp,
  Flame,
  Heart,
  Smile,
  Columns,
  Grid,
  Filter,
  ArrowRight
} from 'lucide-react';

interface ProjectBoardViewProps {
  onNavigate?: (view: ViewMode) => void;
}

export const ProjectBoardView: React.FC<ProjectBoardViewProps> = ({ onNavigate }) => {
  const {
    projectData,
    activeProjectId,
    currentUser,
    saveBoardCategory,
    deleteBoardCategory,
    saveBoardItem,
    deleteBoardItem,
    togglePinBoardItem,
    addBoardItemComment,
    deleteBoardItemComment,
    toggleBoardItemCommentReaction,
    addProjectChatMessage,
    deleteProjectChatMessage,
    toggleProjectChatMessageReaction,
    togglePinProjectChatMessage
  } = useProject();

  const isPM = currentUser.role === 'pm' || currentUser.role === 'admin';

  // Filtering for Board Items
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | BoardItemType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'pinned' | 'newest' | 'oldest' | 'title'>('pinned');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [modalItemType, setModalItemType] = useState<BoardItemType>('note');
  const [editingItem, setEditingItem] = useState<ProjectBoardItem | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectBoardCategory | null>(null);

  const [viewingItem, setViewingItem] = useState<ProjectBoardItem | null>(null);

  // Copy toast state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Categories for active project
  const projectCategories = useMemo(() => {
    return (projectData.boardCategories || []).filter(c => c.projectId === activeProjectId);
  }, [projectData.boardCategories, activeProjectId]);

  // Board items for active project
  const projectItems = useMemo(() => {
    return (projectData.boardItems || []).filter(i => i.projectId === activeProjectId);
  }, [projectData.boardItems, activeProjectId]);

  // Board chat messages for active project
  const projectMessages = useMemo(() => {
    return (projectData.boardMessages || []).filter(m => m.projectId === activeProjectId);
  }, [projectData.boardMessages, activeProjectId]);

  // All unique tags across project board items
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    projectItems.forEach(item => {
      item.tags?.forEach(t => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [projectItems]);

  // Filter & Sort board items
  const filteredItems = useMemo(() => {
    return projectItems.filter(item => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'uncategorized') {
          if (item.categoryId) return false;
        } else if (item.categoryId !== selectedCategory) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }

      // Tag filter
      if (selectedTag !== 'all' && !item.tags?.includes(selectedTag)) {
        return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesContent = item.content.toLowerCase().includes(q);
        const matchesAuthor = item.createdByName.toLowerCase().includes(q);
        const matchesFileName = item.fileName?.toLowerCase().includes(q);
        const matchesTags = item.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesAuthor && !matchesFileName && !matchesTags) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'pinned') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [projectItems, selectedCategory, selectedType, selectedTag, searchQuery, sortBy]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const canEditItem = (item: ProjectBoardItem) => {
    return isPM || item.createdBy === currentUser.id || item.createdByEmail === currentUser.email;
  };

  const getItemColorBadge = (colorName?: string) => {
    switch (colorName) {
      case 'purple': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'teal': return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
      case 'amber': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'rose': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'emerald': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default: return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
    }
  };

  const getCategoryDotColor = (colorName?: string) => {
    switch (colorName) {
      case 'purple': return 'bg-purple-400';
      case 'teal': return 'bg-teal-400';
      case 'amber': return 'bg-amber-400';
      case 'rose': return 'bg-rose-400';
      case 'emerald': return 'bg-emerald-400';
      case 'blue': return 'bg-blue-400';
      default: return 'bg-indigo-400';
    }
  };

  const getFileIcon = (fileType?: string) => {
    const ft = (fileType || '').toLowerCase();
    if (ft.includes('pdf')) return <FileText className="w-5 h-5 text-rose-400" />;
    if (ft.includes('doc') || ft.includes('word')) return <FileText className="w-5 h-5 text-blue-400" />;
    if (ft.includes('xls') || ft.includes('csv') || ft.includes('sheet')) return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    if (ft.includes('png') || ft.includes('jpg') || ft.includes('svg') || ft.includes('img')) return <FileImage className="w-5 h-5 text-purple-400" />;
    if (ft.includes('zip') || ft.includes('tar') || ft.includes('rar')) return <FileArchive className="w-5 h-5 text-amber-400" />;
    if (ft.includes('sql') || ft.includes('json') || ft.includes('js') || ft.includes('ts') || ft.includes('code')) return <FileCode className="w-5 h-5 text-cyan-400" />;
    return <FileIcon className="w-5 h-5 text-indigo-400" />;
  };

  const openCreateModal = (type: BoardItemType) => {
    triggerHaptic('light');
    setModalItemType(type);
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: ProjectBoardItem) => {
    triggerHaptic('light');
    setModalItemType(item.type);
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleShareCardToChat = (item: ProjectBoardItem) => {
    triggerHaptic('selection');
    addProjectChatMessage({
      content: `📌 Shared board item: "${item.title}". Check out this ${item.type.toUpperCase()} on the Project Board!`,
      type: 'item_reference',
      linkedItemId: item.id,
      linkedItemTitle: item.title
    });
    // Open chat view
    if (onNavigate) onNavigate('chat');
  };

  // Sync viewingItem if comments/edits change
  const currentViewingItem = useMemo(() => {
    if (!viewingItem) return null;
    return projectItems.find(i => i.id === viewingItem.id) || viewingItem;
  }, [viewingItem, projectItems]);

  return (
    <div id="project-board-view" className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">Project Board & Team Hub</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {projectData.projectCode}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Shared knowledge base and real-time communication hub. Store specs, design links, and assets while keeping team discussions in one place.
                </p>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => openCreateModal('note')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <StickyNote className="w-4 h-4" />
              <span>+ Note</span>
            </button>

            <button
              onClick={() => openCreateModal('link')}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
            >
              <LinkIcon className="w-4 h-4" />
              <span>+ Link</span>
            </button>

            <button
              onClick={() => openCreateModal('file')}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-teal-600/20 transition-all cursor-pointer"
            >
              <FilePlus className="w-4 h-4" />
              <span>+ File</span>
            </button>

            {isPM && (
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Manage categories for this project"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Categories</span>
              </button>
            )}
          </div>
        </div>

        {/* HEADER TOOLBAR & CHAT LINK */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Grid className="w-3.5 h-3.5 text-indigo-400" />
              <span>Knowledge Board ({projectItems.length} items)</span>
            </span>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('chat')}
              className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              title="Open full-screen Team Chat & Discussion"
            >
              <MessagesSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Open Team Chat ({projectMessages.length})</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          )}
        </div>

        {/* CATEGORY NAV / PILLS */}
        <div className="mt-4 flex flex-wrap items-center gap-2 max-w-full min-w-0">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider mr-1 shrink-0">Category:</span>
            
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950/90 text-slate-200 hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <span className="whitespace-nowrap">All Items</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                selectedCategory === 'all' ? 'bg-indigo-500/40 text-white' : 'bg-slate-900 text-slate-300 border border-slate-800'
              }`}>
                {projectItems.length}
              </span>
            </button>

            {projectCategories.map(cat => {
              const count = projectItems.filter(i => i.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950/90 text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${getCategoryDotColor(cat.color)} shrink-0`} />
                  <span className="whitespace-nowrap">{cat.name}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold shrink-0 ${
                    isSelected ? 'bg-indigo-500/40 text-white' : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                selectedCategory === 'uncategorized'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950/90 text-slate-200 hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span className="whitespace-nowrap">Uncategorized</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold shrink-0 ${
                selectedCategory === 'uncategorized' ? 'bg-indigo-500/40 text-white' : 'bg-slate-900 text-slate-300 border border-slate-800'
              }`}>
                {projectItems.filter(i => !i.categoryId).length}
              </span>
            </button>
          </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex flex-col xl:flex-row xl:items-center justify-between gap-3 min-w-0">
          {/* TYPE TABS */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 max-w-full min-w-0">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                selectedType === 'all'
                  ? 'bg-slate-800 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedType('note')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                selectedType === 'note'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Notes ({projectItems.filter(i => i.type === 'note').length})</span>
            </button>
            <button
              onClick={() => setSelectedType('link')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                selectedType === 'link'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Links ({projectItems.filter(i => i.type === 'link').length})</span>
            </button>
            <button
              onClick={() => setSelectedType('file')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                selectedType === 'file'
                  ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FilePlus className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Files ({projectItems.filter(i => i.type === 'file').length})</span>
            </button>
          </div>

          {/* SEARCH AND TAG FILTER */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full xl:w-auto min-w-0">
            {/* SEARCH INPUT */}
            <div className="relative flex-1 min-w-[150px] sm:min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
              <input
                type="text"
                placeholder="Search title, tags, content..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* TAG FILTER */}
            {allTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                className="bg-slate-950 border border-slate-800/80 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl outline-none cursor-pointer focus:border-indigo-500 shrink-0 min-w-0 max-w-[140px] sm:max-w-none truncate"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            )}

            {/* SORT BY */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800/80 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl outline-none cursor-pointer focus:border-indigo-500 shrink-0 min-w-0 max-w-[140px] sm:max-w-none truncate"
            >
              <option value="pinned">📌 Pinned First</option>
              <option value="newest">🕒 Newest First</option>
              <option value="oldest">📅 Oldest First</option>
              <option value="title">🔤 Title A-Z</option>
            </select>
          </div>
        </div>

      {/* MAIN BOARD CONTENT DISPLAY AREA */}
      <div className="space-y-4">
        <SwipeGestureGuideBanner
          storageKey="pmo_board_items_swipe_hint"
          rightActionText="Toggle Pin / Favorite"
          leftActionText="Edit / View Details"
        />

        {filteredItems.length === 0 ? (
          <EmptyState
            preset={searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || selectedTag !== 'all' ? 'search' : 'folder'}
            icon={FolderKanban}
            title={
              searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || selectedTag !== 'all'
                ? 'No matching board items'
                : 'Project board is empty'
            }
            description={
              searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || selectedTag !== 'all'
                ? 'Try clearing your search query or choosing a different category to reveal board items.'
                : 'Add rich Markdown notes, reference links, and attached files to build your central project knowledge base.'
            }
            action={{
              label: 'Create Note',
              onClick: () => openCreateModal('note'),
              icon: StickyNote,
              variant: 'primary'
            }}
            secondaryAction={
              searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || selectedTag !== 'all'
                ? {
                    label: 'Clear Filters',
                    onClick: () => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedType('all');
                      setSelectedTag('all');
                    }
                  }
                : {
                    label: 'Add Link',
                    onClick: () => openCreateModal('link'),
                    icon: LinkIcon
                  }
            }
          />
        ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item, idx) => {
                  const canEdit = canEditItem(item);
                  const category = projectCategories.find(c => c.id === item.categoryId);
                  const commentsCount = item.comments?.length || 0;

                  return (
                    <SwipeableCard
                      key={item.id}
                      onSwipeRight={() => {
                        togglePinBoardItem(item.id);
                      }}
                      onSwipeLeft={() => {
                        if (canEdit) {
                          openEditModal(item);
                        } else {
                          setViewingItem(item);
                        }
                      }}
                      swipeRightLabel={item.isPinned ? 'Unpin' : 'Pin Item'}
                      swipeLeftLabel={canEdit ? 'Edit Item' : 'View Item'}
                      isCompleted={item.isPinned}
                      showFirstTimeHint={idx === 0}
                      hintStorageKey="pmo_board_items_swipe_hint"
                    >
                    <div
                      className={`group bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/90 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition-all duration-200 relative min-w-0 overflow-hidden h-full ${
                        item.isPinned ? 'ring-1 ring-amber-500/40 bg-gradient-to-b from-slate-900 to-slate-950' : ''
                      }`}
                    >
                      {/* CARD TOP BADGES & ACTIONS */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                            {/* TYPE BADGE */}
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border shrink-0 ${
                              item.type === 'note'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                : item.type === 'link'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                            }`}>
                              {item.type === 'note' && <StickyNote className="w-3 h-3 shrink-0" />}
                              {item.type === 'link' && <LinkIcon className="w-3 h-3 shrink-0" />}
                              {item.type === 'file' && <FilePlus className="w-3 h-3 shrink-0" />}
                              <span className="whitespace-nowrap">{item.type}</span>
                            </span>

                            {/* CATEGORY BADGE */}
                            {category && (
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border truncate max-w-[120px] sm:max-w-[160px] shrink-0 ${getItemColorBadge(category.color)}`}
                                title={category.name}
                              >
                                {category.name}
                              </span>
                            )}

                            {/* PINNED INDICATOR */}
                            {item.isPinned && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                                <Pin className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                                <span className="whitespace-nowrap">Pinned</span>
                              </span>
                            )}
                          </div>

                          {/* TOP ACTION BUTTONS */}
                          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
                            {/* SHARE TO CHAT */}
                            <button
                              onClick={() => handleShareCardToChat(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                              title="Share this item to Team Chat"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* PIN TOGGLE (PM or Owner) */}
                            {(isPM || canEdit) && (
                              <button
                                onClick={() => togglePinBoardItem(item.id)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  item.isPinned
                                    ? 'text-amber-400 hover:bg-amber-500/20'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}
                                title={item.isPinned ? 'Unpin item' : 'Pin to top of board'}
                              >
                                <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'fill-amber-400' : ''}`} />
                              </button>
                            )}

                            {/* EDIT (PM or Creator) */}
                            {canEdit ? (
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                                title="Edit item"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span title="Read-only: Editable by author or PM" className="p-1.5 text-slate-600">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )}

                            {/* DELETE (PM or Creator) */}
                            {canEdit && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete "${item.title}" from Project Board?`)) {
                                    deleteBoardItem(item.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title="Delete item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ITEM TITLE */}
                        <h3
                          onClick={() => setViewingItem(item)}
                          className="font-bold text-base text-slate-100 hover:text-indigo-300 cursor-pointer transition-colors leading-snug line-clamp-2 mb-2"
                        >
                          {item.title}
                        </h3>

                        {/* ITEM CONTENT PREVIEW */}
                        {item.type === 'note' && (
                          <div
                            onClick={() => setViewingItem(item)}
                            className="text-xs text-slate-300 line-clamp-3 leading-relaxed cursor-pointer bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 mb-3 hover:border-slate-700 transition-colors overflow-hidden break-words min-w-0"
                            dangerouslySetInnerHTML={{ __html: item.content }}
                          />
                        )}

                        {item.type === 'link' && (
                          <div className="space-y-2.5 mb-3 min-w-0">
                            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed break-words">
                              {item.content}
                            </p>
                            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-purple-500/20 flex items-center justify-between gap-2 min-w-0">
                              <div className="flex items-center gap-2 overflow-hidden text-purple-300 text-xs font-mono truncate min-w-0 flex-1">
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                                <span className="truncate min-w-0">{item.url}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleCopy(item.url || '', `url-${item.id}`)}
                                  className="p-1 text-slate-400 hover:text-purple-300 hover:bg-purple-500/20 rounded cursor-pointer transition-colors"
                                  title="Copy Link URL"
                                >
                                  {copiedId === `url-${item.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-purple-400 hover:text-purple-200 hover:bg-purple-500/20 rounded transition-colors"
                                  title="Open Link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {item.type === 'file' && (
                          <div className="space-y-2.5 mb-3">
                            <div className="bg-slate-950/80 p-3 rounded-xl border border-teal-500/20 flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 shrink-0">
                                {getFileIcon(item.fileType)}
                              </div>
                              <div className="overflow-hidden flex-1">
                                <p className="text-xs font-semibold text-slate-200 truncate">{item.fileName || item.title}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                  {item.fileSize && <span>{item.fileSize}</span>}
                                  {item.fileType && <span className="uppercase text-teal-400">{item.fileType}</span>}
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {item.content}
                            </p>
                          </div>
                        )}

                        {/* TAGS */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.tags.map(tag => (
                              <span
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className="px-2 py-0.5 bg-slate-950 text-slate-400 hover:text-indigo-300 border border-slate-800 rounded-md text-[10px] font-mono cursor-pointer transition-colors"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* CARD FOOTER: CREATOR, COMMENTS & ACTIONS */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2 overflow-hidden" title={`Created by ${item.createdByName} (${item.createdByEmail})`}>
                          <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-[10px] font-bold text-indigo-300 shrink-0">
                            {item.createdByName?.charAt(0) || 'U'}
                          </div>
                          <span className="truncate text-slate-300 text-[11px] font-medium">{item.createdByName}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* COMMENTS BUTTON */}
                          <button
                            onClick={() => setViewingItem(item)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer border ${
                              commentsCount > 0
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30'
                                : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                            title="View discussion thread on this card"
                          >
                            <MessageCircle className="w-3 h-3 text-indigo-400" />
                            <span>{commentsCount}</span>
                          </button>

                          {/* COPY CONTENT / LINK BUTTON */}
                          <button
                            onClick={() => {
                              const copyText = item.type === 'link' ? (item.url || '') : item.content;
                              handleCopy(copyText, `content-${item.id}`);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title={item.type === 'link' ? 'Copy URL' : 'Copy Content'}
                          >
                            {copiedId === `content-${item.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>

                          {/* VIEW FULL DETAILS */}
                          <button
                            onClick={() => setViewingItem(item)}
                            className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    </SwipeableCard>
                  );
                })}
              </div>
            )}
      </div>

      {/* VIEW BOARD ITEM DETAILS & COMMENT THREAD MODAL */}
      {currentViewingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className={`p-2 rounded-xl border ${
                  currentViewingItem.type === 'note' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                  currentViewingItem.type === 'link' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                  'bg-teal-500/20 text-teal-300 border-teal-500/30'
                }`}>
                  {currentViewingItem.type === 'note' && <StickyNote className="w-5 h-5" />}
                  {currentViewingItem.type === 'link' && <LinkIcon className="w-5 h-5" />}
                  {currentViewingItem.type === 'file' && <FilePlus className="w-5 h-5" />}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 line-clamp-1">{currentViewingItem.title}</h2>
                  <p className="text-xs text-slate-400">
                    Created by {currentViewingItem.createdByName} on {new Date(currentViewingItem.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShareCardToChat(currentViewingItem)}
                  className="px-3 py-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Post reference link to Team Chat"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share to Chat</span>
                </button>

                <button
                  onClick={() => setViewingItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CONTENT VIEWER BODY */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {currentViewingItem.type === 'note' && (
                <div
                  className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-slate-200 text-sm leading-relaxed prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentViewingItem.content }}
                />
              )}

              {currentViewingItem.type === 'link' && (
                <div className="space-y-3">
                  <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-2">
                    <p className="text-xs text-slate-400 font-mono">Target Link URL:</p>
                    <a
                      href={currentViewingItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-300 hover:text-purple-200 font-mono text-sm underline flex items-center gap-1.5 break-all"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0 text-purple-400" />
                      <span>{currentViewingItem.url}</span>
                    </a>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <p className="font-semibold text-slate-400 mb-1">Link Description & Notes:</p>
                    {currentViewingItem.content}
                  </div>
                </div>
              )}

              {currentViewingItem.type === 'file' && (
                <div className="space-y-3">
                  <div className="bg-slate-950 p-4 rounded-xl border border-teal-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/30">
                        {getFileIcon(currentViewingItem.fileType)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{currentViewingItem.fileName || currentViewingItem.title}</p>
                        <p className="text-xs text-slate-400 font-mono">{currentViewingItem.fileSize} • {currentViewingItem.fileType}</p>
                      </div>
                    </div>
                    {currentViewingItem.url && (
                      <a
                        href={currentViewingItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <p className="font-semibold text-slate-400 mb-1">File Preview / Notes:</p>
                    {currentViewingItem.content}
                  </div>
                </div>
              )}

              {/* TAGS */}
              {currentViewingItem.tags && currentViewingItem.tags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400">Tags:</span>
                  {currentViewingItem.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded text-xs font-mono">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* ITEM SPECIFIC DISCUSSION COMMENTS THREAD */}
              <div className="pt-4 border-t border-slate-800">
                <ItemCommentsSection
                  item={currentViewingItem}
                  currentUser={currentUser}
                  onAddComment={async (content) => {
                    await addBoardItemComment(currentViewingItem.id, content);
                  }}
                  onDeleteComment={async (commentId) => {
                    await deleteBoardItemComment(currentViewingItem.id, commentId);
                  }}
                  onToggleReaction={async (commentId, emoji) => {
                    await toggleBoardItemCommentReaction(currentViewingItem.id, commentId, emoji);
                  }}
                />
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  const copyText = currentViewingItem.type === 'link' ? (currentViewingItem.url || '') : currentViewingItem.content;
                  handleCopy(copyText, `modal-copy-${currentViewingItem.id}`);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedId === `modal-copy-${currentViewingItem.id}` ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copy Content</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {canEditItem(currentViewingItem) && (
                  <button
                    onClick={() => {
                      const itemToEdit = currentViewingItem;
                      setViewingItem(null);
                      openEditModal(itemToEdit);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Item</span>
                  </button>
                )}
                <button
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ITEM MODAL */}
      {isItemModalOpen && (
        <ItemEditorModal
          isOpen={isItemModalOpen}
          itemType={modalItemType}
          initialItem={editingItem}
          categories={projectCategories}
          activeProjectId={activeProjectId}
          currentUser={currentUser}
          onClose={() => setIsItemModalOpen(false)}
          onSave={async (itemData) => {
            await saveBoardItem(itemData);
            setIsItemModalOpen(false);
          }}
        />
      )}

      {/* CATEGORY MANAGER MODAL (PM Only) */}
      {isCategoryModalOpen && isPM && (
        <CategoryManagerModal
          isOpen={isCategoryModalOpen}
          categories={projectCategories}
          activeProjectId={activeProjectId}
          onClose={() => setIsCategoryModalOpen(false)}
          onSaveCategory={async (catData) => {
            await saveBoardCategory(catData);
          }}
          onDeleteCategory={async (catId) => {
            await deleteBoardCategory(catId);
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// ITEM COMMENTS THREAD COMPONENT (INSIDE DETAIL MODAL)
// ==========================================
interface ItemCommentsSectionProps {
  item: ProjectBoardItem;
  currentUser: any;
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onToggleReaction: (commentId: string, emoji: string) => Promise<void>;
}

const ItemCommentsSection: React.FC<ItemCommentsSectionProps> = ({
  item,
  currentUser,
  onAddComment,
  onDeleteComment,
  onToggleReaction
}) => {
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comments = item.comments || [];
  const emojis = ['👍', '🚀', '❤️', '💡', '❓'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await onAddComment(commentInput.trim());
    setCommentInput('');
    setIsSubmitting(false);
  };

  const addEmojiToInput = (emoji: string) => {
    setCommentInput(prev => prev + ' ' + emoji);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span>Card Comments & Feedback ({comments.length})</span>
        </h3>
        <span className="text-xs text-slate-400">All responses stay attached to this card</span>
      </div>

      {/* COMMENTS LIST */}
      {comments.length === 0 ? (
        <EmptyState
          size="sm"
          preset="chat"
          title="No comments yet"
          description="Be the first to post a question, update, or feedback on this board item!"
        />
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {comments.map(comment => {
            const isOwner = comment.userId === currentUser.id || comment.userEmail === currentUser.email || currentUser.role === 'pm';
            
            return (
              <div key={comment.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {comment.userAvatar ? (
                      <img src={comment.userAvatar} alt={comment.userName} className="w-6 h-6 rounded-full object-cover border border-slate-700" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center border border-indigo-500/40">
                        {comment.userName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">{comment.userName}</span>
                        {comment.userRole && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-indigo-300">
                            {comment.userRole}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => onDeleteComment(comment.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap pl-8">
                  {comment.content}
                </p>

                {/* REACTION PILLS & PICKER */}
                <div className="pl-8 flex flex-wrap items-center gap-1.5 pt-1">
                  {emojis.map(emoji => {
                    const users = comment.reactions?.[emoji] || [];
                    const hasReacted = users.includes(currentUser.name);
                    return (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(comment.id, emoji)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border ${
                          hasReacted
                            ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50'
                            : users.length > 0
                            ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-900/40 text-slate-500 border-slate-800/40 hover:text-slate-300 hover:border-slate-700'
                        }`}
                        title={users.length > 0 ? `Reacted by: ${users.join(', ')}` : `Add ${emoji}`}
                      >
                        <span>{emoji}</span>
                        {users.length > 0 && <span className="text-[10px] font-bold">{users.length}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD COMMENT FORM */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <textarea
            rows={2}
            placeholder="Write a comment or request feedback on this card..."
            value={commentInput}
            onChange={e => setCommentInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 mr-1">Quick emoji:</span>
            {emojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmojiToInput(emoji)}
                className="p-1 hover:bg-slate-800 rounded text-xs transition-colors cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!commentInput.trim() || isSubmitting}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Comment</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// TEAM CHAT & ACTIVITY STREAM VIEW COMPONENT
// ==========================================
interface TeamChatViewProps {
  projectMessages: ProjectChatMessage[];
  projectItems: ProjectBoardItem[];
  currentUser: any;
  onSendMessage: (msg: Partial<ProjectChatMessage>) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  onTogglePin: (messageId: string) => Promise<void>;
  onViewBoardItem: (itemId: string) => void;
}

const TeamChatView: React.FC<TeamChatViewProps> = ({
  projectMessages,
  projectItems,
  currentUser,
  onSendMessage,
  onDeleteMessage,
  onToggleReaction,
  onTogglePin,
  onViewBoardItem
}) => {
  const [filterType, setFilterType] = useState<'all' | 'announcement' | 'question' | 'item_reference' | 'pinned'>('all');
  const [chatSearch, setChatSearch] = useState('');
  const [inputContent, setInputContent] = useState('');
  const [msgType, setMsgType] = useState<'chat' | 'announcement' | 'question'>('chat');
  const [linkedItemId, setLinkedItemId] = useState<string>('');

  const emojis = ['👍', '🚀', '❤️', '💡', '🎉', '❓'];

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    const linkedItem = projectItems.find(i => i.id === linkedItemId);

    await onSendMessage({
      content: inputContent.trim(),
      type: linkedItemId ? 'item_reference' : msgType,
      linkedItemId: linkedItemId || undefined,
      linkedItemTitle: linkedItem?.title
    });

    setInputContent('');
    setLinkedItemId('');
    setMsgType('chat');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col space-y-3 max-w-full min-w-0 overflow-hidden h-full">
      {/* CHAT HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl shrink-0">
            <MessagesSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-100 truncate">Project Team Discussion</h2>
            <p className="text-xs text-slate-400 truncate">Live conversation feed attached directly to this project</p>
          </div>
        </div>

        {/* SEARCH MESSAGES */}
        <div className="relative shrink-0 w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search chat..."
            value={chatSearch}
            onChange={e => setChatSearch(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 sm:py-1 text-xs text-slate-200 outline-none focus:border-indigo-500 w-full sm:w-44"
          />
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap items-center gap-1.5 max-w-full min-w-0 shrink-0">
        <button
          onClick={() => setFilterType('all')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({projectMessages.length})
        </button>
        <button
          onClick={() => setFilterType('announcement')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            filterType === 'announcement' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Announcements</span>
        </button>
        <button
          onClick={() => setFilterType('question')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            filterType === 'question' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3 h-3 text-cyan-400 shrink-0" />
          <span>Q&A</span>
        </button>
        <button
          onClick={() => setFilterType('item_reference')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            filterType === 'item_reference' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Share2 className="w-3 h-3 text-purple-400 shrink-0" />
          <span>Board Links</span>
        </button>
        <button
          onClick={() => setFilterType('pinned')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            filterType === 'pinned' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Pin className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Pinned ({projectMessages.filter(m => m.isPinned).length})</span>
        </button>
      </div>

      {/* MESSAGES STREAM LIST */}
      <div className="space-y-3 flex-1 min-h-[220px] overflow-y-auto pr-1 min-w-0 my-1">
        {filteredMessages.length === 0 ? (
          <EmptyState
            preset="chat"
            title={filterType === 'pinned' ? 'No pinned messages' : filterType === 'announcements' ? 'No announcements yet' : 'No messages found'}
            description={
              filterType === 'pinned'
                ? 'Pin important messages and discussion items to keep them visible at the top.'
                : 'Post a general message, announcement, or question below to start the conversation!'
            }
          />
        ) : (
          filteredMessages.map(msg => {
            const isOwner = msg.userId === currentUser.id || msg.userEmail === currentUser.email || currentUser.role === 'pm';
            const linkedItem = projectItems.find(i => i.id === msg.linkedItemId);

            return (
              <div
                key={msg.id}
                className={`p-4 rounded-xl border transition-all ${
                  msg.isPinned
                    ? 'bg-amber-500/10 border-amber-500/30 shadow'
                    : msg.type === 'announcement'
                    ? 'bg-indigo-950/40 border-indigo-500/30'
                    : msg.type === 'question'
                    ? 'bg-cyan-950/40 border-cyan-500/30'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                {/* MESSAGE AUTHOR HEADER */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {msg.userAvatar ? (
                      <img src={msg.userAvatar} alt={msg.userName} className="w-7 h-7 rounded-full object-cover border border-slate-700" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center border border-indigo-500/40">
                        {msg.userName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-100">{msg.userName}</span>
                        {msg.userRole && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-indigo-300">
                            {msg.userRole}
                          </span>
                        )}
                        {msg.type === 'announcement' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Megaphone className="w-2.5 h-2.5" />
                            <span>ANNOUNCEMENT</span>
                          </span>
                        )}
                        {msg.type === 'question' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                            <HelpCircle className="w-2.5 h-2.5" />
                            <span>QUESTION</span>
                          </span>
                        )}
                        {msg.isPinned && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            <span>Pinned</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* MESSAGE TOP ACTIONS */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onTogglePin(msg.id)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        msg.isPinned ? 'text-amber-400 hover:bg-amber-500/20' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800'
                      }`}
                      title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {isOwner && (
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="p-1 text-slate-600 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* MESSAGE CONTENT */}
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words mb-2 min-w-0 overflow-hidden">
                  {msg.content}
                </p>

                {/* LINKED BOARD ITEM PREVIEW CARD */}
                {(msg.linkedItemId || msg.linkedItemTitle) && (
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-indigo-500/30 mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Share2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-xs font-semibold text-indigo-300 truncate">
                        {msg.linkedItemTitle || linkedItem?.title || 'Referenced Board Item'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (msg.linkedItemId) onViewBoardItem(msg.linkedItemId);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View Card</span>
                    </button>
                  </div>
                )}

                {/* EMOJI REACTIONS */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {emojis.map(emoji => {
                    const users = msg.reactions?.[emoji] || [];
                    const hasReacted = users.includes(currentUser.name);
                    return (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(msg.id, emoji)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border ${
                          hasReacted
                            ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50'
                            : users.length > 0
                            ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-900/40 text-slate-500 border-slate-800/40 hover:text-slate-300 hover:border-slate-700'
                        }`}
                        title={users.length > 0 ? `Reacted by: ${users.join(', ')}` : `Add ${emoji}`}
                      >
                        <span>{emoji}</span>
                        {users.length > 0 && <span className="text-[10px] font-bold">{users.length}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* COMPOSER BAR */}
      <form onSubmit={handleSend} className="space-y-2 pt-2 border-t border-slate-800 min-w-0 shrink-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* TYPE SELECTOR */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 max-w-full overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setMsgType('chat')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                msgType === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💬 Chat
            </button>
            <button
              type="button"
              onClick={() => setMsgType('announcement')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                msgType === 'announcement' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📢 Announcement
            </button>
            <button
              type="button"
              onClick={() => setMsgType('question')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                msgType === 'question' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ❓ Question
            </button>
          </div>

          {/* LINK TO BOARD ITEM DROPDOWN */}
          {projectItems.length > 0 && (
            <select
              value={linkedItemId}
              onChange={e => setLinkedItemId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl outline-none cursor-pointer focus:border-indigo-500 max-w-full sm:max-w-[220px] truncate"
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

        <div className="flex items-center gap-2">
          <input
            type="text"
            required
            placeholder={
              msgType === 'announcement'
                ? 'Type team announcement...'
                : msgType === 'question'
                ? 'Ask a question about this project...'
                : 'Type team message or update...'
            }
            value={inputContent}
            onChange={e => setInputContent(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputContent.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// ITEM EDITOR MODAL COMPONENT (RICH TEXT NOTE, LINK, FILE)
// ==========================================
interface ItemEditorModalProps {
  isOpen: boolean;
  itemType: BoardItemType;
  initialItem: ProjectBoardItem | null;
  categories: ProjectBoardCategory[];
  activeProjectId: string;
  currentUser: any;
  onClose: () => void;
  onSave: (item: Partial<ProjectBoardItem>) => Promise<void>;
}

const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  itemType,
  initialItem,
  categories,
  activeProjectId,
  currentUser,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(initialItem?.title || '');
  const [categoryId, setCategoryId] = useState(initialItem?.categoryId || '');
  const [content, setContent] = useState(initialItem?.content || '');
  const [url, setUrl] = useState(initialItem?.url || '');
  const [fileName, setFileName] = useState(initialItem?.fileName || '');
  const [fileSize, setFileSize] = useState(initialItem?.fileSize || '');
  const [fileType, setFileType] = useState(initialItem?.fileType || 'PDF');
  const [color, setColor] = useState(initialItem?.color || 'indigo');
  const [tagsInput, setTagsInput] = useState(initialItem?.tags ? initialItem.tags.join(', ') : '');
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  // Editor ref for inserting HTML tags
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);

    await onSave({
      id: initialItem?.id,
      projectId: activeProjectId,
      categoryId: categoryId || undefined,
      type: itemType,
      title: title.trim(),
      content: content.trim(),
      url: url.trim(),
      fileName: fileName.trim(),
      fileSize: fileSize.trim(),
      fileType: fileType.toUpperCase().trim(),
      color,
      tags: parsedTags,
      createdBy: initialItem?.createdBy || currentUser.id,
      createdByName: initialItem?.createdByName || currentUser.name,
      createdByEmail: initialItem?.createdByEmail || currentUser.email
    });
  };

  // Insert HTML helper for rich text editor toolbar
  const insertHtmlTag = (openTag: string, closeTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${openTag}${selectedText || 'text'}${closeTag}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, end + openTag.length + (selectedText.length || 4));
    }, 50);
  };

  const handleInsertColor = (textColor: string) => {
    insertHtmlTag(`<span style="color: ${textColor};">`, `</span>`);
  };

  const handleInsertBg = (bgColor: string) => {
    insertHtmlTag(`<span style="background-color: ${bgColor}; padding: 2px 4px; border-radius: 4px;">`, `</span>`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              itemType === 'note' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
              itemType === 'link' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
              'bg-teal-500/20 text-teal-300 border-teal-500/30'
            }`}>
              {itemType === 'note' && <StickyNote className="w-5 h-5" />}
              {itemType === 'link' && <LinkIcon className="w-5 h-5" />}
              {itemType === 'file' && <FilePlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {initialItem ? 'Edit Board Item' : `Add New ${itemType === 'note' ? 'Rich Text Note' : itemType === 'link' ? 'Project Link' : 'File Asset'}`}
              </h2>
              <p className="text-xs text-slate-400">
                {itemType === 'note' && 'Create formatted notes with headers, color highlights, and HTML tags.'}
                {itemType === 'link' && 'Save quick links to Figma boards, Grafana metrics, or API endpoints.'}
                {itemType === 'file' && 'Log technical blueprints, schemas, and downloadable files.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TITLE & CATEGORY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-300">Title / Name *</label>
              <input
                type="text"
                required
                placeholder={
                  itemType === 'note' ? 'e.g. EVM System Architecture Blueprint' :
                  itemType === 'link' ? 'e.g. Figma UI Kit & Design Tokens' :
                  'e.g. Platform_Technical_Spec_v2.4.pdf'
                }
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Category</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">General / Uncategorized</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* LINK SPECIFIC FIELDS */}
          {itemType === 'link' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Target URL *</label>
              <input
                type="url"
                required
                placeholder="https://figma.com/file/... or https://grafana.apex.io/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-purple-300 font-mono outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          )}

          {/* FILE SPECIFIC FIELDS */}
          {itemType === 'file' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">File Name</label>
                <input
                  type="text"
                  placeholder="e.g. Schema_Migration_v2.sql"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">File Type / Ext</label>
                <select
                  value={fileType}
                  onChange={e => setFileType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="DOCX">Word / Docx</option>
                  <option value="XLSX">Excel / Spreadsheet</option>
                  <option value="SQL">SQL Script</option>
                  <option value="PNG">Image (PNG/JPG)</option>
                  <option value="ZIP">ZIP Archive</option>
                  <option value="JSON">JSON / Code</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">File Size</label>
                <input
                  type="text"
                  placeholder="e.g. 2.4 MB"
                  value={fileSize}
                  onChange={e => setFileSize(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-teal-500"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Download / Asset URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://assets.apex.io/docs/spec.pdf"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-teal-300 font-mono outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}

          {/* NOTE / DESCRIPTION EDITOR CONTENT */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                {itemType === 'note' ? 'Rich Text Note Content (HTML Supported)' : 'Description / Details'}
              </label>

              {itemType === 'note' && (
                <button
                  type="button"
                  onClick={() => setIsHtmlMode(!isHtmlMode)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  {isHtmlMode ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
                  <span>{isHtmlMode ? 'Visual Preview' : 'Raw HTML Code'}</span>
                </button>
              )}
            </div>

            {/* RICH TEXT TOOLBAR FOR NOTES */}
            {itemType === 'note' && !isHtmlMode && (
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-wrap items-center gap-1.5 text-slate-300">
                <button
                  type="button"
                  onClick={() => insertHtmlTag('<strong>', '</strong>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertHtmlTag('<em>', '</em>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertHtmlTag('<u>', '</u>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertHtmlTag('<s>', '</s>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-[1px] bg-slate-800 my-auto mx-0.5" />

                <button
                  type="button"
                  onClick={() => insertHtmlTag('<h2 style="color: #818cf8; font-size: 18px; font-weight: 700; margin-bottom: 8px;">', '</h2>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Heading 1"
                >
                  <Heading1 className="w-3.5 h-3.5 text-indigo-400" />
                </button>
                <button
                  type="button"
                  onClick={() => insertHtmlTag('<h3 style="color: #94a3b8; font-size: 14px; font-weight: 600; margin-bottom: 6px;">', '33</h2>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Heading 2"
                >
                  <Heading2 className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <div className="h-4 w-[1px] bg-slate-800 my-auto mx-0.5" />

                <button
                  type="button"
                  onClick={() => insertHtmlTag('<ul style="color: #cbd5e1; padding-left: 20px; list-style-type: disc;">\n  <li>', '</li>\n</ul>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertHtmlTag('<ol style="color: #cbd5e1; padding-left: 20px; list-style-type: decimal;">\n  <li>', '</li>\n</ol>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertHtmlTag('<pre style="background: #0f172a; padding: 12px; border-radius: 8px; font-family: monospace; color: #38bdf8; border: 1px solid #1e293b;">\n', '\n</pre>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <button
                  type="button"
                  onClick={() => insertHtmlTag('<div style="background: rgba(99, 102, 241, 0.1); padding: 10px; border-left: 3px solid #6366f1; border-radius: 6px; margin-top: 10px;">\n  ', '\n</div>')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  title="Callout Box"
                >
                  <Quote className="w-3.5 h-3.5 text-indigo-400" />
                </button>

                <div className="h-4 w-[1px] bg-slate-800 my-auto mx-0.5" />

                {/* TEXT COLORS */}
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => handleInsertColor('#38bdf8')} className="w-3.5 h-3.5 rounded-full bg-sky-400" title="Sky Blue text" />
                  <button type="button" onClick={() => handleInsertColor('#34d399')} className="w-3.5 h-3.5 rounded-full bg-emerald-400" title="Emerald text" />
                  <button type="button" onClick={() => handleInsertColor('#fbbf24')} className="w-3.5 h-3.5 rounded-full bg-amber-400" title="Amber text" />
                  <button type="button" onClick={() => handleInsertColor('#f472b6')} className="w-3.5 h-3.5 rounded-full bg-pink-400" title="Pink text" />
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={8}
              required
              placeholder={
                itemType === 'note'
                  ? 'Enter HTML formatted notes or click toolbar buttons above to format text...'
                  : 'Enter detailed description, context, or instructions...'
              }
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono outline-none focus:border-indigo-500 transition-colors leading-relaxed"
            />
          </div>

          {/* TAGS INPUT */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Tags (Comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Architecture, Specs, EVM, Figma"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* MODAL ACTIONS */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {initialItem ? 'Save Changes' : `Post ${itemType === 'note' ? 'Note' : itemType === 'link' ? 'Link' : 'File'} to Board`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// CATEGORY MANAGER MODAL (PM CONTROL)
// ==========================================
interface CategoryManagerModalProps {
  isOpen: boolean;
  categories: ProjectBoardCategory[];
  activeProjectId: string;
  onClose: () => void;
  onSaveCategory: (category: Partial<ProjectBoardCategory>) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  categories,
  activeProjectId,
  onClose,
  onSaveCategory,
  onDeleteCategory
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('indigo');

  const startEdit = (cat?: ProjectBoardCategory) => {
    if (cat) {
      setEditingId(cat.id);
      setName(cat.name);
      setDescription(cat.description || '');
      setColor(cat.color || 'indigo');
    } else {
      setEditingId(null);
      setName('');
      setDescription('');
      setColor('indigo');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSaveCategory({
      id: editingId || undefined,
      projectId: activeProjectId,
      name: name.trim(),
      description: description.trim(),
      color
    });

    startEdit(); // reset form
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">Project Board Categories</h2>
              <p className="text-xs text-slate-400">Manage categories specific to this project (PM Admin Control)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ADD / EDIT CATEGORY FORM */}
        <form onSubmit={handleSave} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
            {editingId ? 'Edit Category' : 'Create New Category'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Architecture & Specs"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Badge Color</label>
              <select
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="indigo">Indigo</option>
                <option value="purple">Purple</option>
                <option value="teal">Teal</option>
                <option value="amber">Amber</option>
                <option value="rose">Rose</option>
                <option value="emerald">Emerald</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Description</label>
              <input
                type="text"
                placeholder="Brief purpose of this category..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {editingId && (
              <button
                type="button"
                onClick={() => startEdit()}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow cursor-pointer transition-colors"
            >
              {editingId ? 'Update Category' : '+ Add Category'}
            </button>
          </div>
        </form>

        {/* EXISTING CATEGORIES LIST */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-400">Existing Categories ({categories.length})</h3>
          
          {categories.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No custom categories created yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full bg-${cat.color}-500`} />
                      <p className="text-xs font-bold text-slate-200">{cat.name}</p>
                    </div>
                    {cat.description && (
                      <p className="text-[11px] text-slate-400">{cat.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete category "${cat.name}"? Items in this category will become Uncategorized.`)) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
