import { Island } from '@/modules/island/components/Island';
// import { MainWindow } from '@/modules/main-window/components/MainWindow';
// import { isMainWindow } from '@/shared/utils/windows';

// The standalone main window now lives inside the island (see legacy/main-window).
export const App = () => (
  <main className="h-full w-full">
    <Island />
  </main>
);

// export const App = () => {
//   if (isMainWindow()) return <MainWindow />;
//
//   return (
//     <main className="h-full w-full">
//       <Island />
//     </main>
//   );
// };
