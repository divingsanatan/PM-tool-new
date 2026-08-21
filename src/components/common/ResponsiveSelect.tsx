import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  sublabel?: string;
  disabled?: boolean;
}

interface ResponsiveSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  searchable?: boolean;
  align?: 'auto' | 'left' | 'right';
  id?: string;
  disabled?: boolean;
}

export const ResponsiveSelect: React.FC<ResponsiveSelectProps> = ({
  options,
  value,
  onChange,
  label,
  icon,
  placeholder = 'Select option...',
  className = '',
  menuClassName = '',
  searchable,
  align = 'auto',
  id,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left?: number;
    right?: number;
    width: number;
    alignment: 'left' | 'right' | 'center';
  }>({
    top: 0,
    width: 260,
    alignment: 'left'
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Determine if search should be enabled (auto-enable if options > 6)
  const isSearchEnabled = searchable !== undefined ? searchable : options.length > 6;

  // Calculate smart viewport placement
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const minMenuWidth = Math.max(rect.width, 240);
    const maxMenuWidth = Math.min(viewportWidth - 24, 340);
    const menuWidth = Math.min(Math.max(minMenuWidth, 260), maxMenuWidth);

    // Check vertical space (open downward or upward)
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    const top = shouldOpenUp ? Math.max(10, rect.top - 270) : rect.bottom + 6;

    // Check horizontal space
    let alignment: 'left' | 'right' | 'center' = 'left';
    let left: number | undefined = rect.left;
    let right: number | undefined = undefined;

    if (viewportWidth < 640) {
      // Mobile screen: Center or constrain within 12px margins
      alignment = 'center';
      const calculatedLeft = Math.max(12, Math.min(rect.left, viewportWidth - menuWidth - 12));
      left = calculatedLeft;
      right = undefined;
    } else if (align === 'right' || rect.right + menuWidth > viewportWidth || (align === 'auto' && rect.left + menuWidth > viewportWidth)) {
      alignment = 'right';
      right = Math.max(12, viewportWidth - rect.right);
      left = undefined;
    } else {
      alignment = 'left';
      left = Math.max(12, Math.min(rect.left, viewportWidth - menuWidth - 12));
      right = undefined;
    }

    setMenuPosition({
      top,
      left,
      right,
      width: menuWidth,
      alignment
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      setSearchQuery('');
      // Auto-focus search input after opening
      if (isSearchEnabled) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }
  }, [isOpen]);

  // Handle outside click & window resize / scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleReposition = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen]);

  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  const handleSelect = (optionValue: string, isOptDisabled?: boolean) => {
    if (isOptDisabled) return;
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative inline-block text-left w-full sm:w-auto min-w-0">
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-2 px-3 py-2 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all select-none min-h-[40px] sm:min-h-0 w-full sm:w-auto text-left shadow-sm ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            : isOpen
            ? 'bg-slate-900 border-indigo-500 text-white shadow-indigo-500/20'
            : 'bg-slate-950/90 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white'
        } ${className}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {icon && <span className="shrink-0">{icon}</span>}
          {label && (
            <span className="text-slate-400 font-medium text-xs whitespace-nowrap shrink-0">
              {label}
            </span>
          )}
          {selectedOption ? (
            <span className="font-bold truncate text-slate-100 flex-1 min-w-0">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-slate-500 truncate flex-1 min-w-0">
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Floating Viewport-Safe Menu Portal / Popover */}
      {isOpen && (
        <>
          {/* Mobile Backdrop to prevent accidental touch-through */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent backdrop-blur-[1px] sm:backdrop-blur-none"
            aria-hidden="true"
          />

          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: menuPosition.left !== undefined ? `${menuPosition.left}px` : undefined,
              right: menuPosition.right !== undefined ? `${menuPosition.right}px` : undefined,
              width: `${menuPosition.width}px`,
              maxWidth: 'calc(100vw - 24px)',
              zIndex: 50
            }}
            className={`overflow-hidden rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95 text-xs text-slate-200 ${menuClassName}`}
          >
            {/* Optional Header Search */}
            {isSearchEnabled && (
              <div className="p-2 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Options List */}
            <div className="max-h-64 sm:max-h-72 overflow-y-auto p-1.5 space-y-1 overscroll-contain">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => handleSelect(option.value, option.disabled)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                        option.disabled
                          ? 'opacity-40 cursor-not-allowed text-slate-500'
                          : isSelected
                          ? 'bg-indigo-600/25 text-indigo-200 border border-indigo-500/40 font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {option.icon && (
                          <span className="shrink-0 text-slate-400">{option.icon}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="block truncate">{option.label}</span>
                          {option.sublabel && (
                            <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                              {option.sublabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {option.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              option.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {option.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
