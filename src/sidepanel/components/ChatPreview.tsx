import type { Chat } from '../../shared/types';

interface ChatPreviewProps {
  chat: Chat;
  onClose: () => void;
  onOpen: () => void;
}

export const ChatPreview = ({ chat, onClose, onOpen }: ChatPreviewProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#2a2a2a] rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#404040]">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                chat.service === 'claude' ? 'bg-[#d97757]' : 'bg-[#10a37f]'
              }`}
            />
            <h3 className="font-medium truncate">{chat.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#a0a0a0] hover:text-white"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chat.messages.slice(0, 10).map((message, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-[#3a3a3a] ml-4'
                  : 'bg-[#1a1a1a] mr-4'
              }`}
            >
              <p className="text-xs text-[#a0a0a0] mb-1 capitalize">
                {message.role}
              </p>
              <p className="text-sm whitespace-pre-wrap line-clamp-6">
                {message.content}
              </p>
            </div>
          ))}
          {chat.messages.length > 10 && (
            <p className="text-center text-sm text-[#a0a0a0]">
              +{chat.messages.length - 10} more messages
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#404040]">
          <button
            onClick={onOpen}
            className={`w-full py-2 rounded-lg font-medium transition-colors ${
              chat.service === 'claude'
                ? 'bg-[#d97757] hover:bg-[#c96747]'
                : 'bg-[#10a37f] hover:bg-[#0d8a6a]'
            }`}
          >
            Open in {chat.service === 'claude' ? 'Claude' : 'ChatGPT'}
          </button>
        </div>
      </div>
    </div>
  );
};
