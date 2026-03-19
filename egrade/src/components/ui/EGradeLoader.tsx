import { useState } from "react";
import logoSrc from "@/assets/logo.png";

interface Props {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function EGradeLoader({ message, size = "md", className = "" }: Props) {
  const [imgError, setImgError] = useState(false);
  const dims = size === "sm" ? "w-10 h-10" : size === "lg" ? "w-20 h-20" : "w-14 h-14";
  const textSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-xs";
  const ringDims = size === "sm" ? "w-14 h-14" : size === "lg" ? "w-28 h-28" : "w-20 h-20";
  const ringBorder = size === "sm" ? "border-[2px]" : size === "lg" ? "border-[4px]" : "border-[3px]";

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Spinning ring */}
        <div className={`absolute ${ringDims} rounded-full ${ringBorder} border-transparent border-t-primary border-r-accent animate-egrade-spin`} />
        {/* Logo with fallback */}
        {!imgError ? (
          <img
            src={logoSrc}
            alt="eGrade"
            className={`${dims} object-contain rounded-full animate-egrade-pulse`}
            onError={() => setImgError(true)}
            loading="eager"
          />
        ) : (
          <div className={`${dims} rounded-full bg-primary/10 flex items-center justify-center animate-egrade-pulse`}>
            <span className={`font-black text-primary ${textSize}`}>eG</span>
          </div>
        )}
      </div>
      {message && (
        <p className="text-xs font-semibold text-muted-foreground animate-fade-in">{message}</p>
      )}
    </div>
  );
}
