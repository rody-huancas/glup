import { PageContent } from '@/modules/main-window/components/PageContent';
import { Sidebar } from '@/modules/main-window/components/Sidebar';
import { TitleBar } from '@/modules/main-window/components/TitleBar';
import { useMainWindow } from '@/modules/main-window/hooks/useMainWindow';

export const MainWindow = () => {
  const { page, files, avatarRef, avatarStatus, navigate, onAvatarStateChange } = useMainWindow();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-line bg-bg">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          page={page}
          avatarRef={avatarRef}
          avatarStatus={avatarStatus}
          onNavigate={navigate}
          onAvatarStateChange={onAvatarStateChange}
        />
        <PageContent page={page} files={files} onNavigate={navigate} />
      </div>
    </div>
  );
};
