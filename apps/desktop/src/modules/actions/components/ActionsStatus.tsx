interface ActionsStatusProps {
  message: string;
}

export const ActionsStatus = ({ message }: ActionsStatusProps) => (
  <div className="absolute inset-0 flex items-center justify-center rounded-control border border-dashed border-line-dashed text-sm font-medium text-lilac-soft">
    {message}
  </div>
);
