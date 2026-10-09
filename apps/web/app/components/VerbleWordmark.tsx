type VerbleWordmarkProps = {
  className?: string;
};

export default function VerbleWordmark({
  className = "",
}: VerbleWordmarkProps) {
  return (
    <span className={`font-headline inline-flex items-baseline whitespace-nowrap font-black normal-case tracking-[-0.055em] text-[#4030da] ${className}`.trim()}>
      <span>Verble</span><span className="text-[#75b7a0]">.</span><span>fun</span>
    </span>
  );
}
