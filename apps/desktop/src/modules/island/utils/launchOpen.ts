interface OpenOnLaunchParams {
  // Asks Rust; true only the first time in the process.
  take   : () => Promise<boolean>;
  onOpen : () => void;
}

// The frontend never decides on its own that this is the launch: a remount asks again and gets false.
export const openOnLaunch = async ({ take, onOpen }: OpenOnLaunchParams) => {
  if (await take().catch(() => false)) onOpen();
};
