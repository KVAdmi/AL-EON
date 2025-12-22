
import React from 'react';
import { cn } from '@/lib/utils';

function ChatLayout({ sidebar, thread, composer, isSidebarOpen }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Sidebar */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out border-r flex-shrink-0',
          isSidebarOpen ? 'w-64' : 'w-0'
        )}
        style={{ borderColor: 'var(--color-border)' }}
      >
        {sidebar}
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Message Thread */}
        <div className="flex-1 overflow-hidden">
          {thread}
        </div>

        {/* Message Composer */}
        <div className="flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
          {composer}
        </div>
      </div>
    </div>
  );
}

export default ChatLayout;
