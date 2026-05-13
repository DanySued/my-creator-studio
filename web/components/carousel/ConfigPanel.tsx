import { ThemeSelector } from './ThemeSelector';
import { FolderOpen, Download, AlignLeft, Type, HardDrive } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { motion } from 'motion/react';

interface ConfigPanelProps {
  content: string;
  onContentChange: (content: string) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  directory: string;
  onDirectoryChange: (directory: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function ConfigPanel({
  content,
  onContentChange,
  theme,
  onThemeChange,
  title,
  onTitleChange,
  directory,
  onDirectoryChange,
  onGenerate,
  isGenerating,
}: ConfigPanelProps) {
  return (
    <div className="w-96 h-screen bg-surface-panel/40 backdrop-blur-2xl border-l border-white/5 flex flex-col relative z-20 shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <h2 className="text-lg font-bold text-white tracking-wide">Configuration</h2>
        <p className="text-sm text-zinc-400 mt-1">Customize your carousel styling</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Content Section */}
        <div className="space-y-3">
          <Label htmlFor="content" className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <AlignLeft className="w-3.5 h-3.5 text-gray-500" />
            Slide Content
          </Label>
          <div className="relative">
            <Textarea
              id="content"
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="AI-generated content will appear here. You can edit it freely..."
              className="min-h-[150px] bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none font-mono text-sm"
            />
            <div className="absolute top-2 right-2 text-xs text-gray-500">
              {content.length} chars
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <ThemeSelector selectedTheme={theme} onThemeChange={onThemeChange} />

        {/* Title Override */}
        <div className="space-y-3">
          <Label htmlFor="title" className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-gray-500" />
            Carousel Title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter custom title..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Export Settings */}
        <div className="space-y-4 pt-6 border-t border-white/10">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-gray-500" />
            Export Settings
          </h3>

          <div className="space-y-3">
            <Label htmlFor="directory" className="text-sm text-gray-400">
              Output Directory
            </Label>
            <Select value={directory} onValueChange={onDirectoryChange}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-surface-elevated border-white/10">
                <SelectItem value="downloads" className="text-white">
                  ~/Downloads
                </SelectItem>
                <SelectItem value="desktop" className="text-white">
                  ~/Desktop
                </SelectItem>
                <SelectItem value="documents" className="text-white">
                  ~/Documents
                </SelectItem>
                <SelectItem value="custom" className="text-white">
                  Custom Location...
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="p-6 border-t border-white/5 bg-white/[0.01]">
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGenerate}
          disabled={isGenerating}
          className="relative w-full px-6 py-4 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl font-bold tracking-wide shadow-[0_0_20px_rgba(168,85,247,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group overflow-hidden border border-white/10"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          <Download className="w-5 h-5 relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5" />
          <span className="relative z-10">
            {isGenerating ? 'Generating...' : 'Generate Slides'}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
