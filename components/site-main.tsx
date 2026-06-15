type SiteMainProps = {
  children: React.ReactNode;
};

export function SiteMain({ children }: SiteMainProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 outline-none pt-13 md:pt-14"
    >
      {children}
    </main>
  );
}
