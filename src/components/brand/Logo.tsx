export function WizardImage({ className }: { className?: string }) {
  return <img src="/wizard-louis.png" alt="Louis Smart wizard" className={className} draggable={false} />;
}

export function LouisLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center"
        style={{
          width: size,
          height: size,
        }}
      >
        <WizardImage className="h-full w-full object-contain" />
      </div>
      <span className="text-lg font-semibold tracking-tight">Louis Smart</span>
    </div>
  );
}