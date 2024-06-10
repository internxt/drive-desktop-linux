type ScrollableContent = React.HTMLAttributes<HTMLBaseElement>;

export function ScrollableContent({ children, className }: ScrollableContent) {
  return (
    <div className={`${className} -m-5 ml-0 overflow-auto p-5 pl-0`}>
      {children}
    </div>
  );
}
