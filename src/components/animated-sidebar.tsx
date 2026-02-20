"use client";

import { motion } from "motion/react";
import { AppSidebar } from "@/components/app-sidebar";

const sidebarTransition = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
};

export function AnimatedSidebar() {
  return (
    <motion.div
      className="h-full"
      initial={sidebarTransition.initial}
      animate={sidebarTransition.animate}
      transition={sidebarTransition.transition}
    >
      <AppSidebar />
    </motion.div>
  );
}
