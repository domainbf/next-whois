import React from "react";
import { motion } from "framer-motion";

export interface ClickableProps
  extends React.HTMLAttributes<HTMLDivElement>,
    React.PropsWithChildren<{}> {
  tapScale?: number;
  tapDuration?: number;
  hoverScale?: number;
}

const SPRING = { type: "spring" as const, stiffness: 600, damping: 32, mass: 0.6 };

const Clickable: React.FC<ClickableProps> = ({
  children,
  className,
  tapScale = 0.94,
  tapDuration = 0.1,
  hoverScale,
}) => {
  return (
    <motion.div
      className={className}
      whileTap={{
        scale: tapScale,
        transition: SPRING,
      }}
      whileHover={hoverScale ? { scale: hoverScale, transition: SPRING } : {}}
      whileFocus={hoverScale ? { scale: hoverScale, transition: SPRING } : {}}
    >
      {children}
    </motion.div>
  );
};

Clickable.displayName = "Clickable";
export default Clickable;
