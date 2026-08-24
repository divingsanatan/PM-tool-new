import React, { useState, useEffect } from 'react';
import { X, Layers, Flag, Bookmark, CheckCircle2, DollarSign, Calendar, Tag, ShieldAlert, GitPullRequest, Info, AlertCircle, FileText, Hash } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Milestone, Epic, Feature, UserStory, MilestoneStatus, EpicStatus, FeatureStatus, UserStoryStatus, Priority } from '../../types';

export type HierarchyType = 'milestone' | 'epic' | 'feature' | 'userStory' | 'user_story';

interface HierarchyItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: HierarchyType;
  initialParentMilestoneId?: string;
  initialParentEpicId?: string;
  initialParentFeatureId?: string;
  itemToEdit?: Milestone | Epic | Feature | UserStory | null;
}

const COLOR_PRESETS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#ef4444', // Red
];

export const HierarchyItemModal: React.FC<HierarchyItemModalProps> = ({
  isOpen,
  onClose,
  initialType = 'feature',
  initialParentMilestoneId = '',
  initialParentEpicId = '',
  initialParentFeatureId = '',
  itemToEdit = null
}) => {
  const { projectData, saveMilestone, saveEpic, saveFeature, saveUserStory, currentUser } = useProject();

  const normalizedInitialType = (initialType === 'user_story' ? 'userStory' : initialType) as 'milestone' | 'epic' | 'feature' | 'userStory';
  const [itemType, setItemType] = useState<'milestone' | 'epic' | 'feature' | 'userStory'>(normalizedInitialType);

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [changeRequestId, setChangeRequestId] = useState('');

  // Milestone fields
  const [dueDate, setDueDate] = useState('');
  const [milestoneStatus, setMilestoneStatus] = useState<MilestoneStatus>('upcoming');
  const [baselineCost, setBaselineCost] = useState(15000);

  // Epic fields
  const [epicMilestoneId, setEpicMilestoneId] = useState('');
  const [epicStatus, setEpicStatus] = useState<EpicStatus>('in_progress');

  // Feature fields
  const [featureEpicId, setFeatureEpicId] = useState('');
  const [featureMilestoneId, setFeatureMilestoneId] = useState('');
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus>('in_progress');
  const [featurePriority, setFeaturePriority] = useState<Priority>('normal');
  const [targetReleaseDate, setTargetReleaseDate] = useState('');

  // User Story fields
  const [storyFeatureId, setStoryFeatureId] = useState('');
  const [storyEpicId, setStoryEpicId] = useState('');
  const [storyMilestoneId, setStoryMilestoneId] = useState('');
  const [storySprintId, setStorySprintId] = useState('');
  const [storyStatus, setStoryStatus] = useState<UserStoryStatus>('backlog');
  const [storyPriority, setStoryPriority] = useState<Priority>('normal');
  const [storyPoints, setStoryPoints] = useState<number>(3);
  const [storyTargetReleaseDate, setStoryTargetReleaseDate] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setTitle(itemToEdit.title || '');
      setDescription(itemToEdit.description || '');
      setChangeRequestId(itemToEdit.changeRequestId || '');

      if ('baselineCost' in itemToEdit && 'dueDate' in itemToEdit) {
        setItemType('milestone');
        setDueDate(itemToEdit.dueDate || '');
        setMilestoneStatus(itemToEdit.status as MilestoneStatus);
        setBaselineCost(itemToEdit.baselineCost || 0);
      } else if ('storyPoints' in itemToEdit || 'featureId' in itemToEdit && !('targetReleaseDate' in itemToEdit && 'priority' in itemToEdit && !('storyPoints' in itemToEdit))) {
        // User Story item
        const story = itemToEdit as UserStory;
        setItemType('userStory');
        setStoryFeatureId(story.featureId || '');
        setStoryEpicId(story.epicId || '');
        setStoryMilestoneId(story.milestoneId || '');
        setStorySprintId(story.sprintId || '');
        setStoryStatus(story.status || 'backlog');
        setStoryPriority(story.priority || 'normal');
        setStoryPoints(story.storyPoints ?? 3);
        setStoryTargetReleaseDate(story.targetReleaseDate || '');
        setColor(story.color || '#10b981');
      } else if ('epicId' in itemToEdit || ('priority' in itemToEdit && 'targetReleaseDate' in itemToEdit)) {
        setItemType('feature');
        const feat = itemToEdit as Feature;
        setFeatureEpicId(feat.epicId || '');
        setFeatureMilestoneId(feat.milestoneId || '');
        setFeatureStatus(feat.status);
        setFeaturePriority(feat.priority);
        setTargetReleaseDate(feat.targetReleaseDate || '');
        setColor(feat.color || '#3b82f6');
      } else {
        setItemType('epic');
        const ep = itemToEdit as Epic;
        setEpicMilestoneId(ep.milestoneId || '');
        setEpicStatus(ep.status);
        setColor(ep.color || '#8b5cf6');
      }
    } else {
      setItemType(normalizedInitialType);
      setTitle('');
      setDescription('');
      setChangeRequestId('');
      setColor(normalizedInitialType === 'epic' ? '#8b5cf6' : normalizedInitialType === 'userStory' ? '#10b981' : '#3b82f6');
      setDueDate(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]);
      setMilestoneStatus('upcoming');
      setBaselineCost(20000);

      setEpicMilestoneId(initialParentMilestoneId);
      setEpicStatus('in_progress');

      setFeatureEpicId(initialParentEpicId);
      setFeatureMilestoneId(initialParentMilestoneId);
      setFeatureStatus('in_progress');
      setFeaturePriority('normal');
      setTargetReleaseDate(new Date(Date.now() + 86400000 * 45).toISOString().split('T')[0]);

      setStoryFeatureId(initialParentFeatureId);
      if (initialParentFeatureId) {
        const feat = projectData.features.find(f => f.id === initialParentFeatureId);
        setStoryEpicId(feat?.epicId || initialParentEpicId || '');
        setStoryMilestoneId(feat?.milestoneId || initialParentMilestoneId || '');
      } else {
        setStoryEpicId(initialParentEpicId || '');
        setStoryMilestoneId(initialParentMilestoneId || '');
      }
      setStorySprintId('');
      setStoryStatus('backlog');
      setStoryPriority('normal');
      setStoryPoints(3);
      setStoryTargetReleaseDate(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]);
    }
  }, [itemToEdit, initialType, initialParentMilestoneId, initialParentEpicId, initialParentFeatureId, isOpen]);

  // When parent epic changes for a feature, auto-suggest parent milestone & CR
  const handleFeatureEpicChange = (epicId: string) => {
    setFeatureEpicId(epicId);
    if (epicId) {
      const selectedEpic = (projectData.epics || []).find(e => e.id === epicId);
      if (selectedEpic?.milestoneId) {
        setFeatureMilestoneId(selectedEpic.milestoneId);
      }
      if (selectedEpic?.changeRequestId && !changeRequestId) {
        setChangeRequestId(selectedEpic.changeRequestId);
      }
    }
  };

  // When parent feature changes for a user story, auto-suggest parent epic & milestone
  const handleStoryFeatureChange = (featureId: string) => {
    setStoryFeatureId(featureId);
    if (featureId) {
      const selectedFeat = projectData.features.find(f => f.id === featureId);
      if (selectedFeat?.epicId) {
        setStoryEpicId(selectedFeat.epicId);
        const ep = (projectData.epics || []).find(e => e.id === selectedFeat.epicId);
        if (ep?.milestoneId) {
          setStoryMilestoneId(ep.milestoneId);
        }
      }
      if (selectedFeat?.milestoneId) {
        setStoryMilestoneId(selectedFeat.milestoneId);
      }
      if (selectedFeat?.changeRequestId && !changeRequestId) {
        setChangeRequestId(selectedFeat.changeRequestId);
      }
    }
  };

  if (!isOpen) return null;

  // Find selected CR details for validation display
  const selectedCR = (projectData.changeRequests || []).find(cr => cr.id === changeRequestId);

  // Determine inherited CR if not explicitly selected
  let inheritedCRId: string | undefined;
  if (!changeRequestId) {
    if (itemType === 'epic' && epicMilestoneId) {
      const ms = projectData.milestones.find(m => m.id === epicMilestoneId);
      inheritedCRId = ms?.changeRequestId;
    } else if (itemType === 'feature') {
      if (featureEpicId) {
        const ep = (projectData.epics || []).find(e => e.id === featureEpicId);
        inheritedCRId = ep?.changeRequestId;
      }
      if (!inheritedCRId && featureMilestoneId) {
        const ms = projectData.milestones.find(m => m.id === featureMilestoneId);
        inheritedCRId = ms?.changeRequestId;
      }
    } else if (itemType === 'userStory') {
      if (storyFeatureId) {
        const feat = projectData.features.find(f => f.id === storyFeatureId);
        inheritedCRId = feat?.changeRequestId;
      }
      if (!inheritedCRId && storyEpicId) {
        const ep = (projectData.epics || []).find(e => e.id === storyEpicId);
        inheritedCRId = ep?.changeRequestId;
      }
      if (!inheritedCRId && storyMilestoneId) {
        const ms = projectData.milestones.find(m => m.id === storyMilestoneId);
        inheritedCRId = ms?.changeRequestId;
      }
    }
  }

  const inheritedCR = inheritedCRId ? (projectData.changeRequests || []).find(cr => cr.id === inheritedCRId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (itemType === 'milestone') {
      await saveMilestone({
        id: itemToEdit ? itemToEdit.id : undefined,
        title,
        description,
        dueDate,
        status: milestoneStatus,
        baselineCost: Number(baselineCost) || 0,
        changeRequestId: changeRequestId || undefined
      });
    } else if (itemType === 'epic') {
      await saveEpic({
        id: itemToEdit ? itemToEdit.id : undefined,
        title,
        description,
        milestoneId: epicMilestoneId || undefined,
        status: epicStatus,
        color,
        changeRequestId: changeRequestId || undefined
      });
    } else if (itemType === 'feature') {
      await saveFeature({
        id: itemToEdit ? itemToEdit.id : undefined,
        title,
        description,
        epicId: featureEpicId || undefined,
        milestoneId: featureMilestoneId || undefined,
        status: featureStatus,
        priority: featurePriority,
        targetReleaseDate,
        color,
        changeRequestId: changeRequestId || undefined
      });
    } else if (itemType === 'userStory') {
      await saveUserStory({
        id: itemToEdit ? itemToEdit.id : undefined,
        title,
        description,
        featureId: storyFeatureId || undefined,
        epicId: storyEpicId || undefined,
        milestoneId: storyMilestoneId || undefined,
        sprintId: storySprintId || undefined,
        status: storyStatus,
        priority: storyPriority,
        storyPoints: Number(storyPoints) || 0,
        targetReleaseDate: storyTargetReleaseDate || undefined,
        color,
        changeRequestId: changeRequestId || undefined
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl h-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            {itemType === 'milestone' && <Flag className="w-5 h-5 text-amber-400" />}
            {itemType === 'epic' && <Bookmark className="w-5 h-5 text-purple-400" />}
            {itemType === 'feature' && <Layers className="w-5 h-5 text-blue-400" />}
            {itemType === 'userStory' && <FileText className="w-5 h-5 text-emerald-400" />}
            <h2 className="text-lg font-semibold text-slate-100">
              {itemToEdit ? `Edit ${itemType === 'userStory' ? 'User Story' : itemType.charAt(0).toUpperCase() + itemType.slice(1)}` : `Create New WBS Item`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type selector tabs if creating new */}
        {!itemToEdit && (
          <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => { setItemType('milestone'); setColor('#f59e0b'); }}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 sm:shrink ${
                itemType === 'milestone'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Flag className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Milestone</span>
            </button>
            <button
              type="button"
              onClick={() => { setItemType('epic'); setColor('#8b5cf6'); }}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 sm:shrink ${
                itemType === 'epic'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0 text-purple-400" />
              <span>Epic</span>
            </button>
            <button
              type="button"
              onClick={() => { setItemType('feature'); setColor('#3b82f6'); }}
              className={`flex-1 min-w-[95px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 sm:shrink ${
                itemType === 'feature'
                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              <span>Feature</span>
            </button>
            <button
              type="button"
              onClick={() => { setItemType('userStory'); setColor('#10b981'); }}
              className={`flex-1 min-w-[115px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 sm:shrink ${
                itemType === 'userStory'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>User Story</span>
            </button>
          </div>
        )}

        <form id="hierarchy-item-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {itemType === 'userStory' ? 'USER STORY' : itemType.toUpperCase()} Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. ${
                itemType === 'milestone'
                  ? 'M1: Production Readiness Alpha'
                  : itemType === 'epic'
                  ? 'Cloud Infrastructure & Security'
                  : itemType === 'feature'
                  ? 'User Auth & Role Management'
                  : 'As a user, I want OAuth login so that I can sign in securely'
              }`}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description / Acceptance Summary
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="High-level objective, deliverables, or user story narrative..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* MILESTONE SPECIFIC FIELDS */}
          {itemType === 'milestone' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Target Due Date
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Baseline Budget ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={baselineCost}
                  onChange={(e) => setBaselineCost(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={milestoneStatus}
                  onChange={(e) => setMilestoneStatus(e.target.value as MilestoneStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="in_progress">In Progress</option>
                  <option value="achieved">Achieved / Completed</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>
            </div>
          )}

          {/* EPIC SPECIFIC FIELDS */}
          {itemType === 'epic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-amber-400" /> Parent Milestone
                </label>
                <select
                  value={epicMilestoneId}
                  onChange={(e) => setEpicMilestoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- No Parent Milestone --</option>
                  {projectData.milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={epicStatus}
                    onChange={(e) => setEpicStatus(e.target.value as EpicStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                          color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FEATURE SPECIFIC FIELDS */}
          {itemType === 'feature' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-purple-400" /> Parent Epic
                  </label>
                  <select
                    value={featureEpicId}
                    onChange={(e) => handleFeatureEpicChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- No Parent Epic --</option>
                    {(projectData.epics || []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-amber-400" /> Parent Milestone
                  </label>
                  <select
                    value={featureMilestoneId}
                    onChange={(e) => setFeatureMilestoneId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- No Parent Milestone --</option>
                    {projectData.milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={featureStatus}
                    onChange={(e) => setFeatureStatus(e.target.value as FeatureStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="testing">Testing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={featurePriority}
                    onChange={(e) => setFeaturePriority(e.target.value as Priority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Release
                  </label>
                  <input
                    type="date"
                    value={targetReleaseDate}
                    onChange={(e) => setTargetReleaseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tag Color
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USER STORY SPECIFIC FIELDS */}
          {itemType === 'userStory' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" /> Parent Feature
                  </label>
                  <select
                    value={storyFeatureId}
                    onChange={(e) => handleStoryFeatureChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- No Parent Feature --</option>
                    {projectData.features.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-purple-400" /> Parent Epic
                  </label>
                  <select
                    value={storyEpicId}
                    onChange={(e) => setStoryEpicId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- No Parent Epic --</option>
                    {(projectData.epics || []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-amber-400" /> Milestone
                  </label>
                  <select
                    value={storyMilestoneId}
                    onChange={(e) => setStoryMilestoneId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- No Milestone --</option>
                    {projectData.milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={storyStatus}
                    onChange={(e) => setStoryStatus(e.target.value as UserStoryStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="testing">Testing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={storyPriority}
                    onChange={(e) => setStoryPriority(e.target.value as Priority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" /> Story Points
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Sprint
                  </label>
                  <select
                    value={storySprintId}
                    onChange={(e) => setStorySprintId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- No Sprint --</option>
                    {(projectData.sprints || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tag Color
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LINKED CHANGE REQUEST (OPTIONAL) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <GitPullRequest className="w-4 h-4 text-indigo-400" /> Linked Change Request <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
              </label>
              {selectedCR && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  selectedCR.status === 'approved' || selectedCR.status === 'implemented'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : selectedCR.status === 'rejected'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : selectedCR.status === 'deferred'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                }`}>
                  {selectedCR.status.toUpperCase()}
                </span>
              )}
            </div>

            <select
              value={changeRequestId}
              onChange={(e) => setChangeRequestId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- No Linked Change Request (Optional) --</option>
              {(projectData.changeRequests || []).map((cr) => (
                <option key={cr.id} value={cr.id}>
                  {cr.crNumber}: {cr.title} ({cr.status})
                </option>
              ))}
            </select>

            {/* Validation Message & Guidance Notice */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-start gap-2 text-[11px] text-indigo-300/90 leading-relaxed bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-500/20">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Validation Notice:</strong> Linking a Change Request to a {itemType === 'userStory' ? 'User Story' : itemType} is optional. Linking will automatically propagate this Change Request to all child items in the hierarchy.
                </div>
              </div>

              {selectedCR && (selectedCR.status === 'rejected' || selectedCR.status === 'deferred') && (
                <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/30">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Warning:</strong> Selected Change Request <strong>{selectedCR.crNumber}</strong> is currently <strong>{selectedCR.status}</strong>. Linking is permitted for traceability, but work execution should follow CCB guidelines.
                  </span>
                </div>
              )}

              {inheritedCR && !changeRequestId && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Auto-inherited from parent hierarchy: <strong>{inheritedCR.crNumber} - {inheritedCR.title}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Sticky Footer Actions Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900 shrink-0 gap-3">
          <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="whitespace-nowrap">{itemToEdit ? `Editing ${itemType === 'userStory' ? 'User Story' : itemType}` : `Ready to create ${itemType === 'userStory' ? 'User Story' : itemType}`}</span>
          </div>
          <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="hierarchy-item-form"
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap shrink-0 min-w-fit"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{itemToEdit ? `Save Changes` : `Create ${itemType === 'userStory' ? 'User Story' : itemType.charAt(0).toUpperCase() + itemType.slice(1)}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
