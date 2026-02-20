"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
};

export function AnimatedPageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      className={className}
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      {children}
    </motion.div>
  );
}
