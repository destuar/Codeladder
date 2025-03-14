"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 0.5], [5, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[55rem] md:h-[70rem] flex items-start justify-center relative p-0 md:p-0 mt-12"
      ref={containerRef}
    >
      <div
        className="py-0 md:py-0 w-full relative"
        style={{
          perspective: "1000px",
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }: { 
  translate: MotionValue<number>; 
  titleComponent: string | React.ReactNode; 
}) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="div max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  translate,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 5px 10px #0000002a, 0 15px 20px #00000022, 0 30px 30px #00000016, 0 60px 40px #0000000a, 0 90px 45px #00000003",
      }}
      className="max-w-5xl -mt-16 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-[#5b5bf7]/30 p-2 md:p-6 bg-[#222222] rounded-[30px] shadow-xl"
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-zinc-900 md:rounded-2xl md:p-4">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 dark:to-white/5 pointer-events-none"></div>
        
        {/* Subtle inner shadow */}
        <div className="absolute inset-0 shadow-inner pointer-events-none rounded-2xl"></div>
        
        {/* Purple accent glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#5b5bf7]/20 via-[#7a7aff]/10 to-[#5b5bf7]/20 rounded-xl blur-md opacity-50 pointer-events-none"></div>
        
        {/* Content */}
        <div className="relative h-full">
          {children}
        </div>
      </div>
    </motion.div>
  );
};
