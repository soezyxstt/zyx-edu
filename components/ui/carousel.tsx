"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType, EmblaOptionsType } from "embla-carousel";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CarouselContextValue = {
  viewportRef: (node: HTMLElement | null) => void;
  api: EmblaCarouselType | undefined;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

export function useCarousel() {
  const ctx = React.useContext(CarouselContext);
  if (!ctx) throw new Error("useCarousel must be used within Carousel");
  return ctx;
}

export function Carousel({
  opts,
  className,
  children,
}: React.PropsWithChildren<{ opts?: EmblaOptionsType; className?: string }>) {
  const [viewportRef, api] = useEmblaCarousel(opts);
  return (
    <CarouselContext.Provider value={{ viewportRef, api }}>
      <div className={cn("relative", className)}>{children}</div>
    </CarouselContext.Provider>
  );
}

export function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { viewportRef } = useCarousel();
  return (
    <div ref={viewportRef} className="overflow-hidden">
      <div className={cn("-ml-4 flex", className)} {...props} />
    </div>
  );
}

export function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("min-w-0 shrink-0 grow-0 basis-full pl-4", className)} {...props} />;
}

export function CarouselPrevious({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { api } = useCarousel();
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "interactive absolute left-2 top-1/2 z-10 -translate-y-1/2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      onClick={() => api?.scrollPrev()}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}

export function CarouselNext({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { api } = useCarousel();
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "interactive absolute right-2 top-1/2 z-10 -translate-y-1/2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      onClick={() => api?.scrollNext()}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
