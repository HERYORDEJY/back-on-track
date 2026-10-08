// Adapted from the MIT-licensed shadcn/ui New York button primitive.
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn inline-flex min-h-12 items-center justify-center rounded-lg border-2 px-5 py-2 text-base font-bold no-underline active:translate-y-px focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-night disabled:pointer-events-none disabled:border-rail disabled:bg-mist disabled:text-slate",
  {
    variants: {
      variant: {
        now: "btn--now border-night bg-lamp text-night hover:bg-lamp",
        plain: "border-night bg-paper text-night hover:bg-mist",
        text: "min-h-11 border-transparent bg-transparent px-0 text-night underline underline-offset-4 hover:decoration-[3px]",
      },
    },
    defaultVariants: { variant: "now" },
  },
);

export function Button({ className, variant, asChild = false, ...props }:
  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" data-variant={variant ?? "now"} className={cn(buttonVariants({ variant, className }))} {...props} />;
}
