export function Ticker({ text }: { text: string }) {
  if (!text?.trim()) return null;
  // Duplicamos o conteúdo para criar loop contínuo com translateX(-50%).
  return (
    <div className="overflow-hidden border-t border-border bg-primary text-primary-foreground py-3">
      <div className="animate-marquee whitespace-nowrap text-lg font-medium">
        <span className="px-12">{text}</span>
        <span className="px-12">{text}</span>
      </div>
    </div>
  );
}
